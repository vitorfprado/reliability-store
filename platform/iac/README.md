# IaC — Infraestrutura EKS (consumer)

Provisiona a base mínima para o reliability-store rodar em EKS na AWS:

- **VPC** com 2 AZs (subnets públicas + privadas), Internet Gateway e **1 NAT Gateway** (opção econômica)
- **Cluster EKS** (Kubernetes 1.32) com endpoint público habilitado para administração
- **1 node group SPOT** (`t3.medium`/`t3a.medium`, min 1 / desired 1 / max 2)
- **Add-ons essenciais**: CoreDNS, kube-proxy, VPC CNI e EBS CSI Driver (com IRSA)
- **IAM**: roles do control plane e dos nodes, OIDC provider (IRSA), access entries

Este diretório é um **consumer** dos módulos do repositório
[`vitorfprado/terraform-aws-modules`](https://github.com/vitorfprado/terraform-aws-modules)
(`vpc` e `eks`), referenciados **direto do GitHub na branch `main`** — o padrão
documentado nos READMEs dos próprios módulos:

```hcl
source = "github.com/vitorfprado/terraform-aws-modules//vpc?ref=main"
```

O `terraform init` clona o repositório de módulos automaticamente (requer `git`
instalado). Para fixar uma versão estável, troque `ref=main` por uma tag/commit
do repo de módulos.

## Pré-requisitos (bootstrap único, fora do Terraform)

### 1. Bucket S3 do state remoto

O backend usa S3 com lock nativo (`use_lockfile`, Terraform >= 1.10 — sem DynamoDB).
O bucket `reliability-store-tfstate-762103020993` (conta `762103020993`) **já foi
criado** com versionamento, criptografia SSE-S3 e bloqueio de acesso público.
Caso precise recriá-lo em outra conta:

```bash
aws s3api create-bucket \
  --bucket reliability-store-tfstate-<account-id> \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket reliability-store-tfstate-<account-id> \
  --versioning-configuration Status=Enabled

aws s3api put-public-access-block \
  --bucket reliability-store-tfstate-<account-id> \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-encryption \
  --bucket reliability-store-tfstate-<account-id> \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

> Por que fora do Terraform? O bucket guarda o próprio state — é a única
> dependência circular do bootstrap. Todo o resto é declarativo.

### 2. OIDC do GitHub Actions

A conta já possui o identity provider `token.actions.githubusercontent.com` e a
role `github-actions-reliability-store` (AdministratorAccess, escopo de trust
limitado a `repo:vitorfprado/reliability-store:*` — veja
[`github-oidc-trust-policy.json`](github-oidc-trust-policy.json)). Configure no
GitHub a variable `AWS_ROLE_ARN` com o ARN da role.

### 3. Credenciais

- **Local**: AWS CLI autenticada (`aws sts get-caller-identity` deve funcionar) — profile `VitaoAWS`.
- **CI**: veja [docs/ci-and-iac.md](../../docs/ci-and-iac.md) (OIDC role ou access keys).

## Como executar localmente

```bash
cd platform/iac

# Opcional: copie e ajuste as variáveis (os defaults já funcionam)
cp terraform.tfvars.example terraform.tfvars

terraform init
terraform plan
terraform apply

# Acesso ao cluster depois do apply:
aws eks update-kubeconfig --region us-east-1 --name reliability-store

# Destruição (remove TUDO, incluindo NAT/EIP que geram custo por hora):
terraform destroy
```

## Como executar via GitHub Actions

Workflow **Terraform - infraestrutura EKS** (`Actions → Terraform - infraestrutura EKS → Run workflow`):

| Input | Efeito |
|---|---|
| `action: plan` | fmt + validate + plan (somente leitura) |
| `action: apply` | plan + apply automático |
| `action: destroy` + `confirm_destroy: destroy` | plan -destroy + apply. Sem a confirmação digitada, o job falha antes de qualquer ação |

Pull requests que tocam `platform/iac/**` executam plan automaticamente (nunca apply/destroy).

## Custo estimado (us-east-1, ligado 24/7)

| Recurso | ~USD/mês |
|---|---|
| Control plane EKS | ~73 |
| NAT Gateway (único) | ~33 + tráfego |
| 1x t3.medium SPOT | ~9–12 |
| EBS/CloudWatch | ~1–3 |

**Para laboratório: rode `destroy` ao final de cada sessão de estudo.** O state
remoto preserva a configuração e o `apply` recria tudo em ~15 minutos.

## Decisões de baixo custo

- `single_nat_gateway = true` — 1 NAT em vez de 1 por AZ
- `capacity_type = "SPOT"` com 2 tipos de instância — até ~70% mais barato
- `create_kms_key = false` — sem criptografia de secrets por KMS nesta fase (evita custo e a janela de exclusão de 30 dias da chave a cada ciclo apply/destroy)
- `cluster_enabled_log_types = ["api"]` + retenção de 7 dias no CloudWatch
- Sem ArgoCD/Prometheus/ALB Controller etc. — serão adicionados na fase de CD
