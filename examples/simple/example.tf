provider "aws" {
  version = "~>3.0.0"
  region  = "us-west-2"
}

module "schema_migrations_lambda" {
  //  source = "github.com/byu-oit/terraform-aws-schema-migrations-lambda>?ref=v1.0.0"
  source = "../" # for local testing during module development
}
