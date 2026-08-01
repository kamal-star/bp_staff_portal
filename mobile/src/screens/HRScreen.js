import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

export default function HRScreen({ navigation }) {
  const items = [
    { icon: "calendar-outline", label: "My Attendance", sub: "View attendance history", onPress: () => navigation.navigate("Attendance") },
    { icon: "airplane-outline", label: "Leave Request", sub: "Request leave", onPress: () => navigation.navigate("LeaveRequest") },
    { icon: "document-text-outline", label: "My Leave Requests", sub: "View status of your requests", onPress: () => navigation.navigate("LeaveList") },
    { icon: "person-remove-outline", label: "Absence Report", sub: "Report absence", onPress: () => navigation.navigate("AbsenceReport") },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {items.map((it) => (
        <TouchableOpacity key={it.label} style={styles.item} onPress={it.onPress} activeOpacity={0.8}>
          <View style={styles.itemIcon}>
            <Ionicons name={it.icon} size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemLabel}>{it.label}</Text>
            <Text style={styles.itemSub}>{it.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  item: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#E8F3EE", alignItems: "center", justifyContent: "center", marginRight: 14 },
  itemLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  itemSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
