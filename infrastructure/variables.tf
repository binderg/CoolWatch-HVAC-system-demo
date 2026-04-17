# =============================================================================
# variables.tf
#
# Think of this file as declaring the "inputs" to your Terraform config.
# You define a variable here, then give it an actual value in terraform.tfvars.
# This keeps sensitive values (like API keys) out of your main config files.
# =============================================================================

variable "location" {
  description = "The Azure region to deploy everything into."
  type        = string
  default     = "eastus"
  # Other options: "westus2", "eastus2", "centralus", "uksouth", etc.
  # Closer to your users = lower latency. eastus is a good default.
}

variable "project_name" {
  description = "A short name for this project. Used to name Azure resources."
  type        = string
  default     = "hvac"
  # Azure resource names have strict rules (lowercase, no spaces, length limits)
  # so we keep this short and simple.
}

variable "environment" {
  description = "The environment this deployment is for (dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "subscription_id" {
  description = "The Azure Subscription ID to deploy resources into."
  type        = string
  sensitive   = true
}

variable "client_id" {
  description = "The Service Principal Application (client) ID."
  type        = string
  sensitive   = true
}

variable "client_secret" {
  description = "The Service Principal client secret value."
  type        = string
  sensitive   = true
}

variable "tenant_id" {
  description = "The Azure Active Directory tenant ID."
  type        = string
  sensitive   = true
}

variable "api_key" {
  description = "The API key the NestJS app uses to authenticate requests (x-api-key header)."
  type        = string
  sensitive   = true
  # sensitive = true means Terraform will never print this value in logs or output.
  # No default — you MUST provide this in terraform.tfvars.
}

variable "allowed_origin" {
  description = "The frontend URL that the API allows CORS requests from."
  type        = string
  # This will be your Azure Static Web Apps URL, e.g:
  # https://nice-sky-00bc14f10.azurestaticapps.net
}
