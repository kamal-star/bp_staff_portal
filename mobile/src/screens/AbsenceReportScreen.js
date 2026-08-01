import React, { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { api, extractError } from "../api/client";
import { colors } from "../theme";

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

export default function AbsenceReportScreen({ navigation }) {
  const [date, setDate] = useState(new Date());
  const [reason, setReason] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit() {
    if (!reason.trim()) { setError("Please describe the reason for the absence."); return; }
    setSaving(true);
    setError(null);
    try {
      await api.createAbsenceReport({ from_date: toISO(date), to_date: toISO(date), reason });
      navigation.navigate("Attendance");
    } catch (e) {
      setError(extractError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primaryLight} />
        <Text style={styles.noteText}>{"  "}Report a day you were absent. This marks your attendance as Absent for that date.</Text>
      </View>

      <Text style={styles.label}>Date of Absence</Text>
      <TouchableOpacity style={styles.dateField} onPress={() => setShowPicker(true)}>
        <Text style={styles.dateText}>{toISO(date)}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(e, d) => { setShowPicker(false); if (d) setDate(d); }}
        />
      )}

      <Text style={styles.label}>Reason</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={reason}
        onChangeText={setReason}
        placeholder="Reason for absence"
        placeholderTextColor={colors.muted}
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={[styles.button, saving && styles.disabled]} onPress={onSubmit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Absence Report</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  note: { flexDirection: "row", backgroundColor: "#EAF4EF", borderRadius: 12, padding: 14, marginBottom: 8 },
  noteText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
  label: { fontSize: 13, color: colors.muted, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  dateField: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: "#fff" },
  dateText: { fontSize: 16, color: colors.text, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text, backgroundColor: "#fff" },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, alignItems: "center", marginTop: 22 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, fontSize: 14, marginTop: 14, textAlign: "center" },
});
