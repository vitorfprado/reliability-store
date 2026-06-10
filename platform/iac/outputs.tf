output "region" {
  description = "Região AWS utilizada."
  value       = var.region
}

output "vpc_id" {
  description = "ID da VPC criada."
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "Subnets privadas (onde rodam os nodes)."
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Subnets públicas (futuros load balancers)."
  value       = module.vpc.public_subnet_ids
}

output "nat_public_ips" {
  description = "IPs públicos de saída (NAT Gateway)."
  value       = module.vpc.nat_public_ips
}

output "cluster_name" {
  description = "Nome do cluster EKS."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint da API do Kubernetes."
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group gerenciado pelo EKS."
  value       = module.eks.cluster_security_group_id
}

output "oidc_provider_arn" {
  description = "ARN do OIDC provider (IRSA) — usado por roles de controllers futuros."
  value       = module.eks.oidc_provider_arn
}

output "node_iam_role_arn" {
  description = "ARN da IAM role dos nodes."
  value       = module.eks.node_iam_role_arn
}

output "configure_kubectl" {
  description = "Comando para configurar o kubeconfig local."
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}

# --- Banco de dados (RDS PostgreSQL) ---

output "db_endpoint" {
  description = "Endpoint de conexão do RDS (host:porta)."
  value       = module.rds.db_instance_endpoint
}

output "db_address" {
  description = "Hostname (DNS) do RDS, sem a porta."
  value       = module.rds.db_instance_address
}

output "db_port" {
  description = "Porta de conexão do banco."
  value       = module.rds.db_instance_port
}

output "db_name" {
  description = "Nome do banco de dados inicial."
  value       = module.rds.db_instance_name
}

output "db_username" {
  description = "Usuário master do banco."
  value       = module.rds.db_instance_username
}

output "db_master_secret_arn" {
  description = "ARN do secret (Secrets Manager) com a senha do usuário master do RDS."
  value       = module.rds.master_user_secret_arn
}

output "db_secret_reader_role_arn" {
  description = "ARN da role IRSA que lê o secret do master do RDS. Use na annotation do service account: eks.amazonaws.com/role-arn."
  value       = module.irsa_db_secret.role_arn
}
