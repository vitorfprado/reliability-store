# State remoto no S3 com lock nativo (Terraform >= 1.10, sem DynamoDB).
#
# O bucket é bootstrap único fora do Terraform (veja README.md) — já criado
# na conta 762103020993 com versionamento, criptografia e acesso bloqueado.
terraform {
  backend "s3" {
    bucket       = "reliability-store-tfstate-762103020993"
    key          = "platform/iac/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
