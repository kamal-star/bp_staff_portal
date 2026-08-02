import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { api, extractError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, money } from "../theme";

const STATS = [
  { key: "orders_served", label: "Orders Served", fmt: (v) => String(v ?? 0) },
  { key: "litres_sold", label: "Litres Sold", fmt: (v) => `${money(v)} L` },
  { key: "cash_sales", label: "Cash Sales", fmt: (v) => `TZS ${money(v)}` },
  { key: "card_sales", label: "Card Sales", fmt: (v) => `TZS ${money(v)}` },
];

export default function HomeScreen({ navigation }) {
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await api.getHome());
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shift = data?.shift;
  const quickActions = [
    { icon: "qr-code-outline", label: "Validate Order", onPress: () => navigation.navigate("ValidateTab") },
    { icon: "cash-outline", label: "Daily Cashup", onPress: () => navigation.navigate("Cashup") },
    shift
      ? { icon: "log-out-outline", label: "End Shift", onPress: () => navigation.navigate("More", { screen: "EndShift" }) }
      : { icon: "play-outline", label: "Start Shift", onPress: () => navigation.navigate("More", { screen: "StartShift" }) },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          colors={[colors.primary]}
        />
      }
    >
      <Text style={styles.greeting}>Good day,</Text>
      <Text style={styles.name}>{data?.full_name || data?.employee_name || session?.fullName || "there"} 👋</Text>
      <Text style={styles.station}>{data?.station || session?.station || "—"}</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <View style={styles.shiftCard}>
            <View style={styles.shiftHead}>
              <Text style={styles.shiftTitle}>Current Shift</Text>
              <View style={[styles.badge, { backgroundColor: shift ? colors.success : colors.muted }]}>
                <Text style={styles.badgeText}>{shift ? "ACTIVE" : "NO SHIFT"}</Text>
              </View>
            </View>
            {shift ? (
              <View style={styles.shiftRow}>
                <View style={styles.shiftCell}>
                  <Text style={styles.shiftLabel}>Started At</Text>
                  <Text style={styles.shiftValue}>{formatTime(shift.started_at)}</Text>
                </View>
                <View style={styles.shiftCell}>
                  <Text style={styles.shiftLabel}>Duration</Text>
                  <Text style={styles.shiftValue}>{shift.duration || "—"}</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => navigation.navigate("More", { screen: "StartShift" })}
              >
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.startBtnText}>  Start Shift</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.grid}>
            {STATS.map((s) => (
              <View key={s.key} style={styles.statCard}>
                <Text style={styles.statValue}>{s.fmt(data?.[s.key])}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.grid}>
            {quickActions.map((a) => (
              <TouchableOpacity key={a.label} style={styles.action} activeOpacity={0.85} onPress={a.onPress}>
                <View style={styles.actionIcon}>
                  <Ionicons name={a.icon} size={24} color={colors.primary} />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function formatTime(dt) {
  if (!dt) return "—";
  const d = new Date(dt.replace(" ", "T"));
  if (isNaN(d)) return dt;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  greeting: { fontSize: 15, color: colors.muted },
  name: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 2 },
  station: { fontSize: 15, color: colors.primaryLight, fontWeight: "600", marginTop: 2 },

  shiftCard: {
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    padding: 16, marginTop: 20,
  },
  shiftHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  shiftTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  shiftRow: { flexDirection: "row", marginTop: 14 },
  shiftCell: { flex: 1 },
  shiftLabel: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  shiftValue: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 2 },
  startBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, marginTop: 14,
  },
  startBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 16 },
  statCard: {
    width: "48%", backgroundColor: colors.card, borderRadius: 14, borderWidth: 1,
    borderColor: colors.border, padding: 16, marginBottom: 12,
  },
  statValue: { fontSize: 22, fontWeight: "900", color: colors.text },
  statLabel: { fontSize: 13, color: colors.muted, fontWeight: "600", marginTop: 4 },

  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.muted, marginTop: 12 },
  action: {
    width: "48%", backgroundColor: colors.card, borderRadius: 14, borderWidth: 1,
    borderColor: colors.border, padding: 16, marginBottom: 12, alignItems: "center",
  },
  actionIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: "#E8F3EE",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  actionLabel: { fontSize: 14, fontWeight: "700", color: colors.text },
  error: { color: colors.danger, marginTop: 30, textAlign: "center", fontSize: 15 },
});
