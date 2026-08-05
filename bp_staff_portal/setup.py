"""One-time / idempotent setup for the staff portal.

Adds the custom fields the app needs on the existing greatnorth `SO Request`
doctype so that served orders can be attributed to the attendant who served
them (used by the Home dashboard's per-attendant stats). Runs automatically on
install and on every `bench migrate`.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def ensure_custom_fields():
    create_custom_fields(
        {
            "SO Request": [
                {
                    "fieldname": "served_by",
                    "label": "Served By",
                    "fieldtype": "Link",
                    "options": "User",
                    "read_only": 1,
                    "no_copy": 1,
                    "insert_after": "otp",
                },
                {
                    "fieldname": "served_time",
                    "label": "Served Time",
                    "fieldtype": "Datetime",
                    "read_only": 1,
                    "no_copy": 1,
                    "insert_after": "served_by",
                },
            ]
        },
        ignore_validate=True,
    )
