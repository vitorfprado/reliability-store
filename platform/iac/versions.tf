terraform {
  # >= 1.10 por causa do lock nativo do backend S3 (use_lockfile),
  # que dispensa a tabela DynamoDB de lock.
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40"
    }
    # Exigido pelo módulo eks (thumbprint do OIDC provider para IRSA).
    tls = {
      source  = "hashicorp/tls"
      version = ">= 4.0"
    }
  }
}
