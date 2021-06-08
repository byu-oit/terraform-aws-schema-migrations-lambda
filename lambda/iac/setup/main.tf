terraform {
  required_version = ">= 0.14"
  required_providers {
    aws = {
      version = "~> 3"
    }
  }
}

provider "aws" {
  region = "us-west-2"
}

locals {
  name = "schema-migrations-lambda"
  tags = {
    data-sensitivity = "public"
    repo             = "https://github.com/byu-oit/terraform-aws-schema-migrations-lambda"
  }
}

resource "aws_ecr_repository" "repo" {
  name = local.name
  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.tags
}

resource "aws_ecr_repository_policy" "repo_policy" {
  policy     = <<R_POLICY
{
  "Version": "2008-10-17",
  "Statement": [
	{
	  "Sid": "pull",
	  "Effect": "Allow",
	  "Principal": "*",
	  "Action": [
		"ecr:GetDownloadUrlForLayer",
		"ecr:BatchGetImage",
		"ecr:BatchCheckLayerAvailability"
	  ]
	}
  ]
}
R_POLICY
  repository = aws_ecr_repository.repo.name
}
