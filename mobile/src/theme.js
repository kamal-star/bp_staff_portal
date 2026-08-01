export const colors = {
  primary: "#0B3D2E",
  primaryLight: "#14805C",
  accent: "#F0A500",
  bg: "#F4F6F5",
  card: "#FFFFFF",
  text: "#1A1A1A",
  muted: "#6B7280",
  border: "#E3E7E5",
  danger: "#C0392B",
  success: "#1E8E5A",
  received: "#2D6CDF",
  warning: "#B7791F",
};

// SO Request statuses: Received (new), Served (fulfilled), Cancelled.
export const statusColor = (status) => {
  switch (status) {
    case "Received":
      return colors.received;
    case "Served":
      return colors.success;
    case "Cancelled":
      return colors.danger;
    case "Open":
      return colors.success;
    case "Closed":
      return colors.muted;
    default:
      return colors.muted;
  }
};

// Thousands separators for TZS amounts (no decimals — matches the ERP display).
export const money = (n) =>
  (Math.round(Number(n) || 0)).toLocaleString("en-US");
