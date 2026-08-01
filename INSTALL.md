# Installing the Staff Portal API app

The `bp_staff_portal` app is a standard Frappe app. Install it on the same site
that runs `greatnorth`.

## 1. Get the app onto the bench

```bash
cd /path/to/frappe-bench
# from a git remote:
bench get-app bp_staff_portal <git-url>
# or, if copying the folder in directly, place it at apps/bp_staff_portal
```

## 2. Install on the site

```bash
bench --site bpgreatnorth.com install-app bp_staff_portal
bench --site bpgreatnorth.com migrate
bench restart
```

## 3. Verify the endpoints

With any staff user's credentials:

```bash
curl -X POST https://bpgreatnorth.com/api/method/bp_staff_portal.api.app_login \
  -d 'usr=attendant@bpgreatnorth.com' -d 'pwd=THEIR_PIN'
```

A successful response returns `api_key`, `api_secret`, and the attendant's
`station`. Use the token for the rest:

```bash
curl https://bpgreatnorth.com/api/method/bp_staff_portal.api.get_home \
  -H 'Authorization: token API_KEY:API_SECRET'
```

## 4. Staff setup checklist (per attendant)

- A **User** account (their login email + PIN as the password).
- An **Employee** with `user_id` = that user and a `branch` set (the station).
- A **Sales Person** whose `employee` = that Employee (for shift ownership).
- Roles that allow the underlying doctypes, or rely on the app's
  `ignore_permissions` writes (see [INTEGRATION.md](INTEGRATION.md)).

## Notes

- No custom doctypes are created by this app — it only adds API methods over the
  existing `greatnorth` + HRMS doctypes.
- Endpoints live at `/api/method/bp_staff_portal.api.<function>`.
