// components/screens/ComprarSocioScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/supabase";

// Tipos simples (ajuste conforme seu banco)
type Role =
  | "membro"
  | "socio_bronze"
  | "socio_prata"
  | "socio_ouro"
  | "resp_bonde"
  | "resp_zona"
  | "resp_socio"
  | "diretoria";

type Plan = "membro" | "bronze" | "prata" | "ouro";

type Profile = {
  id: string; // user_id (auth)
  nome: string | null;
  role: Role;
  tipo_socio: Plan; // seu plano atual
  bonde_id?: string | null;
  zona_id?: string | null;
};

type MemberRow = {
  id: string;
  nome: string | null;
  tipo_socio: Plan;
  role: Role;
  bonde_id?: string | null;
  zona_id?: string | null;
};

const PLAN_LABEL: Record<Plan, string> = {
  membro: "Membro (gratuito)",
  bronze: "Sócio Bronze",
  prata: "Sócio Prata",
  ouro: "Sócio Ouro",
};

const PLAN_PRICE: Record<Plan, number> = {
  membro: 0,
  bronze: 15,
  prata: 25,
  ouro: 40,
};

const PLAN_BADGE: Record<Plan, { icon: keyof typeof Ionicons.glyphMap; hint: string }> = {
  membro: { icon: "person", hint: "Acesso básico" },
  bronze: { icon: "medal", hint: "Benefícios Bronze" },
  prata: { icon: "trophy", hint: "Benefícios Prata" },
  ouro: { icon: "diamond", hint: "Benefícios Ouro" },
};

function formatBRL(value: number) {
  // formatação simples sem Intl (pra evitar inconsistências)
  const cents = Math.round(value * 100);
  const reais = Math.floor(cents / 100);
  const dec = String(cents % 100).padStart(2, "0");
  const reaisStr = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${reaisStr},${dec}`;
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export default function ComprarSocioScreen() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [me, setMe] = useState<Profile | null>(null);

  // Para todos: plano escolhido para “eu mesmo”
  const [selectedPlan, setSelectedPlan] = useState<Plan>("bronze");

  // Resp_socio: modo de aplicar em outro membro
  const [applyToOther, setApplyToOther] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [targetMember, setTargetMember] = useState<MemberRow | null>(null);

  const isRespSocio = me?.role === "resp_socio";

  const target = applyToOther && isRespSocio ? targetMember : me;

  const currentPlan = (target?.tipo_socio ?? "membro") as Plan;

  const canApply = useMemo(() => {
    if (!target) return false;
    if (selectedPlan === currentPlan) return false;
    if (busy) return false;
    return true;
  }, [target, selectedPlan, currentPlan, busy]);

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function boot() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) {
        setMe(null);
        return;
      }

      // Ajuste o nome da sua tabela/colunas:
      // Sugestão: tabela "profiles" com id=user.id
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("id,nome,role,tipo_socio,bonde_id,zona_id")
        .eq("id", user.id)
        .single();

      if (profErr) throw profErr;

      setMe(profile as Profile);

      // default: sugerir upgrade se já tiver plano
      const suggested: Plan =
        (profile?.tipo_socio as Plan) === "membro" ? "bronze" : (profile?.tipo_socio as Plan);

      setSelectedPlan(suggested);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível carregar seus dados.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMembersForPicker() {
    if (!isRespSocio) return;
    try {
      setMembersLoading(true);

      // Resp_socio pode listar todos (assumindo RLS permite).
      const { data, error } = await supabase
        .from("profiles")
        .select("id,nome,role,tipo_socio,bonde_id,zona_id")
        .order("nome", { ascending: true })
        .limit(200);

      if (error) throw error;

      setMembers((data ?? []) as MemberRow[]);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível carregar a lista de membros.");
    } finally {
      setMembersLoading(false);
    }
  }

  function openPicker() {
    if (!isRespSocio) return;
    setPickerOpen(true);
    if (members.length === 0) {
      void loadMembersForPicker();
    }
  }

  function closePicker() {
    setPickerOpen(false);
    setMemberQuery("");
  }

  const filteredMembers = useMemo(() => {
    const q = normalize(memberQuery);
    if (!q) return members;
    return members.filter((m) => normalize(m.nome ?? "").includes(q) || m.id.includes(q));
  }, [members, memberQuery]);

  async function confirmAndApply() {
    if (!target || !me) return;

    const applyingFor = target.id === me.id ? "você" : (target.nome ?? "este membro");
    const title = "Confirmar alteração";
    const msg =
      selectedPlan === "membro"
        ? `Você vai definir o plano de ${applyingFor} como ${PLAN_LABEL[selectedPlan]}.`
        : `Você vai definir o plano de ${applyingFor} como ${PLAN_LABEL[selectedPlan]} (${formatBRL(
            PLAN_PRICE[selectedPlan]
          )}/mês).`;

    Alert.alert(title, msg, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", style: "default", onPress: () => void applyPlan() },
    ]);
  }

  async function applyPlan() {
    if (!target || !me) return;

    try {
      setBusy(true);

      // Regra:
      // - Qualquer um pode mudar o próprio plano (ou iniciar pagamento)
      // - Resp_socio pode mudar plano de qualquer um
      const changingOther = target.id !== me.id;

      if (changingOther && me.role !== "resp_socio") {
        Alert.alert("Sem permissão", "Apenas o responsável pelo sócio pode alterar o plano de outra pessoa.");
        return;
      }

      // Aqui você tem 2 caminhos:
      // A) MVP: setar direto no perfil (tipo_socio) e pronto.
      // B) Produção: criar "orders"/"payments" e mudar plano só após confirmação de pagamento.
      //
      // Vou fazer (A) porque você pediu a tela e ainda está no MVP.
      const { error } = await supabase
        .from("profiles")
        .update({ tipo_socio: selectedPlan })
        .eq("id", target.id);

      if (error) throw error;

      // Atualiza estado local
      if (target.id === me.id) {
        setMe({ ...me, tipo_socio: selectedPlan });
      } else {
        setTargetMember({ ...(target as MemberRow), tipo_socio: selectedPlan });
        setMembers((prev) => prev.map((m) => (m.id === target.id ? { ...m, tipo_socio: selectedPlan } : m)));
      }

      Alert.alert("Pronto", "Plano atualizado com sucesso.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível atualizar o plano.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Carregando…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!me) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={28} />
          <Text style={styles.title}>Você não está logado</Text>
          <Text style={styles.muted}>Volte e faça login para acessar o sócio.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const whoLabel =
    target?.id === me.id
      ? "Você"
      : `${target?.nome ?? "Membro"} (${PLAN_LABEL[(target?.tipo_socio ?? "membro") as Plan]})`;

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Sócio</Text>
          <Text style={styles.subtitle}>Escolha/gerencie o plano</Text>
        </View>

        {/* Quem será afetado */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Aplicar em</Text>
              <Text style={styles.value}>{whoLabel}</Text>
            </View>

            {isRespSocio ? (
              <Pressable
                onPress={() => {
                  setApplyToOther((v) => {
                    const nv = !v;
                    if (!nv) setTargetMember(null);
                    return nv;
                  });
                }}
                style={[styles.chip, applyToOther ? styles.chipOn : styles.chipOff]}
              >
                <Ionicons name={applyToOther ? "checkmark-circle" : "person-add"} size={18} />
                <Text style={styles.chipText}>{applyToOther ? "Outro membro" : "Somente eu"}</Text>
              </Pressable>
            ) : null}
          </View>

          {isRespSocio && applyToOther ? (
            <View style={{ marginTop: 12 }}>
              <Pressable onPress={openPicker} style={styles.pickerBtn}>
                <Ionicons name="search" size={18} />
                <Text style={styles.pickerBtnText}>
                  {targetMember ? `Trocar (${targetMember.nome ?? targetMember.id})` : "Selecionar membro"}
                </Text>
                <Ionicons name="chevron-down" size={18} />
              </Pressable>

              {!targetMember ? (
                <Text style={styles.helper}>
                  Dica: use o seletor para escolher quem vai receber o plano.
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Plano atual */}
        <View style={styles.card}>
          <Text style={styles.label}>Plano atual</Text>
          <View style={styles.planRow}>
            <Ionicons name={PLAN_BADGE[currentPlan].icon} size={18} />
            <Text style={styles.value}>{PLAN_LABEL[currentPlan]}</Text>
          </View>
          <Text style={styles.mutedSmall}>
            {currentPlan === "membro"
              ? "Você pode virar sócio quando quiser."
              : `Mensalidade: ${formatBRL(PLAN_PRICE[currentPlan])}`}
          </Text>
        </View>

        {/* Seleção de planos */}
        <View style={styles.card}>
          <Text style={styles.label}>Escolher plano</Text>

          <View style={styles.plansGrid}>
            {(["bronze", "prata", "ouro", "membro"] as Plan[]).map((p) => {
              const active = selectedPlan === p;
              const disabled = p === currentPlan;

              return (
                <Pressable
                  key={p}
                  onPress={() => setSelectedPlan(p)}
                  disabled={disabled}
                  style={[
                    styles.planCard,
                    active ? styles.planCardActive : null,
                    disabled ? styles.planCardDisabled : null,
                  ]}
                >
                  <View style={styles.planTop}>
                    <Ionicons name={PLAN_BADGE[p].icon} size={18} />
                    <Text style={styles.planTitle}>{PLAN_LABEL[p]}</Text>
                  </View>

                  <Text style={styles.planHint}>{PLAN_BADGE[p].hint}</Text>
                  <Text style={styles.planPrice}>
                    {p === "membro" ? "R$ 0" : `${formatBRL(PLAN_PRICE[p])}/mês`}
                  </Text>

                  {disabled ? <Text style={styles.tag}>atual</Text> : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={confirmAndApply}
            disabled={!canApply}
            style={[styles.primaryBtn, !canApply ? styles.primaryBtnDisabled : null]}
          >
            {busy ? <ActivityIndicator /> : <Ionicons name="checkmark" size={18} />}
            <Text style={styles.primaryBtnText}>
              {selectedPlan === "membro" ? "Definir como membro" : "Aplicar plano"}
            </Text>
          </Pressable>

          <Text style={styles.helper}>
            * No MVP, o plano é atualizado direto. Depois você pode trocar para um fluxo de pagamento com confirmação.
          </Text>
        </View>

        {/* Modal de seleção (resp_socio) */}
        <Modal visible={pickerOpen} animationType="slide" onRequestClose={closePicker}>
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <Pressable onPress={closePicker} style={styles.iconBtn}>
                <Ionicons name="close" size={22} />
              </Pressable>
              <Text style={styles.modalTitle}>Selecionar membro</Text>
              <View style={{ width: 36 }} />
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} />
              <TextInput
                value={memberQuery}
                onChangeText={setMemberQuery}
                placeholder="Buscar por nome…"
                placeholderTextColor="#777"
                style={styles.searchInput}
              />
            </View>

            {membersLoading ? (
              <View style={styles.center}>
                <ActivityIndicator />
                <Text style={styles.muted}>Carregando membros…</Text>
              </View>
            ) : (
              <FlatList
                data={filteredMembers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const selected = targetMember?.id === item.id;
                  return (
                    <Pressable
                      onPress={() => {
                        setTargetMember(item);
                        closePicker();
                      }}
                      style={[styles.memberRow, selected ? styles.memberRowSelected : null]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{item.nome ?? "Sem nome"}</Text>
                        <Text style={styles.mutedSmall}>
                          {PLAN_LABEL[item.tipo_socio]} • {item.role}
                        </Text>
                      </View>
                      {selected ? <Ionicons name="checkmark-circle" size={20} /> : <Ionicons name="chevron-forward" size={18} />}
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.center}>
                    <Text style={styles.muted}>Nenhum membro encontrado.</Text>
                  </View>
                }
              />
            )}
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0b0f14" },

  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#b7c0cc", marginTop: 2 },

  card: {
    backgroundColor: "#121a23",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1c2a38",
  },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },

  label: { color: "#9fb0c2", fontSize: 12, marginBottom: 6 },
  value: { color: "#fff", fontSize: 16, fontWeight: "700" },
  muted: { color: "#b7c0cc", marginTop: 8 },
  mutedSmall: { color: "#b7c0cc", marginTop: 6, fontSize: 12 },
  helper: { color: "#8ea2b8", marginTop: 10, fontSize: 12, lineHeight: 16 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipOn: { borderColor: "#2f89ff", backgroundColor: "rgba(47,137,255,0.18)" },
  chipOff: { borderColor: "#2a3a4a", backgroundColor: "rgba(42,58,74,0.25)" },
  chipText: { color: "#fff", fontWeight: "700" },

  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#26384a",
    backgroundColor: "#0e151d",
  },
  pickerBtnText: { color: "#fff", fontWeight: "700", flex: 1 },

  planRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  plansGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  planCard: {
    width: "48%",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#243445",
    backgroundColor: "#0e151d",
    position: "relative",
  },
  planCardActive: { borderColor: "#2f89ff", backgroundColor: "rgba(47,137,255,0.10)" },
  planCardDisabled: { opacity: 0.55 },

  planTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  planTitle: { color: "#fff", fontWeight: "800" },
  planHint: { color: "#9fb0c2", marginTop: 6, fontSize: 12 },
  planPrice: { color: "#fff", marginTop: 10, fontWeight: "800" },

  tag: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: "#fff",
    fontSize: 11,
    overflow: "hidden",
  },

  primaryBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#2f89ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnDisabled: { opacity: 0.55 },

  primaryBtnText: { color: "#fff", fontWeight: "900" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },

  modal: { flex: 1, backgroundColor: "#0b0f14" },
  modalHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#162230",
  },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  searchBox: {
    margin: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#223244",
    backgroundColor: "#0e151d",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, color: "#fff", fontWeight: "700" },

  memberRow: {
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1c2a38",
    backgroundColor: "#121a23",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberRowSelected: { borderColor: "#2f89ff", backgroundColor: "rgba(47,137,255,0.12)" },
  memberName: { color: "#fff", fontWeight: "900" },
});