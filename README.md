# Terraform AWS Schema Migrations

![Latest GitHub Release](https://img.shields.io/github/v/release/byu-oit/terraform-aws-schema-migrations-lambda?sort=semver)

Terraform module that creates a generic lambda function that will run
database schema migrations using
[Umzug](https://github.com/sequelize/umzug)

## Usage
```hcl
module "schema_migrations_lambda" {
  source = "github.com/byu-oit/terraform-aws-schema-migrations-lambda?ref=v1.0.0"
}
```

## Requirements
* Terraform version 0.12.16 or greater

## Inputs

| Name | Type | Description | Default |
|:-----|:-----|:------------|:--------|
|      |      |             |         |

## Outputs
| Name | Type | Description |
|:-----|:-----|:------------|
|      |      |             |
