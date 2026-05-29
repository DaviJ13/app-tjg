import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

type Aviso = {
  id: string;
  titulo: string | null;
  mensagem: string | null;
  bonde_id: string | null;
  zona_id: string | null;
  criado_por: string | null;
  created_at: string | null;
};

type Reuniao = {
  id: string;
  titulo: string | null;
  descricao: string | null;
  local: string | null;
  data_hora: string | null;
  bonde_id: string | null;
  zona_id: string | null;
  destino: string | null;
  created_at: string | null;
};

type Aba = "avisos" | "reunioes";

export default function AvisosTab() {
  const { profile } = useAuth();
  const [aba, setAba] = useState<Aba>("avisos");
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);

  // Form aviso
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");

  // Form reunião
  const [rTitulo, setRTitulo] = useState("");
  const [rDescricao, setRDescricao] = useState("");
  const [rLocal, setRLocal] = useState("");
  const [rData, setRData] = useState("");
  const [rHora, setRHora] = useState("");

  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregar();
  }, [profile, aba]);

  async function carregar() {
    try {
      setLoading(true);
      if (aba === "avisos") {
        const { data, error } = await supabase
          .from("avisos")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setAvisos((data ?? []) as Aviso[]);
      } else {
        const { data, error } = await supabase
          .from("reunioes")
          .select("*")
          .order("data_hora", { ascending: true });
        if (error) throw error;
        setReunioes((data ?? []) as Reuniao[]);
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.message);
    } finally {
      setLoading(false);
    }
  }

  async function salvarAviso() {
    if (!titulo.trim() || !mensagem.trim()) {
      Alert.alert("Atenção", "Preencha título e mensagem.");
      return;
    }
    try {
      setSalvando(true);
      const { error } = await supabase.from("avisos").insert({
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        bonde_id: profile?.bonde_id ?? null,
        zona_id: profile?.zona_id ?? null,
        criado_por: profile?.id,
      });
      if (error) throw error;
      setTitulo("");
      setMensagem("");
      setModalAberto(false);
      carregar();
    } catch (e: any) {
      Alert.alert("Erro", e?.message);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarReuniao() {
    if (!rTitulo.trim() || !rData.trim() || !rHora.trim()) {
      Alert.alert("Atenção", "Preencha título, data e hora.");
      return;
    }
    // Monta data no formato ISO
    const [dia, mes, ano] = rData.split("/");
    const isoStr = `${ano}-${mes}-${dia}T${rHora}:00`;
    const dataHora = new Date(isoStr);
    if (isNaN(dataHora.getTime())) {
      Alert.alert("Data inválida", "Use o formato DD/MM/AAAA e HH:MM.");
      return;
    }
    try {
      setSalvando(true);
      const { error } = await supabase.from("reunioes").insert({
        titulo: rTitulo.trim(),
        descricao: rDescricao.trim() || null,
        local: rLocal.trim() || null,
        data_hora: dataHora.toISOString(),
        bonde_id: profile?.bonde_id ?? null,
        zona_id: profile?.zona_id ?? null,
        criado_por: profile?.id,
        destino: profile?.bonde_id ? "bonde" : "zona",
      });
      if (error) throw error;
      setRTitulo("");
      setRDescricao("");
      setRLocal("");
      setRData("");
      setRHora("");
      setModalAberto(false);
      carregar();
    } catch (e: any) {
      Alert.alert("Erro", e?.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(tipo: "aviso" | "reuniao", id: string) {
    Alert.alert("Confirmar", "Deseja excluir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          const tabela = tipo === "aviso" ? "avisos" : "reunioes";
          await supabase.from(tabela).delete().eq("id", id);
          carregar();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={s.page}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Comunicados</Text>
        <Pressable
          style={s.btnAdd}
          onPress={() => setModalAberto(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.btnAddText}>Novo</Text>
        </Pressable>
      </View>

      {/* Abas */}
      <View style={s.abas}>
        <Pressable
          style={[s.aba, aba === "avisos" && s.abaAtiva]}
          onPress={() => setAba("avisos")}
        >
          <Ionicons name="megaphone" size={16} color={aba === "avisos" ? "#0ea5ff" : "#666"} />
          <Text style={[s.abaText, aba === "avisos" && s.abaTextAtiva]}>Avisos</Text>
        </Pressable>
        <Pressable
          style={[s.aba, aba === "reunioes" && s.abaAtiva]}
          onPress={() => setAba("reunioes")}
        >
          <Ionicons name="calendar" size={16} color={aba === "reunioes" ? "#0ea5ff" : "#666"} />
          <Text style={[s.abaText, aba === "reunioes" && s.abaTextAtiva]}>Reuniões</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#0ea5ff" />
        </View>
      ) : aba === "avisos" ? (
        <FlatList
          data={avisos}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="megaphone-outline" size={40} color="#333" />
              <Text style={s.muted}>Nenhum aviso ainda</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.cardIcon}>
                  <Ionicons name="megaphone" size={18} color="#0ea5ff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitulo}>{item.titulo}</Text>
                  <Text style={s.cardData}>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })
                      : "-"}
                  </Text>
                </View>
                <Pressable onPress={() => excluir("aviso", item.id)}>
                  <Ionicons name="trash-outline" size={18} color="#E24B4A" />
                </Pressable>
              </View>
              <Text style={s.cardMensagem}>{item.mensagem}</Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={reunioes}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="calendar-outline" size={40} color="#333" />
              <Text style={s.muted}>Nenhuma reunião marcada</Text>
            </View>
          }
          renderItem={({ item }) => {
            const data = item.data_hora ? new Date(item.data_hora) : null;
            const passada = data ? data < new Date() : false;
            return (
              <View style={[s.card, passada && s.cardPassada]}>
                <View style={s.cardTop}>
                  <View style={s.reuniaoData}>
                    <Text style={s.reuniaoDia}>
                      {data ? data.getDate().toString().padStart(2, "0") : "--"}
                    </Text>
                    <Text style={s.reuniaoMes}>
                      {data ? data.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase() : "---"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitulo}>{item.titulo}</Text>
                    {item.local && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <Ionicons name="location-outline" size={12} color="#666" />
                        <Text style={s.cardData}>{item.local}</Text>
                      </View>
                    )}
                    {data && (
                      <Text style={s.cardData}>
                        {data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}h
                      </Text>
                    )}
                  </View>
                  <Pressable onPress={() => excluir("reuniao", item.id)}>
                    <Ionicons name="trash-outline" size={18} color="#E24B4A" />
                  </Pressable>
                </View>
                {item.descricao && (
                  <Text style={s.cardMensagem}>{item.descricao}</Text>
                )}
                {passada && (
                  <View style={s.tagPassada}>
                    <Text style={s.tagPassadaText}>Realizada</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Modal novo aviso/reunião */}
      <Modal
        visible={modalAberto}
        animationType="slide"
        transparent
        onRequestClose={() => setModalAberto(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.overlay}
        >
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitulo}>
              {aba === "avisos" ? "Novo aviso" : "Nova reunião"}
            </Text>

            {aba === "avisos" ? (
              <>
                <TextInput
                  value={titulo}
                  onChangeText={setTitulo}
                  placeholder="Título do aviso"
                  placeholderTextColor="#555"
                  style={s.input}
                />
                <TextInput
                  value={mensagem}
                  onChangeText={setMensagem}
                  placeholder="Mensagem..."
                  placeholderTextColor="#555"
                  style={[s.input, s.inputArea]}
                  multiline
                  numberOfLines={4}
                />
                <Pressable
                  style={[s.salvarBt, salvando && s.salvarBtDisabled]}
                  onPress={salvarAviso}
                  disabled={salvando}
                >
                  {salvando ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.salvarBtText}>Publicar aviso</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <TextInput
                  value={rTitulo}
                  onChangeText={setRTitulo}
                  placeholder="Título da reunião"
                  placeholderTextColor="#555"
                  style={s.input}
                />
                <TextInput
                  value={rLocal}
                  onChangeText={setRLocal}
                  placeholder="Local (opcional)"
                  placeholderTextColor="#555"
                  style={s.input}
                />
                <View style={s.dataHoraRow}>
                  <TextInput
                    value={rData}
                    onChangeText={setRData}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#555"
                    style={[s.input, { flex: 1 }]}
                    keyboardType="numeric"
                  />
                  <TextInput
                    value={rHora}
                    onChangeText={setRHora}
                    placeholder="HH:MM"
                    placeholderTextColor="#555"
                    style={[s.input, { width: 100 }]}
                    keyboardType="numeric"
                  />
                </View>
                <TextInput
                  value={rDescricao}
                  onChangeText={setRDescricao}
                  placeholder="Descrição (opcional)"
                  placeholderTextColor="#555"
                  style={[s.input, s.inputArea]}
                  multiline
                  numberOfLines={3}
                />
                <Pressable
                  style={[s.salvarBt, salvando && s.salvarBtDisabled]}
                  onPress={salvarReuniao}
                  disabled={salvando}
                >
                  {salvando ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.salvarBtText}>Marcar reunião</Text>
                  )}
                </Pressable>
              </>
            )}

            <Pressable
              style={s.cancelarBt}
              onPress={() => setModalAberto(false)}
            >
              <Text style={s.cancelarBtText}>Cancelar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0b0b0c" },
  header: {
    backgroundColor: "#0ea5ff",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "900" },
  btnAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  btnAddText: { color: "#fff", fontWeight: "900" },

  abas: {
    flexDirection: "row",
    margin: 14,
    backgroundColor: "#111115",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  aba: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  abaAtiva: { backgroundColor: "#0ea5ff18", borderWidth: 1, borderColor: "#0ea5ff44" },
  abaText: { color: "#666", fontWeight: "700" },
  abaTextAtiva: { color: "#0ea5ff" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 60 },
  muted: { color: "#555" },

  card: {
    backgroundColor: "#111115",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e1e24",
    gap: 10,
  },
  cardPassada: { opacity: 0.6 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0ea5ff18",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitulo: { color: "#fff", fontWeight: "900", fontSize: 15 },
  cardData: { color: "#666", fontSize: 12, marginTop: 2 },
  cardMensagem: { color: "#aaa", fontSize: 13, lineHeight: 20 },

  reuniaoData: {
    width: 48,
    alignItems: "center",
    backgroundColor: "#0ea5ff18",
    borderRadius: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#0ea5ff33",
  },
  reuniaoDia: { color: "#0ea5ff", fontSize: 22, fontWeight: "900" },
  reuniaoMes: { color: "#0ea5ff", fontSize: 10, fontWeight: "700" },

  tagPassada: {
    alignSelf: "flex-start",
    backgroundColor: "#1D9E7522",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagPassadaText: { color: "#1D9E75", fontSize: 11, fontWeight: "700" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#111115",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#333",
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetTitulo: { color: "#fff", fontSize: 20, fontWeight: "900" },

  input: {
    backgroundColor: "#0b0b0c",
    borderRadius: 14,
    padding: 14,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#2a2a2e",
  },
  inputArea: { minHeight: 100, textAlignVertical: "top" },
  dataHoraRow: { flexDirection: "row", gap: 10 },

  salvarBt: {
    backgroundColor: "#0ea5ff",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  salvarBtDisabled: { opacity: 0.6 },
  salvarBtText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  cancelarBt: {
    backgroundColor: "#1a1a1e",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelarBtText: { color: "#888", fontWeight: "700" },
});