/**
 * cadastro-membro.tsx  (app/(lider)/cadastro-membro.tsx)
 * Tela do RESPONSÁVEL DO BONDE para gerar código de cadastro
 * e depois visualizar membros pendentes.
 */
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

type CodigoPendente = {
  id: string;
  codigo: string;
  usado: boolean;
  expira_em: string;
  criado_em: string;
};

export default function CadastroMembro() {
  const { profile } = useAuth();
  const [gerandoCodigo, setGerandoCodigo] = useState(false);
  const [codigos, setCodigos] = useState<CodigoPendente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarCodigos();
  }, []);

  async function carregarCodigos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("codigos_cadastro")
        .select("id, codigo, usado, expira_em, criado_em")
        .eq("gerado_por", profile?.id)
        .order("criado_em", { ascending: false })
        .limit(20);

      if (error) throw error;
      setCodigos((data ?? []) as CodigoPendente[]);
    } catch (e: any) {
      Alert.alert("Erro", e?.message);
    } finally {
      setLoading(false);
    }
  }

  async function gerarCodigo() {
    if (!profile?.bonde_id) {
      Alert.alert("Erro", "Você precisa estar vinculado a um bonde.");
      return;
    }
    try {
      setGerandoCodigo(true);

      // Gera código único de 6 chars
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let codigo = "";
      for (let i = 0; i < 6; i++) {
        codigo += chars[Math.floor(Math.random() * chars.length)];
      }

      const expira_em = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from("codigos_cadastro").insert({
        codigo,
        gerado_por: profile.id,
        bonde_id: profile.bonde_id,
        expira_em,
      });

      if (error) throw error;

      await carregarCodigos();

      Alert.alert(
        "Código gerado! ✅",
        `Código: ${codigo}\n\nVálido por 24 horas.\nMostre para o novo membro se cadastrar.`,
        [
          { text: "Compartilhar", onPress: () => Share.share({ message: `Código de cadastro TJG: ${codigo}\nVálido por 24 horas.` }) },
          { text: "OK" },
        ]
      );
    } catch (e: any) {
      Alert.alert("Erro ao gerar código", e?.message);
    } finally {
      setGerandoCodigo(false);
    }
  }

  function expirado(expira_em: string) {
    return new Date(expira_em) < new Date();
  }

  function statusTag(item: CodigoPendente) {
    if (item.usado) return { label: "Usado", color: "#1D9E75" };
    if (expirado(item.expira_em)) return { label: "Expirado", color: "#E24B4A" };
    return { label: "Ativo", color: "#EF9F27" };
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Cadastro de Membro</Text>
        <Text style={s.sub}>Gere um código para um novo membro se cadastrar</Text>
      </View>

      {/* Botão gerar */}
      <View style={s.gerarBox}>
        <Pressable style={[s.gerarBtn, gerandoCodigo && s.btnOff]} onPress={gerarCodigo} disabled={gerandoCodigo}>
          {gerandoCodigo
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="add-circle" size={22} color="#fff" />
                <Text style={s.gerarBtnText}>Gerar novo código</Text>
              </>
          }
        </Pressable>
        <Text style={s.gerarHint}>O membro usa o código na tela "Cadastre-se" do app</Text>
      </View>

      {/* Lista de códigos */}
      <View style={s.listHeader}>
        <Text style={s.listTitle}>Códigos gerados</Text>
        <Pressable onPress={carregarCodigos}>
          <Ionicons name="refresh" size={18} color="#64748b" />
        </Pressable>
      </View>

      {loading
        ? <ActivityIndicator style={{ marginTop: 30 }} />
        : (
          <FlatList
            data={codigos}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ padding: 16, paddingTop: 0 }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyText}>Nenhum código gerado ainda</Text>
              </View>
            }
            renderItem={({ item }) => {
              const tag = statusTag(item);
              return (
                <View style={s.codigoCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.codigoCodigo}>{item.codigo}</Text>
                    <Text style={s.codigoDate}>Gerado: {formatDate(item.criado_em)}</Text>
                    {!item.usado && (
                      <Text style={s.codigoDate}>Expira: {formatDate(item.expira_em)}</Text>
                    )}
                  </View>
                  <View style={[s.tag, { backgroundColor: tag.color + "22" }]}>
                    <Text style={[s.tagText, { color: tag.color }]}>{tag.label}</Text>
                  </View>
                </View>
              );
            }}
          />
        )
      }
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f4f5" },
  header: {
    backgroundColor: "#000",
    padding: 20,
    paddingTop: 26,
    paddingBottom: 22,
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.7)", marginTop: 4, fontWeight: "600", fontSize: 13 },
  gerarBox: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  gerarBtn: {
    backgroundColor: "#000",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  btnOff: { backgroundColor: "#94a3b8" },
  gerarBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  gerarHint: { marginTop: 12, color: "#94a3b8", fontSize: 13, fontWeight: "600", textAlign: "center" },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  listTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  codigoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  codigoCodigo: { fontSize: 22, fontWeight: "900", color: "#0f172a", letterSpacing: 2 },
  codigoDate: { fontSize: 12, color: "#94a3b8", fontWeight: "600", marginTop: 2 },
  tag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { fontWeight: "800", fontSize: 12 },
  empty: { alignItems: "center", paddingTop: 40 },
  emptyText: { color: "#94a3b8", fontWeight: "600" },
});