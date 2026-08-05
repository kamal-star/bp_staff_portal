app_name = "bp_staff_portal"
app_title = "BP Staff Portal (Mobile API)"
app_publisher = "BP Great North"
app_description = "Mobile API layer over the greatnorth station endpoints for the staff app"
app_email = "support@bpgreatnorth.com"
app_license = "MIT"

# Requires the `greatnorth` app to be installed on the same site (this app reuses
# greatnorth doctypes/endpoints for serving orders, shift readings, cashup and
# physical stock). See INTEGRATION.md for the exact names to confirm.
required_apps = ["greatnorth"]

# Create the app's custom fields (served_by / served_time on SO Request) on
# install and on every migrate. Idempotent.
after_install = "bp_staff_portal.setup.ensure_custom_fields"
after_migrate = "bp_staff_portal.setup.ensure_custom_fields"

# Endpoints are exposed automatically via
# /api/method/bp_staff_portal.api.<function>. No extra hooks required.
