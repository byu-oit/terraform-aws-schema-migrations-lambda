# Terraform AWS Schema Migrations

![Latest GitHub Release](https://img.shields.io/github/v/release/byu-oit/terraform-aws-schema-migrations-lambda?sort=semver)

Terraform module that creates a generic lambda function that will run
database schema migrations using
[Umzug](https://github.com/sequelize/umzug) for PostgreSQL and MySQL
databases.

> You will need to manually apply any schema migrations that take longer
> than 15 minutes (see
> [AWS Lambda enables functions that can run up to 15 minutes](https://aws.amazon.com/about-aws/whats-new/2018/10/aws-lambda-supports-functions-that-can-run-up-to-15-minutes/))

## Requirements

* Terraform >= 0.13
* AWS Provider >= 3.0.0
* Postgres or MySQL database

## Usage

```hcl
module "schema_migrations_lambda" {
  source = "github.com/byu-oit/terraform-aws-schema-migrations-lambda>?ref=v1.0.0"
  app_name = "${local.name}-${var.env}"
  migration_files = "migrations/*.mig.js"
  database = {
    identifier = module.db.instance.id
    username = module.db.master_username_parameter.value
    password = module.db.master_password_parameter.value
    name = module.db.instance.name
  }
}
```

You will need to specify which files you'd like to consider for the
migration. One way to accomplish this is to place all migrations in a
single directory with a common suffix to separate migration files from
other notes or scripts you might store with your migration files. For
example:

##### Directory structure

```
/
├── iac
    └── main.tf
└── migrations
    ├── README.md
    ├── some-script.js
    ├── 1.0.0__init.mig.js
    └── 1.1.0__add_classes_table.mig.js
```

##### Schema Migrations Lambda Terraform Declaration

```
migration_files = "../migrations/*.mig.js"
```

The resulting set of files that the migration lambda would run would be:
- 20210312-initialize.mig.js
- 20210412-add-classes-table.mig.js

For more information on the pattern/glob matching syntax, please see the
[Terraform `fileset` function docs](https://www.terraform.io/docs/language/functions/fileset.html).

### Migrations Files

Migrations can be written in Javascript or Typescript, however
Typescript migrations should be transpiled before they are uploaded to
the s3 bucket and run. See
[Umzug's examples](https://github.com/sequelize/umzug/blob/master/examples/1.sequelize-typescript/migrations/2020.11.24T16.52.04.users-table.ts)
for more on typescript migrations.

A migration file must export an `up` and `down` method.

#### Javascript Example

```js
// 1.0.0__init.mig.js
module.exports.up = async ({client}) => {
    await client.query('create table if not exists users(id int, name text);')
}

module.exports.down = async ({client}) => {
    await client.query('drop table users;')
}
```

#### Typescript Example

```ts
// 1.0.0__init.mig.ts
import { Migration } from '../umzug' // For correct function typings
export const up: Migration = async ({client}) => {
    await client.query('create table if not exists users(id int, name text);')
}

export const down: Migration = async ({client}) => {
    await client.query('drop table users;')
}
```

## Inputs

| Name                          | Type                           | Description                                                                                                                             | Default      |
|:------------------------------|:-------------------------------|:----------------------------------------------------------------------------------------------------------------------------------------|:-------------|
| app_name                      | string                         | Application name to give the schema migrations lambda function (e.g. `hello-world-dev`)                                                 | **REQUIRED** |
| migration_files               | string                         | Path and pattern to enumerate the schema migration files (e.g. `./migrations/dir/*.sql`)                                                | **REQUIRED** |
| migrations_bucket_name        | string                         | The name of the S3 Bucket name where this module will upload the schema migrations directory (defaults to <app_name>-schema-migrations) | null         |
| database                      | [object](#database-definition) | The RDS database connection information                                                                                                 | **REQUIRED** |
| role_permissions_boundary_arn | string                         | ARN of the IAM Role permissions boundary to place on each IAM role created                                                              |              |
| log_retention_in_days         | number                         | CloudWatch log group retention in days                                                                                                  | 7            |
| tags                          | map(string)                    | A map of AWS Tags to attach to each resource created                                                                                    | {}           |
| timeout                       | number                         | The max number of seconds the lambda will run for without stopping.                                                                     | 900          |
| memory_size                   | number                         | The size of the memory of the lambda                                                                                                    | 128          |

#### Database Definition

| Name       | Type   | Description                                                                                                                                                                                               | Default                                                                                                                                |
|:-----------|:-------|:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------------------------------------------------------------------------------------------------------------------------------------|
| identifier | string | The [rds instance identifier](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/db_instance#db_instance_identifier)                                                          | **REQUIRED**                                                                                                                           |
| username   | string | The SSM parameter path for the username of a DDL user [AWS SSM parameter name](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter#name) (e.g. /my/ssm/username) | **REQUIRED**                                                                                                                           |
| password   | string | The SSM parameter path for the password of a DDL user [AWS SSM parameter name](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter#name) (e.g. /my/ssm/password) | **REQUIRED**                                                                                                                           |
| name       | string | The name of the database or schema where the tables reside                                                                                                                                                | [aws_db_instance.db_instance.db_name](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/db_instance#db_name) |

## Outputs

| Name                     | Type                                                                                                   | Description                                                       |
|:-------------------------|:-------------------------------------------------------------------------------------------------------|:------------------------------------------------------------------|
| lambda_function          | [object](https://www.terraform.io/docs/providers/aws/r/lambda_function.html#attributes-reference)      | Created lambda function that runs the schema migrations           |
| lambda_iam_role          | [object](https://www.terraform.io/docs/providers/aws/r/iam_role.html#attributes-reference)             | Created IAM role for the `lambda_function`                        |
| schema_migrations_bucket | [object](https://www.terraform.io/docs/providers/aws/r/s3_bucket.html#attributes-reference)            | Created S3 Bucket where schema migration files are uploaded       |
| cloudwatch_log_group     | [object](https://www.terraform.io/docs/providers/aws/r/cloudwatch_log_group.html#attributes-reference) | Created CloudWatch Log Group for the schema migration lambda logs |

## Publishing

Create and push a new tag representing the major (v1), minor (v1.0), and
patch (v1.0.0) versions. If the tag already exists, you may force push a
tag (see example below).

You can use the scripts `release` and `tag` to accomplish these tasks:
```bash
# Create an edge and latest branch (this will fire the CI to create new ECR tags)
npm run release edge latest

# Create new git tags (this will fire the CI to create new ECR tags)
npm run tag v1 v1.0 v1.0.0
```

Example:

```bash
# New version
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Update minor version tag
git tag -fa v1.0 -m "Update v1.0 tag"
git push --force origin v1.0

# Update major version tag
git tag -fa v1 -m "Update v1 tag"
git push --force origin v1

# Git Tagging Docs: https://git-scm.com/book/en/v2/Git-Basics-Tagging
```

