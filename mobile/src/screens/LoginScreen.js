import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

export default function LoginScreen() {
  const { login, defaultServerUrl, extractError } = useAuth();
  const [serverUrl, setServerUrl] = useState(defaultServerUrl);
  const [usr, setUsr] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showServer, setShowServer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit() {
    if (!usr.trim() || !pwd) {
      setError("Enter your Staff ID and PIN.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(serverUrl, usr.trim(), pwd);
    } catch (e) {
      setError(extractError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.primary }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>gn</Text>
          </View>
          <Text style={styles.logo}>Great North</Text>
          <Text style={styles.subtitle}>Staff App</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.welcome}>Welcome Back!</Text>
          <Text style={styles.welcomeSub}>Sign in to continue</Text>

          <Text style={styles.label}>Staff ID</Text>
          <TextInput
            style={styles.input}
            value={usr}
            onChangeText={setUsr}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Enter your staff ID"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.label}>PIN</Text>
          <View style={styles.pwdRow}>
            <TextInput
              style={styles.pwdInput}
              value={pwd}
              onChangeText={setPwd}
              secureTextEntry={!showPwd}
              placeholder="Enter your PIN"
              placeholderTextColor={colors.muted}
              onSubmitEditing={onSubmit}
            />
            <TouchableOpacity onPress={() => setShowPwd((s) => !s)} style={styles.eye}>
              <Text style={styles.eyeText}>{showPwd ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowServer((s) => !s)}>
            <Text style={styles.serverToggle}>
              {showServer ? "Hide server settings" : "Server settings"}
            </Text>
          </TouchableOpacity>
          {showServer && (
            <>
              <Text style={styles.label}>Server URL</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </>
          )}
        </View>

        <Text style={styles.footer}>
          Built for pump attendants and station staff.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 24 },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoBadgeText: { color: colors.primary, fontSize: 28, fontWeight: "900" },
  logo: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: 0.5 },
  subtitle: { color: "#CDE7DB", fontSize: 15, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  welcome: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center" },
  welcomeSub: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 2, marginBottom: 8 },
  label: { fontSize: 13, color: colors.muted, marginBottom: 6, marginTop: 14, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: "#fff",
  },
  pwdRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  pwdInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
  eye: { paddingHorizontal: 14 },
  eyeText: { color: colors.primaryLight, fontWeight: "700", fontSize: 13 },
  serverToggle: { color: colors.primaryLight, fontSize: 13, marginTop: 18, fontWeight: "600", textAlign: "center" },
  error: { color: colors.danger, marginTop: 14, fontSize: 14 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 22,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  footer: { color: "#CDE7DB", textAlign: "center", marginTop: 22, fontSize: 13 },
});
