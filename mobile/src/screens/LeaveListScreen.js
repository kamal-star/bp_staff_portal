import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, extractError } from "../api/client";
import { colors } from "../theme";

function statusStyle(status) {
  switch (status) {
    case "Approved": return { bg: "#E8F3EE", fg: colors.success };
    case "Rejected": return { bg: "#FBEAE8", fg: colors.danger };
    default: return { bg: "#FDF2E0", fg: colors.warning };
  }
}
function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleDateString([], { day: "2-digit", month: "short" });
}

export default function LeaveListScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows((await api.getLeaveRequests()) || []);
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={rows}
      keyExtractor={(it) => it.name}
      ListEmptyComponent={<Text style={styles.empty}>No leave requests yet.</Text>}
      renderItem={({ item }) => {
        const s = statusStyle(item.status);
        return (
          <View style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.type}>{item.leave_type}</Text>
              <View style={[styles.pill, { backgroundColor: s.bg }]}>
                <Text style={[styles.pillText, { color: s.fg }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.dates}>
              {formatDate(item.from_date)} – {formatDate(item.to_date)}
              {item.total_leave_days ? `  ·  ${item.total_leave_days} day(s)` : ""}
            </Text>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: 24 },
  card: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 10 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  type: { fontSize: 15, fontWeight: "700", color: colors.text },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 12, fontWeight: "800" },
  dates: { fontSize: 13, color: colors.muted, marginTop: 6, fontWeight: "600" },
  desc: { fontSize: 13, color: colors.text, marginTop: 6 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 30, fontSize: 15 },
  error: { color: colors.danger, fontSize: 15, textAlign: "center" },
});
