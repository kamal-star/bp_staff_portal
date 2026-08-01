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

const TABS = ["Current Stock", "Stock Take"];

export default function PhysicalStockScreen() {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.getStock();
      setData(res);
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onSubmitTake() {
    const rows = (data?.stock || [])
      .filter((s) => counts[s.item_code] !== undefined && counts[s.item_code] !== "")
      .map((s) => ({ item_code: s.item_code, qty: Number(counts[s.item_code]) }));
    if (rows.length === 0) {
      setError("Enter at least one counted quantity.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.submitStockTake({ counts: rows });
      setMessage(`Stock take saved (${res.name}) for supervisor review.`);
      setCounts({});
    } catch (e) {
      setError(extractError(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const stock = data?.stock || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.tabs}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === i && styles.tabActive]} onPress={() => { setTab(i); setError(null); setMessage(null); }}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sub}>{data?.station} · Stock levels for {data?.date}</Text>

      {stock.length === 0 ? (
        <Text style={styles.emptyText}>No stock records found for this station.</Text>
      ) : tab === 0 ? (
        <View style={styles.table}>
          <View style={[styles.tr, styles.trHead]}>
            <Text style={[styles.th, { flex: 2 }]}>Product</Text>
            <Text style={styles.th}>Balance</Text>
          </View>
          {stock.map((s) => (
            <View key={s.item_code} style={styles.tr}>
              <Text style={[styles.td, styles.tdName, { flex: 2 }]}>{s.product}</Text>
              <Text style={styles.td}>{money(s.balance)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <>
          <View style={styles.table}>
            <View style={[styles.tr, styles.trHead]}>
              <Text style={[styles.th, { flex: 2 }]}>Product</Text>
              <Text style={styles.th}>System</Text>
              <Text style={[styles.th, { flex: 1.3 }]}>Counted</Text>
            </View>
            {stock.map((s) => (
              <View key={s.item_code} style={styles.tr}>
                <Text style={[styles.td, styles.tdName, { flex: 2 }]}>{s.product}</Text>
                <Text style={styles.td}>{money(s.balance)}</Text>
                <TextInput
                  style={styles.countInput}
                  value={counts[s.item_code] ?? ""}
                  onChangeText={(v) => setCounts((p) => ({ ...p, [s.item_code]: v.replace(/[^0-9.]/g, "") }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                />
              </View>
            ))}
          </View>
          <TouchableOpacity style={[styles.button, saving && styles.disabled]} onPress={onSubmitTake} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Stock Take</Text>}
          </TouchableOpacity>
        </>
      )}

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={16} color={colors.primaryLight} />
        <Text style={styles.noteText}>{"  "}Stock levels are based on shift data and system records.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  tabs: { flexDirection: "row", backgroundColor: "#E8ECEA", borderRadius: 10, padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: colors.card },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.muted },
  tabTextActive: { color: colors.primary, fontWeight: "800" },
  sub: { fontSize: 13, color: colors.muted, marginBottom: 12, fontWeight: "600" },
  table: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  tr: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  trHead: { borderTopWidth: 0, backgroundColor: "#F0F4F2" },
  th: { flex: 1, fontSize: 12, fontWeight: "800", color: colors.muted, textAlign: "right" },
  td: { flex: 1, fontSize: 14, color: colors.text, textAlign: "right" },
  tdName: { textAlign: "left", fontWeight: "700" },
  countInput: { flex: 1.3, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 8, marginLeft: 6, fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", backgroundColor: "#fff" },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, alignItems: "center", marginTop: 16 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  success: { color: colors.success, fontSize: 14, marginTop: 14, textAlign: "center", fontWeight: "600" },
  error: { color: colors.danger, fontSize: 14, marginTop: 14, textAlign: "center" },
  emptyText: { color: colors.muted, fontSize: 15, marginTop: 20, textAlign: "center" },
  note: { flexDirection: "row", backgroundColor: "#EAF4EF", borderRadius: 10, padding: 12, marginTop: 18 },
  noteText: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 18 },
});
