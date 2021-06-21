terraform {
  required_version = ">= 0.14"
  required_providers {
    aws = {
      version = "~> 3"
    }
  }
}

locals {
  ecr_repo      = var.ecr_repo
  ecr_image_tag = var.ecr_image_tag
  lambda_env_variables_base = {
    MIGRATIONS_BUCKET = aws_s3_bucket.schema_migration_bucket.bucket
    DB_ENGINE         = var.db_engine != null ? var.db_engine : data.aws_db_instance.db_instance.engine # Should be postgres or mysql
    DB_HOST           = data.aws_db_instance.db_instance.address
    DB_PORT           = data.aws_db_instance.db_instance.port
    DB_NAME           = var.db_name != null ? var.db_name : data.aws_db_instance.db_instance.db_name
    DB_USERNAME       = var.db_ssm_username
    DB_PASSWORD       = var.db_ssm_password
    REGION            = data.aws_region.current.name
  }
  lambda_env_variables_ssl = {
    PGSSLMODE           = "require"
    NODE_EXTRA_CA_CERTS = "/var/task/rds-ca-2019-root.pem"
  }
  lambda_env_variables    = var.db_ssl_mode == true ? merge(local.lambda_env_variables_base, local.lambda_env_variables_ssl) : local.lambda_env_variables_base
  lambda_function_name    = "${var.app_name}-schema-migrations"
  migrations_dir          = dirname(var.migration_files)
  migrations_path_pattern = basename(var.migration_files)
}

# -----------------------------------------------------------------------------
# START OF DB PARAMETERS
# -----------------------------------------------------------------------------

data "aws_region" "current" {}

data "aws_db_instance" "db_instance" {
  db_instance_identifier = var.db_identifier
}

# -----------------------------------------------------------------------------
# START OF LOCAL FILES
# Note we need to upload local files to an S3 bucket to be pulled down into the function
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "migration_bucket_logs" {
  bucket = var.migrations_bucket_name != null ? "${var.migrations_bucket_name}-logs" : "${var.app_name}-schema-migrations-${data.aws_caller_identity.current.account_id}-logs"
  acl    = "log-delivery-write"
  tags   = var.tags

  lifecycle_rule {
    id                                     = "AutoAbortFailedMultipartUpload"
    enabled                                = true
    abort_incomplete_multipart_upload_days = 10

    expiration {
      days                         = 0
      expired_object_delete_marker = false
    }
  }
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket" "schema_migration_bucket" {
  bucket = var.migrations_bucket_name != null ? var.migrations_bucket_name : "${var.app_name}-schema-migrations"
  logging {
    target_bucket = aws_s3_bucket.migration_bucket_logs.id
    target_prefix = "log/"
  }
  lifecycle_rule {
    id                                     = "AutoAbortFailedMultipartUpload"
    enabled                                = true
    abort_incomplete_multipart_upload_days = 10

    expiration {
      days                         = 0
      expired_object_delete_marker = false
    }
  }
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
  tags = var.tags
}

resource "aws_s3_bucket_public_access_block" "migrations" {
  bucket                  = aws_s3_bucket.schema_migration_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket                  = aws_s3_bucket.migration_bucket_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_object" "migrations" {
  for_each = fileset(local.migrations_dir, local.migrations_path_pattern)

  bucket = aws_s3_bucket.schema_migration_bucket.bucket
  key    = each.value
  source = "${local.migrations_dir}/${each.value}"
  etag   = filemd5("${local.migrations_dir}/${each.value}")
  tags   = var.tags
}

resource "aws_iam_policy" "s3_access" {
  name        = "${aws_s3_bucket.schema_migration_bucket.bucket}-access"
  description = "A policy to allow access to s3 to this bucket: ${aws_s3_bucket.schema_migration_bucket.bucket}"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "${aws_s3_bucket.schema_migration_bucket.arn}"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "${aws_s3_bucket.schema_migration_bucket.arn}/*"
      ]
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  policy_arn = aws_iam_policy.s3_access.arn
  role       = aws_iam_role.migrations_lambda.name
}

# -----------------------------------------------------------------------------
# START OF LAMBDA FUNCTION
# -----------------------------------------------------------------------------

data "aws_ecr_repository" "migrations_lambda" {
  name = local.ecr_repo # Must match the name in /iac/setup/main.tf#ecr.name
}

data "aws_ecr_image" "migrations_lambda" {
  repository_name = local.ecr_repo # Must match the name in /iac/setup/main.tf#ecr.name
  image_tag       = local.ecr_image_tag
}

resource "aws_lambda_function" "migrations_lambda" {
  package_type  = "Image"
  function_name = local.lambda_function_name
  description   = "Runs schema migrations on ${data.aws_db_instance.db_instance.db_instance_identifier}"
  role          = aws_iam_role.migrations_lambda.arn
  image_uri     = "${data.aws_ecr_repository.migrations_lambda.repository_url}:${data.aws_ecr_image.migrations_lambda.image_tag}"
  runtime       = null
  handler       = null
  timeout       = 900 # Setting this to the max makes the most sense for schema migrations
  memory_size   = var.memory_size

  environment {
    variables = local.lambda_env_variables
  }

  vpc_config {
    subnet_ids         = [var.vpc_subnet_ids[0]]
    security_group_ids = compact(concat([aws_security_group.migrations_lambda_sg.id], var.vpc_security_group_ids))
  }

  tags = var.tags

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs
  ]
}

resource "aws_security_group" "migrations_lambda_sg" {
  name        = "${var.app_name}-schema-migrations"
  description = "Controls access to the Schema Migrations Lambda"
  vpc_id      = var.vpc_id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = var.tags
}

resource "aws_security_group_rule" "migrations_lambda_sg_rule" {
  description              = "Allows the Schema Migrations Lambda to communicate with the RDS instance"
  from_port                = data.aws_db_instance.db_instance.port
  protocol                 = "tcp"
  security_group_id        = var.db_security_group_id
  to_port                  = data.aws_db_instance.db_instance.port
  type                     = "ingress"
  source_security_group_id = aws_security_group.migrations_lambda_sg.id
}

resource "aws_iam_role" "migrations_lambda" {
  name                 = "${var.app_name}-schema-migrations"
  permissions_boundary = var.role_permissions_boundary_arn
  tags                 = var.tags

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

# Gives the schema migration lambda permission to execute with the any VPC where placed
resource "aws_iam_role_policy_attachment" "vpc_access" {
  role       = aws_iam_role.migrations_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "migrations_lambda" {
  name = "${var.app_name}-schema-migrations"
  role = aws_iam_role.migrations_lambda.name

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*",
      "Effect": "Allow"
    },
    {
      "Action": "codedeploy:PutLifecycleEventHookExecutionStatus",
      "Resource": "*",
      "Effect": "Allow"
    },
    {
      "Action": "ssm:GetParameter",
      "Resource": "${var.db_ssm_username_arn}",
      "Effect": "Allow"
    },
    {
      "Action": "ssm:GetParameter",
      "Resource": "${var.db_ssm_password_arn}",
      "Effect": "Allow"
    }
  ]
}
EOF
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${local.lambda_function_name}"
  retention_in_days = var.log_retention_in_days
  tags              = var.tags
}
