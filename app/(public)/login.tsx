import { supabase } from "@/supabase";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const onlyDigits = (s: string) => s.replace(/\D/g, "");

function formatCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function LoginScreen() {
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);

  async function entrar() {
    const cpfDigits = onlyDigits(cpf);
    if (cpfDigits.length !== 11) { Alert.alert("CPF inválido", "Digite os 11 números do CPF."); return; }
    if (!senha) { Alert.alert("Digite sua senha"); return; }

    try {
      setBusy(true);
      const email = `${cpfDigits}@tjg.com`;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

      if (error) {
        Alert.alert("Erro ao entrar", "CPF ou senha incorretos.");
        return;
      }

      // O AuthContext vai detectar via onAuthStateChange e redirecionar pelo index.tsx
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha inesperada");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={s.container}>
          {/* Logo / Header */}
          <View style={s.heroBox}>
            <View style={s.logoCircle}>
              <Text style={s.logoText}>TJG</Text>
            </View>
            <Text style={s.appName}>Torcida Jovem do Galo</Text>
            <Text style={s.appSub}>Portal do Associado</Text>
          </View>

          {/* Form */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Entrar</Text>

            <Text style={s.label}>CPF</Text>
            <TextInput
              style={s.input}
              value={cpf}
              onChangeText={(v) => setCpf(formatCPF(v))}
              keyboardType="numeric"
              placeholder="000.000.000-00"
              placeholderTextColor="#94a3b8"
              returnKeyType="next"
            />

            <Text style={s.label}>Senha</Text>
            <TextInput
              style={s.input}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              placeholder="Sua senha"
              placeholderTextColor="#94a3b8"
              returnKeyType="done"
              onSubmitEditing={entrar}
            />

            <Pressable style={[s.btn, busy && s.btnOff]} onPress={entrar} disabled={busy}>
              {busy
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Entrar</Text>}
            </Pressable>

            <View style={s.divider} />

            <Pressable style={s.linkBtn} onPress={() => router.push("/(public)/cadastre-se")}>
              <Text style={s.linkText}>
                Ainda não é membro?{" "}
                <Text style={{ color: "#000", fontWeight: "900" }}>Cadastre-se</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  heroBox: { alignItems: "center", marginBottom: 32 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: { color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: 2 },
  appName: { fontSize: 20, fontWeight: "900", color: "#0f172a" },
  appSub: { marginTop: 4, color: "#64748b", fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardTitle: { fontSize: 22, fontWeight: "900", color: "#0f172a", marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#0f172a",
    marginBottom: 16,
    backgroundColor: "#f8fafc",
  },
  btn: {
    backgroundColor: "#000",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  btnOff: { backgroundColor: "#94a3b8" },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 16 },
  linkBtn: { alignItems: "center" },
  linkText: { color: "#64748b", fontWeight: "600", fontSize: 14 },
});