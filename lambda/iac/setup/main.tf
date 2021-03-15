terraform {
  required_version = ">=0.13.0"
}

provider "aws" {
  region = "us-west-2"
}

module "ecr" {
  source           = "github.com/byu-oit/terraform-aws-ecr?ref=v2.0.1"
  name             = "schema-migrations-lambda"
  lifecycle_policy = <<L_POLICY
{
  "rules": [
    {
      "rulePriority": 10,
      "description": "Expire untagged images",
      "selection": {
        "tagStatus": "untagged",
        "countType": "imageCountMoreThan",
        "countNumber": 0
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
L_POLICY
}

output "ecr" {
  value = module.ecr.repository.repository_url
}