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

variable "db_identifier" {
  type        = string
  description = "Database identifier - name of the database"
  default     = null
}

variable "db_ssm_username" {
  type        = string
  description = "The ssm path for the username of a DDL user"
  default     = null
}

variable "db_ssm_password" {
  type        = string
  description = "The ssm path for the password of a DDL user"
  default     = null
}

variable "db_ssm_username_arn" {
  type        = string
  description = "The ssm arn for the username of a DDL user"
  default     = null
}

variable "db_ssm_password_arn" {
  type        = string
  description = "The ssm arn for the password of a DDL user"
  default     = null
}

variable "db_name" {
  type        = string
  description = "The name of the database or schema where the tables reside"
  default     = null
}

variable "db_engine" {
  type        = string
  description = "The engine of the database - mysql or postgres, if set, otherwise we pick it up automatically, but this can break for aurora-postgresql for example hence we make this a potential input"
  default     = null
}

variable "db_security_group_id" {
  type        = string
  description = "The security group id where the schema migration lambda access rule should be added"
  default     = null
}

variable "db_ssl_mode" {
  type        = bool
  description = "Whether to expect SSL or not for the database connection"
  default     = false
}

variable "vpc_id" {
  type        = string
  description = "VPC ID from which to run the Lambda Function"
  default     = null
}

variable "vpc_security_group_ids" {
  type        = list(any)
  description = "SG to put the lambda function in."
}

variable "vpc_subnet_ids" {
  type        = list(any)
  description = "Subnet to put the lambda function in."
}

variable "role_permissions_boundary_arn" {
  type        = string
  description = "ARN of the IAM Role permissions boundary to place on each IAM role created"
  default     = null
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

variable "ecr_repo" {
  type        = string
  default     = "schema-migrations-lambda"
  description = "Default ecr repo name for the lambda image build"
}

variable "ecr_image_tag" {
  type        = string
  default     = "latest"
  description = "Edge tag is for testing, use latest or another version tag for default uses.s"
}

variable "tags" {
  type        = map(string)
  description = "A map of AWS Tags to attach to each resource created"
  default     = {}
}
