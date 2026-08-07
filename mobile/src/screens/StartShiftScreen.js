import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
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

const keyOf = (o) => `${o.pump}||${o.nozzle}`;
const labelOf = (o) => `${o.pump}  ·  ${o.nozzle}`;

export default function StartShiftScreen({ navigation }) {
  const [station, setStation] = useState(null);
  const [options, setOptions] = useState([]); // branch pumps (pump+nozzle)
  const [rows, setRows] = useState([]); // selected: {key,pump,nozzle,product,price,last_reading,opening_meter}
  const [existingShift, setExistingShift] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pickerFor, setPickerFor] = useState(null); // row index whose dropdown is open

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
      setOptions(res.pumps || []);
      setRows([]);
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const usedKeys = new Set(rows.filter((r) => r.pump).map(keyOf));
  const availableFor = (idx) =>
    options.filter((o) => !usedKeys.has(keyOf(o)) || (rows[idx] && keyOf(o) === keyOf(rows[idx])));

  function addRow() {
    setRows((p) => [
      ...p,
      { key: Math.random().toString(36).slice(2), pump: null, nozzle: null, product: null, price: null, last_reading: null, opening_meter: "" },
    ]);
  }
  function removeRow(i) { setRows((p) => p.filter((_, idx) => idx !== i)); }
  function choose(i, o) {
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, pump: o.pump, nozzle: o.nozzle, product: o.product, price: o.price, last_reading: o.last_reading } : r)));
    setPickerFor(null);
  }
  function setMeter(i, v) {
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, opening_meter: v.replace(/[^0-9]/g, "") } : r)));
  }

  async function onStart() {
    const valid = rows.filter((r) => r.pump && r.opening_meter !== "");
    if (valid.length === 0) {
      setError("Add at least one pump and enter its opening reading.");
      return;
    }
    const readings = valid.map((r) => ({
      pump: r.pump, nozzle: r.nozzle, product: r.product, price: r.price,
      opening_meter: Number(r.opening_meter),
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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

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
      <Text style={styles.intro}>Add each pump you're operating and enter its opening meter reading.</Text>
      <View style={styles.stationRow}>
        <Text style={styles.stationLabel}>Station</Text>
        <Text style={styles.stationValue}>{station || "—"}</Text>
      </View>

      <Text style={styles.sectionTitle}>Pump Meter Readings (Opening)</Text>

      {rows.length === 0 ? (
        <Text style={styles.hint}>No pumps added yet. Tap “Add Pump” below.</Text>
      ) : (
        rows.map((r, i) => (
          <View key={r.key} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardIndex}>Pump {i + 1}</Text>
              <TouchableOpacity onPress={() => removeRow(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Select Pump</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setPickerFor(i)}>
              <Text style={[styles.dropdownText, !r.pump && { color: colors.muted }]}>
                {r.pump ? labelOf(r) : "Choose a pump…"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </TouchableOpacity>

            {r.pump ? (
              <Text style={styles.meta}>
                {r.product || "—"}  ·  TZS {r.price ?? 0}
                {r.last_reading ? `   ·   Last: ${money(r.last_reading)}` : ""}
              </Text>
            ) : null}

            <Text style={styles.label}>Opening Meter Reading</Text>
            <TextInput
              style={styles.meterInput}
              value={r.opening_meter}
              onChangeText={(v) => setMeter(i, v)}
              keyboardType="number-pad"
              placeholder="Enter opening reading"
              placeholderTextColor={colors.muted}
            />
          </View>
        ))
      )}

      <TouchableOpacity style={styles.addBtn} onPress={addRow}>
        <Ionicons name="add" size={20} color={colors.primary} />
        <Text style={styles.addBtnText}>  Add Pump</Text>
      </TouchableOpacity>

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

      {/* Pump picker */}
      <Modal visible={pickerFor !== null} transparent animationType="fade" onRequestClose={() => setPickerFor(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerFor(null)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select a pump</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {(pickerFor !== null ? availableFor(pickerFor) : []).map((o) => (
                <TouchableOpacity key={keyOf(o)} style={styles.sheetItem} onPress={() => choose(pickerFor, o)}>
                  <View>
                    <Text style={styles.sheetItemLabel}>{labelOf(o)}</Text>
                    <Text style={styles.sheetItemMeta}>
                      {o.product || "—"}  ·  TZS {o.price ?? 0}{o.last_reading ? `  ·  Last: ${money(o.last_reading)}` : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {pickerFor !== null && availableFor(pickerFor).length === 0 ? (
                <Text style={styles.hint}>All pumps for this station are already added.</Text>
              ) : null}
            </ScrollView>
            <TouchableOpacity style={styles.sheetClose} onPress={() => setPickerFor(null)}>
              <Text style={styles.sheetCloseText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  hint: { color: colors.muted, fontSize: 14, paddingVertical: 10, textAlign: "center" },
  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardIndex: { fontSize: 13, fontWeight: "800", color: colors.primaryLight },
  label: { fontSize: 12, color: colors.muted, fontWeight: "600", marginTop: 10, marginBottom: 6 },
  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: "#fff" },
  dropdownText: { fontSize: 15, color: colors.text, fontWeight: "600" },
  meta: { fontSize: 12, color: colors.muted, marginTop: 6 },
  meterInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: "700", color: colors.text, backgroundColor: "#fff" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.primary, borderStyle: "dashed", borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  addBtnText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, marginTop: 18 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, fontSize: 14, marginTop: 14, textAlign: "center" },
  emptyText: { color: colors.muted, fontSize: 15, marginTop: 12, textAlign: "center" },
  linkBtn: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20 },
  linkBtnText: { color: "#fff", fontWeight: "700" },
  // picker
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28 },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 12 },
  sheetItem: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  sheetItemLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  sheetItemMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  sheetClose: { marginTop: 12, alignItems: "center", paddingVertical: 12, backgroundColor: colors.bg, borderRadius: 10 },
  sheetCloseText: { color: colors.text, fontWeight: "700" },
});
