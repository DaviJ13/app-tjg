import { supabase } from "@/supabase";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

const onlyDigits = (s: string) => s.replace(/\D/g, "");

function formatCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function formatTel(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

export default function CadastreSe() {
  const [step, setStep] = useState<"codigo" | "dados">("codigo");
  const [busy, setBusy] = useState(false);

  // Step 1
  const [codigo, setCodigo] = useState("");
  const [conviteData, setConviteData] = useState<any>(null);

  // Step 2
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNasc, setDataNasc] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");

  // ── STEP 1: verificar código ─────────────────────────────
  async function verificarCodigo() {
    const c = codigo.trim().toUpperCase();
    if (!c) { Alert.alert("Digite o código"); return; }
    try {
      setBusy(true);
      const { data, error } = await supabase
        .from("convites")
        .select("id, bonde_id, usado, expira_em")
        .eq("codigo", c)
        .maybeSingle();

      if (error) throw error;
      if (!data) { Alert.alert("Código inválido", "Solicite um novo código ao responsável."); return; }
      if (data.usado) { Alert.alert("Código já utilizado", "Solicite um novo código."); return; }
      if (new Date(data.expira_em) < new Date()) { Alert.alert("Código expirado", "Solicite um novo código."); return; }

      setConviteData(data);
      setStep("dados");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha ao verificar código");
    } finally {
      setBusy(false);
    }
  }

  // ── STEP 2: cadastrar ────────────────────────────────────
  async function cadastrar() {
    const cpfDigits = onlyDigits(cpf);
    if (!nome.trim()) { Alert.alert("Digite seu nome completo"); return; }
    if (cpfDigits.length !== 11) { Alert.alert("CPF inválido", "Digite os 11 dígitos."); return; }
    if (senha.length < 6) { Alert.alert("Senha curta", "Mínimo 6 caracteres."); return; }
    if (senha !== confirmSenha) { Alert.alert("Senhas não conferem"); return; }

    try {
      setBusy(true);

      // Verificar blacklist
      const { data: black } = await supabase
        .from("blacklist")
        .select("id")
        .eq("cpf", cpfDigits)
        .maybeSingle();
      if (black) { Alert.alert("Cadastro não permitido", "Seu CPF consta na lista de impedidos."); return; }

      // Verificar CPF já cadastrado
      const { data: existente } = await supabase
        .from("profiles")
        .select("id")
        .eq("cpf", cpfDigits)
        .maybeSingle();
      if (existente) { Alert.alert("CPF já cadastrado", "Entre em contato com o responsável."); return; }

      // Buscar nome do bonde e zona (para salvar como texto em profiles)
      let nomeZona: string | null = null;
      let nomeBonde: string | null = null;
      let zonaId: string | null = null;

      if (conviteData.bonde_id) {
        const { data: bondeData } = await supabase
          .from("bondes")
          .select("nome, zona_id, zonas(nome)")
          .eq("id", conviteData.bonde_id)
          .maybeSingle();
        if (bondeData) {
          nomeBonde = bondeData.nome;
          zonaId = bondeData.zona_id;
          nomeZona = (bondeData as any).zonas?.nome ?? null;
        }
      }

      // Criar usuário auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${cpfDigits}@tjg.com`,
        password: senha,
      });
      if (authError || !authData.user) { Alert.alert("Erro ao criar conta", authError?.message ?? "Tente novamente"); return; }

      const userId = authData.user.id;

      // Criar profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        nome: nome.trim(),
        cpf: cpfDigits,
        telefone: onlyDigits(telefone) || null,
        data_nascimento: dataNasc || null,
        bairro: bairro.trim() || null,
        cidade: cidade.trim() || null,
        bonde_id: conviteData.bonde_id ?? null,
        zona_id: zonaId ?? null,
        bonde: nomeBonde,
        zona: nomeZona,
        role: "membro",
        tipo_socio: "membro",
        status: "ativo",
        status_cadastro: "pendente",
      });

      if (profileError) { Alert.alert("Erro ao salvar dados", profileError.message); return; }

      // Marcar convite como usado
      await supabase.from("convites").update({ usado: true }).eq("id", conviteData.id);

      Alert.alert(
        "Cadastro enviado ✅",
        "Seus dados foram enviados para análise. Aguarde a aprovação.",
        [{ text: "OK", onPress: () => router.replace("/(public)/login") }]
      );
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha no cadastro");
    } finally {
      setBusy(false);
    }
  }

  // ── STEP 1 UI ────────────────────────────────────────────
  if (step === "codigo") {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={s.container}>
            <View style={s.heroBox}>
              <View style={s.logoCircle}><Text style={s.logoText}>TJG</Text></View>
              <Text style={s.title}>Cadastro de Membro</Text>
              <Text style={s.sub}>Solicite o código ao responsável{"\n"}do seu bonde para se cadastrar</Text>
            </View>

            <View style={s.card}>
              <Text style={s.label}>Código de acesso</Text>
              <TextInput
                style={s.input}
                value={codigo}
                onChangeText={(v) => setCodigo(v.toUpperCase())}
                placeholder="Ex: TJG-AB12CD"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Pressable style={[s.btn, busy && s.btnOff]} onPress={verificarCodigo} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Verificar código</Text>}
              </Pressable>
              <Pressable style={s.link} onPress={() => router.back()}>
                <Text style={s.linkText}>← Voltar ao login</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── STEP 2 UI ────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={{ marginBottom: 20 }}>
            <Text style={s.title}>Preencha sua ficha</Text>
            <Text style={s.sub}>Código válido ✅  Complete os dados abaixo</Text>
          </View>

          <View style={s.card}>
            <F label="Nome completo *" value={nome} onChangeText={setNome} placeholder="Seu nome completo" />
            <F label="CPF *" value={cpf} onChangeText={(v: string) => setCpf(formatCPF(v))} placeholder="000.000.000-00" keyboardType="numeric" />
            <F label="Telefone / WhatsApp" value={telefone} onChangeText={(v: string) => setTelefone(formatTel(v))} placeholder="(81) 99999-9999" keyboardType="phone-pad" />
            <F label="Data de nascimento" value={dataNasc} onChangeText={setDataNasc} placeholder="DD/MM/AAAA" keyboardType="numeric" />
            <F label="Bairro" value={bairro} onChangeText={setBairro} placeholder="Seu bairro" />
            <F label="Cidade" value={cidade} onChangeText={setCidade} placeholder="Sua cidade" />
            <F label="Senha *" value={senha} onChangeText={setSenha} placeholder="Mínimo 6 caracteres" secureTextEntry />
            <F label="Confirmar senha *" value={confirmSenha} onChangeText={setConfirmSenha} placeholder="Repita a senha" secureTextEntry />

            <Pressable style={[s.btn, busy && s.btnOff]} onPress={cadastrar} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Enviar cadastro</Text>}
            </Pressable>
            <Pressable style={s.link} onPress={() => setStep("codigo")}>
              <Text style={s.linkText}>← Voltar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function F({ label, ...props }: { label: string } & any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} placeholderTextColor="#999" autoCorrect={false} {...props} />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },
  container: { flexGrow: 1, padding: 20, paddingTop: 30 },
  heroBox: { alignItems: "center", marginBottom: 28 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#000", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  logoText: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 2 },
  title: { fontSize: 24, fontWeight: "900", color: "#0f172a", textAlign: "center" },
  sub: { marginTop: 6, color: "#64748b", fontWeight: "600", textAlign: "center", lineHeight: 20 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  label: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, padding: 13, fontSize: 15, color: "#0f172a", backgroundColor: "#f8fafc" },
  btn: { backgroundColor: "#000", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  btnOff: { backgroundColor: "#94a3b8" },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  link: { alignItems: "center", marginTop: 16 },
  linkText: { color: "#64748b", fontWeight: "700" },
});