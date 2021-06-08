terraform {
  required_version = ">= 0.14"
  required_providers {
    aws = {
      version = "~> 3"
    }
  }
}

provider "aws" {
  region = "us-west-2"
}

module "acs" {
  source = "github.com/byu-oit/terraform-aws-acs-info?ref=v3.1.0"
}

locals {
  repo = "terraform-aws-schema-migrations-lambda"
  name = "migrations-lambda" # Package resource namespace

  ssm_path = "/${local.repo}/${var.env}"

  tags = {
    env              = var.env
    data-sensitivity = "public"
    repo             = "https://github.com/byu-oit/${local.repo}"
  }
}

# ------------------------------------------------------------
# Start of Schema Migrations Lambda
# ------------------------------------------------------------
module "schema_migrations_lambda" {
  #  source = "github.com/byu-oit/terraform-aws-schema-migrations-lambda?ref=v1.0.0"
  source                        = "../.." # for local testing during module development
  app_name                      = "${local.name}-${var.env}"
  migration_files               = "migrations/*.mig.js"
  db_identifier                 = module.db.instance.id
  db_ssm_username               = module.db.master_username_parameter.name
  db_ssm_password               = module.db.master_password_parameter.name
  db_name                       = module.db.instance.name
  db_security_group_id          = module.db.security_group.id
  role_permissions_boundary_arn = module.acs.role_permissions_boundary.arn
  vpc_id                        = module.acs.vpc.id
  vpc_subnet_ids                = module.acs.private_subnet_ids
  vpc_security_group_ids        = []
}

# ------------------------------------------------------------
# Start of Target Database
# Note: this could also be a data source
# ------------------------------------------------------------
module "db" {
  source = "github.com/byu-oit/terraform-aws-rds?ref=v2.3.1"

  identifier              = "${local.name}-${var.env}"
  engine                  = "postgres"
  engine_version          = "12.5"
  family                  = "postgres12"
  cloudwatch_logs_exports = ["postgresql", "upgrade"]

  db_name             = "edge"
  ssm_prefix          = local.ssm_path
  subnet_ids          = module.acs.data_subnet_ids
  subnet_group_name   = module.acs.db_subnet_group_name
  vpc_id              = module.acs.vpc.id
  deletion_protection = false
}
