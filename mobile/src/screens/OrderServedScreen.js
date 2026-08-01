import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, money } from "../theme";

export default function OrderServedScreen({ route, navigation }) {
  const order = route.params?.order || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.successBanner}>
        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        <Text style={styles.successText}>  Order Served Successfully!</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.smallLabel}>OTP</Text>
        <Text style={styles.otpValue}>{order.otp}</Text>

        <Row label="Customer" value={order.customer_name || order.customer} />
        <Row label="Product" value={order.product} />
        <Row label="Quantity" value={order.qty != null ? `${money(order.qty)} Litres` : "—"} />
        <Row label="Station" value={order.station} />
        <Row label="Served By" value={order.served_by} />
        <Row label="Served Time" value={formatDateTime(order.served_time)} />
      </View>

      <View style={styles.note}>
        <Ionicons name="checkmark-done-outline" size={18} color={colors.success} />
        <Text style={styles.noteText}>{"  "}Fuel has been issued and the order is marked as served.</Text>
      </View>

      <TouchableOpacity
        style={styles.doneBtn}
        onPress={() => navigation.navigate("Validate")}
      >
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value ?? "—"}</Text>
    </View>
  );
}

function formatDateTime(dt) {
  if (!dt) return "—";
  const d = new Date(String(dt).replace(" ", "T"));
  if (isNaN(d)) return dt;
  return d.toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  successBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#E8F3EE", borderRadius: 12, padding: 14, marginBottom: 14,
  },
  successText: { color: colors.success, fontSize: 16, fontWeight: "800" },
  card: {
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    padding: 18, marginBottom: 14,
  },
  smallLabel: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  otpValue: { fontSize: 26, fontWeight: "900", color: colors.text, letterSpacing: 2, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { fontSize: 14, color: colors.muted },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: "700", flexShrink: 1, textAlign: "right", marginLeft: 12 },
  note: { flexDirection: "row", backgroundColor: "#EAF4EF", borderRadius: 12, padding: 14, marginBottom: 16 },
  noteText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
  doneBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, alignItems: "center" },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
