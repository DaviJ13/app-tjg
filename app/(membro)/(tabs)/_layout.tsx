import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function MembroTabsLayout() {
  return (
    <Tabs initialRouteName="carteirinha" screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="carteirinha"
        options={{
          title: "Carteirinha",
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="card" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="comprar"
        options={{
          title: "Sócio",
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}