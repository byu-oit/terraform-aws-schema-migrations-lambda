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
  db_identifier = module.db.instance.id
  db_ssm_username = module.db.master_username_parameter.value
  db_ssm_password = module.db.master_password_parameter.value
  db_name = module.db.instance.name
  db_security_group_id = module.db.security_group.id
  vpc_id = module.acs.vpc.id
  vpc_subnet_ids = module.acs.private_subnet_ids
  vpc_security_group_ids = []
}
```

<!-- BEGINNING OF PRE-COMMIT-TERRAFORM DOCS HOOK -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 0.14 |
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 3 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_aws"></a> [aws](#provider\_aws) | 3.45.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [aws_cloudwatch_log_group.lambda_logs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group) | resource |
| [aws_iam_policy.s3_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_role.migrations_lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role_policy.migrations_lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy) | resource |
| [aws_iam_role_policy_attachment.s3_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_role_policy_attachment.vpc_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_lambda_function.migrations_lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function) | resource |
| [aws_s3_bucket.migration_bucket_logs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket) | resource |
| [aws_s3_bucket.schema_migration_bucket](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket) | resource |
| [aws_s3_bucket_object.migrations](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object) | resource |
| [aws_s3_bucket_public_access_block.logs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block) | resource |
| [aws_s3_bucket_public_access_block.migrations](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block) | resource |
| [aws_security_group.migrations_lambda_sg](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group) | resource |
| [aws_security_group_rule.migrations_lambda_sg_rule](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule) | resource |
| [aws_caller_identity.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity) | data source |
| [aws_db_instance.db_instance](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/db_instance) | data source |
| [aws_ecr_image.migrations_lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ecr_image) | data source |
| [aws_ecr_repository.migrations_lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ecr_repository) | data source |
| [aws_region.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_app_name"></a> [app\_name](#input\_app\_name) | Application name to give your schema migrations lambda function (e.g. hello-world-dev) | `string` | n/a | yes |
| <a name="input_db_engine"></a> [db\_engine](#input\_db\_engine) | The engine of the database - mysql or postgres, if set, otherwise we pick it up automatically, but this can break for aurora-postgresql for example hence we make this a potential input | `string` | `null` | no |
| <a name="input_db_identifier"></a> [db\_identifier](#input\_db\_identifier) | Database identifier - name of the database | `string` | `null` | no |
| <a name="input_db_name"></a> [db\_name](#input\_db\_name) | The name of the database or schema where the tables reside | `string` | `null` | no |
| <a name="input_db_security_group_id"></a> [db\_security\_group\_id](#input\_db\_security\_group\_id) | The security group id where the schema migration lambda access rule should be added | `string` | `null` | no |
| <a name="input_db_ssl_mode"></a> [db\_ssl\_mode](#input\_db\_ssl\_mode) | Whether to expect SSL or not for the database connection | `bool` | `false` | no |
| <a name="input_db_ssm_password"></a> [db\_ssm\_password](#input\_db\_ssm\_password) | The ssm path for the password of a DDL user | `string` | `null` | no |
| <a name="input_db_ssm_password_arn"></a> [db\_ssm\_password\_arn](#input\_db\_ssm\_password\_arn) | The ssm arn for the password of a DDL user | `string` | `null` | no |
| <a name="input_db_ssm_username"></a> [db\_ssm\_username](#input\_db\_ssm\_username) | The ssm path for the username of a DDL user | `string` | `null` | no |
| <a name="input_db_ssm_username_arn"></a> [db\_ssm\_username\_arn](#input\_db\_ssm\_username\_arn) | The ssm arn for the username of a DDL user | `string` | `null` | no |
| <a name="input_ecr_image_tag"></a> [ecr\_image\_tag](#input\_ecr\_image\_tag) | Edge tag is for testing, use latest or another version tag for default uses.s | `string` | `"latest"` | no |
| <a name="input_ecr_repo"></a> [ecr\_repo](#input\_ecr\_repo) | Default ecr repo name for the lambda image build | `string` | `"schema-migrations-lambda"` | no |
| <a name="input_log_retention_in_days"></a> [log\_retention\_in\_days](#input\_log\_retention\_in\_days) | CloudWatch log group retention in days. Defaults to 7 | `number` | `7` | no |
| <a name="input_memory_size"></a> [memory\_size](#input\_memory\_size) | The size of the memory of the lambda | `number` | `128` | no |
| <a name="input_migration_files"></a> [migration\_files](#input\_migration\_files) | Path and pattern to enumerate the schema migration files (e.g. ./migrations/dir/*.sql) | `string` | n/a | yes |
| <a name="input_migrations_bucket_name"></a> [migrations\_bucket\_name](#input\_migrations\_bucket\_name) | The name of the S3 Bucket name where this module will upload the schema migrations directory (defaults to <app\_name>-schema-migrations) | `string` | `null` | no |
| <a name="input_role_permissions_boundary_arn"></a> [role\_permissions\_boundary\_arn](#input\_role\_permissions\_boundary\_arn) | ARN of the IAM Role permissions boundary to place on each IAM role created | `string` | `null` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of AWS Tags to attach to each resource created | `map(string)` | `{}` | no |
| <a name="input_vpc_id"></a> [vpc\_id](#input\_vpc\_id) | VPC ID from which to run the Lambda Function | `string` | `null` | no |
| <a name="input_vpc_security_group_ids"></a> [vpc\_security\_group\_ids](#input\_vpc\_security\_group\_ids) | SG to put the lambda function in. | `list(any)` | n/a | yes |
| <a name="input_vpc_subnet_ids"></a> [vpc\_subnet\_ids](#input\_vpc\_subnet\_ids) | Subnet to put the lambda function in. | `list(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_cloudwatch_log_group"></a> [cloudwatch\_log\_group](#output\_cloudwatch\_log\_group) | lambda function cloudwatch logs path |
| <a name="output_lambda_function"></a> [lambda\_function](#output\_lambda\_function) | lambda function name |
| <a name="output_lambda_iam_role"></a> [lambda\_iam\_role](#output\_lambda\_iam\_role) | lambda function role |
| <a name="output_schema_migrations_bucket"></a> [schema\_migrations\_bucket](#output\_schema\_migrations\_bucket) | lambda function migrations bucket name |
<!-- END OF PRE-COMMIT-TERRAFORM DOCS HOOK -->

## Migration Files

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
