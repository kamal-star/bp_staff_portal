import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { api, configureClient, extractError } from "../api/client";

const AuthContext = createContext(null);
const STORAGE_KEY = "bp_staff_session_v1";

const DEFAULT_SERVER =
  (Constants.expoConfig &&
    Constants.expoConfig.extra &&
    Constants.expoConfig.extra.defaultServerUrl) ||
  "https://bpgreatnorth.com";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { serverUrl, apiKey, apiSecret, user, fullName, station, ... }
  const [loading, setLoading] = useState(true);

  // Restore a saved session on cold start.
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          configureClient(saved);
          setSession(saved);
        }
      } catch (_) {
        /* ignore corrupt store */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(serverUrl, usr, pwd) {
    const url = (serverUrl || DEFAULT_SERVER).trim();
    const res = await api.login(url, usr, pwd);
    const next = {
      serverUrl: url,
      apiKey: res.api_key,
      apiSecret: res.api_secret,
      user: res.user,
      fullName: res.full_name,
      employee: res.employee,
      employeeName: res.employee_name,
      salesPerson: res.sales_person,
      station: res.station,
    };
    configureClient(next);
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
    return next;
  }

  async function logout() {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    configureClient({ serverUrl: session?.serverUrl });
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{ session, loading, login, logout, defaultServerUrl: DEFAULT_SERVER, extractError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
