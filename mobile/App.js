import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { colors } from "./src/theme";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ValidateOrderScreen from "./src/screens/ValidateOrderScreen";
import OrderServedScreen from "./src/screens/OrderServedScreen";
import StartShiftScreen from "./src/screens/StartShiftScreen";
import EndShiftScreen from "./src/screens/EndShiftScreen";
import CashupScreen from "./src/screens/CashupScreen";
import MoreScreen from "./src/screens/MoreScreen";
import HRScreen from "./src/screens/HRScreen";
import AttendanceScreen from "./src/screens/AttendanceScreen";
import LeaveRequestScreen from "./src/screens/LeaveRequestScreen";
import LeaveListScreen from "./src/screens/LeaveListScreen";
import AbsenceReportScreen from "./src/screens/AbsenceReportScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "700" },
  contentStyle: { backgroundColor: colors.bg },
};

function ValidateStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen
        name="Validate"
        component={ValidateOrderScreen}
        options={{ title: "Fuel Order Validation" }}
      />
      <Stack.Screen
        name="OrderServed"
        component={OrderServedScreen}
        options={{ title: "Order Served", headerBackVisible: false }}
      />
    </Stack.Navigator>
  );
}

function MoreStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="MoreMenu" component={MoreScreen} options={{ title: "More" }} />
      <Stack.Screen name="StartShift" component={StartShiftScreen} options={{ title: "Start Shift" }} />
      <Stack.Screen name="EndShift" component={EndShiftScreen} options={{ title: "End Shift" }} />
      <Stack.Screen name="HR" component={HRScreen} options={{ title: "HR – Absence & Leave" }} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: "My Attendance" }} />
      <Stack.Screen name="LeaveRequest" component={LeaveRequestScreen} options={{ title: "Leave Request" }} />
      <Stack.Screen name="LeaveList" component={LeaveListScreen} options={{ title: "My Leave Requests" }} />
      <Stack.Screen name="AbsenceReport" component={AbsenceReportScreen} options={{ title: "Absence Report" }} />
    </Stack.Navigator>
  );
}

const TAB_ICONS = {
  Home: "home",
  ValidateTab: "qr-code",
  Cashup: "cash",
  More: "ellipsis-horizontal",
};

// Active tab: icon lifts into a highlighted brand-green circle floating above the bar.
function TabIcon({ routeName, focused }) {
  const base = TAB_ICONS[routeName];
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons
        name={focused ? base : `${base}-outline`}
        size={22}
        color={focused ? "#fff" : colors.muted}
      />
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...headerStyle,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { height: 66, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
        tabBarIcon: ({ focused }) => <TabIcon routeName={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Home" }} />
      <Tab.Screen
        name="ValidateTab"
        component={ValidateStack}
        options={{ title: "Validate", headerShown: false }}
      />
      <Tab.Screen name="Cashup" component={CashupScreen} options={{ title: "Cashup" }} />
      <Tab.Screen
        name="More"
        component={MoreStack}
        options={{ title: "More", headerShown: false }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return session ? <MainTabs /> : <LoginScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
    transform: [{ translateY: -16 }],
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
