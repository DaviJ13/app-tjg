/**
 * avisos.tsx  (app/(lider)/(tabs)/avisos.tsx)
 * Avisos + Reuniões com seleção de destino por hierarquia
 * Cores TJG: preto #0a0a0a · ouro #F5B800 · branco #FFFFFF
 */
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
    Modal, Platform, Pressable, SafeAreaView, ScrollView,
    StyleSheet, Text, TextInput, View,
} from "react-native";

// ── Paleta TJG ────────────────────────────────────────────
const C = {
  bg:        "#0a0a0a",
  card:      "#141414",
  cardBd:    "#222222",
  ouro:      "#F5B800",
  ouroDim:   "#F5B80020",
  ouroBd:    "#F5B80044",
  branco:    "#FFFFFF",
  cinza:     "#888888",
  cinzaBd:   "#2a2a2a",
  sheet:     "#111111",
  input:     "#0c0c0c",
  vermelho:  "#E53E3E",
  verde:     "#1D9E75",
};

type Aviso = {
  id: string; titulo: string | null; mensagem: string | null;
  bonde_id: string | null; zona_id: string | null;
  criado_por: string | null; created_at: string | null;
};
type Reuniao = {
  id: string; titulo: string | null; descricao: string | null;
  local: string | null; data_hora: string | null; bonde_id: string | null;
  zona_id: string | null; destino: string | null; created_at: string | null;
};
type Bonde = { id: string; nome: string; sigla: string | null; zona_id: string | null };
type Zona  = { id: string; nome: string };
type Aba   = "avisos" | "reunioes";

// Opções de destino montadas pela hierarquia
type OpcaoDestino = {
  label: string;
  icon: string;
  bonde_id: string | null;
  zona_id: string | null;
  destino: string;
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

function formatData(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2");
}
function formatHora(v: string) {
  const d = onlyDigits(v).slice(0, 4);
  return d.replace(/(\d{2})(\d)/, "$1:$2");
}

export default function AvisosTab() {
  const { profile } = useAuth();
  const role = profile?.role ?? "";

  const isDiretoria = role === "diretoria" || role === "resp_socio";
  const isRespZona  = role === "resp_zona";
  const isRespBonde = role === "resp_bonde";

  const [aba, setAba]           = useState<Aba>("avisos");
  const [avisos, setAvisos]     = useState<Aviso[]>([]);
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [zonas, setZonas]       = useState<Zona[]>([]);
  const [bondes, setBondes]     = useState<Bonde[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Campos aviso
  const [titulo, setTitulo]     = useState("");
  const [mensagem, setMensagem] = useState("");

  // Campos reunião
  const [rTitulo, setRTitulo]       = useState("");
  const [rDescricao, setRDescricao] = useState("");
  const [rLocal, setRLocal]         = useState("");
  const [rData, setRData]           = useState("");
  const [rHora, setRHora]           = useState("");

  // Destino selecionado
  const [destino, setDestino] = useState<OpcaoDestino | null>(null);

  useEffect(() => {
    carregarEstrutura();
  }, [profile]);

  useEffect(() => {
    carregar();
  }, [aba, profile]);

  async function carregarEstrutura() {
    if (!profile) return;
    // Zonas
    if (isDiretoria) {
      const { data } = await supabase.from("zonas").select("id,nome").order("nome");
      setZonas((data ?? []) as Zona[]);
    } else if (isRespZona && profile.zona_id) {
      const { data } = await supabase.from("zonas").select("id,nome").eq("id", profile.zona_id);
      setZonas((data ?? []) as Zona[]);
    }
    // Bondes
    let q = supabase.from("bondes").select("id,nome,sigla,zona_id").order("nome");
    if (isRespZona && profile.zona_id)  q = q.eq("zona_id", profile.zona_id);
    if (isRespBonde && profile.bonde_id) q = q.eq("id", profile.bonde_id);
    const { data: bd } = await q;
    setBondes((bd ?? []) as Bonde[]);
  }

  async function carregar() {
    if (!profile) return;
    try {
      setLoading(true);
      if (aba === "avisos") {
        let q = supabase.from("avisos").select("*").order("created_at", { ascending: false });
        // Filtrar pelo escopo: membro vê avisos do seu bonde/zona/geral
        // Líderes veem tudo do seu escopo
        if (isRespBonde && profile.bonde_id) {
          q = q.or(`bonde_id.eq.${profile.bonde_id},zona_id.eq.${profile.zona_id ?? "null"},bonde_id.is.null`);
        } else if (isRespZona && profile.zona_id) {
          q = q.or(`zona_id.eq.${profile.zona_id},bonde_id.is.null`);
        }
        // diretoria vê tudo (sem filtro)
        const { data, error } = await q;
        if (error) throw error;
        setAvisos((data ?? []) as Aviso[]);
      } else {
        let q = supabase.from("reunioes").select("*").order("data_hora", { ascending: true });
        if (isRespBonde && profile.bonde_id) {
          q = q.or(`bonde_id.eq.${profile.bonde_id},zona_id.eq.${profile.zona_id ?? "null"}`);
        } else if (isRespZona && profile.zona_id) {
          q = q.or(`zona_id.eq.${profile.zona_id},bonde_id.is.null`);
        }
        const { data, error } = await q;
        if (error) throw error;
        setReunioes((data ?? []) as Reuniao[]);
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.message);
    } finally {
      setLoading(false);
    }
  }

  // Monta opções de destino com base na hierarquia
  function opcoesDestino(): OpcaoDestino[] {
    const opts: OpcaoDestino[] = [];

    if (isDiretoria) {
      opts.push({ label: "Toda a torcida", icon: "globe", bonde_id: null, zona_id: null, destino: "todos" });
      zonas.forEach(z => {
        opts.push({ label: `Zona: ${z.nome}`, icon: "map", bonde_id: null, zona_id: z.id, destino: "zona" });
        bondes.filter(b => b.zona_id === z.id).forEach(b => {
          opts.push({ label: `Bonde: ${b.sigla ?? b.nome}`, icon: "people", bonde_id: b.id, zona_id: b.zona_id, destino: "bonde" });
        });
      });
      // Bondes sem zona
      bondes.filter(b => !b.zona_id).forEach(b => {
        opts.push({ label: `Bonde: ${b.sigla ?? b.nome}`, icon: "people", bonde_id: b.id, zona_id: null, destino: "bonde" });
      });
    } else if (isRespZona) {
      if (zonas.length > 0) {
        opts.push({ label: `Toda zona: ${zonas[0]?.nome}`, icon: "map", bonde_id: null, zona_id: profile?.zona_id ?? null, destino: "zona" });
      }
      bondes.forEach(b => {
        opts.push({ label: `Bonde: ${b.sigla ?? b.nome}`, icon: "people", bonde_id: b.id, zona_id: b.zona_id, destino: "bonde" });
      });
    } else if (isRespBonde) {
      opts.push({ label: `Meu bonde`, icon: "people", bonde_id: profile?.bonde_id ?? null, zona_id: profile?.zona_id ?? null, destino: "bonde" });
    }

    return opts;
  }

  function abrirModal() {
    const opts = opcoesDestino();
    setDestino(opts.length === 1 ? opts[0] : null);
    setTitulo(""); setMensagem("");
    setRTitulo(""); setRDescricao(""); setRLocal(""); setRData(""); setRHora("");
    setModalAberto(true);
  }

  async function salvarAviso() {
    if (!titulo.trim() || !mensagem.trim()) { Alert.alert("Atenção", "Preencha título e mensagem."); return; }
    if (!destino) { Alert.alert("Selecione o destino do aviso"); return; }
    try {
      setSalvando(true);
      const { error } = await supabase.from("avisos").insert({
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        bonde_id: destino.bonde_id,
        zona_id: destino.zona_id,
        criado_por: profile?.id,
      });
      if (error) throw error;
      setModalAberto(false);
      carregar();
    } catch (e: any) {
      Alert.alert("Erro", e?.message);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarReuniao() {
    if (!rTitulo.trim() || !rData.trim() || !rHora.trim()) { Alert.alert("Atenção", "Preencha título, data e hora."); return; }
    if (!destino) { Alert.alert("Selecione o destino da reunião"); return; }
    const [dia, mes, ano] = rData.split("/");
    const isoStr = `${ano}-${mes}-${dia}T${rHora}:00`;
    const dataHora = new Date(isoStr);
    if (isNaN(dataHora.getTime())) { Alert.alert("Data inválida", "Use DD/MM/AAAA e HH:MM."); return; }
    try {
      setSalvando(true);
      const { error } = await supabase.from("reunioes").insert({
        titulo: rTitulo.trim(),
        descricao: rDescricao.trim() || null,
        local: rLocal.trim() || null,
        data_hora: dataHora.toISOString(),
        bonde_id: destino.bonde_id,
        zona_id: destino.zona_id,
        destino: destino.destino,
        criado_por: profile?.id,
      });
      if (error) throw error;
      setModalAberto(false);
      carregar();
    } catch (e: any) {
      Alert.alert("Erro", e?.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(tipo: "aviso" | "reuniao", id: string) {
    Alert.alert("Confirmar exclusão", "Deseja excluir este item?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => {
        await supabase.from(tipo === "aviso" ? "avisos" : "reunioes").delete().eq("id", id);
        carregar();
      }},
    ]);
  }

  function labelDestino(item: Aviso | Reuniao) {
    if (item.bonde_id) {
      const b = bondes.find(b => b.id === item.bonde_id);
      return b ? `Bonde: ${b.sigla ?? b.nome}` : "Bonde";
    }
    if (item.zona_id) {
      const z = zonas.find(z => z.id === item.zona_id);
      return z ? `Zona: ${z.nome}` : "Zona";
    }
    return "Toda a torcida";
  }

  const opts = opcoesDestino();

  return (
    <SafeAreaView style={s.page}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Comunicados</Text>
          <Text style={s.headerSub}>Avisos e reuniões do seu grupo</Text>
        </View>
        <Pressable style={s.btnNovo} onPress={abrirModal}>
          <Ionicons name="add" size={20} color={C.bg} />
          <Text style={s.btnNovoText}>Novo</Text>
        </Pressable>
      </View>

      {/* ── Abas ── */}
      <View style={s.abas}>
        {(["avisos", "reunioes"] as Aba[]).map(a => (
          <Pressable key={a} style={[s.aba, aba === a && s.abaAtiva]} onPress={() => setAba(a)}>
            <Ionicons name={a === "avisos" ? "megaphone" : "calendar"} size={16}
              color={aba === a ? C.ouro : C.cinza} />
            <Text style={[s.abaText, aba === a && s.abaTextAtiva]}>
              {a === "avisos" ? "Avisos" : "Reuniões"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading
        ? <View style={s.center}><ActivityIndicator color={C.ouro} /></View>
        : aba === "avisos"
          ? (
            <FlatList
              data={avisos}
              keyExtractor={i => i.id}
              contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
              ListEmptyComponent={
                <View style={s.center}>
                  <Ionicons name="megaphone-outline" size={40} color={C.cinzaBd} />
                  <Text style={s.muted}>Nenhum aviso ainda</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={s.card}>
                  <View style={s.cardTop}>
                    <View style={s.cardIconBox}>
                      <Ionicons name="megaphone" size={18} color={C.ouro} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitulo}>{item.titulo}</Text>
                      <View style={s.destRow}>
                        <Ionicons name="send" size={10} color={C.ouro} />
                        <Text style={s.destLabel}>{labelDestino(item)}</Text>
                      </View>
                      <Text style={s.cardData}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                      </Text>
                    </View>
                    <Pressable onPress={() => excluir("aviso", item.id)} hitSlop={10}>
                      <Ionicons name="trash-outline" size={18} color={C.vermelho} />
                    </Pressable>
                  </View>
                  <Text style={s.cardMsg}>{item.mensagem}</Text>
                </View>
              )}
            />
          )
          : (
            <FlatList
              data={reunioes}
              keyExtractor={i => i.id}
              contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
              ListEmptyComponent={
                <View style={s.center}>
                  <Ionicons name="calendar-outline" size={40} color={C.cinzaBd} />
                  <Text style={s.muted}>Nenhuma reunião marcada</Text>
                </View>
              }
              renderItem={({ item }) => {
                const dt = item.data_hora ? new Date(item.data_hora) : null;
                const passada = dt ? dt < new Date() : false;
                return (
                  <View style={[s.card, passada && { opacity: 0.55 }]}>
                    <View style={s.cardTop}>
                      <View style={s.reuniaoDataBox}>
                        <Text style={s.reuniaoDia}>{dt ? dt.getDate().toString().padStart(2,"0") : "--"}</Text>
                        <Text style={s.reuniaoMes}>{dt ? dt.toLocaleDateString("pt-BR",{month:"short"}).replace(".","").toUpperCase() : "---"}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardTitulo}>{item.titulo}</Text>
                        <View style={s.destRow}>
                          <Ionicons name="send" size={10} color={C.ouro} />
                          <Text style={s.destLabel}>{labelDestino(item)}</Text>
                        </View>
                        {item.local && (
                          <View style={{ flexDirection:"row", alignItems:"center", gap:4, marginTop:2 }}>
                            <Ionicons name="location-outline" size={11} color={C.cinza} />
                            <Text style={s.cardData}>{item.local}</Text>
                          </View>
                        )}
                        {dt && <Text style={s.cardData}>{dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}h</Text>}
                      </View>
                      <Pressable onPress={() => excluir("reuniao", item.id)} hitSlop={10}>
                        <Ionicons name="trash-outline" size={18} color={C.vermelho} />
                      </Pressable>
                    </View>
                    {item.descricao && <Text style={s.cardMsg}>{item.descricao}</Text>}
                    {passada && (
                      <View style={s.tagPassada}>
                        <Text style={s.tagPassadaText}>Realizada</Text>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )
      }

      {/* ── Modal ── */}
      <Modal visible={modalAberto} animationType="slide" transparent onRequestClose={() => setModalAberto(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.sheetTitulo}>{aba === "avisos" ? "Novo aviso" : "Nova reunião"}</Text>

              {/* ── Seletor de destino ── */}
              {opts.length > 1 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={s.fieldLabel}>Para quem?</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 8 }}>
                    {opts.map((o, i) => (
                      <Pressable
                        key={i}
                        style={[s.chipDest, destino === o && s.chipDestAtivo]}
                        onPress={() => setDestino(o)}
                      >
                        <Ionicons name={o.icon as any} size={13} color={destino === o ? C.bg : C.cinza} />
                        <Text style={[s.chipDestText, destino === o && s.chipDestTextAtivo]}>
                          {o.label}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
              {/* Destino único (resp_bonde) — mostra fixo */}
              {opts.length === 1 && (
                <View style={[s.chipDest, s.chipDestAtivo, { marginBottom: 14, alignSelf: "flex-start" }]}>
                  <Ionicons name="people" size={13} color={C.bg} />
                  <Text style={[s.chipDestText, s.chipDestTextAtivo]}>{opts[0].label}</Text>
                </View>
              )}

              {/* ── Campos aviso ── */}
              {aba === "avisos" ? (
                <>
                  <Text style={s.fieldLabel}>Título *</Text>
                  <TextInput value={titulo} onChangeText={setTitulo}
                    placeholder="Título do aviso" placeholderTextColor={C.cinza} style={s.input} />

                  <Text style={s.fieldLabel}>Mensagem *</Text>
                  <TextInput value={mensagem} onChangeText={setMensagem}
                    placeholder="Escreva a mensagem..." placeholderTextColor={C.cinza}
                    style={[s.input, s.inputArea]} multiline numberOfLines={4} />

                  <Pressable style={[s.btnSalvar, salvando && s.btnOff]} onPress={salvarAviso} disabled={salvando}>
                    {salvando ? <ActivityIndicator color={C.bg} /> : <Text style={s.btnSalvarText}>Publicar aviso</Text>}
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={s.fieldLabel}>Título *</Text>
                  <TextInput value={rTitulo} onChangeText={setRTitulo}
                    placeholder="Título da reunião" placeholderTextColor={C.cinza} style={s.input} />

                  <Text style={s.fieldLabel}>Local</Text>
                  <TextInput value={rLocal} onChangeText={setRLocal}
                    placeholder="Local (opcional)" placeholderTextColor={C.cinza} style={s.input} />

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fieldLabel}>Data *</Text>
                      <TextInput value={rData} onChangeText={v => setRData(formatData(v))}
                        placeholder="DD/MM/AAAA" placeholderTextColor={C.cinza}
                        style={s.input} keyboardType="numeric" maxLength={10} />
                    </View>
                    <View style={{ width: 110 }}>
                      <Text style={s.fieldLabel}>Hora *</Text>
                      <TextInput value={rHora} onChangeText={v => setRHora(formatHora(v))}
                        placeholder="HH:MM" placeholderTextColor={C.cinza}
                        style={s.input} keyboardType="numeric" maxLength={5} />
                    </View>
                  </View>

                  <Text style={s.fieldLabel}>Descrição</Text>
                  <TextInput value={rDescricao} onChangeText={setRDescricao}
                    placeholder="Descrição (opcional)" placeholderTextColor={C.cinza}
                    style={[s.input, s.inputArea]} multiline numberOfLines={3} />

                  <Pressable style={[s.btnSalvar, salvando && s.btnOff]} onPress={salvarReuniao} disabled={salvando}>
                    {salvando ? <ActivityIndicator color={C.bg} /> : <Text style={s.btnSalvarText}>Marcar reunião</Text>}
                  </Pressable>
                </>
              )}

              <Pressable style={s.btnCancelar} onPress={() => setModalAberto(false)}>
                <Text style={s.btnCancelarText}>Cancelar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.card,
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.cardBd,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  headerTitle: { color: C.branco, fontSize: 24, fontWeight: "900" },
  headerSub: { color: C.cinza, fontSize: 12, marginTop: 2, fontWeight: "600" },
  btnNovo: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.ouro, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
  },
  btnNovoText: { color: C.bg, fontWeight: "900", fontSize: 14 },

  abas: {
    flexDirection: "row", margin: 14,
    backgroundColor: C.card, borderRadius: 14, padding: 4, gap: 4,
    borderWidth: 1, borderColor: C.cardBd,
  },
  aba: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: 10,
  },
  abaAtiva: { backgroundColor: C.ouroDim, borderWidth: 1, borderColor: C.ouroBd },
  abaText: { color: C.cinza, fontWeight: "700", fontSize: 14 },
  abaTextAtiva: { color: C.ouro, fontWeight: "900" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 60 },
  muted: { color: C.cinza, fontWeight: "600" },

  card: {
    backgroundColor: C.card, borderRadius: 18, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: C.cardBd, gap: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardIconBox: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.ouroDim, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.ouroBd,
  },
  cardTitulo: { color: C.branco, fontWeight: "900", fontSize: 15 },
  destRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  destLabel: { color: C.ouro, fontSize: 11, fontWeight: "700" },
  cardData: { color: C.cinza, fontSize: 11, marginTop: 2 },
  cardMsg: { color: "#aaa", fontSize: 13, lineHeight: 20 },

  reuniaoDataBox: {
    width: 52, alignItems: "center",
    backgroundColor: C.ouroDim, borderRadius: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: C.ouroBd,
  },
  reuniaoDia: { color: C.ouro, fontSize: 22, fontWeight: "900" },
  reuniaoMes: { color: C.ouro, fontSize: 10, fontWeight: "800" },

  tagPassada: {
    alignSelf: "flex-start", backgroundColor: `${C.verde}22`,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  tagPassadaText: { color: C.verde, fontSize: 11, fontWeight: "700" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.sheet, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 40, paddingHorizontal: 20, paddingTop: 14, maxHeight: "92%",
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#333",
    alignSelf: "center", marginBottom: 16,
  },
  sheetTitulo: { color: C.branco, fontSize: 20, fontWeight: "900", marginBottom: 16 },

  fieldLabel: { color: C.cinza, fontSize: 12, fontWeight: "700", marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: C.input, borderRadius: 14, padding: 14,
    color: C.branco, fontSize: 14, borderWidth: 1, borderColor: C.cinzaBd, marginBottom: 12,
  },
  inputArea: { minHeight: 100, textAlignVertical: "top" },

  chipDest: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBd, marginRight: 8, marginBottom: 4,
  },
  chipDestAtivo: { backgroundColor: C.ouro, borderColor: C.ouro },
  chipDestText: { color: C.cinza, fontWeight: "700", fontSize: 13 },
  chipDestTextAtivo: { color: C.bg, fontWeight: "900" },

  btnSalvar: {
    backgroundColor: C.ouro, borderRadius: 14,
    paddingVertical: 16, alignItems: "center", marginTop: 4,
  },
  btnOff: { opacity: 0.5 },
  btnSalvarText: { color: C.bg, fontWeight: "900", fontSize: 16 },
  btnCancelar: {
    backgroundColor: C.card, borderRadius: 14,
    paddingVertical: 14, alignItems: "center", marginTop: 10,
    borderWidth: 1, borderColor: C.cardBd,
  },
  btnCancelarText: { color: C.cinza, fontWeight: "700" },
});