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

# ---------------------------------------------------------------------------
# Banco de dados PostgreSQL gerenciado (RDS).
#
# Configuração de laboratório/teste — menor custo possível:
# - db.t4g.micro (classe mais barata, elegível ao free tier)
# - Single-AZ, sem réplicas, storage mínimo (20 GB gp3, sem autoscaling)
# - Criptografia com a chave gerenciada aws/rds — sem KMS dedicada (mesma
#   decisão do EKS: evita a janela de exclusão de 30 dias a cada apply/destroy)
# - deletion_protection=false + skip_final_snapshot=true: permitem um
#   `terraform destroy` limpo ao fim de cada sessão de estudo
# - Sem backups nem Enhanced Monitoring (enxuga custo de storage/IAM)
# - Senha do master gerada/rotacionada pelo Secrets Manager (nunca vai ao state)
#
# Rede privada: só o security group do cluster EKS pode conectar na porta.
# ---------------------------------------------------------------------------
module "rds" {
  source = "github.com/vitorfprado/terraform-aws-modules//rds?ref=main"

  name           = "${var.cluster_name}-db"
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 0 # sem autoscaling de storage

  db_name  = var.db_name
  username = var.db_username
  # manage_master_user_password = true (padrão): senha no Secrets Manager.

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids

  # Acesso restrito às subnets privadas (onde rodam os nodes do EKS; os pods
  # saem com IPs dessas subnets via VPC CNI). Banco sem IP público.
  #
  # Por que CIDR e não o security group do cluster: o ID do cluster SG só é
  # conhecido após a criação do EKS, e o módulo usa for_each sobre o conjunto
  # de SGs — o que falha no plan ("Invalid for_each argument"). Os CIDRs das
  # subnets são estáticos, então resolvem no plan sem two-phase apply.
  publicly_accessible = false
  allowed_cidr_blocks = var.private_subnet_cidrs

  # Criptografia com a chave gerenciada aws/rds (sem custo de KMS dedicada).
  storage_encrypted = true
  create_kms_key    = false

  # Flags de laboratório: destroy limpo, sem proteção nem snapshot final.
  deletion_protection = false
  skip_final_snapshot = true

  # Enxuga custo: sem backups e sem role de Enhanced Monitoring.
  backup_retention_period = 0
  create_monitoring_role  = false

  tags = local.tags
}

# ---------------------------------------------------------------------------
# IRSA: permissão para os pods lerem a senha do master do RDS no Secrets Manager.
#
# A senha é gerada/rotacionada pela AWS (manage_master_user_password) e nunca vai
# ao state — então o pod precisa buscá-la em runtime. Esta role é assumida via
# OIDC pelos service accounts informados em var.db_service_accounts (namespace
# var.app_namespace) e só permite ler ESTE secret específico.
#
# Decrypt não precisa de kms:Decrypt explícito: o secret usa a chave gerenciada
# aws/secretsmanager, cuja policy já libera a conta através do serviço.
#
# Anexe a role ao service account com a annotation:
#   eks.amazonaws.com/role-arn: <output db_secret_reader_role_arn>
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "rds_secret_read" {
  statement {
    sid    = "ReadRdsMasterSecret"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
    ]
    resources = [module.rds.master_user_secret_arn]
  }
}

module "irsa_db_secret" {
  source = "github.com/vitorfprado/terraform-aws-modules//iam-irsa?ref=main"

  name              = "${var.cluster_name}-db-secret-reader"
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url

  namespace        = var.app_namespace
  service_accounts = var.db_service_accounts

  inline_policies = {
    rds-secret-read = data.aws_iam_policy_document.rds_secret_read.json
  }

  tags = local.tags
}
