output "eks_cluster_name" {
  value       = module.eks.cluster_name
  description = "EKS cluster name"
}

output "eks_cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "EKS cluster endpoint"
}

output "rds_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "RDS connection endpoint"
}

output "jenkins_public_ip" {
  value       = aws_instance.jenkins.public_ip
  description = "Jenkins server public IP"
}

output "ecr_repository_urls" {
  value = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
  description = "ECR repository registry URLs"
}
