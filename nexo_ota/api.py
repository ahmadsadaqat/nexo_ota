import frappe
from frappe import _
import json


# =========================================================
# GET WAITER CONTEXT
# =========================================================

@frappe.whitelist()
def get_waiter_context():

    try:

        # =====================================================
        # BLOCK GUEST USER
        # =====================================================

        if frappe.session.user == "Guest":

            return {
                "error": False,
                "guest": True,
                "floors": [],
                "tables": [],
                "payments": [],
                "employee": {},
                "branch": None,
                "pos_profile": None
            }

        user = frappe.session.user

        pos_profile = None
        branch = None
        emp_doc = None

        # =====================================================
        # ADMIN USER HANDLING
        # =====================================================

        if user == "Administrator":

            pos_profile = frappe.db.get_value(
                "POS Profile",
                {"disabled": 0},
                "name"
            )

            if not pos_profile:

                return {
                    "error": True,
                    "message": _("No active POS Profile found.")
                }

            branch = frappe.db.get_value(
                "POS Profile",
                pos_profile,
                "custom_branch"
            )

        # =====================================================
        # NORMAL USER HANDLING
        # =====================================================

        else:

            # =================================================
            # GET EMPLOYEE
            # =================================================

            emp_doc = frappe.db.get_value(
                "Employee",
                {"user_id": user},
                ["name", "employee_name", "branch", "image"],
                as_dict=True
            )

            if not emp_doc:

                return {
                    "error": True,
                    "message": _("Employee linked with this user was not found.")
                }

            employee_branch = emp_doc.get("branch")

            if not employee_branch:

                return {
                    "error": True,
                    "message": _("Employee branch is not set.")
                }

            # =================================================
            # GET POS PROFILE FOR USER
            # =================================================

            pos_profile_query = frappe.db.sql("""
                SELECT
                    pp.name,
                    pp.custom_branch
                FROM `tabPOS Profile` pp

                INNER JOIN `tabPOS Profile User` ppu
                    ON ppu.parent = pp.name

                WHERE
                    ppu.user = %s
                    AND ppu.parenttype = 'POS Profile'
                    AND ppu.parentfield = 'applicable_for_users'
                    AND pp.disabled = 0
            """, (user,), as_dict=True)

            if not pos_profile_query:

                return {
                    "error": True,
                    "message": _("No POS Profile mapped with this user.")
                }

            # =================================================
            # FIND EXACT BRANCH MATCH
            # =================================================

            exact_match = None

            for row in pos_profile_query:

                profile_branch = (row.get("custom_branch") or "").strip()
                employee_branch_clean = (employee_branch or "").strip()

                if profile_branch == employee_branch_clean:
                    exact_match = row
                    break

            # =================================================
            # USE EXACT MATCH
            # =================================================

            if exact_match:

                pos_profile = exact_match.get("name")
                branch = exact_match.get("custom_branch")

            # =================================================
            # FALLBACK FIRST PROFILE
            # =================================================

            else:

                pos_profile = pos_profile_query[0].get("name")
                branch = pos_profile_query[0].get("custom_branch")

        # =====================================================
        # FINAL VALIDATIONS
        # =====================================================

        if not pos_profile:

            return {
                "error": True,
                "message": _("POS Profile not found.")
            }

        if not branch:

            return {
                "error": True,
                "message": _("POS Profile branch is missing.")
            }

        # =====================================================
        # OTA PAYMENT FLAG
        # =====================================================

        custom_enable_ota_payments = frappe.db.get_value(
            "POS Profile",
            pos_profile,
            "custom_enable_ota_payments"
        )

        # =====================================================
        # EMPLOYEE RESPONSE
        # =====================================================

        if user == "Administrator":

            employee_details = {
                "employee_id": "ADMIN",
                "employee_name": "Administrator",
                "user_id": user,
                "branch": branch,
                "image": None
            }

        else:

            employee_details = {
                "employee_id": emp_doc.get("name"),
                "employee_name": emp_doc.get("employee_name"),
                "user_id": user,
                "branch": emp_doc.get("branch"),
                "image": emp_doc.get("image") or None
            }

        # =====================================================
        # FLOOR CONFIG
        # =====================================================

        floor_branch_field = (
            "branch"
            if frappe.db.has_column("Restaurant Floor", "branch")
            else "custom_branch"
        )

        floor_fields = ["name"]

        if frappe.db.has_column("Restaurant Floor", "floor_name"):
            floor_fields.append("floor_name")

        raw_floors = frappe.get_all(
            "Restaurant Floor",
            filters={
                floor_branch_field: branch
            },
            fields=floor_fields
        )

        floors = []

        for f in raw_floors:

            floor_name = f.get("floor_name") or f.get("name")

            floors.append({
                "name": f.get("name"),
                "floor_name": floor_name,
                "name1": floor_name
            })

        floor_names = [f["name"] for f in floors]

        # =====================================================
        # TABLES
        # =====================================================

        tables = []

        if floor_names:

            table_doctype = (
                "Restaurant Table"
                if frappe.db.exists("DocType", "Restaurant Table")
                else "Table"
            )

            table_floor_field = (
                "floor"
                if frappe.db.has_column(table_doctype, "floor")
                else "custom_floor"
            )

            if frappe.db.has_column(table_doctype, "minimum_seating"):
                table_seats_field = "minimum_seating"

            elif frappe.db.has_column(table_doctype, "seats"):
                table_seats_field = "seats"

            elif frappe.db.has_column(table_doctype, "custom_minimum_seating"):
                table_seats_field = "custom_minimum_seating"

            else:
                table_seats_field = None

            select_fields = [
                "name",
                "status"
            ]

            if frappe.db.has_column(table_doctype, "table_name"):
                select_fields.append("table_name")

            if frappe.db.has_column(table_doctype, table_floor_field):
                select_fields.append(table_floor_field)

            if table_seats_field:
                select_fields.append(table_seats_field)

            raw_tables = frappe.get_all(
                table_doctype,
                filters={
                    table_floor_field: ["in", floor_names]
                },
                fields=select_fields
            )

            for t in raw_tables:

                tables.append({
                    "name": t.get("name"),
                    "table_name": t.get("table_name") or t.get("name"),
                    "nameno": t.get("table_name") or t.get("name"),
                    "floor": t.get(table_floor_field),
                    "status": t.get("status") or "Available",
                    "seats": (
                        t.get(table_seats_field)
                        if table_seats_field
                        else 4
                    )
                })

        # =====================================================
        # PAYMENTS
        # =====================================================

        payments_raw = frappe.db.sql("""
            SELECT
                mode_of_payment,
                `default`
            FROM `tabPOS Payment Method`
            WHERE
                parent = %s
                AND parenttype = 'POS Profile'
                AND parentfield = 'payments'
        """, (pos_profile,), as_dict=True)

        payments = []

        for p in payments_raw:

            payments.append({
                "payment_method": p.get("mode_of_payment"),
                "default": p.get("default") or 0
            })

        # =====================================================
        # FINAL RESPONSE
        # =====================================================

        return {
            "error": False,
            "guest": False,
            "pos_profile": pos_profile,
            "branch": branch,
            "floors": floors,
            "tables": tables,
            "payments": payments,
            "employee": employee_details,
            "custom_enable_ota_payments": (
                1 if (
                    custom_enable_ota_payments == 1
                    or custom_enable_ota_payments is True
                )
                else 0
            )
        }

    except Exception as e:

        frappe.log_error(
            title="NEXO OTA Context Error",
            message=frappe.get_traceback()
        )

        return {
            "error": True,
            "message": str(e)
        }


# =========================================================
# CREATE ORDER / UPDATE EXISTING
# =========================================================

@frappe.whitelist()
def create_order_invoice(
    invoice_id=None,
    custom_table=None,
    custom_floor=None,
    items=None,
    custom_branch=None,
    pos_profile=None
):

    try:

        if isinstance(items, str):
            items = json.loads(items)

        context = get_waiter_context()

        if isinstance(context, dict) and context.get("error"):
            return context

        final_pos_profile = pos_profile or context.get("pos_profile")
        final_branch = custom_branch or context.get("branch")

        if not final_pos_profile:

            return {
                "error": True,
                "message": _("POS Profile missing.")
            }

        table_doctype = (
            "Restaurant Table"
            if frappe.db.exists("DocType", "Restaurant Table")
            else "Table"
        )

        # =====================================================
        # EXISTING DRAFT INVOICE (prefer explicit invoice_id)
        # =====================================================
        invoice = None

        if invoice_id:
            try:
                invoice = frappe.get_doc("Sales Invoice", invoice_id)
                # only use if draft and pos
                if invoice.docstatus != 0 or not getattr(invoice, 'is_pos', False):
                    invoice = None
                else:
                    invoice.items = []
            except Exception:
                invoice = None

        if not invoice:
            existing_invoice = frappe.db.get_value(
                "Sales Invoice",
                {
                    "custom_table": custom_table,
                    "docstatus": 0,
                    "is_pos": 1
                },
                "name"
            )

            # UPDATE EXISTING
            if existing_invoice:
                invoice = frappe.get_doc("Sales Invoice", existing_invoice)
                invoice.items = []

        # CREATE NEW
        if not invoice:

            invoice = frappe.new_doc("Sales Invoice")

            invoice.is_pos = 1
            invoice.pos_profile = final_pos_profile

            pos_profile_doc = frappe.get_cached_doc(
                "POS Profile",
                final_pos_profile
            )

            invoice.company = pos_profile_doc.company

            if getattr(pos_profile_doc, "naming_series", None):
                invoice.naming_series = pos_profile_doc.naming_series

            if getattr(pos_profile_doc, "customer", None):

                invoice.customer = pos_profile_doc.customer

            else:

                invoice.customer = frappe.db.get_value(
                    "Company",
                    invoice.company,
                    "default_customer"
                )

            invoice.custom_branch = final_branch
            invoice.custom_floor = custom_floor
            invoice.custom_table = custom_table

        invoice.set_missing_values()

        # =====================================================
        # ITEMS
        # =====================================================

        for item in items:

            invoice.append("items", {
                "item_code": item.get("item_code"),
                "qty": item.get("qty") or 1,
                "rate": item.get("rate") or 0
            })

        invoice.flags.ignore_permissions = True

        invoice.save()

        # =====================================================
        # TABLE STATUS
        # =====================================================

        frappe.db.set_value(
            table_doctype,
            custom_table,
            "status",
            "Occupied"
        )

        frappe.db.commit()

        return {
            "error": False,
            "invoice_id": invoice.name,
            "message": _("Order sent successfully.")
        }

    except Exception as e:

        frappe.log_error(
            title="OTA Order Creation Error",
            message=frappe.get_traceback()
        )

        return {
            "error": True,
            "message": str(e)
        }


# =========================================================
# GET ACTIVE TABLE ORDER
# =========================================================

@frappe.whitelist()
def get_occupied_table_order(custom_table):

    try:

        invoice_name = frappe.db.get_value(
            "Sales Invoice",
            {
                "custom_table": custom_table,
                "docstatus": 0,
                "is_pos": 1
            },
            "name"
        )

        if not invoice_name:

            return {
                "error": True,
                "message": _("No active draft order found.")
            }

        doc = frappe.get_doc(
            "Sales Invoice",
            invoice_name
        )

        items = []

        for d in doc.items:

            items.append({
                "item_code": d.item_code,
                "name": d.item_name or d.item_code,
                "qty": d.qty,
                "price": d.rate
            })

        return {
            "error": False,
            "items": items,
            "invoice_id": invoice_name
        }

    except Exception as e:

        frappe.log_error(
            title="Get Occupied Table Error",
            message=frappe.get_traceback()
        )

        return {
            "error": True,
            "message": str(e)
        }


# =========================================================
# FINALIZE PAYMENT
# =========================================================

@frappe.whitelist()
def finalize_and_pay_invoice(
    invoice_id,
    payment_method,
    amount_paid,
    custom_table
):

    try:

        doc = frappe.get_doc(
            "Sales Invoice",
            invoice_id
        )

        # Enforce POS Profile OTA payment flag: prevent OTA payments if disabled
        pos_profile = getattr(doc, "pos_profile", None)
        if pos_profile:
            enable_flag = frappe.db.get_value("POS Profile", pos_profile, "custom_enable_ota_payments")
            if not (enable_flag == 1 or enable_flag is True or enable_flag == "1"):
                return {"error": True, "message": _("OTA payments are disabled for this POS Profile.")}

        amount_paid = float(amount_paid)

        doc.payments = []

        payment_account = frappe.db.get_value(
            "Mode of Payment Account",
            {
                "parent": payment_method,
                "company": doc.company
            },
            "default_account"
        )

        doc.append("payments", {
            "mode_of_payment": payment_method,
            "amount": amount_paid,
            "account": payment_account
        })

        doc.paid_amount = amount_paid

        doc.outstanding_amount = max(
            0,
            float(doc.grand_total) - amount_paid
        )

        doc.flags.ignore_permissions = True

        doc.submit()

        table_doctype = (
            "Restaurant Table"
            if frappe.db.exists("DocType", "Restaurant Table")
            else "Table"
        )

        frappe.db.set_value(
            table_doctype,
            custom_table,
            "status",
            "Available"
        )

        frappe.db.commit()

        return {
            "error": False,
            "message": _("Payment successful. Table released.")
        }

    except Exception as e:

        frappe.log_error(
            title="OTA Finalize Payment Error",
            message=frappe.get_traceback()
        )

        return {
            "error": True,
            "message": str(e)
        }