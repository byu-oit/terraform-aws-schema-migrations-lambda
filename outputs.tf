output "lambda_function" {
  value = aws_lambda_function.migrations_lambda
}

output "lambda_iam_role" {
  value = aws_iam_role.migrations_lambda
}

output "migrations_bucket" {
  value = aws_s3_bucket.schema_migration_bucket[0]
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.lambda_logs
}
