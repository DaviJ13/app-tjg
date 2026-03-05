// app/debug.tsx
import { View, Text, Pressable } from "react-native";
import { router, type Href } from "expo-router";

function Btn({ title, to }: { title: string; to: Href }) {
  return (
    <Pressable
      onPress={() => router.push(to)}
      style={{
        padding: 14,
        borderRadius: 12,
        backgroundColor: "#1c2a38",
        marginTop: 10,
      }}
    >
      <Text style={{ color: "white", fontWeight: "800" }}>{title}</Text>
      <Text style={{ color: "#9fb0c2", marginTop: 4 }}>
        {typeof to === "string" ? to : JSON.stringify(to)}
      </Text>
    </Pressable>
  );
}

export default function Debug() {
  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "#0b0f14" }}>
      <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>
        Debug Rotas
      </Text>

      <Btn title="Membro • Carteirinha" to="/(membro)/(tabs)/carteirinha" />
      <Btn title="Membro • Comprar" to="/(membro)/(tabs)/comprar" />

      <Btn title="Líder • Carteirinha" to="/(lider)/(tabs)/carteirinha" />
      <Btn title="Líder • Comprar" to="/(lider)/(tabs)/comprar" />
      <Btn title="Líder • Membros" to="/(lider)/(tabs)/membros" />
      <Btn title="Líder • Avisos" to="/(lider)/(tabs)/avisos" />

      <Btn title="Cadastro membro (líder)" to="/(lider)/cadastro-membro" />
      <Btn title="Login" to="/(public)/login" />
      <Btn title="Cadastre-se" to="/(public)/cadastre-se" />
    </View>
  );
}