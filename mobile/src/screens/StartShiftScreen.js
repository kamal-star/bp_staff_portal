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
import { colors } from "../theme";

export default function StartShiftScreen({ navigation }) {
  const [station, setStation] = useState(null);
  const [rows, setRows] = useState([]);
  const [existingShift, setExistingShift] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const shift = await api.getShift();
      if (shift?.active) {
        setExistingShift(true);
        setLoading(false);
        return;
      }
      const res = await api.getPumps();
      setStation(res.station);
      setRows((res.pumps || []).map((p) => ({ ...p, opening_meter: String(p.opening_meter ?? "") })));
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function setMeter(i, val) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, opening_meter: val.replace(/[^0-9]/g, "") } : r)));
  }

  async function onStart() {
    const readings = rows.map((r) => ({
      pump: r.pump, nozzle: r.nozzle, product: r.product, price: r.price,
      opening_meter: Number(r.opening_meter || 0),
    }));
    setSaving(true);
    setError(null);
    try {
      await api.startShift(readings);
      navigation.navigate("MoreMenu");
    } catch (e) {
      setError(extractError(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (existingShift) {
    return (
      <View style={styles.center}>
        <Ionicons name="time-outline" size={40} color={colors.muted} />
        <Text style={styles.emptyText}>You already have an open shift.</Text>
        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate("EndShift")}>
          <Text style={styles.linkBtnText}>Go to End Shift</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>Record opening pump readings for each pump.</Text>
      <View style={styles.stationRow}>
        <Text style={styles.stationLabel}>Station</Text>
        <Text style={styles.stationValue}>{station || "—"}</Text>
      </View>

      <Text style={styles.sectionTitle}>Pump Meter Readings (Opening)</Text>
      {rows.length === 0 ? (
        <Text style={styles.emptyText}>No active pumps found for this station.</Text>
      ) : (
        rows.map((r, i) => (
          <View key={`${r.pump}-${r.nozzle}`} style={styles.readingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pumpName}>{r.pump} · {r.nozzle}</Text>
              <Text style={styles.pumpMeta}>{r.product}  ·  TZS {r.price}</Text>
            </View>
            <TextInput
              style={styles.meterInput}
              value={r.opening_meter}
              onChangeText={(v) => setMeter(i, v)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.muted}
            />
          </View>
        ))
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, (saving || rows.length === 0) && styles.disabled]}
        onPress={onStart}
        disabled={saving || rows.length === 0}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <><Ionicons name="play" size={16} color="#fff" /><Text style={styles.buttonText}>  Start Shift</Text></>
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
  readingRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10,
  },
  pumpName: { fontSize: 15, fontWeight: "700", color: colors.text },
  pumpMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  meterInput: {
    width: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "right", backgroundColor: "#fff",
  },
  button: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, marginTop: 18,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, fontSize: 14, marginTop: 14, textAlign: "center" },
  emptyText: { color: colors.muted, fontSize: 15, marginTop: 12, textAlign: "center" },
  linkBtn: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20 },
  linkBtnText: { color: "#fff", fontWeight: "700" },
});
