variable "app_name" {
  type        = string
  description = "Application name to give your schema migrations lambda function (e.g. hello-world-dev)"
}

variable "migration_files" {
  type        = string
  description = "Path and pattern to enumerate the schema migration files (e.g. ./migrations/dir/*.sql)"
}

variable "migrations_bucket_name" {
  type        = string
  description = "The name of the S3 Bucket name where this module will upload the schema migrations directory (defaults to <app_name>-schema-migrations)"
  default     = null
}

variable "database" {
  type = object({
    # The rds instance identifier
    identifier = string
    # The ssm path for the username of a DDL user
    ssm_username = string
    # The ssm path for the password of a DDL user
    ssm_password = string
    # The name of the database or schema where the tables reside
    name = string
    # The security group id where the schema migration lambda access rule should be added
    security_group_id = string
  })
  description = "The RDS database connection information"
}

variable "vpc_config" {
  description = "VPC configuration to allow your Lambda function to access your RDS instance"
  type = object({
    id                 = string
    security_group_ids = list(string)
    subnet_ids         = list(string)
  })
}

variable "role_permissions_boundary_arn" {
  type        = string
  description = "ARN of the IAM Role permissions boundary to place on each IAM role created"
}

variable "log_retention_in_days" {
  type        = number
  description = "CloudWatch log group retention in days. Defaults to 7"
  default     = 7
}

variable "memory_size" {
  type        = number
  description = "The size of the memory of the lambda"
  default     = 128
}

variable "tags" {
  type        = map(string)
  description = "A map of AWS Tags to attach to each resource created"
  default     = {}
}
