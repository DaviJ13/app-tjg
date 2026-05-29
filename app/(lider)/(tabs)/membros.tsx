import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator, Alert, FlatList, Modal, Pressable,
    SafeAreaView, ScrollView, Share, StyleSheet, Text,
    TextInput, View,
} from "react-native";

type Membro = {
  id: string; nome: string | null; cpf: string | null; telefone: string | null;
  role: string | null; tipo_socio: string | null; status: string | null;
  status_cadastro: string | null; bonde: string | null; zona: string | null;
  bonde_id: string | null; zona_id: string | null; created_at: string | null;
};
type Bonde = { id: string; nome: string; sigla: string | null; zona_id: string | null };
type Zona  = { id: string; nome: string };

const ROLE_LABEL: Record<string, string> = {
  membro: "Membro", socio_bronze: "Sócio Bronze", socio_prata: "Sócio Prata",
  socio_ouro: "Sócio Ouro", resp_bonde: "Resp. Bonde", resp_zona: "Resp. Zona",
  resp_socio: "Resp. Sócio", diretoria: "Diretoria",
};
const STATUS_COLOR: Record<string, string> = {
  ativo: "#1D9E75", suspenso: "#EF9F27", expulso: "#E24B4A", pendente: "#888",
};

export default function MembrosTab() {
  const { profile } = useAuth();
  const role = profile?.role ?? "";

  const isDiretoria  = role === "diretoria" || role === "resp_socio";
  const isRespZona   = role === "resp_zona";
  const isRespBonde  = role === "resp_bonde";

  const [membros, setMembros] = useState<Membro[]>([]);
  const [zonas,   setZonas]   = useState<Zona[]>([]);
  const [bondes,  setBondes]  = useState<Bonde[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busca, setBusca]           = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroZonaId, setFiltroZonaId] = useState<string | null>(null);
  const [filtroBondeId, setFiltroBondeId] = useState<string | null>(null);

  // Modais
  const [selecionado,   setSelecionado]   = useState<Membro | null>(null);
  const [modalCodigo,   setModalCodigo]   = useState(false);
  const [codigoGerado,  setCodigoGerado]  = useState("");
  const [gerandoCodigo, setGerandoCodigo] = useState(false);
  const [modalAddZona,  setModalAddZona]  = useState(false);
  const [cpfZona, setCpfZona]             = useState("");
  const [addingZona, setAddingZona]       = useState(false);

  useEffect(() => { init(); }, [profile]);

  async function init() {
    await Promise.all([carregarZonas(), carregarBondes(), carregarMembros()]);
  }

  async function carregarZonas() {
    const { data } = await supabase.from("zonas").select("id, nome").order("nome");
    setZonas((data ?? []) as Zona[]);
  }

  async function carregarBondes() {
    let q = supabase.from("bondes").select("id, nome, sigla, zona_id").order("nome");
    if (isRespZona && profile?.zona_id) q = q.eq("zona_id", profile.zona_id);
    const { data } = await q;
    setBondes((data ?? []) as Bonde[]);
  }

  async function carregarMembros() {
    try {
      setLoading(true);
      let q = supabase
        .from("profiles")
        .select("id,nome,cpf,telefone,role,tipo_socio,status,status_cadastro,bonde,zona,bonde_id,zona_id,created_at")
        .order("nome", { ascending: true });

      if (isRespBonde && profile?.bonde_id) q = q.eq("bonde_id", profile.bonde_id);
      else if (isRespZona && profile?.zona_id) q = q.eq("zona_id", profile.zona_id);
      // diretoria / resp_socio: sem filtro → vê todos

      const { data, error } = await q;
      if (error) throw error;
      setMembros((data ?? []) as Membro[]);
    } catch (e: any) {
      Alert.alert("Erro", e?.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Gerar convite ────────────────────────────────────────
  async function gerarCodigo() {
    if (!profile?.bonde_id && !profile?.zona_id) {
      Alert.alert("Erro", "Você precisa estar vinculado a um bonde ou zona.");
      return;
    }
    try {
      setGerandoCodigo(true);
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let sufixo = "";
      for (let i = 0; i < 6; i++) sufixo += chars[Math.floor(Math.random() * chars.length)];
      const codigo = "TJG-" + sufixo;
      const expira = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from("convites").insert({
        codigo,
        bonde_id: profile?.bonde_id ?? null,
        criado_por: profile?.id,
        expira_em: expira,
        usado: false,
      });
      if (error) throw error;
      setCodigoGerado(codigo);
      setModalCodigo(true);
    } catch (e: any) {
      Alert.alert("Erro", e?.message);
    } finally {
      setGerandoCodigo(false);
    }
  }

  // ── Adicionar membro da zona ao bonde (resp_bonde) ──────
  async function adicionarDaZona() {
    const cpfDigits = cpfZona.replace(/\D/g, "");
    if (cpfDigits.length !== 11) { Alert.alert("CPF inválido"); return; }
    if (!profile?.bonde_id) { Alert.alert("Erro", "Você não está vinculado a um bonde."); return; }
    try {
      setAddingZona(true);
      const { data: found, error: findErr } = await supabase
        .from("profiles")
        .select("id, nome, bonde_id, zona_id, role")
        .eq("cpf", cpfDigits)
        .maybeSingle();

      if (findErr) throw findErr;
      if (!found) { Alert.alert("Membro não encontrado", "CPF não cadastrado na torcida."); return; }
      if (found.bonde_id) { Alert.alert("Membro já tem bonde", `${found.nome} já pertence a um bonde.`); return; }

      // Busca nome do bonde do resp para atualizar campos texto
      const { data: bondeData } = await supabase
        .from("bondes")
        .select("nome, zona_id, zonas(nome)")
        .eq("id", profile.bonde_id)
        .maybeSingle();

      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          bonde_id: profile.bonde_id,
          bonde: bondeData?.nome ?? null,
          zona_id: bondeData?.zona_id ?? null,
          zona: (bondeData as any)?.zonas?.nome ?? null,
        })
        .eq("id", found.id);

      if (upErr) throw upErr;
      Alert.alert("✅ Feito", `${found.nome} foi adicionado ao seu bonde.`);
      setCpfZona("");
      setModalAddZona(false);
      carregarMembros();
    } catch (e: any) {
      Alert.alert("Erro", e?.message);
    } finally {
      setAddingZona(false);
    }
  }

  // ── Alterar status ───────────────────────────────────────
  async function alterarStatus(membro: Membro, novoStatus: string) {
    const { error } = await supabase.from("profiles").update({ status: novoStatus }).eq("id", membro.id);
    if (error) { Alert.alert("Erro", error.message); return; }
    setMembros(prev => prev.map(m => m.id === membro.id ? { ...m, status: novoStatus } : m));
    setSelecionado(null);
    Alert.alert("Pronto", `Status de ${membro.nome} alterado para ${novoStatus}.`);
  }

  // ── Alterar role ─────────────────────────────────────────
  async function alterarRole(membro: Membro, novoRole: string) {
    const { error } = await supabase.from("profiles").update({ role: novoRole }).eq("id", membro.id);
    if (error) { Alert.alert("Erro", error.message); return; }
    setMembros(prev => prev.map(m => m.id === membro.id ? { ...m, role: novoRole } : m));
    setSelecionado(null);
    Alert.alert("Pronto", `Cargo de ${membro.nome} atualizado.`);
  }

  // ── Blacklist ────────────────────────────────────────────
  async function adicionarBlacklist(membro: Membro, motivo: string) {
    await supabase.from("blacklist").insert({
      cpf: membro.cpf, nome: membro.nome, motivo, criado_por: profile?.id,
    });
    await alterarStatus(membro, "expulso");
    Alert.alert("Feito", `${membro.nome} foi adicionado à blacklist.`);
  }

  // ── Aprovação de cadastro ────────────────────────────────
  async function aprovarCadastro(membro: Membro) {
    const { error } = await supabase.from("profiles").update({
      status_cadastro: "aprovado",
      aprovado_por: profile?.id,
      aprovado_em: new Date().toISOString(),
    }).eq("id", membro.id);
    if (error) { Alert.alert("Erro", error.message); return; }
    setMembros(prev => prev.map(m => m.id === membro.id ? { ...m, status_cadastro: "aprovado" } : m));
    setSelecionado(null);
    Alert.alert("✅ Aprovado", `${membro.nome} foi aprovado.`);
  }

  // ── Filtros aplicados ────────────────────────────────────
  const bondesDaZonaFiltrada = filtroZonaId
    ? bondes.filter(b => b.zona_id === filtroZonaId)
    : bondes;

  const membrosFiltrados = membros.filter(m => {
    const matchBusca = busca === "" ||
      (m.nome ?? "").toLowerCase().includes(busca.toLowerCase()) ||
      (m.cpf ?? "").includes(busca.replace(/\D/g, ""));
    const matchStatus = filtroStatus === "todos" || m.status === filtroStatus;
    const matchZona   = !filtroZonaId || m.zona_id === filtroZonaId;
    const matchBonde  = !filtroBondeId || m.bonde_id === filtroBondeId;
    return matchBusca && matchStatus && matchZona && matchBonde;
  });

  const totalAtivos = membros.filter(m => m.status === "ativo").length;
  const totalSocios = membros.filter(m => m.tipo_socio && m.tipo_socio !== "membro").length;
  const totalPendentes = membros.filter(m => m.status_cadastro === "pendente").length;

  const podeConvidar = isRespBonde || isRespZona || isDiretoria;

  return (
    <SafeAreaView style={s.page}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Membros</Text>
          <Text style={s.headerSub}>
            {totalAtivos} ativos · {totalSocios} sócios
            {totalPendentes > 0 ? ` · ${totalPendentes} pendentes` : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {isRespBonde && (
            <Pressable style={s.btnAdd} onPress={() => setModalAddZona(true)}>
              <Ionicons name="person-add-outline" size={16} color="#fff" />
              <Text style={s.btnAddText}>Da zona</Text>
            </Pressable>
          )}
          {podeConvidar && (
            <Pressable style={s.btnAdd} onPress={gerarCodigo} disabled={gerandoCodigo}>
              {gerandoCodigo
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="person-add" size={16} color="#fff" /><Text style={s.btnAddText}>Convidar</Text></>}
            </Pressable>
          )}
        </View>
      </View>

      {/* Filtros */}
      <View style={s.filtros}>
        {/* Busca */}
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color="#888" />
          <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar por nome ou CPF..."
            placeholderTextColor="#666" style={s.searchInput} />
          {busca !== "" && <Pressable onPress={() => setBusca("")}><Ionicons name="close-circle" size={16} color="#888" /></Pressable>}
        </View>

        {/* Filtro zona (diretoria/resp_socio) */}
        {isDiretoria && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
            <Chip label="Todas zonas" ativo={!filtroZonaId} onPress={() => { setFiltroZonaId(null); setFiltroBondeId(null); }} />
            {zonas.map(z => (
              <Chip key={z.id} label={z.nome} ativo={filtroZonaId === z.id}
                onPress={() => { setFiltroZonaId(z.id); setFiltroBondeId(null); }} />
            ))}
          </ScrollView>
        )}

        {/* Filtro bonde */}
        {(isDiretoria || isRespZona) && bondesDaZonaFiltrada.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
            <Chip label="Todos bondes" ativo={!filtroBondeId} onPress={() => setFiltroBondeId(null)} />
            {bondesDaZonaFiltrada.map(b => (
              <Chip key={b.id} label={b.sigla ?? b.nome} ativo={filtroBondeId === b.id}
                onPress={() => setFiltroBondeId(b.id)} />
            ))}
          </ScrollView>
        )}

        {/* Filtro status */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
          {["todos", "ativo", "pendente", "suspenso", "expulso"].map(f => (
            <Chip key={f} label={f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
              ativo={filtroStatus === f} onPress={() => setFiltroStatus(f)} />
          ))}
        </ScrollView>
      </View>

      {/* Lista */}
      {loading
        ? <View style={s.center}><ActivityIndicator color="#0ea5ff" /><Text style={s.muted}>Carregando...</Text></View>
        : (
          <FlatList
            data={membrosFiltrados}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
            ListEmptyComponent={
              <View style={s.center}>
                <Ionicons name="people-outline" size={40} color="#444" />
                <Text style={s.muted}>Nenhum membro encontrado</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable style={s.card} onPress={() => setSelecionado(item)}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{(item.nome ?? "?")[0].toUpperCase()}</Text>
                </View>
                <View style={s.cardBody}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={s.cardNome} numberOfLines={1}>{item.nome ?? "Sem nome"}</Text>
                    {item.status_cadastro === "pendente" && (
                      <View style={s.badgePendente}><Text style={s.badgePendenteText}>pendente</Text></View>
                    )}
                  </View>
                  <Text style={s.cardSub}>
                    {ROLE_LABEL[item.role ?? ""] ?? item.role ?? "-"} · {item.bonde ?? item.zona ?? "Sem bonde"}
                  </Text>
                  <Text style={s.cardSocio}>
                    {item.tipo_socio === "membro" || !item.tipo_socio ? "Membro" : item.tipo_socio.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </Text>
                </View>
                <View style={[s.statusDot, { backgroundColor: STATUS_COLOR[item.status ?? ""] ?? "#888" }]} />
              </Pressable>
            )}
          />
        )
      }

      {/* ── Modal detalhe do membro ────────────────────────── */}
      <Modal visible={!!selecionado} transparent animationType="slide" onRequestClose={() => setSelecionado(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            {selecionado && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Avatar + nome */}
                <View style={s.sheetHeader}>
                  <View style={s.avatarLg}>
                    <Text style={s.avatarLgText}>{(selecionado.nome ?? "?")[0].toUpperCase()}</Text>
                  </View>
                  <Text style={s.sheetNome}>{selecionado.nome}</Text>
                  <Text style={s.sheetRole}>{ROLE_LABEL[selecionado.role ?? ""] ?? selecionado.role}</Text>
                  {selecionado.status_cadastro === "pendente" && (
                    <View style={[s.badgePendente, { marginTop: 6 }]}>
                      <Text style={s.badgePendenteText}>cadastro pendente de aprovação</Text>
                    </View>
                  )}
                </View>

                {/* Infos */}
                <View style={s.infoBox}>
                  <InfoRow label="CPF"      value={selecionado.cpf ? `${selecionado.cpf.slice(0,3)}.***.***-${selecionado.cpf.slice(-2)}` : "-"} />
                  <InfoRow label="Telefone" value={selecionado.telefone ?? "-"} />
                  <InfoRow label="Bonde"    value={selecionado.bonde ?? "-"} />
                  <InfoRow label="Zona"     value={selecionado.zona ?? "-"} />
                  <InfoRow label="Status"   value={selecionado.status ?? "-"} />
                  <InfoRow label="Sócio"    value={selecionado.tipo_socio ?? "-"} />
                  <InfoRow label="Cadastro" value={selecionado.created_at ? new Date(selecionado.created_at).toLocaleDateString("pt-BR") : "-"} />
                </View>

                {/* Ações */}
                <View style={s.acoes}>
                  {/* Aprovar cadastro pendente */}
                  {selecionado.status_cadastro === "pendente" && (
                    <AcaoBtn
                      label="Aprovar cadastro" icon="checkmark-circle" color="#1D9E75"
                      onPress={() => aprovarCadastro(selecionado)}
                    />
                  )}

                  {/* Alterar status */}
                  {selecionado.status !== "ativo" && (
                    <AcaoBtn label="Ativar" icon="checkmark" color="#1D9E75" onPress={() => alterarStatus(selecionado, "ativo")} />
                  )}
                  {selecionado.status !== "suspenso" && (
                    <AcaoBtn label="Suspender" icon="pause-circle" color="#EF9F27" onPress={() => alterarStatus(selecionado, "suspenso")} />
                  )}

                  {/* Blacklist */}
                  <AcaoBtn label="Blacklist" icon="ban" color="#E24B4A" onPress={() => {
                    setSelecionado(null);
                    Alert.prompt("Motivo", `Por que bloquear ${selecionado.nome}?`, motivo => {
                      if (motivo?.trim()) adicionarBlacklist(selecionado, motivo.trim());
                    }, "plain-text");
                  }} />

                  {/* Alterar cargo (diretoria/resp_socio) */}
                  {isDiretoria && (
                    <AcaoBtn label="Alterar cargo" icon="shield" color="#8B5CF6" onPress={() => {
                      const roles = ["membro", "socio_bronze", "socio_prata", "socio_ouro", "resp_bonde", "resp_zona"];
                      Alert.alert("Novo cargo", "Selecione o cargo:", roles.map(r => ({
                        text: ROLE_LABEL[r], onPress: () => alterarRole(selecionado, r),
                      })));
                    }} />
                  )}
                </View>

                <Pressable style={s.fecharBt} onPress={() => setSelecionado(null)}>
                  <Text style={s.fecharBtText}>Fechar</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal código convite ───────────────────────────── */}
      <Modal visible={modalCodigo} transparent animationType="slide" onRequestClose={() => setModalCodigo(false)}>
        <View style={s.overlay}>
          <View style={s.codigoSheet}>
            <Text style={s.codigoTitulo}>Código gerado ✅</Text>
            <Text style={s.codigoSub}>Mostre ou compartilhe com o novo membro</Text>
            <View style={s.codigoBox}>
              <Text style={s.codigoCodigo}>{codigoGerado}</Text>
            </View>
            <Text style={s.codigoAviso}>Válido por 24 horas</Text>
            <Pressable style={[s.btn, { width: "100%", alignItems: "center", marginTop: 10 }]}
              onPress={() => Share.share({ message: `Código de cadastro TJG: ${codigoGerado}\nVálido por 24 horas.\nBaixe o app e use na tela "Cadastre-se".` })}>
              <Text style={s.btnText}>Compartilhar</Text>
            </Pressable>
            <Pressable style={[s.fecharBt, { width: "100%" }]} onPress={() => setModalCodigo(false)}>
              <Text style={s.fecharBtText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Modal adicionar da zona ────────────────────────── */}
      <Modal visible={modalAddZona} transparent animationType="slide" onRequestClose={() => setModalAddZona(false)}>
        <View style={s.overlay}>
          <View style={[s.sheet, { padding: 24 }]}>
            <View style={s.sheetHandle} />
            <Text style={s.codigoTitulo}>Adicionar da zona</Text>
            <Text style={[s.codigoSub, { marginBottom: 16 }]}>
              Busque pelo CPF de um membro da zona que ainda não tem bonde
            </Text>
            <TextInput
              style={[s.searchBox, { color: "#fff", paddingVertical: 14, marginBottom: 14 }]}
              value={cpfZona}
              onChangeText={setCpfZona}
              placeholder="CPF do membro (somente números)"
              placeholderTextColor="#666"
              keyboardType="numeric"
              maxLength={14}
            />
            <Pressable style={[s.btn, addingZona && { backgroundColor: "#555" }]} onPress={adicionarDaZona} disabled={addingZona}>
              {addingZona ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Adicionar ao bonde</Text>}
            </Pressable>
            <Pressable style={[s.fecharBt, { marginTop: 10 }]} onPress={() => setModalAddZona(false)}>
              <Text style={s.fecharBtText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Componentes auxiliares ───────────────────────────────
function Chip({ label, ativo, onPress }: { label: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, ativo && s.chipAtivo]}>
      <Text style={[s.chipText, ativo && s.chipTextAtivo]}>{label}</Text>
    </Pressable>
  );
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}
function AcaoBtn({ label, icon, color, onPress }: any) {
  return (
    <Pressable style={[s.acaoBt, { backgroundColor: color + "22", flex: undefined, minWidth: 120, flexGrow: 1 }]} onPress={onPress}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[s.acaoBtText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0b0b0e" },
  header: { backgroundColor: "#0ea5ff", paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "900" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  btnAdd: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14 },
  btnAddText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  filtros: { padding: 14, gap: 10 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#161618", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#2a2a2e" },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  chips: { flexDirection: "row" },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: "#1a1a1e", marginRight: 8, borderWidth: 1, borderColor: "#2a2a2e" },
  chipAtivo: { backgroundColor: "#0ea5ff22", borderColor: "#0ea5ff" },
  chipText: { color: "#888", fontWeight: "700", fontSize: 13 },
  chipTextAtivo: { color: "#0ea5ff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
  muted: { color: "#555", fontSize: 14 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#111115", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#1e1e24", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#0ea5ff22", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#0ea5ff44" },
  avatarText: { color: "#0ea5ff", fontWeight: "900", fontSize: 18 },
  cardBody: { flex: 1 },
  cardNome: { color: "#fff", fontWeight: "900", fontSize: 15 },
  cardSub: { color: "#888", fontSize: 12, marginTop: 2 },
  cardSocio: { color: "#0ea5ff", fontSize: 11, fontWeight: "700", marginTop: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  badgePendente: { backgroundColor: "#EF9F2733", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgePendenteText: { color: "#EF9F27", fontSize: 10, fontWeight: "800" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#111115", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, paddingHorizontal: 20, maxHeight: "92%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#333", alignSelf: "center", marginVertical: 12 },
  sheetHeader: { alignItems: "center", marginBottom: 20 },
  avatarLg: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#0ea5ff22", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#0ea5ff44", marginBottom: 12 },
  avatarLgText: { color: "#0ea5ff", fontWeight: "900", fontSize: 30 },
  sheetNome: { color: "#fff", fontSize: 20, fontWeight: "900" },
  sheetRole: { color: "#0ea5ff", fontWeight: "700", marginTop: 4 },
  infoBox: { backgroundColor: "#0e0e12", borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: "#1e1e24" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { color: "#666", fontSize: 13 },
  infoValue: { color: "#fff", fontWeight: "700", fontSize: 13 },
  acoes: { flexDirection: "row", gap: 10, marginTop: 16, flexWrap: "wrap" },
  acaoBt: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 14, paddingHorizontal: 14 },
  acaoBtText: { fontWeight: "900", fontSize: 13 },
  fecharBt: { marginTop: 16, backgroundColor: "#1a1a1e", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  fecharBtText: { color: "#fff", fontWeight: "900" },
  codigoSheet: { backgroundColor: "#111115", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, paddingHorizontal: 24, paddingTop: 30, alignItems: "center", gap: 12 },
  codigoTitulo: { color: "#fff", fontSize: 22, fontWeight: "900" },
  codigoSub: { color: "#888", textAlign: "center", fontSize: 13 },
  codigoBox: { backgroundColor: "#0b0b0c", borderWidth: 2, borderColor: "#0ea5ff", borderRadius: 18, paddingHorizontal: 32, paddingVertical: 20, marginVertical: 8 },
  codigoCodigo: { color: "#0ea5ff", fontSize: 32, fontWeight: "900", letterSpacing: 4 },
  codigoAviso: { color: "#666", fontSize: 12, textAlign: "center" },
  btn: { backgroundColor: "#000", borderRadius: 14, padding: 15, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});