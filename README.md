# BP Great North — Staff App

A mobile app for pump attendants and station staff to run daily operations:
validate & serve fuel orders by OTP, capture pump readings at shift start/end,
view physical stock, do the daily cashup, and manage attendance & leave.

It is the staff-side counterpart to the customer **order app** (`bp-order-app`)
and follows the same architecture: a thin Frappe API app that reads and writes
the **existing** `greatnorth` ERP doctypes, plus an Expo/React Native client.
Everything the app records flows straight back into the same ERP the desk web
forms use — no parallel data store.

## Two parts

| Part | Path | What it is |
|------|------|-----------|
| Frappe API app | `bp_staff_portal/` | Whitelisted endpoints at `/api/method/bp_staff_portal.api.*` |
| Mobile app | `mobile/` | Expo (React Native) app, builds to Android/iOS |

## Features (screens)

- **Login** — Staff ID (email) + PIN (password) → API token
- **Home** — current shift status, today's orders served / litres / cash / card, quick actions
- **Validate & Serve** — look up a fuel order by its 6-digit OTP and mark it Served
- **Start Shift / End Shift** — opening & closing pump meter readings + cash count
- **Physical Stock** — current fuel stock levels and a stock-take submission
- **Daily Cashup** — day's sales summary, cash count, variance
- **HR** — attendance history, leave requests, absence reports

## ERP mapping

Every endpoint reads/writes real `greatnorth` + HRMS doctypes (`SO Request`,
`Shifts`, `Pump Reading`, `Deposit`, `Pumps`, `Attendance`, `Leave Application`).
The full field-by-field mapping — and the handful of derived/assumption points to
confirm — is in **[INTEGRATION.md](INTEGRATION.md)**.

## Install

See **[INSTALL.md](INSTALL.md)** for the server app and **[mobile/BUILD.md](mobile/BUILD.md)**
for building the phone app.

## Requires

- The `greatnorth` app installed on the same site (declared in `hooks.py`).
- Frappe HR / HRMS (for `Attendance`, `Leave Application`, `Leave Type`).
