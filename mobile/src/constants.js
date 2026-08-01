// Deposit / payment types offered on the cashup and end-shift screens.
// The ERP `Deposit.deposit_type` is a free select, so the app owns this list.
export const DEPOSIT_TYPES = ["Cash", "Card", "Mobile Money", "Bank"];

export const NOZZLES = ["A", "B"];

// Fuel product codes on SO Request.item (mirrors the customer order app).
export const PRODUCT_LABELS = { D001: "Diesel", P002: "Petrol" };

export function productLabel(code) {
  return PRODUCT_LABELS[code] || code || "—";
}
