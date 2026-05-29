/**
 * carteirinha.tsx  (app/(membro)/(tabs)/carteirinha.tsx)
 * Carteirinha do membro — usa useAuth() em vez de buscar direto no supabase
 */
import { useAuth } from "@/contexts/AuthContext";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

const IMG_WATERMARK = require("../../../assets/images/logo_fundo.png");
const IMG_LOGOS     = require("../../../assets/images/logos.png");

const CARD_AR = 944 / 560;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

const CARGO_LABEL: Record<string, string> = {
  membro:      "Membro",
  socio_bronze:"Sócio Bronze",
  socio_prata: "Sócio Prata",
  socio_ouro:  "Sócio Ouro",
  resp_bonde:  "Resp. Bonde",
  resp_zona:   "Resp. Zona",
  resp_socio:  "Resp. Sócio",
  diretoria:   "Diretoria",
};

const CARGO_COLOR: Record<string, string> = {
  membro:      "#64748b",
  socio_bronze:"#CD7F32",
  socio_prata: "#94a3b8",
  socio_ouro:  "#F59E0B",
  resp_bonde:  "#0ea5e9",
  resp_zona:   "#8B5CF6",
  resp_socio:  "#10B981",
  diretoria:   "#EF4444",
};

export default function CarteirinhaTab() {
  const { user, profile, loading, signOut } = useAuth();
  const { width, height } = useWindowDimensions();

  // Dimensões do card
  const safeTopAndBottom = 230;
  const availH   = Math.max(320, height - safeTopAndBottom);
  const outerH   = clamp(availH * 0.78, 360, 560);
  const innerW   = outerH;
  const innerH   = Math.round(innerW / CARD_AR);
  const outerW   = innerH;
  const isBigCard = innerW >= 520;
  const photoH   = isBigCard ? 188 : 130;

  // Flip animation
  const [isFlipped, setIsFlipped] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const frontRotateY = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotateY  = anim.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
  const frontOpacity = anim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity  = anim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] });

  function flip() {
    Animated.timing(anim, {
      toValue: isFlipped ? 0 : 1,
      duration: 500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => setIsFlipped(!isFlipped));
  }

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[s.page, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  // ── Sem perfil ────────────────────────────────────────────
  if (!profile) {
    return (
      <SafeAreaView style={s.page}>
        <View style={s.center}>
          <Text style={{ fontWeight: "900", fontSize: 18, color: "#0f172a" }}>Perfil não encontrado</Text>
          <Pressable style={s.btn} onPress={() => signOut?.()}>
            <Text style={s.btnText}>Sair</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Pendente ──────────────────────────────────────────────
  if (profile.status === "pendente") {
    return (
      <SafeAreaView style={s.page}>
        <View style={s.header}>
          <Text style={s.headerTitle}>TJG</Text>
          <Text style={s.headerSub}>Torcida Jovem do Galo</Text>
        </View>
        <View style={s.center}>
          <Text style={{ fontSize: 48 }}>⏳</Text>
          <Text style={{ fontWeight: "900", fontSize: 18, color: "#0f172a", marginTop: 16 }}>
            Cadastro em análise
          </Text>
          <Text style={{ color: "#64748b", marginTop: 8, textAlign: "center", paddingHorizontal: 30 }}>
            Seus dados foram enviados. Aguarde a aprovação do responsável do bonde.
          </Text>
          <Pressable style={s.btn} onPress={() => signOut?.()}>
            <Text style={s.btnText}>Sair</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const cargo      = profile.cargo ?? "membro";
  const cargoLabel = CARGO_LABEL[cargo] ?? cargo;
  const cargoColor = CARGO_COLOR[cargo] ?? "#64748b";
  const nome       = profile.nome ?? "—";
  const bonde      = profile.bonde ?? profile.bonde_id ?? "—";
  const zona       = profile.zona ?? profile.zona_id ?? "—";

  // ── Card frente ───────────────────────────────────────────
  const Front = (
    <Animated.View
      style={[
        s.cardBase,
        { width: innerW, height: innerH },
        { transform: [{ rotateY: frontRotateY }, { rotate: "90deg" }] },
        { opacity: frontOpacity },
      ]}
    >
      <View style={[s.cardInner, { width: innerW, height: innerH }]}>
        <ImageBackground source={IMG_WATERMARK} style={{ flex: 1 }} imageStyle={{ opacity: 0.07 }}>
          {/* Header preto */}
          <View style={s.cardHeader}>
            <Text style={s.cardHeaderText}>TORCIDA JOVEM DO GALO</Text>
          </View>

          {/* Faixa de cargo */}
          <View style={[s.cargoBadge, { backgroundColor: cargoColor }]}>
            <Text style={s.cargoBadgeText}>{cargoLabel.toUpperCase()}</Text>
          </View>

          {/* Conteúdo */}
          <View style={s.row}>
            {/* Foto */}
            <View style={[s.photoWrap, { width: 122, height: photoH }]}>
              {profile.foto_url
                ? <Image source={{ uri: profile.foto_url }} style={s.photoImg} resizeMode="cover" />
                : (
                  <View style={s.photoPlaceholder}>
                    <Text style={{ fontSize: 40 }}>👤</Text>
                    <Text style={s.photoPlaceholderText}>{nome.charAt(0).toUpperCase()}</Text>
                  </View>
                )
              }
            </View>

            {/* Campos */}
            <View style={s.fields}>
              <FaixaField label="Nome" value={nome} />
              <FaixaField label="Bonde" value={bonde} />
              <FaixaField label="Zona" value={zona} />
              <FaixaField label="CPF" value={profile.cpf ? `***${profile.cpf.slice(-4)}` : "—"} />
            </View>
          </View>

          {/* Logos */}
          <Image source={IMG_LOGOS} style={s.logosBottom} resizeMode="contain" />

          {/* Barra inferior */}
          <View style={s.bottomBar}>
            <Text style={s.bottomBarText}>DOCUMENTO DE IDENTIFICAÇÃO DO ASSOCIADO</Text>
          </View>
        </ImageBackground>
      </View>
    </Animated.View>
  );

  // ── Card verso ────────────────────────────────────────────
  const Back = (
    <Animated.View
      style={[
        s.cardBase,
        { width: innerW, height: innerH },
        { transform: [{ rotateY: backRotateY }, { rotate: "90deg" }] },
        { opacity: backOpacity },
      ]}
    >
      <View style={[s.cardInner, { width: innerW, height: innerH }]}>
        <View style={{ flex: 1, backgroundColor: "#0f172a", padding: 20 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>TORCIDA JOVEM DO GALO</Text>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontWeight: "700", marginTop: 4, fontSize: 12 }}>
            Documento válido somente com foto
          </Text>

          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 90, height: 90, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 36 }}>🏟</Text>
            </View>
            <Text style={{ color: "#fff", fontWeight: "900", marginTop: 14, fontSize: 18, letterSpacing: 2 }}>
              {profile.id?.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 6 }}>ID DO ASSOCIADO</Text>
          </View>

          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textAlign: "center" }}>
            Em caso de perda, comunique o responsável do seu bonde imediatamente.
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  // ── Render principal ──────────────────────────────────────
  return (
    <SafeAreaView style={s.page}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Olá, {nome.split(" ")[0]} 👋</Text>
          <Text style={s.headerSub}>{cargoLabel}</Text>
        </View>
        <Pressable onPress={() => signOut?.()} style={s.sairBtn}>
          <Text style={s.sairBtnText}>Sair</Text>
        </Pressable>
      </View>

      {/* Hint */}
      <View style={s.body}>
        <View style={s.hintBox}>
          <Text style={s.hintText}>🔄 Toque no cartão para virar</Text>
        </View>

        {/* Container do card girado */}
        <Pressable onPress={flip}>
          <View style={{ width: outerW, height: outerH }}>
            {Front}
            {Back}
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function FaixaField({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.faixa}>
      <Text style={s.faixaLabel}>{label}</Text>
      <Text style={s.faixaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff" },
  header: {
    backgroundColor: "#000",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  headerSub: { color: "rgba(255,255,255,0.7)", marginTop: 4, fontSize: 13, fontWeight: "700" },
  sairBtn: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  sairBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  body: { flex: 1, alignItems: "center", justifyContent: "flex-start", paddingTop: 80 },
  hintBox: {
    backgroundColor: "#111113",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 16,
  },
  hintText: { color: "#fff", fontWeight: "900" },
  cardBase: {
    position: "absolute",
    top: 0,
    left: 0,
    backfaceVisibility: "hidden",
    backgroundColor: "transparent",
  },
  cardInner: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.12)",
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 12 } },
      android: { elevation: 10 },
    }),
  },
  cardHeader: { backgroundColor: "#000", paddingVertical: 10, paddingHorizontal: 14 },
  cardHeaderText: { color: "#fff", fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  cargoBadge: { paddingVertical: 6, paddingHorizontal: 14, alignSelf: "flex-start", margin: 10, borderRadius: 8 },
  cargoBadgeText: { color: "#fff", fontWeight: "900", fontSize: 11, letterSpacing: 1 },
  row: { flexDirection: "row", paddingHorizontal: 14, gap: 12, flex: 1 },
  photoWrap: { borderRadius: 14, overflow: "hidden", backgroundColor: "#1e293b" },
  photoImg: { width: "100%", height: "100%" },
  photoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  photoPlaceholderText: { color: "#fff", fontWeight: "900", fontSize: 16, marginTop: -8 },
  fields: { flex: 1, justifyContent: "center", gap: 8 },
  faixa: { backgroundColor: "#0f172a", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  faixaLabel: { color: "rgba(255,255,255,0.6)", fontWeight: "900", width: 50, fontSize: 10 },
  faixaValue: { color: "#fff", fontWeight: "800", flex: 1, fontSize: 11 },
  logosBottom: { height: 36, alignSelf: "center", marginBottom: 34 },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, height: 28, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  bottomBarText: { color: "#fff", fontWeight: "900", letterSpacing: 0.8, fontSize: 9 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  btn: { marginTop: 20, backgroundColor: "#000", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: "#fff", fontWeight: "900" },
});