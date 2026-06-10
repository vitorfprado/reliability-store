variable "region" {
  description = "Região AWS onde a infraestrutura será provisionada."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Nome do ambiente (usado em tags)."
  type        = string
  default     = "lab"
}

variable "cluster_name" {
  description = "Nome do cluster EKS e prefixo dos recursos."
  type        = string
  default     = "reliability-store"
}

variable "cluster_version" {
  description = "Versão do Kubernetes do control plane."
  type        = string
  default     = "1.32"
}

variable "vpc_cidr" {
  description = "Bloco CIDR da VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDRs das subnets públicas (uma por AZ, mínimo 2 para o EKS)."
  type        = list(string)
  default     = ["10.0.0.0/20", "10.0.16.0/20"]
}

variable "private_subnet_cidrs" {
  description = "CIDRs das subnets privadas (uma por AZ, mínimo 2 para o EKS)."
  type        = list(string)
  default     = ["10.0.32.0/20", "10.0.48.0/20"]
}

variable "public_access_cidrs" {
  description = "CIDRs autorizados a acessar o endpoint público da API do EKS."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "cluster_enabled_log_types" {
  description = "Tipos de log do control plane enviados ao CloudWatch (mínimo para reduzir custo)."
  type        = list(string)
  default     = ["api"]
}

variable "node_instance_types" {
  description = "Tipos de instância do node group SPOT (mais tipos = mais chance de capacidade)."
  type        = list(string)
  default     = ["t3.medium", "t3a.medium"]
}

variable "admin_principal_arn" {
  description = "ARN de um principal IAM (user/role) com acesso admin ao cluster, além do criador. Null = nenhum extra."
  type        = string
  default     = null
}

# --- Banco de dados (RDS PostgreSQL) ---

variable "db_engine_version" {
  description = "Versão do PostgreSQL no RDS (alinhada ao postgres:16 do ambiente local)."
  type        = string
  default     = "16"
}

variable "db_instance_class" {
  description = "Classe da instância RDS. db.t4g.micro é a mais barata e elegível ao free tier."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Storage alocado no RDS, em GB (mínimo 20 para gp3)."
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Nome do banco de dados inicial criado no RDS."
  type        = string
  default     = "reliability_store"
}

variable "db_username" {
  description = "Usuário master do banco."
  type        = string
  default     = "reliability"
}

variable "app_namespace" {
  description = "Namespace Kubernetes onde rodam os serviços que acessam o banco (usado pela role IRSA)."
  type        = string
  default     = "reliability-store"
}

variable "db_service_accounts" {
  description = "Service accounts autorizados a assumir a role IRSA que lê o secret do RDS. Use [\"*\"] para todos no namespace."
  type        = list(string)
  default     = ["inventory-service", "product-service", "order-service"]
}
