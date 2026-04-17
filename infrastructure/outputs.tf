# =============================================================================
# outputs.tf
#
# Outputs are values Terraform prints to your terminal after `terraform apply`
# completes. Think of them as the return value of the whole deployment.
#
# They're useful for:
#   - Knowing your app's URL without logging into the Azure Portal
#   - Grabbing values you need to paste into other configs (like the frontend's
#     ALLOWED_ORIGIN or GitHub Actions secrets)
# =============================================================================

output "resource_group_name" {
  description = "The name of the Azure Resource Group."
  value       = azurerm_resource_group.main.name
}

output "container_registry_login_server" {
  description = "The ACR login server URL. You'll need this for GitHub Actions to push images."
  value       = azurerm_container_registry.main.login_server
  # Example value: crhvacdev.azurecr.io
}

output "container_registry_username" {
  description = "ACR admin username. Add this as a GitHub Actions secret."
  value       = azurerm_container_registry.main.admin_username
}

output "container_registry_password" {
  description = "ACR admin password. Add this as a GitHub Actions secret."
  value       = azurerm_container_registry.main.admin_password
  sensitive   = true
  # Won't print in terminal output but you can retrieve it with:
  # terraform output container_registry_password
}

output "api_url" {
  description = "The public HTTPS URL of your NestJS API. Use this as ALLOWED_ORIGIN in the frontend."
  value       = "https://${azurerm_container_app.api.latest_revision_fqdn}"
  # Example value: https://ca-hvac-api-dev.nicename.eastus.azurecontainerapps.io
}
