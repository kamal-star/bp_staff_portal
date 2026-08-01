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

export default function CashupScreen() {
  const [data, setData] = useState(null);
  const [cashCounted, setCashCounted] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await api.getCashup());
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const expectedCash = data?.cash_sales || 0;
  const difference = (Number(cashCounted) || 0) - expectedCash;

  async function onSubmit() {
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.submitCashup({
        date: data?.raw_date,
        cash_counted: Number(cashCounted || 0),
        remarks,
      });
      setResult(res);
      await load();
    } catch (e) {
      setError(extractError(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={styles.dateText}>  {data?.date}</Text>
      </View>

      <Text style={styles.sectionTitle}>Sales Summary</Text>
      <View style={styles.card}>
        <Row label="Cash Sales (TZS)" value={money(data?.cash_sales)} />
        <Row label="Card Sales (TZS)" value={money(data?.card_sales)} />
        <Row label="Mobile Money (TZS)" value={money(data?.mobile_money)} />
        <Row label="Total Sales (TZS)" value={money(data?.total_sales)} bold />
      </View>

      <Text style={styles.sectionTitle}>Cash Count</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Cash Counted (TZS)</Text>
        <TextInput
          style={styles.input}
          value={cashCounted}
          onChangeText={(v) => setCashCounted(v.replace(/[^0-9.]/g, ""))}
          keyboardType="decimal-pad"
          placeholder="Enter amount"
          placeholderTextColor={colors.muted}
        />
        <View style={styles.diffRow}>
          <Text style={styles.diffLabel}>Difference</Text>
          <Text style={[styles.diffValue, { color: difference === 0 ? colors.text : difference < 0 ? colors.danger : colors.success }]}>
            TZS {money(difference)}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Remarks (Optional)</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={remarks}
        onChangeText={setRemarks}
        placeholder="Enter any remarks"
        placeholderTextColor={colors.muted}
        multiline
      />

      {result ? (
        <Text style={styles.success}>
          Cashup submitted. Difference: TZS {money(result.difference)}.
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={[styles.button, saving && styles.disabled]} onPress={onSubmit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Cashup</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value, bold }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowValueBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  dateRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14 },
  dateText: { fontSize: 15, fontWeight: "700", color: colors.text },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  rowLabel: { fontSize: 14, color: colors.muted },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: "700" },
  rowValueBold: { fontSize: 16, fontWeight: "900" },
  label: { fontSize: 13, color: colors.muted, fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text, backgroundColor: "#fff" },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  diffRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  diffLabel: { fontSize: 15, fontWeight: "700", color: colors.muted },
  diffValue: { fontSize: 18, fontWeight: "900" },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  success: { color: colors.success, fontSize: 14, marginTop: 16, textAlign: "center", fontWeight: "600" },
  error: { color: colors.danger, fontSize: 14, marginTop: 16, textAlign: "center" },
});
