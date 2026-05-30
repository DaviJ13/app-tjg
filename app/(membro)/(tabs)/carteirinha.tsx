/**
 * carteirinha.tsx  (app/(membro)/(tabs)/carteirinha.tsx)
 * Carteirinha responsiva — cores TJG · sem rotação 90°
 * Preto #0a0a0a · Ouro/Amarelo #F5B800 · Branco #FFFFFF
 */
import { useAuth } from "@/contexts/AuthContext";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated, Easing, Image, ImageBackground, Platform,
  Pressable, SafeAreaView, StyleSheet, Text,
  useWindowDimensions, View,
} from "react-native";

const IMG_WATERMARK = require("../../../assets/images/logo_fundo.png");
const IMG_LOGOS     = require("../../../assets/images/logos.png");

// ── Paleta TJG ────────────────────────────────────────────
const C = {
  bg:       "#0a0a0a",
  card:     "#141414",
  ouro:     "#F5B800",
  ouroDim:  "#F5B80018",
  ouroBd:   "#F5B80055",
  branco:   "#FFFFFF",
  cinza:    "#888888",
  cinzaBd:  "#2a2a2a",
};

// ── Labels e cores de cargo ───────────────────────────────
const CARGO_LABEL: Record<string, string> = {
  membro:       "Membro",
  socio_bronze: "Sócio Bronze",
  socio_prata:  "Sócio Prata",
  socio_ouro:   "Sócio Ouro",
  resp_bonde:   "Resp. Bonde",
  resp_zona:    "Resp. Zona",
  resp_socio:   "Resp. Sócio",
  diretoria:    "Diretoria",
};

const CARGO_COLOR: Record<string, { bg: string; text: string }> = {
  membro:       { bg: "#222222", text: "#aaaaaa" },
  socio_bronze: { bg: "#5C3A1E", text: "#CD7F32" },
  socio_prata:  { bg: "#1e2535", text: "#94a3b8" },
  socio_ouro:   { bg: "#3D2E00", text: "#F5B800" },
  resp_bonde:   { bg: "#0a2a3d", text: "#38bdf8" },
  resp_zona:    { bg: "#1e1040", text: "#a78bfa" },
  resp_socio:   { bg: "#0a2e1e", text: "#34d399" },
  diretoria:    { bg: "#3d0a0a", text: "#f87171" },
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function CarteirinhaTab() {
  const { profile, loading, signOut } = useAuth();
  const { width, height } = useWindowDimensions();

  // ── Card vertical — sem rotação ───────────────────────
  // Proporção de carteirinha vertical: 85.6mm × 54mm ≈ 1.585 (altura/largura)
  const CARD_RATIO = 1.6;
  const maxCardW = Math.min(width - 48, 380);
  const cardW = clamp(maxCardW, 280, 380);
  const cardH = Math.round(cardW * CARD_RATIO);

  // Flip animation
  const [isFlipped, setIsFlipped] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const frontRotateY = anim.interpolate({ inputRange:[0,1], outputRange:["0deg","180deg"] });
  const backRotateY  = anim.interpolate({ inputRange:[0,1], outputRange:["180deg","360deg"] });
  const frontOpacity = anim.interpolate({ inputRange:[0,0.49,0.5,1], outputRange:[1,1,0,0] });
  const backOpacity  = anim.interpolate({ inputRange:[0,0.49,0.5,1], outputRange:[0,0,1,1] });

  function flip() {
    Animated.timing(anim, {
      toValue: isFlipped ? 0 : 1,
      duration: 500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => setIsFlipped(f => !f));
  }

  if (loading) {
    return (
      <SafeAreaView style={s.page}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.ouro} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={s.page}>
        <View style={s.center}>
          <Text style={{ color: C.branco, fontWeight:"900", fontSize:18 }}>Perfil não encontrado</Text>
          <Pressable style={s.btnSair} onPress={() => signOut?.()}>
            <Text style={s.btnSairText}>Sair</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (profile.status_cadastro === "pendente" || profile.status === "pendente") {
    return (
      <SafeAreaView style={s.page}>
        <View style={s.header}>
          <Text style={s.headerTitle}>TJG</Text>
          <Text style={s.headerSub}>Torcida Jovem do Galo</Text>
        </View>
        <View style={s.center}>
          <Text style={{ fontSize: 52 }}>⏳</Text>
          <Text style={{ color: C.branco, fontWeight:"900", fontSize:20, marginTop:20 }}>
            Cadastro em análise
          </Text>
          <Text style={{ color: C.cinza, marginTop:10, textAlign:"center", paddingHorizontal:30, lineHeight:22 }}>
            Seus dados foram enviados. Aguarde a aprovação do responsável.
          </Text>
          <Pressable style={[s.btnSair, { marginTop: 32 }]} onPress={() => signOut?.()}>
            <Text style={s.btnSairText}>Sair</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const role       = profile.role ?? "membro";
  const cargoLabel = CARGO_LABEL[role] ?? role;
  const cargoCor   = CARGO_COLOR[role] ?? CARGO_COLOR.membro;
  const nome       = profile.nome ?? "—";
  const primeiroNome = nome.split(" ")[0];
  const bonde      = profile.bonde ?? "—";
  const zona       = profile.zona ?? "—";
  const tipoSocio  = String(profile.tipo_socio ?? "membro").replace("_"," ")
    .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <SafeAreaView style={s.page}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Olá, {primeiroNome}!</Text>
          <Text style={s.headerSub}>{cargoLabel}</Text>
        </View>
        <Pressable style={s.btnSair} onPress={() => signOut?.()}>
          <Text style={s.btnSairText}>Sair</Text>
        </Pressable>
      </View>

      {/* ── Corpo ── */}
      <View style={s.body}>
        <Text style={s.hint}>Toque na carteirinha para virar 🔄</Text>

        {/* Container do card */}
        <Pressable onPress={flip} style={{ width: cardW, height: cardH }}>
          {/* Frente */}
          <Animated.View style={[
            s.cardBase,
            { width: cardW, height: cardH, opacity: frontOpacity,
              transform: [{ perspective: 1200 }, { rotateY: frontRotateY }] }
          ]}>
            <CardFrente
              nome={nome} bonde={bonde} zona={zona}
              cpf={profile.cpf} cargoLabel={cargoLabel}
              cargoCor={cargoCor} fotoUrl={profile.foto_url}
              tipoSocio={tipoSocio} cardW={cardW} cardH={cardH}
            />
          </Animated.View>

          {/* Verso */}
          <Animated.View style={[
            s.cardBase,
            { width: cardW, height: cardH, opacity: backOpacity,
              transform: [{ perspective: 1200 }, { rotateY: backRotateY }] }
          ]}>
            <CardVerso
              profileId={profile.id} tipoSocio={tipoSocio}
              cardW={cardW} cardH={cardH}
            />
          </Animated.View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ── FRENTE ────────────────────────────────────────────────
function CardFrente({
  nome, bonde, zona, cpf, cargoLabel, cargoCor,
  fotoUrl, tipoSocio, cardW, cardH,
}: {
  nome: string; bonde: string; zona: string; cpf: string | null;
  cargoLabel: string; cargoCor: { bg: string; text: string };
  fotoUrl?: string | null; tipoSocio: string;
  cardW: number; cardH: number;
}) {
  const fotoSize = Math.round(cardW * 0.32);
  const fontSize = cardW < 310 ? 10 : 12;

  return (
    <View style={[s.cardInner, { width: cardW, height: cardH }]}>
      <ImageBackground source={IMG_WATERMARK} style={{ flex: 1 }} imageStyle={{ opacity: 0.06 }} resizeMode="cover">

        {/* Topo preto */}
        <View style={s.cardTopBar}>
          <Text style={s.cardTopBarText}>TORCIDA JOVEM DO GALO</Text>
          <Image source={IMG_LOGOS} style={s.cardTopLogo} resizeMode="contain" />
        </View>

        {/* Faixa de cargo */}
        <View style={[s.cargoBadge, { backgroundColor: cargoCor.bg }]}>
          <Text style={[s.cargoBadgeText, { color: cargoCor.text }]}>
            {cargoLabel.toUpperCase()}
          </Text>
        </View>

        {/* Foto + dados */}
        <View style={s.cardBody}>
          {/* Foto */}
          <View style={[s.fotoBox, { width: fotoSize, height: Math.round(fotoSize * 1.2) }]}>
            {fotoUrl
              ? <Image source={{ uri: fotoUrl }} style={s.fotoImg} resizeMode="cover" />
              : (
                <View style={s.fotoPlaceholder}>
                  <Text style={s.fotoInicial}>{nome.charAt(0).toUpperCase()}</Text>
                </View>
              )
            }
          </View>

          {/* Faixas de info */}
          <View style={{ flex: 1 }}>
            <InfoFaixa label="NOME"  value={nome}  fontSize={fontSize} />
            <InfoFaixa label="BONDE" value={bonde} fontSize={fontSize} />
            <InfoFaixa label="ZONA"  value={zona}  fontSize={fontSize} />
            <InfoFaixa
              label="CPF"
              value={cpf ? `***${cpf.slice(-6, -2)}**.${cpf.slice(-2)}-${cpf.slice(-0)}`.replace(/[^*\d.-]/g, "") : "—"}
              fontSize={fontSize}
            />
            <InfoFaixa label="CPF"  value={cpf ? `***.***-${cpf.slice(-2)}` : "—"} fontSize={fontSize} />
          </View>
        </View>

        {/* Rodapé */}
        <View style={s.cardFooter}>
          <Text style={s.cardFooterText}>{tipoSocio.toUpperCase()} · DOCUMENTO DE IDENTIFICAÇÃO</Text>
        </View>
      </ImageBackground>
    </View>
  );
}

// ── VERSO ─────────────────────────────────────────────────
function CardVerso({ profileId, tipoSocio, cardW, cardH }: {
  profileId: string; tipoSocio: string; cardW: number; cardH: number;
}) {
  return (
    <View style={[s.cardInner, { width: cardW, height: cardH, backgroundColor: "#111" }]}>
      <ImageBackground source={IMG_WATERMARK} style={{ flex: 1 }} imageStyle={{ opacity: 0.08 }} resizeMode="cover">

        {/* Topo */}
        <View style={s.cardTopBar}>
          <Text style={s.cardTopBarText}>TORCIDA JOVEM DO GALO</Text>
        </View>

        {/* Centro */}
        <View style={s.versoCenter}>
          {/* QR placeholder */}
          <View style={s.qrBox}>
            <Text style={s.qrIcon}>⬛</Text>
            <Text style={{ color: C.cinza, fontSize: 10, marginTop: 4, fontWeight:"700" }}>QR CODE</Text>
          </View>

          {/* ID */}
          <View style={s.idBox}>
            <Text style={s.idLabel}>ID DO ASSOCIADO</Text>
            <Text style={s.idValue}>{profileId.slice(0, 8).toUpperCase()}</Text>
          </View>

          {/* Aviso */}
          <View style={s.regrasBox}>
            <Text style={s.regraTexto}>• Uso pessoal e intransferível</Text>
            <Text style={s.regraTexto}>• Apresente na entrada dos eventos</Text>
            <Text style={s.regraTexto}>• Sujeito à verificação pela diretoria</Text>
          </View>
        </View>

        {/* Logo */}
        <Image source={IMG_LOGOS} style={s.versoLogo} resizeMode="contain" />

        {/* Rodapé */}
        <View style={s.cardFooter}>
          <Text style={s.cardFooterText}>{tipoSocio.toUpperCase()} · DOCUMENTO DE IDENTIFICAÇÃO</Text>
        </View>
      </ImageBackground>
    </View>
  );
}

function InfoFaixa({ label, value, fontSize = 12 }: { label: string; value: string; fontSize?: number }) {
  return (
    <View style={s.infoFaixa}>
      <Text style={[s.infoLabel, { fontSize: fontSize - 1 }]}>{label}</Text>
      <Text style={[s.infoValue, { fontSize }]} numberOfLines={1}>{value || "—"}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.card,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: C.cinzaBd,
  },
  headerTitle: { color: C.branco, fontSize: 22, fontWeight: "900" },
  headerSub: { color: C.ouro, marginTop: 3, fontSize: 13, fontWeight: "700" },
  btnSair: {
    backgroundColor: C.ouroDim, borderWidth: 1, borderColor: C.ouroBd,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9,
  },
  btnSairText: { color: C.ouro, fontWeight: "800", fontSize: 13 },

  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 20 },
  hint: {
    color: C.cinza, fontWeight: "700", fontSize: 13, marginBottom: 20,
    backgroundColor: C.card, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1, borderColor: C.cinzaBd, overflow: "hidden",
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },

  cardBase: {
    position: "absolute", top: 0, left: 0,
    backfaceVisibility: "hidden", backgroundColor: "transparent",
  },
  cardInner: {
    borderRadius: 20, overflow: "hidden",
    backgroundColor: "#0f0f0f",
    borderWidth: 1.5, borderColor: C.ouroBd,
    ...Platform.select({
      ios:     { shadowColor: C.ouro, shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 12 },
    }),
  },

  // Topo da carteirinha
  cardTopBar: {
    backgroundColor: "#000",
    paddingVertical: 10, paddingHorizontal: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: C.ouroBd,
  },
  cardTopBarText: { color: C.ouro, fontWeight: "900", fontSize: 10, letterSpacing: 1 },
  cardTopLogo: { height: 26, width: 80 },

  // Cargo
  cargoBadge: {
    marginHorizontal: 14, marginTop: 10,
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8, alignSelf: "flex-start",
  },
  cargoBadgeText: { fontWeight: "900", fontSize: 10, letterSpacing: 1 },

  // Corpo: foto + faixas
  cardBody: {
    flex: 1, flexDirection: "row",
    paddingHorizontal: 14, paddingVertical: 12, gap: 12, alignItems: "flex-start",
  },

  fotoBox: {
    borderRadius: 14, overflow: "hidden",
    backgroundColor: "#1a1a1a", borderWidth: 1.5, borderColor: C.ouroBd,
  },
  fotoImg: { width: "100%", height: "100%" },
  fotoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1a1a1a" },
  fotoInicial: { color: C.ouro, fontSize: 32, fontWeight: "900" },

  infoFaixa: {
    backgroundColor: "#0c0c0c",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    marginBottom: 6, borderWidth: 1, borderColor: "#222",
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  infoLabel: {
    color: C.ouro, fontWeight: "900",
    width: 46, letterSpacing: 0.5,
  },
  infoValue: { color: C.branco, fontWeight: "800", flex: 1 },

  // Rodapé
  cardFooter: {
    backgroundColor: "#000",
    paddingVertical: 9, paddingHorizontal: 14,
    alignItems: "center",
    borderTopWidth: 1, borderTopColor: C.ouroBd,
  },
  cardFooterText: { color: C.ouro, fontWeight: "900", fontSize: 9, letterSpacing: 0.8 },

  // Verso
  versoCenter: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 20, paddingBottom: 16, gap: 14,
  },
  qrBox: {
    width: 110, height: 110,
    backgroundColor: "#0c0c0c", borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: C.ouroBd,
  },
  qrIcon: { fontSize: 42 },
  idBox: {
    backgroundColor: "#0c0c0c", borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10,
    alignItems: "center", borderWidth: 1, borderColor: "#222",
  },
  idLabel: { color: C.cinza, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  idValue: { color: C.ouro, fontSize: 18, fontWeight: "900", marginTop: 4, letterSpacing: 2 },
  regrasBox: {
    backgroundColor: "#0c0c0c", borderRadius: 12,
    padding: 12, width: "100%", gap: 6,
    borderWidth: 1, borderColor: "#222",
  },
  regraTexto: { color: "#666", fontSize: 11, fontWeight: "700" },
  versoLogo: {
    position: "absolute", bottom: 46, right: 16,
    width: 100, height: 32,
  },
});