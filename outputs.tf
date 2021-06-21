output "account_id" {
  value       = data.aws_caller_identity.current.account_id
  description = "account ID of current AWS account"
}

output "lambda_function" {
  value       = aws_lambda_function.migrations_lambda
  sensitive   = true
  description = "lambda function name"
}

output "lambda_iam_role" {
  value       = aws_iam_role.migrations_lambda
  description = "lambda function role"
}

output "schema_migrations_bucket" {
  value       = aws_s3_bucket.schema_migration_bucket
  description = "lambda function migrations bucket name"
}

output "cloudwatch_log_group" {
  value       = aws_cloudwatch_log_group.lambda_logs
  description = "lambda function cloudwatch logs path"
}
