import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { api, extractError } from "../api/client";
import { colors, money } from "../theme";
import { DEPOSIT_TYPES } from "../constants";

export default function EndShiftScreen({ navigation }) {
  const [shift, setShift] = useState(null);
  const [rows, setRows] = useState([]);
  const [deposits, setDeposits] = useState(() =>
    DEPOSIT_TYPES.map((t) => ({ deposit_type: t, amount: "" }))
  );
  const [creditSales, setCreditSales] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getShift();
      if (!res?.active) {
        setShift(null);
        setLoading(false);
        return;
      }
      setShift(res);
      setRows((res.readings || []).map((r) => ({ ...r, closing_meter: r.closing_meter ? String(r.closing_meter) : "" })));
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function setClosing(i, val) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, closing_meter: val.replace(/[^0-9]/g, "") } : r)));
  }
  function setDeposit(i, val) {
    setDeposits((prev) => prev.map((d, idx) => (idx === i ? { ...d, amount: val.replace(/[^0-9.]/g, "") } : d)));
  }

  const totalDeposits = deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  async function onClose() {
    const readings = rows.map((r) => ({ pump: r.pump, nozzle: r.nozzle, closing_meter: Number(r.closing_meter || 0) }));
    const deps = deposits.filter((d) => Number(d.amount) > 0).map((d) => ({ deposit_type: d.deposit_type, amount: Number(d.amount) }));
    setSaving(true);
    setError(null);
    try {
      await api.endShift({ readings, deposits: deps, credit_sales: Number(creditSales || 0) });
      navigation.navigate("MoreMenu");
    } catch (e) {
      setError(extractError(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  if (!shift) {
    return (
      <View style={styles.center}>
        <Ionicons name="time-outline" size={40} color={colors.muted} />
        <Text style={styles.emptyText}>No open shift to close.</Text>
        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate("StartShift")}>
          <Text style={styles.linkBtnText}>Start a Shift</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>Record closing meter readings before closing shift.</Text>
      <View style={styles.stationRow}>
        <Text style={styles.stationLabel}>Station</Text>
        <Text style={styles.stationValue}>{shift.station || "—"}</Text>
      </View>

      <Text style={styles.sectionTitle}>Pump Meter Readings (Closing)</Text>
      {rows.map((r, i) => (
        <View key={`${r.pump}-${r.nozzle}`} style={styles.readingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pumpName}>{r.pump} · {r.nozzle}</Text>
            <Text style={styles.pumpMeta}>Opening: {money(r.opening_meter)}</Text>
          </View>
          <TextInput
            style={styles.meterInput}
            value={r.closing_meter}
            onChangeText={(v) => setClosing(i, v)}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.muted}
          />
        </View>
      ))}

      <Text style={styles.sectionTitle}>Cash Count Summary</Text>
      {deposits.map((d, i) => (
        <View key={d.deposit_type} style={styles.depRow}>
          <Text style={styles.depLabel}>{d.deposit_type}</Text>
          <TextInput
            style={styles.depInput}
            value={d.amount}
            onChangeText={(v) => setDeposit(i, v)}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.muted}
          />
        </View>
      ))}
      <View style={styles.depRow}>
        <Text style={styles.depLabel}>Credit Sales</Text>
        <TextInput
          style={styles.depInput}
          value={creditSales}
          onChangeText={(v) => setCreditSales(v.replace(/[^0-9.]/g, ""))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.muted}
        />
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Collected (TZS)</Text>
        <Text style={styles.totalValue}>{money(totalDeposits)}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={[styles.button, saving && styles.disabled]} onPress={onClose} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.buttonText}>  Close Shift</Text></>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: 24 },
  intro: { fontSize: 14, color: colors.muted, marginBottom: 14 },
  stationRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14 },
  stationLabel: { fontSize: 14, color: colors.muted, fontWeight: "600" },
  stationValue: { fontSize: 14, color: colors.text, fontWeight: "700" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 20, marginBottom: 10 },
  readingRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  pumpName: { fontSize: 15, fontWeight: "700", color: colors.text },
  pumpMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  meterInput: { width: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "right", backgroundColor: "#fff" },
  depRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  depLabel: { fontSize: 14, color: colors.text, fontWeight: "600" },
  depInput: { width: 140, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "right", backgroundColor: "#fff" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 6, paddingVertical: 10, marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: "700", color: colors.muted },
  totalValue: { fontSize: 20, fontWeight: "900", color: colors.text },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, marginTop: 18 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, fontSize: 14, marginTop: 14, textAlign: "center" },
  emptyText: { color: colors.muted, fontSize: 15, marginTop: 12, textAlign: "center" },
  linkBtn: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20 },
  linkBtnText: { color: "#fff", fontWeight: "700" },
});
