# Terraform AWS Schema Migrations

![Latest GitHub Release](https://img.shields.io/github/v/release/byu-oit/terraform-aws-schema-migrations-lambda?sort=semver)

Terraform module that creates a generic lambda function that will run
database schema migrations using
[Umzug](https://github.com/sequelize/umzug) for PostgreSQL and MySQL
databases. If you need other engine support, please submit an issue or
pull request (see [contributing](#contributing)).

> You will need to manually apply any schema migrations that take longer
> than 15 minutes (see
> [AWS Lambda enables functions that can run up to 15 minutes](https://aws.amazon.com/about-aws/whats-new/2018/10/aws-lambda-supports-functions-that-can-run-up-to-15-minutes/))

## Requirements

* Terraform >= 0.13
* AWS Provider >= 3.0.0
* Postgres or MySQL database

## Usage

The following example is used in conjunction with the
[byu-oit/terraform-aws-rds](https://github.com/byu-oit/terraform-aws-rds)
module and the
[byu/terraform-aws-acs-info](https://github.com/byu-oit/terraform-aws-acs-info)
module.

```hcl
module "schema_migrations_lambda" {
  source = "github.com/byu-oit/terraform-aws-schema-migrations-lambda?ref=v1.0.0"
  app_name = "${local.name}-${var.env}"
  migration_files = "migrations/*.mig.js"
  database = {
    identifier = module.db.instance.id
    ssm_username = module.db.master_username_parameter.value
    ssm_password = module.db.master_password_parameter.value
    name = module.db.instance.name
    security_group_id = module.db.security_group.id
  }
  vpc_config = {
    id = module.acs.vpc.id
    subnet_ids = module.acs.private_subnet_ids
    security_group_ids = []
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
- 1.0.0__init.mig.js
- 1.1.0__add_classes_table.mig.js

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
exports.up = async ({context: {client}}) => {
    await client.query('create table if not exists users (id int, name text);')
}

exports.down = async ({context: {client}}) => {
    await client.query('drop table users;')
}
```

#### Typescript Example

Note: You must compile your typescript migrations and reference the
output javascript files for the upload. Migration files must be
javascript.

```ts
// 1.0.0__init.mig.ts
import {Connection} from 'mysql'
import {MigrationParams} from 'umzug'
import {StorageContext} from 'byu-oit/terraform-aws-schema-migrations-lambda/lambda/dist/storage'

type Migration = (params: MigrationParams<StorageContext<Connection>>) => Promise<unknown>

export const up: Migration = async ({context: {client}}) => {
    await client.query('create table if not exists users(id int, name text);')
}

export const down: Migration = async ({context: {client}}) => {
    await client.query('drop table users;')
}
```

## Inputs

| Name                          | Type                                    | Description                                                                                                                             | Default      |
|:------------------------------|:----------------------------------------|:----------------------------------------------------------------------------------------------------------------------------------------|:-------------|
| app_name                      | string                                  | Application name to give the schema migrations lambda function (e.g. `hello-world-dev`)                                                 | **REQUIRED** |
| migration_files               | string                                  | Path and pattern to enumerate the schema migration files (e.g. `./migrations/dir/*.sql`)                                                | **REQUIRED** |
| migrations_bucket_name        | string                                  | The name of the S3 Bucket name where this module will upload the schema migrations directory (defaults to <app_name>-schema-migrations) | null         |
| database                      | [object](#database-definition)          | The RDS database connection information                                                                                                 | **REQUIRED** |
| vpc_config                    | [object](#vpc-configuration-definition) | VPC configuration to allow your Lambda function to access your RDS instance                                                             | **REQUIRED** |
| role_permissions_boundary_arn | string                                  | ARN of the IAM Role permissions boundary to place on each IAM role created                                                              | **REQUIRED** |
| log_retention_in_days         | number                                  | CloudWatch log group retention in days                                                                                                  | 7            |
| tags                          | map(string)                             | A map of AWS Tags to attach to each resource created                                                                                    | {}           |
| memory_size                   | number                                  | The size of the memory of the lambda                                                                                                    | 128          |

#### Database Definition

Specify the database connection information for the schema migration
lambda to connect to the desired RDS instance. The authentication
credentials should belong to a user that has the necessary permissions
to perform the schema migrations specified in your migrations directory.

| Name              | Type   | Description                                                                                                                                                                                               | Default                                                                                                                                   |
|:------------------|:-------|:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:------------------------------------------------------------------------------------------------------------------------------------------|
| identifier        | string | The [rds instance identifier](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/db_instance#db_instance_identifier)                                                          | **REQUIRED**                                                                                                                              |
| ssm_username      | string | The SSM parameter path for the username of a DDL user [AWS SSM parameter name](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter#name) (e.g. /my/ssm/username) | **REQUIRED**                                                                                                                              |
| ssm_password      | string | The SSM parameter path for the password of a DDL user [AWS SSM parameter name](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter#name) (e.g. /my/ssm/password) | **REQUIRED**                                                                                                                              |
| name              | string | The name of the database or schema where the tables reside                                                                                                                                                | [aws_db_instance.db_instance.db_name](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/db_instance#db_name) |
| security_group_id | string | The security group id where the schema migration lambda access rule should be added                                                                                                                       | **REQUIRED**                                                                                                                              |

#### VPC Configuration Definition

The schema migrations lambda must run inside the same VPC as the RDS
instance to which it will apply the schema migrations.

| Name               | Type         | Definition                                                      |
|:-------------------|:-------------|:----------------------------------------------------------------|
| id                 | string       | The ID of the VPC where this schema migration lambda should run |
| subnet_ids         | list(string) | List of subnet IDs for the Lambda service                       |
| security_group_ids | list(string) | List of extra security group IDs to attach                      |

## Outputs

| Name                     | Type                                                                                                   | Description                                                       |
|:-------------------------|:-------------------------------------------------------------------------------------------------------|:------------------------------------------------------------------|
| lambda_function          | [object](https://www.terraform.io/docs/providers/aws/r/lambda_function.html#attributes-reference)      | Created lambda function that runs the schema migrations           |
| lambda_iam_role          | [object](https://www.terraform.io/docs/providers/aws/r/iam_role.html#attributes-reference)             | Created IAM role for the `lambda_function`                        |
| schema_migrations_bucket | [object](https://www.terraform.io/docs/providers/aws/r/s3_bucket.html#attributes-reference)            | Created S3 Bucket where schema migration files are uploaded       |
| cloudwatch_log_group     | [object](https://www.terraform.io/docs/providers/aws/r/cloudwatch_log_group.html#attributes-reference) | Created CloudWatch Log Group for the schema migration lambda logs |

## Contributing

To add additional engine support, add a new client that implements a
generic connection interface. Then implement the Umzug Storage class in
the storage directory. Don't forget to add the newly created
functionality to the respective index files, so it can be accessed by
the lambda machinery.

All fixes or enhancements must pass the workflow tests. Only add tests
where it makes sense to do so.

Follow this checklist to ensure your contribution is complete and
speedily merged:

1. Add tests where it makes sense to do so. Don't test external
   functionality.
2. Properly lint the code base before submitting the PR (`terraform fmt
   --recursive`, `npm run lint -- --fix`).
3. Consider deploying a test environment using the simple example (or
   add a new example to test your specific enhancement). This will not
   only ensure that the enhancement works, but the CI workflows will not
   pass if the terraform plan is unsuccessful.
4. All CI workflows must pass before a PR can be merged.
5. Merged PRs may be grouped together into a single release, so don't
   change the package version or update the tags until after the changes
   are merged into the master branch.

### Publishing

New features will first be deployed using the `edge` branch for testing
new releases before they are published to the `latest` branch. The
version tag **should** reflect the same version found in the Lambda
`package.json` file.

Create and push a new tag representing the major (v1), minor (v1.0), and
patch (v1.0.0) versions. If the tag already exists, you may force push a
tag (see example below).

The `publish` workflow automatically deploys a new image to the
`byu-oit-terraform-prd` AWS account, tagged according to the branch or
tag name.

You can use the scripts `release` and `tag` to accomplish trigger the
automatic deployment. If the tag or branch already exists, you will be
prompted to confirm force pushes or to merge into an existing branch
respectively.

```bash
# Create an edge and latest branch (this will fire the CI to create new ECR tags)
npm run release -- edge latest

# Create new git tags (this will fire the CI to create new ECR tags)
npm run tag -- v1 v1.0 v1.0.0
```

