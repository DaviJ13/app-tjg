import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/supabase";

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export default function LoginScreen() {
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);

  async function entrar() {
    console.log("[LOGIN] clicou entrar");
    const cpfDigits = onlyDigits(cpf);
    const email = `${cpfDigits}@tjg.com`;

    try {
      setBusy(true);

      if (cpfDigits.length !== 11) {
        Alert.alert("CPF inválido", "Digite 11 números.");
        return;
      }
      if (!senha) {
        Alert.alert("Senha", "Digite sua senha.");
        return;
      }

      console.log("[LOGIN] tentando com", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      console.log("[LOGIN] retorno", { data, error });

      if (error) {
        Alert.alert("Erro ao entrar", error.message);
        return;
      }

      Alert.alert("Ok", "Logado! Indo para /");
      router.replace("/"); // seu index.tsx deve redirecionar
    } catch (e: any) {
      console.log("[LOGIN] exception", e);
      Alert.alert("Erro", e?.message ?? "Falha inesperada");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "900", marginBottom: 16 }}>Entrar</Text>

      <Text style={{ marginBottom: 6 }}>CPF</Text>
      <TextInput
        value={cpf}
        onChangeText={setCpf}
        keyboardType="numeric"
        placeholder="Somente números"
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 12, marginBottom: 12 }}
      />

      <Text style={{ marginBottom: 6 }}>Senha</Text>
      <TextInput
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        placeholder="Senha"
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 12, marginBottom: 16 }}
      />

      <Pressable
        onPress={entrar}
        disabled={busy}
        style={{
          backgroundColor: busy ? "#888" : "#000",
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "900" }}>{busy ? "Entrando..." : "Entrar"}</Text>
      </Pressable>
    </View>
  );
}