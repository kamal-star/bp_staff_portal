import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, extractError } from "../api/client";
import { colors, money } from "../theme";

const OTP_LEN = 6;

export default function ValidateOrderScreen({ navigation }) {
  const [otp, setOtp] = useState("");
  const [order, setOrder] = useState(null);
  const [searching, setSearching] = useState(false);
  const [serving, setServing] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function onSearch() {
    if (otp.length < OTP_LEN) {
      setError(`Enter the full ${OTP_LEN}-digit OTP.`);
      return;
    }
    setSearching(true);
    setError(null);
    setOrder(null);
    try {
      setOrder(await api.findOrder(otp));
    } catch (e) {
      setError(extractError(e));
    } finally {
      setSearching(false);
    }
  }

  function confirmServe() {
    Alert.alert(
      "Serve this order?",
      "Make sure the fuel has been delivered to the customer before serving.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Serve Order", style: "default", onPress: onServe },
      ]
    );
  }

  async function onServe() {
    setServing(true);
    setError(null);
    try {
      const res = await api.serveOrder(otp);
      navigation.navigate("OrderServed", { order: res });
      setOtp("");
      setOrder(null);
    } catch (e) {
      setError(extractError(e));
    } finally {
      setServing(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.searchHead}>
          <Ionicons name="search" size={18} color={colors.primary} />
          <Text style={styles.searchTitle}>  Search Order by OTP</Text>
        </View>
        <Text style={styles.label}>Enter 6-digit OTP</Text>
        <TextInput
          ref={inputRef}
          style={styles.otpInput}
          value={otp}
          onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, "").slice(0, OTP_LEN))}
          keyboardType="number-pad"
          placeholder="------"
          placeholderTextColor={colors.border}
          maxLength={OTP_LEN}
          onSubmitEditing={onSearch}
        />
        <TouchableOpacity style={[styles.button, searching && styles.disabled]} onPress={onSearch} disabled={searching}>
          {searching ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Search Order</Text>}
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!order && !error && (
        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primaryLight} />
          <Text style={styles.hintText}>
            {"  "}Enter the OTP from the customer's order SMS. If the order exists and has not been served, you will be able to Serve it.
          </Text>
        </View>
      )}

      {order && (
        <View style={styles.card}>
          <View style={styles.foundHead}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.foundTitle}>  Order Found – Ready to Serve</Text>
          </View>

          <View style={styles.otpRow}>
            <View>
              <Text style={styles.smallLabel}>OTP</Text>
              <Text style={styles.otpValue}>{order.otp}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: order.pending_service ? "#FDF2E0" : "#E8F3EE" }]}>
              <Text style={[styles.statusPillText, { color: order.pending_service ? colors.warning : colors.success }]}>
                {order.pending_service ? "Pending Service" : order.status}
              </Text>
            </View>
          </View>

          <Row label="Customer" value={order.customer_name || order.customer} />
          <Row label="Product" value={order.product} />
          <Row label="Quantity" value={`${money(order.qty)} Litres`} />
          <Row label="Vehicle" value={order.vehicle} />
          <Row label="Station" value={order.station} />
          <Row label="Order Time" value={formatDateTime(order.order_time)} />

          {order.pending_service ? (
            <>
              <TouchableOpacity style={[styles.serveBtn, serving && styles.disabled]} onPress={confirmServe} disabled={serving}>
                {serving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="flame" size={18} color="#fff" />
                    <Text style={styles.serveBtnText}>  Serve Order</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={styles.warn}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.received} />
                <Text style={styles.warnText}>{"  "}Make sure the fuel has been delivered to the customer before serving the order.</Text>
              </View>
            </>
          ) : (
            <Text style={styles.alreadyServed}>This order is already {String(order.status).toLowerCase()}.</Text>
          )}
        </View>
      )}
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
  card: {
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    padding: 18, marginBottom: 14,
  },
  searchHead: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  searchTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  label: { fontSize: 13, color: colors.muted, fontWeight: "600", marginBottom: 8 },
  otpInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 14,
    fontSize: 28, letterSpacing: 12, textAlign: "center", color: colors.text, backgroundColor: "#fff",
    fontWeight: "800",
  },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, alignItems: "center", marginTop: 16 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, fontSize: 14, marginBottom: 14, textAlign: "center" },
  hint: { flexDirection: "row", backgroundColor: "#EAF4EF", borderRadius: 12, padding: 14 },
  hintText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },

  foundHead: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  foundTitle: { fontSize: 15, fontWeight: "700", color: colors.success },
  otpRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  smallLabel: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  otpValue: { fontSize: 26, fontWeight: "900", color: colors.text, letterSpacing: 2 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusPillText: { fontSize: 12, fontWeight: "800" },

  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { fontSize: 14, color: colors.muted },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: "700", flexShrink: 1, textAlign: "right", marginLeft: 12 },

  serveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, marginTop: 16,
  },
  serveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  warn: { flexDirection: "row", backgroundColor: "#EAF1FB", borderRadius: 10, padding: 12, marginTop: 12 },
  warnText: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 18 },
  alreadyServed: { marginTop: 14, color: colors.muted, fontStyle: "italic", textAlign: "center" },
});
