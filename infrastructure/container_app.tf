# =============================================================================
# container_app.tf
#
# This file provisions two resources:
#   1. Container Apps Environment — the underlying platform/runtime
#   2. Container App             — your actual NestJS app
# =============================================================================

# -----------------------------------------------------------------------------
# LOG ANALYTICS WORKSPACE
#
# Container Apps requires somewhere to send logs. Log Analytics is Azure's
# logging service — it's where you'll go to see your app's console output,
# errors, etc. Think of it like Cloudwatch on AWS or just a managed log sink.
# -----------------------------------------------------------------------------
resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${var.project_name}-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  # PerGB2018 = you pay per GB of logs ingested. For a small app this is
  # essentially free (first 5GB/month is free).
  # retention_in_days = how long logs are kept before Azure deletes them.

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

# -----------------------------------------------------------------------------
# CONTAINER APPS ENVIRONMENT
#
# This is the platform that your Container App runs on. Think of it as the
# "server rack" — it handles networking, scaling infrastructure, and log
# routing. You never interact with it directly, it just needs to exist.
#
# One environment can host multiple Container Apps (e.g. if you later add
# a background worker or another microservice, they'd share this environment).
# -----------------------------------------------------------------------------
resource "azurerm_container_app_environment" "main" {
  name                       = "cae-${var.project_name}-${var.environment}"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  # Note: we reference the log workspace we just created above.
  # Terraform sees this and knows to create the workspace BEFORE this environment.

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

# -----------------------------------------------------------------------------
# CONTAINER APP
#
# This is your actual NestJS app. You define:
#   - Which Docker image to run
#   - CPU and memory
#   - Environment variables (PORT, API_KEY, ALLOWED_ORIGIN)
#   - How to scale
#   - That it's accessible from the internet
# -----------------------------------------------------------------------------
resource "azurerm_container_app" "api" {
  name                         = "ca-${var.project_name}-api-${var.environment}"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"
  # revision_mode = "Single" means only one version of your app runs at a time.
  # Every time you deploy a new Docker image, it replaces the old one.
  # "Multiple" would let you do canary/blue-green deployments — overkill for now.

  # ---------------------------------------------------------------------------
  # REGISTRY CREDENTIALS
  # Tells the Container App how to authenticate with ACR to pull the image.
  # We reference the registry we created in registry.tf.
  # ---------------------------------------------------------------------------
  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "registry-password"
    # password_secret_name references the secret defined below in the secret block.
    # We can't put the password inline here — it must go through a secret.
  }

  # ---------------------------------------------------------------------------
  # SECRETS
  # Sensitive values are declared here and referenced by name elsewhere.
  # This keeps them out of plain text in the template block below.
  # ---------------------------------------------------------------------------
  secret {
    name  = "registry-password"
    value = azurerm_container_registry.main.admin_password
  }

  secret {
    name  = "api-key"
    value = var.api_key
  }

  # ---------------------------------------------------------------------------
  # TEMPLATE
  # Defines what actually runs — the container, its resources, env vars, scaling.
  # ---------------------------------------------------------------------------
  template {
    container {
      name   = "hvac-api"
      image  = "${azurerm_container_registry.main.login_server}/hvac-api:latest"
      # This is the image URL that GitHub Actions will push to.
      # Pattern: <registry-login-server>/<image-name>:<tag>
      # e.g.    crhvacdev.azurecr.io/hvac-api:latest

      cpu    = 0.25
      memory = "0.5Gi"
      # These are the minimum values for Container Apps.
      # 0.25 vCPU and 512MB RAM is plenty for this in-memory simulator app.
      # You can scale up later if needed.

      # Environment variables injected into the container at runtime.
      # These are what your NestJS app reads via process.env.*
      env {
        name  = "PORT"
        value = "3001"
      }

      env {
        name        = "API_KEY"
        secret_name = "api-key"
        # For sensitive values, reference the secret by name instead of
        # putting the value inline. This keeps it out of Terraform state logs.
      }

      env {
        name  = "ALLOWED_ORIGIN"
        value = var.allowed_origin
      }
    }

    # -------------------------------------------------------------------------
    # SCALING
    # min_replicas = 0 means the app scales to zero when no traffic comes in.
    # This is great for dev/cost saving — you're not paying for idle time.
    # The downside is a "cold start" (~5-10 seconds) on the first request after
    # a period of inactivity.
    #
    # For production you'd set min_replicas = 1 to always have one instance ready.
    # -------------------------------------------------------------------------
    min_replicas = 0
    max_replicas = 2
  }

  # ---------------------------------------------------------------------------
  # INGRESS
  # Makes the Container App accessible from the internet on HTTPS.
  # Without this block the app would be internal-only (no public URL).
  # ---------------------------------------------------------------------------
  ingress {
    external_enabled = true
    target_port      = 3001
    # target_port must match the PORT your app listens on inside the container.

    traffic_weight {
      percentage      = 100
      latest_revision = true
      # Send 100% of traffic to the latest revision (deployment).
      # Required when revision_mode = "Single".
    }
  }

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}
