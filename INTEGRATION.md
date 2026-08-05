# ERP Integration Map

Every API method in `bp_staff_portal/api.py` reads or writes an **existing**
ERP doctype. Names/fields below were verified against the live site's DocType
meta (`/api/resource/DocType/<name>`). If the ERP schema changes, update the
`CONFIG` block at the top of `api.py`.

## Identity chain

```
User  --(Employee.user_id)-->  Employee  --(Sales Person.employee)-->  Sales Person
station (Branch) = Employee.branch
```

An attendant must have an **Employee** (with `user_id` = their login and a
`branch`) and, for shift ownership, a **Sales Person** whose `employee` points to
that Employee. Admins without an Employee can still log in but have no station.

## Doctype / field mapping

### `SO Request` — fuel orders (serve by OTP)
`find_order_by_otp`, `serve_order`

| App field | ERP field |
|-----------|-----------|
| otp | `otp` |
| status | `status` (Received → **Served**) |
| customer / customer_name | `customer` (code) → `Customer.customer_name` |
| product | `item` (D001/P002 → label, else `Item.item_name`) |
| qty, vehicle, station, driver_name | same names |

- Serving = find by `otp` where `status = Received`, set `status = Served`.

### `Shifts` — shift lifecycle (submittable; New/Open/Closed)
`get_shift`, `start_shift`, `end_shift`, `get_home`, cashup

| App | ERP |
|-----|-----|
| attendant | `attendant` (→ Sales Person) |
| station | `location` (→ Branch) |
| started_at / ended | `start` / `end` (Datetime) |
| opening/closing meters | child table `pump_reading` (→ **Pump Reading**) |
| deposits | child table `deposits` (→ **Deposit**) |
| totals | `total_sales`, `credit_sales`, `total_deposits`, `variance`, `completed` |

- **Pump Reading** child: `pump`, `nozzle` (A/B), `price`, `opening_meter`, `closing_meter`, `product`, `sales`, `volume`, `amount`.
- **Deposit** child: `amount`, `deposit_type`, `reference`.

### `Pumps` — opening meters source
`get_pumps` — filters `location = branch`, `status = Active`. Opening meters come
from `last_reading` (nozzle A) and `last_reading_b` (nozzle B). Price from `price`.

### HRMS
`get_attendance` → `Attendance`; `get_leave_types` → `Leave Type`;
`get_leave_requests` / `create_leave_request` → `Leave Application`.
`create_absence_report` → creates a submitted **`Attendance`** record with status
`Absent` per day (reason stored as a comment; Attendance has no reason field);
days that already have attendance are skipped.

## Points to confirm / tune (assumptions)

These work as written but are the only spots not 1:1 with a dedicated ERP field —
review them against how the back office expects the data:

1. **Served by / served time** — the app adds custom fields `served_by` (Link
   User) and `served_time` (Datetime) to `SO Request` via `setup.ensure_custom_fields`
   (run on install/migrate). `serve_order` stamps them so served orders are
   attributed to the attendant.

2. **Home stats** — `orders_served` / `litres_sold` count `SO Request`s with
   `status = Served`, `date = today` and `served_by = the signed-in attendant`
   (so the dashboard is per-attendant). `cash_sales`/`card_sales` come from that
   attendant's open shift (`total_deposits`/`credit_sales`), populated as
   deposits/credit are recorded. Per-attendant cash/card requires the attendant
   to have a Sales Person link (else `_open_shift` falls back to station).

3. **Physical stock** — there is no custom stock-take doctype. `get_physical_stock`
   reads live balances from `Bin` for warehouses whose name contains the branch
   name; `submit_stock_take` creates a **draft** `Stock Reconciliation` for a
   supervisor to review/submit. Confirm the warehouse-naming assumption and
   whether a draft reconciliation is the desired sink.

4. **Cashup** — `submit_cashup` records the counted-cash variance back onto the
   day's `Shifts.variance`. If cashup should be its own record, point it at that
   doctype instead.

5. **Writes use `ignore_permissions=True`** — the endpoint itself is the guard
   (scoped to the logged-in attendant), matching the order app. Attendants
   therefore don't need desk write roles on these doctypes.
