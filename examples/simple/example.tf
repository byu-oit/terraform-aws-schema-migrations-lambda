provider "aws" {
  region = "us-west-2"
}
module "acs" {
  source = "github.com/byu-oit/terraform-aws-acs-info?ref=v3.1.0"
}
variable "env" {
  description = "Deploy various environments by specifying an environment name"
  type        = string
  default     = "edge" // For testing purposes
}
locals {
  repo = "terraform-aws-schema-migrations-lambda"
  name = "migrations-lambda" // Package resource namespace

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
  //  source = "github.com/byu-oit/terraform-aws-schema-migrations-lambda?ref=v1.0.0"
  source          = "../.." # for local testing during module development
  app_name        = "${local.name}-${var.env}"
  migration_files = "migrations/*.mig.js"
  database = {
    identifier        = module.db.instance.id
    ssm_username      = module.db.master_username_parameter.name
    ssm_password      = module.db.master_password_parameter.name
    name              = module.db.instance.name
    security_group_id = module.db.security_group.id
  }
  role_permissions_boundary_arn = module.acs.role_permissions_boundary.arn
  vpc_config = {
    id                 = module.acs.vpc.id
    subnet_ids         = module.acs.private_subnet_ids
    security_group_ids = []
  }
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
