# =============================================================================
# main.tf
#
# This is the entry point for Terraform. It does two things:
#   1. Tells Terraform WHICH cloud provider to talk to (Azure, in our case)
#   2. Creates the Resource Group — the "folder" in Azure that holds everything
# =============================================================================

# -----------------------------------------------------------------------------
# TERRAFORM BLOCK
# Declares which providers (cloud SDKs) this config needs and their versions.
# Terraform downloads these automatically when you run `terraform init`.
# -----------------------------------------------------------------------------
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.85.0"
      # >= 3.85.0 ensures we get a version that supports all the resources we use.
    }
  }
}

# -----------------------------------------------------------------------------
# PROVIDER BLOCK
# Configures the Azure provider. Terraform uses this to authenticate with Azure
# and know which subscription to deploy resources into.
#
# Authentication is handled via the Azure CLI — when you run `az login` in your
# terminal, Terraform picks up those credentials automatically. No secrets needed
# in this file.
# -----------------------------------------------------------------------------
provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  client_id       = var.client_id
  client_secret   = var.client_secret
  tenant_id       = var.tenant_id

  # resource_provider_registrations = "none" disables automatic resource provider
  # registration. The providers we need have already been registered manually.
  resource_provider_registrations = "none"
}

# -----------------------------------------------------------------------------
# RESOURCE GROUP
# In Azure, everything lives inside a Resource Group — think of it as a folder.
# Deleting the resource group deletes everything inside it, which makes cleanup easy.
# -----------------------------------------------------------------------------
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.project_name}-${var.environment}"
  location = var.location
  # With our defaults this becomes: rg-hvac-dev in eastus
  # The "rg-" prefix is an Azure naming convention for resource groups.

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
  # Tags are optional but useful — they show up in Azure cost reports and help
  # you identify what created a resource when you're looking at it months later.
}
