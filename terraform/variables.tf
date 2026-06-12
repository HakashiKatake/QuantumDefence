variable "aws_region" {
  type        = string
  description = "Target AWS Region for C2 deployment"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Project name tag"
  default     = "quantum-defense"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block"
  default     = "10.0.0.0/16"
}

variable "db_username" {
  type        = string
  description = "RDS Postgres master username"
  default     = "postgres"
  sensitive   = true
}

variable "db_password" {
  type        = string
  description = "RDS Postgres master password"
  default     = "TacticalC2SecureDBPass!"
  sensitive   = true
}
