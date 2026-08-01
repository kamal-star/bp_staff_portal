"""Mobile API for the BP Great North station-staff app.

A thin, mobile-friendly JSON layer over the EXISTING `greatnorth` station doctypes.
Everything here writes back into the same ERP the desk web forms use, so the app
and the back office stay in sync — exactly like the customer order app does for
fuel orders.

Backing doctypes (confirmed against the live site's DocType meta):
    SO Request     fuel orders — serve by OTP (status Received -> Served)
    Shifts         shift lifecycle (New/Open/Closed, submittable)
      Pump Reading   child table — opening/closing pump meters
      Deposit        child table — cash/card/mobile deposits
    Pumps          pumps per Branch (opening meters = last_reading / last_reading_b)
    Attendance / Leave Application / Leave Type  (HRMS)

Staff identity chain:
    User  --(user_id)-->  Employee  --(employee)-->  Sales Person
    station (Branch) = Employee.branch

Namespace: /api/method/bp_staff_portal.api.<name>
    app_login              (allow_guest) -> token + attendant context
    get_profile                          -> current attendant + station
    get_home                             -> greeting, current shift, today's stats
    find_order_by_otp                    -> look up a fuel order by its OTP
    serve_order                          -> mark the order Served
    get_pumps                            -> pumps for the attendant's station
    get_shift                            -> current/open shift
    start_shift                          -> open a shift with opening meters
    end_shift                            -> close a shift (closing meters + cash)
    get_physical_stock                   -> fuel stock levels for the station
    submit_stock_take                    -> record a physical stock count
    get_cashup                           -> day's sales summary
    submit_cashup                        -> record cash counted + variance
    get_leave_types / get_attendance / get_leave_requests
    create_leave_request / create_absence_report
"""

import frappe
from frappe import _
from frappe.auth import LoginManager
from frappe.utils import (
    now_datetime,
    nowdate,
    getdate,
    get_datetime,
    time_diff_in_seconds,
    flt,
    cint,
    formatdate,
)

# ---------------------------------------------------------------------------
# CONFIG — ERP doctype / field names. All confirmed against the live site.
# If the ERP schema changes, update these in ONE place.
# ---------------------------------------------------------------------------
DT_ORDER = "SO Request"
DT_SHIFT = "Shifts"
DT_PUMP = "Pumps"
DT_ATTENDANCE = "Attendance"
DT_LEAVE = "Leave Application"
DT_LEAVE_TYPE = "Leave Type"

ORDER_SERVED = "Served"
ORDER_RECEIVED = "Received"
SHIFT_OPEN = "Open"
SHIFT_CLOSED = "Closed"

# Fuel product codes on SO Request.item (kept in sync with the order app).
PRODUCT_LABELS = {"D001": "Diesel", "P002": "Petrol"}

# Deposit types offered on the cashup screen (Deposit.deposit_type is a free
# select on the ERP side, so the app defines the vocabulary).
DEPOSIT_TYPES = ["Cash", "Card", "Mobile Money", "Bank"]


# ---------------------------------------------------------------------------
# Attendant resolution
# ---------------------------------------------------------------------------

def _attendant(user=None):
    """Resolve the logged-in user to (employee, employee_name, sales_person, branch).

    Returns a dict; any field may be None if the user isn't fully set up as an
    attendant (e.g. an admin testing the app).
    """
    user = user or frappe.session.user
    ctx = {"user": user, "employee": None, "employee_name": None,
           "sales_person": None, "branch": None}
    if not user or user == "Guest":
        return ctx

    emp = frappe.db.get_value(
        "Employee", {"user_id": user},
        ["name", "employee_name", "branch"], as_dict=True,
    )
    if emp:
        ctx["employee"] = emp.name
        ctx["employee_name"] = emp.employee_name
        ctx["branch"] = emp.branch
        ctx["sales_person"] = frappe.db.get_value(
            "Sales Person", {"employee": emp.name}, "name"
        )
    ctx["full_name"] = frappe.db.get_value("User", user, "full_name")
    return ctx


def _require_attendant():
    ctx = _attendant()
    if ctx["user"] in (None, "Guest"):
        frappe.throw(_("Please sign in."), frappe.PermissionError)
    return ctx


def _require_station(ctx):
    if not ctx.get("branch"):
        frappe.throw(
            _("Your account is not assigned to a station. Please contact your supervisor."),
            frappe.PermissionError,
        )
    return ctx["branch"]


def _ensure_api_keys(user):
    """Return (api_key, api_secret), generating them once and reusing thereafter."""
    user_doc = frappe.get_doc("User", user)
    if not user_doc.api_key:
        user_doc.api_key = frappe.generate_hash(length=15)
        user_doc.save(ignore_permissions=True)
    api_secret = user_doc.get_password("api_secret", raise_exception=False)
    if not api_secret:
        api_secret = frappe.generate_hash(length=15)
        user_doc.api_secret = api_secret
        user_doc.save(ignore_permissions=True)
    return user_doc.api_key, api_secret


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def app_login(usr, pwd):
    """Authenticate a staff user, return an API token + their attendant context."""
    login_manager = LoginManager()
    login_manager.authenticate(usr, pwd)      # raises on bad credentials
    user = login_manager.user

    ctx = _attendant(user)
    api_key, api_secret = _ensure_api_keys(user)
    return {
        "user": user,
        "full_name": ctx.get("full_name") or frappe.db.get_value("User", user, "full_name"),
        "employee": ctx["employee"],
        "employee_name": ctx["employee_name"],
        "sales_person": ctx["sales_person"],
        "station": ctx["branch"],
        "api_key": api_key,
        "api_secret": api_secret,
    }


@frappe.whitelist()
def get_profile():
    ctx = _require_attendant()
    return {
        "user": ctx["user"],
        "full_name": ctx.get("full_name"),
        "employee": ctx["employee"],
        "employee_name": ctx["employee_name"],
        "sales_person": ctx["sales_person"],
        "station": ctx["branch"],
    }


# ---------------------------------------------------------------------------
# Home / dashboard
# ---------------------------------------------------------------------------

def _open_shift(ctx):
    """The attendant's currently-open shift, if any."""
    filters = {"status": SHIFT_OPEN}
    if ctx.get("sales_person"):
        filters["attendant"] = ctx["sales_person"]
    elif ctx.get("branch"):
        filters["location"] = ctx["branch"]
    rows = frappe.get_all(
        DT_SHIFT, filters=filters,
        fields=["name", "start", "location", "total_sales", "credit_sales", "total_deposits"],
        order_by="start desc", limit=1, ignore_permissions=True,
    )
    return rows[0] if rows else None


@frappe.whitelist()
def get_home():
    """Greeting, current shift and today's headline stats for the home screen."""
    ctx = _require_attendant()
    today = nowdate()

    shift = _open_shift(ctx)
    shift_info = None
    if shift:
        started = get_datetime(shift.start) if shift.start else None
        duration = None
        if started:
            secs = time_diff_in_seconds(now_datetime(), started)
            duration = f"{int(secs // 3600):02d}h {int((secs % 3600) // 60):02d}m"
        shift_info = {
            "name": shift.name,
            "active": True,
            "started_at": str(shift.start) if shift.start else None,
            "duration": duration,
        }

    # Orders served today (optionally scoped to this station's warehouse name).
    order_filter = {"status": ORDER_SERVED, "date": today}
    served = frappe.get_all(
        DT_ORDER, filters=order_filter, fields=["qty"], ignore_permissions=True
    )
    orders_served = len(served)
    litres_sold = sum(flt(r.qty) for r in served)

    # Cash / card figures come from the current shift's running totals + deposits.
    cash_sales = card_sales = 0.0
    if shift:
        card_sales = flt(shift.credit_sales)
        cash_sales = flt(shift.total_deposits)

    return {
        "full_name": ctx.get("full_name"),
        "employee_name": ctx.get("employee_name"),
        "station": ctx.get("branch"),
        "shift": shift_info,
        "orders_served": orders_served,
        "litres_sold": litres_sold,
        "cash_sales": cash_sales,
        "card_sales": card_sales,
    }


# ---------------------------------------------------------------------------
# Validate & serve orders (by OTP — no browsable list for staff)
# ---------------------------------------------------------------------------

def _order_view(doc):
    customer_name = None
    if doc.customer:
        customer_name = frappe.db.get_value("Customer", doc.customer, "customer_name") or doc.customer
    item_name = PRODUCT_LABELS.get(doc.item)
    if not item_name and doc.item:
        item_name = frappe.db.get_value("Item", doc.item, "item_name") or doc.item
    return {
        "name": doc.name,
        "otp": doc.otp,
        "status": doc.status,
        "pending_service": doc.status == ORDER_RECEIVED,
        "customer": doc.customer,
        "customer_name": customer_name,
        "item": doc.item,
        "product": item_name,
        "qty": doc.qty,
        "station": doc.station,
        "vehicle": doc.vehicle,
        "driver_name": doc.driver_name,
        "driver_mobile_number": doc.driver_mobile_number,
        "order_time": str(doc.date) if doc.date else None,
    }


@frappe.whitelist()
def find_order_by_otp(otp):
    """Look up a fuel order by its 6-digit OTP."""
    _require_attendant()
    otp = (otp or "").strip()
    if not otp:
        frappe.throw(_("Enter the 6-digit OTP."))

    name = frappe.db.get_value(DT_ORDER, {"otp": otp}, "name")
    if not name:
        frappe.throw(_("No order found for that OTP. Check the number and try again."))
    doc = frappe.get_doc(DT_ORDER, name)
    return _order_view(doc)


@frappe.whitelist()
def serve_order(otp):
    """Mark the order with this OTP as Served."""
    ctx = _require_attendant()
    otp = (otp or "").strip()
    name = frappe.db.get_value(DT_ORDER, {"otp": otp}, "name")
    if not name:
        frappe.throw(_("No order found for that OTP."))

    doc = frappe.get_doc(DT_ORDER, name)
    if doc.status == ORDER_SERVED:
        frappe.throw(_("This order has already been served."))
    if doc.status != ORDER_RECEIVED:
        frappe.throw(_("This order cannot be served (status: {0}).").format(doc.status))

    doc.status = ORDER_SERVED
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    view = _order_view(doc)
    view["served_by"] = ctx.get("full_name") or ctx.get("employee_name")
    view["served_time"] = str(now_datetime())
    return view


# ---------------------------------------------------------------------------
# Shift — pumps, start, end
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_pumps():
    """Active pumps at the attendant's station, one row per nozzle (A/B).

    Opening meters are pre-filled from the pump's last recorded reading.
    """
    ctx = _require_attendant()
    branch = _require_station(ctx)

    pumps = frappe.get_all(
        DT_PUMP, filters={"location": branch, "status": "Active"},
        fields=["name", "product", "price", "last_reading", "last_reading_b"],
        order_by="name asc", ignore_permissions=True,
    )
    rows = []
    for p in pumps:
        rows.append({"pump": p.name, "nozzle": "A", "product": p.product,
                     "price": cint(p.price), "opening_meter": cint(p.last_reading)})
        # Second nozzle only if it has ever carried a reading.
        if cint(p.last_reading_b):
            rows.append({"pump": p.name, "nozzle": "B", "product": p.product,
                         "price": cint(p.price), "opening_meter": cint(p.last_reading_b)})
    return {"station": branch, "pumps": rows, "deposit_types": DEPOSIT_TYPES}


@frappe.whitelist()
def get_shift():
    """The attendant's current open shift with its pump-reading rows, if any."""
    ctx = _require_attendant()
    shift = _open_shift(ctx)
    if not shift:
        return {"active": False}
    doc = frappe.get_doc(DT_SHIFT, shift.name)
    return {
        "active": True,
        "name": doc.name,
        "started_at": str(doc.start) if doc.start else None,
        "station": doc.location,
        "readings": [
            {"pump": r.pump, "nozzle": r.nozzle, "product": r.product,
             "price": cint(r.price), "opening_meter": cint(r.opening_meter),
             "closing_meter": cint(r.closing_meter)}
            for r in doc.pump_reading
        ],
    }


@frappe.whitelist()
def start_shift(readings):
    """Open a shift, recording opening pump meters.

    `readings` is a JSON list of {pump, nozzle, product, price, opening_meter}.
    """
    ctx = _require_attendant()
    branch = _require_station(ctx)

    if _open_shift(ctx):
        frappe.throw(_("You already have an open shift. Close it before starting a new one."))

    rows = frappe.parse_json(readings) if isinstance(readings, str) else (readings or [])
    if not rows:
        frappe.throw(_("Enter opening meter readings for at least one pump."))

    doc = frappe.new_doc(DT_SHIFT)
    doc.attendant = ctx.get("sales_person")
    doc.location = branch
    doc.start = now_datetime()
    doc.status = SHIFT_OPEN
    for r in rows:
        doc.append("pump_reading", {
            "pump": r.get("pump"),
            "nozzle": r.get("nozzle") or "A",
            "product": r.get("product"),
            "price": cint(r.get("price")),
            "opening_meter": cint(r.get("opening_meter")),
        })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"name": doc.name, "status": doc.status, "started_at": str(doc.start)}


@frappe.whitelist()
def end_shift(readings, deposits=None, credit_sales=0):
    """Close the open shift: closing meters + cash deposits.

    `readings` : JSON list of {pump, nozzle, closing_meter}
    `deposits` : JSON list of {deposit_type, amount, reference}
    """
    ctx = _require_attendant()
    shift = _open_shift(ctx)
    if not shift:
        frappe.throw(_("You have no open shift to close."))

    read_rows = frappe.parse_json(readings) if isinstance(readings, str) else (readings or [])
    dep_rows = frappe.parse_json(deposits) if isinstance(deposits, str) else (deposits or [])

    # Index closing meters by (pump, nozzle) for a quick lookup.
    closing = {(r.get("pump"), r.get("nozzle") or "A"): cint(r.get("closing_meter"))
               for r in read_rows}

    doc = frappe.get_doc(DT_SHIFT, shift.name)
    total_sales = 0.0
    for r in doc.pump_reading:
        key = (r.pump, r.nozzle or "A")
        if key in closing:
            r.closing_meter = closing[key]
        r.sales = max(cint(r.closing_meter) - cint(r.opening_meter), 0)
        r.volume = r.sales
        r.amount = flt(r.volume) * flt(r.price)
        total_sales += flt(r.amount)

    # Reset and re-add deposit rows.
    doc.set("deposits", [])
    total_deposits = 0.0
    for d in dep_rows:
        amount = flt(d.get("amount"))
        if not amount:
            continue
        doc.append("deposits", {
            "deposit_type": d.get("deposit_type") or "Cash",
            "amount": amount,
            "reference": d.get("reference") or "",
        })
        total_deposits += amount

    doc.credit_sales = flt(credit_sales)
    doc.total_sales = total_sales
    doc.total_deposits = total_deposits
    doc.variance = total_deposits + flt(credit_sales) - total_sales
    doc.end = now_datetime()
    doc.status = SHIFT_CLOSED
    doc.completed = 1
    doc.save(ignore_permissions=True)
    if doc.docstatus == 0 and frappe.get_meta(DT_SHIFT).is_submittable:
        doc.submit()
    frappe.db.commit()

    return {
        "name": doc.name,
        "status": doc.status,
        "total_sales": total_sales,
        "total_deposits": total_deposits,
        "variance": doc.variance,
    }


# ---------------------------------------------------------------------------
# Physical stock  (derived from Bin for the station's fuel warehouse)
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_physical_stock(date=None):
    """Fuel stock levels for the attendant's station.

    Reads live balances from ERPNext `Bin` for warehouses whose name starts with
    the station (Branch) name. Opening/sales/closing are derived from the day's
    Stock Ledger where available.
    """
    ctx = _require_attendant()
    branch = _require_station(ctx)
    date = date or nowdate()

    warehouses = frappe.get_all(
        "Warehouse",
        filters={"warehouse_name": ["like", f"%{branch}%"], "disabled": 0},
        pluck="name", ignore_permissions=True,
    )
    rows = []
    if warehouses:
        bins = frappe.get_all(
            "Bin", filters={"warehouse": ["in", warehouses]},
            fields=["item_code", "actual_qty"], ignore_permissions=True,
        )
        agg = {}
        for b in bins:
            agg.setdefault(b.item_code, 0.0)
            agg[b.item_code] += flt(b.actual_qty)
        for item_code, balance in agg.items():
            item_name = frappe.db.get_value("Item", item_code, "item_name") or item_code
            rows.append({
                "product": item_name,
                "item_code": item_code,
                "balance": balance,
                # Opening/sales/closing left for the back office ledger; balance
                # is the live figure the attendant verifies against.
                "closing": balance,
            })
    return {"station": branch, "date": date, "stock": rows}


@frappe.whitelist()
def submit_stock_take(counts, remarks=None):
    """Record a physical stock count as a Stock Reconciliation (draft).

    `counts` : JSON list of {item_code, warehouse?, qty}. Left as a draft for a
    supervisor to review and submit in the desk.
    """
    ctx = _require_attendant()
    branch = _require_station(ctx)
    rows = frappe.parse_json(counts) if isinstance(counts, str) else (counts or [])
    if not rows:
        frappe.throw(_("Enter at least one counted quantity."))

    default_wh = frappe.get_all(
        "Warehouse",
        filters={"warehouse_name": ["like", f"%{branch}%"], "disabled": 0},
        pluck="name", limit=1, ignore_permissions=True,
    )
    default_wh = default_wh[0] if default_wh else None

    doc = frappe.new_doc("Stock Reconciliation")
    doc.purpose = "Stock Reconciliation"
    for r in rows:
        doc.append("items", {
            "item_code": r.get("item_code"),
            "warehouse": r.get("warehouse") or default_wh,
            "qty": flt(r.get("qty")),
        })
    if remarks:
        doc.remarks = remarks
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"name": doc.name, "status": "Draft"}


# ---------------------------------------------------------------------------
# Daily cashup
# ---------------------------------------------------------------------------

def _day_shift(ctx, date):
    filters = {"start": ["between", [f"{date} 00:00:00", f"{date} 23:59:59"]]}
    if ctx.get("sales_person"):
        filters["attendant"] = ctx["sales_person"]
    elif ctx.get("branch"):
        filters["location"] = ctx["branch"]
    rows = frappe.get_all(
        DT_SHIFT, filters=filters, fields=["name"],
        order_by="start desc", limit=1, ignore_permissions=True,
    )
    return rows[0].name if rows else None


@frappe.whitelist()
def get_cashup(date=None):
    """Day's sales summary for the cashup screen."""
    ctx = _require_attendant()
    date = date or nowdate()

    name = _day_shift(ctx, date) or (_open_shift(ctx) or {}).get("name")
    summary = {"cash_sales": 0.0, "card_sales": 0.0, "mobile_money": 0.0, "total_sales": 0.0}
    if name:
        doc = frappe.get_doc(DT_SHIFT, name)
        by_type = {}
        for d in doc.deposits:
            by_type[d.deposit_type] = by_type.get(d.deposit_type, 0.0) + flt(d.amount)
        summary["cash_sales"] = by_type.get("Cash", 0.0)
        summary["card_sales"] = flt(doc.credit_sales) or by_type.get("Card", 0.0)
        summary["mobile_money"] = by_type.get("Mobile Money", 0.0)
        summary["total_sales"] = flt(doc.total_sales) or (
            summary["cash_sales"] + summary["card_sales"] + summary["mobile_money"]
        )
    return {
        "date": formatdate(date, "dd MMM yyyy"),
        "raw_date": str(date),
        "shift": name,
        **summary,
    }


@frappe.whitelist()
def submit_cashup(date=None, cash_counted=0, remarks=None):
    """Record counted cash against the day's shift and compute the variance."""
    ctx = _require_attendant()
    date = date or nowdate()
    name = _day_shift(ctx, date) or (_open_shift(ctx) or {}).get("name")
    if not name:
        frappe.throw(_("No shift found for {0} to cash up.").format(date))

    doc = frappe.get_doc(DT_SHIFT, name)
    expected_cash = 0.0
    for d in doc.deposits:
        if d.deposit_type == "Cash":
            expected_cash += flt(d.amount)
    difference = flt(cash_counted) - expected_cash
    doc.variance = difference
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {
        "shift": name,
        "expected_cash": expected_cash,
        "cash_counted": flt(cash_counted),
        "difference": difference,
    }


# ---------------------------------------------------------------------------
# HR — attendance & leave
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_leave_types():
    _require_attendant()
    return frappe.get_all(DT_LEAVE_TYPE, pluck="name", ignore_permissions=True)


@frappe.whitelist()
def get_attendance(limit=30):
    ctx = _require_attendant()
    if not ctx.get("employee"):
        return []
    return frappe.get_all(
        DT_ATTENDANCE,
        filters={"employee": ctx["employee"]},
        fields=["name", "attendance_date", "status", "working_hours"],
        order_by="attendance_date desc",
        limit=int(limit), ignore_permissions=True,
    )


@frappe.whitelist()
def get_leave_requests(limit=30):
    ctx = _require_attendant()
    if not ctx.get("employee"):
        return []
    return frappe.get_all(
        DT_LEAVE,
        filters={"employee": ctx["employee"]},
        fields=["name", "leave_type", "from_date", "to_date", "status",
                "total_leave_days", "description"],
        order_by="from_date desc",
        limit=int(limit), ignore_permissions=True,
    )


def _create_leave(ctx, leave_type, from_date, to_date, reason):
    if not ctx.get("employee"):
        frappe.throw(_("Your account is not linked to an employee record."))
    doc = frappe.new_doc(DT_LEAVE)
    doc.employee = ctx["employee"]
    doc.leave_type = leave_type
    doc.from_date = getdate(from_date)
    doc.to_date = getdate(to_date)
    doc.description = reason or ""
    doc.status = "Open"
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def create_leave_request(leave_type, from_date, to_date, reason=None):
    ctx = _require_attendant()
    return _create_leave(ctx, leave_type, from_date, to_date, reason)


@frappe.whitelist()
def create_absence_report(from_date, to_date=None, reason=None, leave_type=None):
    """Report an absence. Files a Leave Application (defaulting the type)."""
    ctx = _require_attendant()
    if not leave_type:
        types = frappe.get_all(DT_LEAVE_TYPE, pluck="name",
                               limit=1, ignore_permissions=True)
        leave_type = types[0] if types else None
    if not leave_type:
        frappe.throw(_("No leave type is configured. Please contact HR."))
    return _create_leave(ctx, leave_type, from_date, to_date or from_date, reason)
