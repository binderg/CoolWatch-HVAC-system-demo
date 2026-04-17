# =============================================================================
# registry.tf
#
# Azure Container Registry (ACR) — this is where your Docker image lives.
#
# The flow is:
#   1. You build a Docker image on your machine (or in CI)
#   2. You push it to ACR (like pushing code to GitHub, but for Docker images)
#   3. Azure Container Apps pulls the image from ACR when deploying
#
# ACR is essentially a private Docker Hub that lives inside your Azure account.
# =============================================================================

resource "azurerm_container_registry" "main" {
  name                = "cr${var.project_name}${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = true

  # NAME: Azure registry names must be globally unique, alphanumeric only, 5-50 chars.
  # With our defaults this becomes: crhvacdev
  # The "cr" prefix = container registry (Azure naming convention)

  # SKU OPTIONS:
  #   Basic  — cheapest (~$0.17/day), fine for dev/small projects. Limited storage & throughput.
  #   Standard — middle tier, good for production
  #   Premium — adds geo-replication, private endpoints, etc.
  # Basic is fine for this app.

  # ADMIN ENABLED:
  # Enables a simple username/password login for the registry.
  # We need this so Container Apps can pull the image.
  # In a larger production setup you'd use managed identity instead,
  # but admin is simpler and fine for now.

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

# =============================================================================
# OUTPUTS from this file (used by container_app.tf)
#
# These aren't Terraform outputs (those are in outputs.tf) — these are just
# references we'll use in other .tf files. Terraform lets you reference any
# resource attribute using the pattern:
#   resource_type.resource_name.attribute
#
# For example, container_app.tf will use:
#   azurerm_container_registry.main.login_server  → "crhvacdev.azurecr.io"
#   azurerm_container_registry.main.admin_username → the registry username
#   azurerm_container_registry.main.admin_password → the registry password
# =============================================================================
