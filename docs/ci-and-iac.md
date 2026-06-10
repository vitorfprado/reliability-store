# CI e Infraestrutura como Código

Esta página documenta as esteiras de CI dos microserviços e a esteira de
Terraform. **Não há CD nesta fase** — as imagens são publicadas no ECR e a
infraestrutura EKS é criada/destruída sob demanda; o deploy da aplicação no
cluster será a próxima etapa.

## Visão geral dos workflows

| Workflow | Arquivo | Disparo |
|---|---|---|
| CI - frontend | `.github/workflows/ci-frontend.yml` | push em `main` (paths), tag `v*.*.*`, PR, manual |
| CI - product-service | `.github/workflows/ci-product-service.yml` | idem |
| CI - order-service | `.github/workflows/ci-order-service.yml` | idem |
| CI - inventory-service | `.github/workflows/ci-inventory-service.yml` | idem |
| (reusável) Docker CI | `.github/workflows/_docker-ci.yml` | chamado pelos quatro acima |
| Terraform - infraestrutura EKS | `.github/workflows/terraform.yml` | manual (`plan`/`apply`/`destroy`); PR em `platform/iac/**` roda só plan |

### O que cada esteira de CI faz

1. **Qualidade** *(não bloqueante nesta fase — `continue-on-error: true`)*
   - Python (FastAPI): `ruff check` (lint), `pytest tests` (smoke tests em `microservices/*/tests/`)
   - Node (React/Vite): `npm run typecheck` (`tsc --noEmit`)
2. **Segurança** *(não bloqueante nesta fase)*
   - Dependências: `pip-audit` (Python) / `npm audit --audit-level=high` (Node)
   - Imagem: **Trivy** (severidade HIGH/CRITICAL, somente vulnerabilidades com fix)
3. **Build** com BuildKit/buildx e cache do GitHub Actions (`type=gha`, escopo por serviço)
4. **Push para o Amazon ECR** (exceto em pull request, que só builda e escaneia)

> Quando os testes forem amadurecer, basta remover `continue-on-error: true`
> das etapas em `_docker-ci.yml` para torná-las bloqueantes.

### Versionamento das imagens

A versão vem de **tags Git no formato `vX.Y.Z`**:

| Evento | Tags publicadas no ECR |
|---|---|
| Push da tag `v1.4.0` | `1.4.0`, `sha-<short>`, `latest` |
| Push em `main` sem tag nova | `<última tag>-dev.<run_number>` (ex.: `1.4.0-dev.37`), `sha-<short>` |
| Sem nenhuma tag no repo | `0.0.0-dev.<run_number>`, `sha-<short>` |

`latest` é publicada **apenas** em releases (tag `v*`), como tag complementar —
deploys futuros devem referenciar a versão semântica ou o SHA.

Para lançar uma release de todas as imagens:

```bash
git tag v0.1.0
git push origin v0.1.0   # dispara as 4 esteiras (filtro de paths não se aplica a tags)
```

### Repositórios ECR

As esteiras publicam em `<account>.dkr.ecr.<region>.amazonaws.com/<prefixo>/<serviço>`.
Na conta `762103020993` (us-east-1) os 4 repositórios **já existem** com o prefixo
padrão dos workflows (`reliability-store`) — nenhuma variable extra é necessária:

- `reliability-store/frontend`
- `reliability-store/product-service`
- `reliability-store/order-service`
- `reliability-store/inventory-service`

Configuração dos repositórios: tags **imutáveis com exceção de `latest`**
(`IMMUTABLE_WITH_EXCLUSION`), criptografia AES256, scan on push desligado.
A imutabilidade combina com a estratégia de versionamento: cada versão
semântica/`sha-*`/`-dev.N` é publicada uma única vez e só `latest` é móvel.

## Secrets e variables no GitHub

`Settings → Secrets and variables → Actions` no repositório `reliability-store`.

### Opção A — OIDC (recomendada, sem chaves de longa duração)

| Tipo | Nome | Valor |
|---|---|---|
| Variable | `AWS_ROLE_ARN` | `arn:aws:iam::762103020993:role/github-actions-reliability-store` |
| Variable | `AWS_REGION` | `us-east-1` (opcional, é o default) |

O identity provider `token.actions.githubusercontent.com` e a role acima **já
foram criados** na conta `762103020993`. A trust policy limita `sub` a
`repo:vitorfprado/reliability-store:*` (qualquer branch/tag deste repo) e a role
tem `AdministratorAccess` (necessário para o Terraform criar VPC/EKS/IAM;
restrinja depois se desejar). Cópia da trust policy:
[platform/iac/github-oidc-trust-policy.json](../platform/iac/github-oidc-trust-policy.json).

### Opção B — Access keys (fallback)

Usada automaticamente quando a variable `AWS_ROLE_ARN` não está definida.

| Tipo | Nome |
|---|---|
| Secret | `AWS_ACCESS_KEY_ID` |
| Secret | `AWS_SECRET_ACCESS_KEY` |

### Opcionais

| Tipo | Nome | Default | Uso |
|---|---|---|---|
| Variable | `ECR_REPOSITORY_PREFIX` | `reliability-store` | prefixo dos repositórios ECR |
| Variable | `TF_MODULES_REF` | `main` | branch/tag do repo `terraform-aws-modules` usada no CI |

## Permissões AWS necessárias

**Esteiras de CI (push de imagem):**
- `ecr:GetAuthorizationToken` (em `*`)
- `ecr:BatchCheckLayerAvailability`, `ecr:CompleteLayerUpload`, `ecr:InitiateLayerUpload`,
  `ecr:PutImage`, `ecr:UploadLayerPart`, `ecr:BatchGetImage`, `ecr:GetDownloadUrlForLayer`
  (nos repositórios `reliability-store/*`)

**Esteira de Terraform (apply/destroy):** criação/destruição de VPC/EC2 (subnets,
NAT, EIP, security groups), EKS (cluster, node groups, add-ons, access entries),
IAM (roles, policies, OIDC provider), KMS (não usado por padrão), CloudWatch Logs,
além de leitura/escrita no bucket S3 do state. Para laboratório, uma policy ampla
(`AdministratorAccess` ou um conjunto de `*FullAccess`) é o caminho simples;
restrinja depois se necessário.

## Esteira de Terraform

Detalhes de uso, bootstrap do bucket de state e custos: [platform/iac/README.md](../platform/iac/README.md).

Resumo:
- `Actions → Terraform - infraestrutura EKS → Run workflow`
- `action = plan | apply | destroy`
- `destroy` exige digitar `destroy` no campo de confirmação; nada é destruído por push
- O workflow clona `vitorfprado/terraform-aws-modules` ao lado do repo da aplicação
  para resolver os `source` relativos dos módulos

## Pendências conhecidas

1. **ECR fora do IaC** — não há módulo ECR no repo `terraform-aws-modules` (há
   apenas vpc, eks, rds, dynamodb, sqs, elasticache); o recomendado é criar um
   módulo `ecr` lá e passar a gerenciar os repositórios via `platform/iac`.
2. **Variable do GitHub não configurada** — definir `AWS_ROLE_ARN` (seção acima).
3. **Role do CI com AdministratorAccess** — adequado para laboratório;
   restringir a ECR + escopo do Terraform no futuro.
4. **Qualidade/segurança não bloqueiam** — por decisão desta fase; endurecer
   removendo `continue-on-error: true` em `_docker-ci.yml`.
5. **Frontend sem lockfile** — `package-lock.json` não está commitado; o CI usa
   `npm install`. Commitar um lockfile habilita `npm ci` + cache de dependências.
6. **Sem testes de integração/E2E** — só smoke tests mínimos criados junto com o CI.
7. **Re-execução de um run não pode reaproveitar tag** — as tags são imutáveis
   (exceto `latest`); um "re-run" do mesmo workflow tenta publicar a mesma tag
   `-dev.<run_number>` e falha no push. Disparar um novo run resolve.

## Próximos passos sugeridos (fase de CD)

1. Manifests Kubernetes/Helm chart da aplicação (Deployments, Services, Ingress,
   ConfigMaps) referenciando as imagens semânticas do ECR.
2. PostgreSQL gerenciado (módulo `rds` já existe no repo de módulos) ou
   StatefulSet com EBS (o CSI driver já fica instalado).
3. GitOps com ArgoCD (o repo de módulos já tem add-on pronto em `eks/addons`).
4. AWS Load Balancer Controller + Ingress para expor o frontend/API.
5. Observabilidade no cluster (kube-prometheus-stack também já existe como add-on).
6. Tornar qualidade/segurança bloqueantes no CI e exigir environment com
   aprovação manual para `apply`/`destroy` do Terraform.
