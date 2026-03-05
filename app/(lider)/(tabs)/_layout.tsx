import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function LiderTabsLayout() {
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
        name="membros"
        options={{
          title: "Membros",
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="avisos"
        options={{
          title: "Avisos",
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="megaphone" size={size} color={color} />
          ),
        }}
      />

      {/* Se ainda não tiver essas telas, pode esconder por enquanto:
      <Tabs.Screen name="caixa" options={{ href: null }} />
      <Tabs.Screen name="blacklist" options={{ href: null }} />
      */}
    </Tabs>
  );
}