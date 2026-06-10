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
