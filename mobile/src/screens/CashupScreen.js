import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
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
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await api.getCashup();
      setData(d);
      // Reflect the amount already recorded on the shift so reopening the screen
      // shows the last submitted value instead of a blank field.
      setCashCounted(d?.deposited_cash ? String(Math.round(d.deposited_cash)) : "");
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const expectedCash = data?.cash_sales || 0;
  const difference = (Number(cashCounted) || 0) - expectedCash;
  const hasShift = !!data?.shift;

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
    >
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={styles.dateText}>  {data?.date}</Text>
      </View>

      {!hasShift ? (
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primaryLight} />
          <Text style={styles.noteText}>{"  "}No open shift found. Start a shift first — cashup is recorded on your open shift.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Sales Summary</Text>
          <View style={styles.card}>
            <Row label="Total Sales (TZS)" value={money(data?.total_sales)} bold />
            <Row label="Credit / Card Sales (TZS)" value={money(data?.card_sales)} />
            <Row label="Mobile Money (TZS)" value={money(data?.mobile_money)} />
            <Row label="Expected Cash (TZS)" value={money(expectedCash)} />
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
              <Text style={styles.diffLabel}>Difference vs expected</Text>
              <Text style={[styles.diffValue, { color: difference === 0 ? colors.text : difference < 0 ? colors.danger : colors.success }]}>
                TZS {money(difference)}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Recorded on Shift</Text>
          <View style={styles.card}>
            <Row label="Shift" value={data?.shift} />
            <Row label="Cash Deposited (TZS)" value={money(data?.deposited_cash)} />
            <Row label="Variance / Unaccounted (TZS)" value={money(data?.variance)} bold />
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
            <View style={styles.resultBox}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.resultText}>
                {"  "}Cashup saved. Cash deposited: TZS {money(result.cash_counted)} · Variance: TZS {money(result.variance)}
              </Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.button, saving && styles.disabled]} onPress={onSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Cashup</Text>}
          </TouchableOpacity>
        </>
      )}

      {!hasShift && error ? <Text style={styles.error}>{error}</Text> : null}
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
  rowLabel: { fontSize: 14, color: colors.muted, flexShrink: 1, marginRight: 10 },
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
  resultBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F3EE", borderRadius: 10, padding: 12, marginTop: 16 },
  resultText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "600" },
  note: { flexDirection: "row", backgroundColor: "#EAF4EF", borderRadius: 12, padding: 14, marginTop: 14 },
  noteText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
  error: { color: colors.danger, fontSize: 14, marginTop: 16, textAlign: "center" },
});
