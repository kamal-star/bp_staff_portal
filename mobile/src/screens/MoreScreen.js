import React from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

export default function MoreScreen({ navigation }) {
  const { session, logout } = useAuth();

  const items = [
    { icon: "play-outline", label: "Start Shift", sub: "Record opening pump readings", onPress: () => navigation.navigate("StartShift") },
    { icon: "log-out-outline", label: "End Shift", sub: "Closing readings & cash count", onPress: () => navigation.navigate("EndShift") },
    { icon: "people-outline", label: "HR – Absence & Leave", sub: "Attendance and leave requests", onPress: () => navigation.navigate("HR") },
  ];

  function confirmLogout() {
    Alert.alert("Sign out?", "You'll need your Staff ID and PIN to sign back in.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(session?.fullName || session?.employeeName || "S").slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{session?.fullName || session?.employeeName || "Staff"}</Text>
          <Text style={styles.meta}>{session?.station || "—"}</Text>
        </View>
      </View>

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

      <TouchableOpacity style={styles.logout} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>  Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.support}>Need help? Contact support · +255 700 123 456</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  profile: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: 14 },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  name: { fontSize: 17, fontWeight: "800", color: colors.text },
  meta: { fontSize: 13, color: colors.primaryLight, fontWeight: "600", marginTop: 2 },
  item: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#E8F3EE", alignItems: "center", justifyContent: "center", marginRight: 14 },
  itemLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  itemSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FBEAE8", borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
  support: { textAlign: "center", color: colors.muted, fontSize: 12, marginTop: 20 },
});
