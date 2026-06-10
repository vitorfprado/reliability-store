provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "reliability-store"
      ManagedBy = "terraform"
      Stack     = "platform-iac"
    }
  }
}
