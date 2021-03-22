output "lambda_function" {
  value     = aws_lambda_function.migrations_lambda
  sensitive = true
}

output "lambda_iam_role" {
  value = aws_iam_role.migrations_lambda
}

output "schema_migrations_bucket" {
  value = aws_s3_bucket.schema_migration_bucket
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.lambda_logs
}
