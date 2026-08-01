import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { api, extractError } from "../api/client";
import { colors } from "../theme";

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

export default function LeaveRequestScreen({ navigation }) {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveType, setLeaveType] = useState(null);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [reason, setReason] = useState("");
  const [picker, setPicker] = useState(null); // "from" | "to" | null
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const types = (await api.getLeaveTypes()) || [];
        setLeaveTypes(types);
        if (types.length) setLeaveType(types[0]);
      } catch (e) {
        setError(extractError(e));
      }
    })();
  }, []);

  async function onSubmit() {
    if (!leaveType) { setError("Select a leave type."); return; }
    setSaving(true);
    setError(null);
    try {
      await api.createLeaveRequest({
        leave_type: leaveType,
        from_date: toISO(fromDate),
        to_date: toISO(toDate),
        reason,
      });
      navigation.navigate("LeaveList");
    } catch (e) {
      setError(extractError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Leave Type</Text>
      <View style={styles.chips}>
        {leaveTypes.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, leaveType === t && styles.chipActive]}
            onPress={() => setLeaveType(t)}
          >
            <Text style={[styles.chipText, leaveType === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
        {leaveTypes.length === 0 ? <Text style={styles.muted}>Loading leave types…</Text> : null}
      </View>

      <Text style={styles.label}>From Date</Text>
      <TouchableOpacity style={styles.dateField} onPress={() => setPicker("from")}>
        <Text style={styles.dateText}>{toISO(fromDate)}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>To Date</Text>
      <TouchableOpacity style={styles.dateField} onPress={() => setPicker("to")}>
        <Text style={styles.dateText}>{toISO(toDate)}</Text>
      </TouchableOpacity>

      {picker && (
        <DateTimePicker
          value={picker === "from" ? fromDate : toDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(e, d) => {
            setPicker(Platform.OS === "ios" ? picker : null);
            if (d) {
              if (picker === "from") { setFromDate(d); if (d > toDate) setToDate(d); }
              else setToDate(d);
            }
            if (Platform.OS === "ios" && e.type === "set") setPicker(null);
          }}
        />
      )}

      <Text style={styles.label}>Reason</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={reason}
        onChangeText={setReason}
        placeholder="Reason for leave"
        placeholderTextColor={colors.muted}
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={[styles.button, saving && styles.disabled]} onPress={onSubmit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Request</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  label: { fontSize: 13, color: colors.muted, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8, backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  muted: { color: colors.muted },
  dateField: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: "#fff" },
  dateText: { fontSize: 16, color: colors.text, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text, backgroundColor: "#fff" },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, alignItems: "center", marginTop: 22 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, fontSize: 14, marginTop: 14, textAlign: "center" },
});
