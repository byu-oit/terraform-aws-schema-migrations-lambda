terraform {
  required_version = ">= 0.13"
  required_providers {
    aws = ">= 3.19"
  }
}

locals {
  use_ssm_for_username = regexall("^/", var.database.username)
  use_ssm_for_password = regexall("^/", var.database.password)
  lambda_env_variables = {
    MIGRATIONS_BUCKET = aws_s3_bucket.schema_migration_bucket[0].bucket
    DB_ENGINE         = data.aws_db_instance.db_instance.engine // Should be postgres or mysql
    DB_HOST           = data.aws_db_instance.db_instance.endpoint
    DB_PORT           = data.aws_db_instance.db_instance.port
    DB_NAME           = var.database.name != null ? var.database.name : data.aws_db_instance.db_instance.db_name
    DB_USERNAME       = local.use_ssm_for_username ? data.aws_ssm_parameter.db_username.value : var.database.username
    DB_PASSWORD       = local.use_ssm_for_password ? data.aws_ssm_parameter.db_password.value : var.database.password
    REGION            = data.aws_region.current.name
  }
  lambda_function_name = "${var.app_name}-schema-migrations"
}

# -----------------------------------------------------------------------------
# START OF DB PARAMETERS
# Note if the username or password given starts with a `/` then we will look at
# the parameter store to find the value
# -----------------------------------------------------------------------------

data "aws_region" "current" {}

data "aws_ssm_parameter" "db_username" {
  count = local.use_ssm_for_username ? 0 : 1
  name  = var.database.username
}

data "aws_ssm_parameter" "db_password" {
  count = local.use_ssm_for_password ? 0 : 1
  name  = var.database.password
}

data "aws_db_instance" "db_instance" {
  db_instance_identifier = var.database.identifier
}

# -----------------------------------------------------------------------------
# START OF LOCAL FILES
# Note we need to upload local files to an S3 bucket to be pulled down into the function
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "migration_bucket_logs" {
  bucket = "${var.app_name}-schema-migrations-${data.aws_caller_identity.current.account_id}-logs"
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
    target_bucket = aws_s3_bucket.migration_bucket_logs[0].id
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

resource "aws_s3_bucket_public_access_block" "default" {
  bucket                  = aws_s3_bucket.schema_migration_bucket[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_object" "migrations" {
  for_each = fileset(dirname(var.migration_files), basename(var.migration_files))

  bucket = aws_s3_bucket.schema_migration_bucket[0].bucket
  key    = each.value
  source = var.migration_files + "/" + each.value
  etag   = filemd5(each.value)
  tags   = var.tags
}

resource "aws_iam_policy" "s3_access" {
  name        = "${aws_s3_bucket.schema_migration_bucket[0].bucket}-access"
  description = "A policy to allow access to s3 to this bucket: ${aws_s3_bucket.schema_migration_bucket[0].bucket}"

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
        "${aws_s3_bucket.schema_migration_bucket[0].arn}"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "${aws_s3_bucket.schema_migration_bucket[0].arn}/*"
      ]
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  policy_arn = aws_iam_policy.s3_access[0].arn
  role       = aws_iam_role.migrations_lambda.name
}
# -----------------------------------------------------------------------------
# END OF LOCAL FILES
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# START OF LAMBDA FUNCTION
# -----------------------------------------------------------------------------

data "aws_ecr_repository" "migrations_lambda" {
  name = "schema-migrations-lambda" # Must match the name in /iac/set/main.tf#ecr.name
}

resource "aws_lambda_function" "migrations_lambda" {
  function_name = local.lambda_function_name
  description   = "Runs schema migrations on ${data.aws_db_instance.db_instance.db_instance_identifier}"
  role          = aws_iam_role.migrations_lambda.arn
  image_uri     = data.aws_ecr_repository.migrations_lambda.repository_url
  runtime       = null
  handler       = null
  timeout       = var.timeout
  memory_size   = var.memory_size
  environment {
    variables = local.lambda_env_variables
  }
  tags = var.tags

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs
  ]
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
# -----------------------------------------------------------------------------
# END OF LAMBDA FUNCTION
# -----------------------------------------------------------------------------
