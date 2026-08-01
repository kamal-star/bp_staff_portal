import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, extractError } from "../api/client";
import { colors, statusColor } from "../theme";

export default function AttendanceScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows((await api.getAttendance()) || []);
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
      ListEmptyComponent={<Text style={styles.empty}>No attendance records yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View>
            <Text style={styles.date}>{formatDate(item.attendance_date)}</Text>
            {item.working_hours ? <Text style={styles.hours}>{item.working_hours} hrs</Text> : null}
          </View>
          <View style={[styles.pill, { backgroundColor: statusBg(item.status) }]}>
            <Text style={[styles.pillText, { color: statusColor(item.status === "Present" ? "Served" : item.status) }]}>{item.status}</Text>
          </View>
        </View>
      )}
    />
  );
}

function statusBg(status) {
  if (status === "Present") return "#E8F3EE";
  if (status === "Absent") return "#FBEAE8";
  return "#EEF1F0";
}
function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: 24 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 10 },
  date: { fontSize: 15, fontWeight: "700", color: colors.text },
  hours: { fontSize: 12, color: colors.muted, marginTop: 2 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 12, fontWeight: "800" },
  empty: { textAlign: "center", color: colors.muted, marginTop: 30, fontSize: 15 },
  error: { color: colors.danger, fontSize: 15, textAlign: "center" },
});
