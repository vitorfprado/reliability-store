# Infraestrutura mínima para o reliability-store rodar em EKS.
#
# Consome os módulos do repositório github.com/vitorfprado/terraform-aws-modules
# (branch main), conforme o padrão documentado nos READMEs dos próprios módulos.
# Configuração de laboratório: 2 AZs, NAT único, 1 node group SPOT com 1 node.

locals {
  tags = {
    Environment = var.environment
  }
}

module "vpc" {
  source = "github.com/vitorfprado/terraform-aws-modules//vpc?ref=main"

  name       = "${var.cluster_name}-vpc"
  cidr_block = var.vpc_cidr

  # EKS exige subnets em pelo menos 2 AZs.
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  # NAT único: opção econômica do módulo (1 NAT para todas as AZs).
  enable_nat_gateway = true
  single_nat_gateway = true

  # Tags de descoberta para futuros load balancers do Kubernetes.
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }

  tags = local.tags
}

module "eks" {
  source = "github.com/vitorfprado/terraform-aws-modules//eks?ref=main"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids

  # Endpoint público liberado para administrar o cluster de fora da VPC
  # (laboratório sem VPN/bastion). Restrinja public_access_cidrs se possível.
  endpoint_private_access = true
  endpoint_public_access  = true
  public_access_cidrs     = var.public_access_cidrs

  # IRSA habilitado: exigido pelo add-on EBS CSI e pelos controllers futuros.
  enable_irsa = true

  # Sem KMS própria nesta fase (custo + janela de exclusão de 30 dias).
  create_kms_key = false

  # Logs do control plane reduzidos ao mínimo para baixar custo de CloudWatch.
  cluster_enabled_log_types        = var.cluster_enabled_log_types
  cloudwatch_log_retention_in_days = 7

  node_groups = {
    default = {
      # Múltiplos tipos aumentam a chance de capacidade SPOT disponível.
      instance_types = var.node_instance_types
      capacity_type  = "SPOT"
      disk_size      = 20
      desired_size   = 1
      min_size       = 1
      max_size       = 2
      labels = {
        role = "general"
      }
    }
  }

  # Apenas os add-ons essenciais; o EBS CSI driver (com IRSA) é instalado
  # pelo flag padrão enable_ebs_csi_driver = true do módulo.
  cluster_addons = {
    coredns    = {}
    kube-proxy = {}
    vpc-cni    = {}
  }

  # Acesso administrativo extra além do criador do cluster
  # (bootstrap_cluster_creator_admin_permissions = true por padrão no módulo).
  access_entries = var.admin_principal_arn == null ? {} : {
    admin = {
      principal_arn = var.admin_principal_arn
      policy_associations = {
        cluster_admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          scope_type = "cluster"
        }
      }
    }
  }

  tags = local.tags
}
