import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Animated,
  Easing,
  Image,
  ImageBackground,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/supabase";

const IMG_WATERMARK = require("../../../assets/images/logo_fundo.png");
const IMG_TITULO = require("../../../assets/images/titulo_jovem.png");
const IMG_LOGOS = require("../../../assets/images/logos.png");

// ✅ proporção real da arte (horizontal)
const CARD_AR = 944 / 560;

type Perfil = {
  id: string;
  nome: string | null;
  role: string | null;
  zona: string | null;
  bonde: string | null;
  tipo_socio: string | null;
  foto_url?: string | null;
};

export default function CarteirinhaTab() {
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  // ✅ espaço útil (header + hint + bottom tabs)
  const safeTopAndBottom = 230;
  const availH = Math.max(320, height - safeTopAndBottom);

  // ✅ tamanho do cartão (não estoura em telas grandes)
  // você pode ajustar o "560" se quiser permitir ficar maior em tablet
  const outerH = clamp(availH * 0.78, 360, 560);

  // porque gira 90°:
  const innerW = outerH;
  const innerH = Math.round(innerW / CARD_AR);
  const outerW = innerH;

  // ✅ regras de “layout grande”
  const isBigCard = innerW >= 520; // telas maiores / tablets
  const photoH = isBigCard ? 188 : 130; // foto maior em telas grandes
  const logoH = isBigCard ? 56 : 44; // logo um pouco maior em telas grandes

  // Flip
  const [isFlipped, setIsFlipped] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const frontRotateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const frontOpacity = anim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = anim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.replace("/(public)/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id,nome,role,zona,bonde,tipo_socio,foto_url")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setPerfil(data as Perfil);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha ao carregar perfil");
    } finally {
      setLoading(false);
    }
  }

  function toggleFlip() {
    const toValue = isFlipped ? 0 : 1;
    Animated.timing(anim, {
      toValue,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  }

  const primeiroNome = useMemo(() => {
    const n = (perfil?.nome ?? "").trim();
    if (!n) return "Sócio";
    return n.split(" ")[0];
  }, [perfil?.nome]);

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

  if (!perfil) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.center}>
          <Text style={styles.muted}>Você não está logado.</Text>
          <Pressable onPress={() => router.replace("/(public)/login")} style={styles.btn}>
            <Text style={styles.btnText}>Ir para Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ mesma rotação/escala na frente e no verso (gira pra esquerda)
  const cardTransformFront = [
    { perspective: 1400 },
    { rotateY: frontRotateY },
    { rotate: "-90deg" as const },
    { scaleX: 1 as const },
    { scaleY: 1.03 as const },
  ];

  const cardTransformBack = [
    { perspective: 1400 },
    { rotateY: backRotateY },
    { rotate: "-90deg" as const },
    { scaleX: 1 as const },
    { scaleY: 1.03 as const },
  ];

  return (
    <SafeAreaView style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Olá, {primeiroNome}!</Text>
        <Text style={styles.headerSub}>Acesse sua carteirinha digital abaixo</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>Toque na carteirinha para virar</Text>
        </View>

        {/* ✅ CONTAINER (em pé) — centralizado, sem colar na esquerda */}
        <View style={{ width: outerW, height: outerH, alignSelf: "center" }}>
          <Pressable onPress={toggleFlip} style={{ flex: 1 }}>
            {/* Frente */}
            <Animated.View
              style={[
                styles.cardBase,
                {
                  width: outerW,
                  height: outerH,
                  opacity: frontOpacity,
                  transform: cardTransformFront,
                },
              ]}
            >
              <Frente
                perfil={perfil}
                innerW={innerW}
                innerH={innerH}
                photoH={photoH}
                logoH={logoH}
              />
            </Animated.View>

            {/* Verso */}
            <Animated.View
              style={[
                styles.cardBase,
                {
                  width: outerW,
                  height: outerH,
                  opacity: backOpacity,
                  transform: cardTransformBack,
                },
              ]}
            >
              <Verso perfil={perfil} innerW={innerW} innerH={innerH} />
            </Animated.View>
          </Pressable>

          {/* PDF */}
          <Pressable
            onPress={() => Alert.alert("PDF", "Depois ativamos a geração do PDF.")}
            style={styles.fab}
          >
            <Text style={styles.fabText}>PDF</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Frente({
  perfil,
  innerW,
  innerH,
  photoH,
  logoH,
}: {
  perfil: Perfil;
  innerW: number;
  innerH: number;
  photoH: number;
  logoH: number;
}) {
  const socio = String(perfil.tipo_socio ?? "MEMBRO").toUpperCase();
  const cargo = String(perfil.role ?? "-").toUpperCase();

  // ✅ “alinhamento inteligente”
  // (foto alinhada com NOME/ZONA/BONDE e logo alinhada com CARGO)
  const top = 66;
  const bottomBarH = 32;
  const bottomGap = 12; // folga antes da barra preta
  const workingH = innerH - top - bottomBarH - bottomGap;

  // altura “aproximada” de uma faixa (visual) -> ajuda a alinhar
  const faixaH = 44;
  const gapFaixas = 10;

  // 3 faixas (nome/zona/bonde)
  const threeFaixasH = faixaH * 3 + gapFaixas * 2;

  // foto não pode ser maior que isso, senão invade
  const computedPhotoH = clamp(photoH, 110, Math.floor(Math.min(threeFaixasH, workingH * 0.62)));

  // logo “encaixa” no espaço do cargo (mesma vibe de altura)
  const computedLogoH = clamp(logoH, 40, 64);

  return (
    <View style={{ width: innerW, height: innerH }}>
      <ImageBackground
        source={IMG_WATERMARK}
        resizeMode="cover"
        style={styles.cardInner}
        imageStyle={styles.bg}
      >
        <Image source={IMG_TITULO} resizeMode="contain" style={styles.titulo} />

        <View style={[styles.row, { top, bottom: bottomBarH + bottomGap }]}>
          {/* ESQUERDA */}
          <View style={styles.leftCol}>
            <View style={[styles.photoWrap, { height: computedPhotoH }]}>
              {perfil.foto_url ? (
                <Image source={{ uri: perfil.foto_url }} style={styles.photoImg} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>FOTO</Text>
                </View>
              )}
            </View>

            {/* ✅ logo alinhada com o "CARGO" */}
            <View style={{ marginTop: 10, height: faixaH, justifyContent: "center" }}>
              <Image
                source={IMG_LOGOS}
                resizeMode="contain"
                style={[styles.logosLeft, { height: computedLogoH }]}
              />
            </View>
          </View>

          {/* DIREITA */}
          <View style={styles.fields}>
            <Faixa label="NOME" value={perfil.nome ?? "-"} />
            <Faixa label="ZONA" value={perfil.zona ?? "-"} />
            <Faixa label="BONDE" value={perfil.bonde ?? "-"} />
            <Faixa label="CARGO" value={cargo || "-"} />
          </View>
        </View>

        <View style={styles.bottomBar}>
          <Text style={styles.bottomBarText}>{socio}</Text>
        </View>
      </ImageBackground>
    </View>
  );
}

function Verso({ perfil, innerW, innerH }: { perfil: Perfil; innerW: number; innerH: number }) {
  const socio = String(perfil.tipo_socio ?? "MEMBRO").toUpperCase();

  return (
    <View style={{ width: innerW, height: innerH }}>
      <ImageBackground
        source={IMG_WATERMARK}
        resizeMode="cover"
        style={styles.cardInner}
        imageStyle={styles.bg}
      >
        {/* topo */}
        <View style={styles.backTop}>
          <Text style={styles.backTitle}>TORCIDA JOVEM DO GALO</Text>
          <Text style={styles.backSub}>Carteirinha Digital</Text>
        </View>

        {/* centro */}
        <View style={styles.backCenter}>
          <View style={styles.qrBox}>
            <Text style={styles.qrText}>QR</Text>
          </View>
          <Text style={styles.backSmall}>ID: {(perfil.id ?? "").slice(0, 12).toUpperCase()}</Text>

          {/* ✅ pequenas regras/avisos no verso */}
          <View style={styles.rulesBox}>
            <Text style={styles.ruleText}>• Uso pessoal e intransferível</Text>
            <Text style={styles.ruleText}>• Apresente na entrada dos eventos</Text>
            <Text style={styles.ruleText}>• Sujeito a verificação pela diretoria</Text>
          </View>
        </View>

        {/* logos no verso */}
        <Image source={IMG_LOGOS} resizeMode="contain" style={styles.logosBack} />

        <View style={styles.bottomBar}>
          <Text style={styles.bottomBarText}>{socio}</Text>
        </View>
      </ImageBackground>
    </View>
  );
}

function Faixa({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.faixa}>
      <Text style={styles.faixaLabel}>{label}:</Text>
      <Text style={styles.faixaValue} numberOfLines={1}>
        {value || "-"}
      </Text>
    </View>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

const styles = StyleSheet.create({
  // ✅ cores “torcida”: preto no fundo + detalhes azul atual (pode mudar depois)
  page: { flex: 1, backgroundColor: "#ffffff" },

  header: {
    backgroundColor: "#0ea5ff", // se quiser trocar pra preto/vermelho depois, eu troco
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTitle: { color: "#fff", fontSize: 28, fontWeight: "900" },
  headerSub: { color: "rgba(255,255,255,0.92)", marginTop: 6, fontSize: 14, fontWeight: "700" },

  // ✅ você disse que paddingTop 100 ficou perfeito — mantido
  body: { flex: 1, alignItems: "center", justifyContent: "flex-start", paddingTop: 100 },

  hintBox: {
    backgroundColor: "#111113",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 2 },
    }),
  },
  hintText: { color: "#fff", fontWeight: "900" },

  cardBase: {
    position: "absolute",
    top: 0,
    left: 0,
    borderRadius: 18,
    overflow: "visible",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
  },

  cardInner: {
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.18)",
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#fff",
    ...Platform.select({
        ios: {
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 12 },
        },
        android: { elevation: 10 },
        }),
  },
  bg: { opacity: 1 },

  titulo: {
    position: "absolute",
    top: 8,
    right: 10,
    width: 190,
    height: 54,
  },

  row: {
    position: "absolute",
    left: 14,
    right: 14,
    flexDirection: "row",
    gap: 12,
  },

  leftCol: {
    width: 122,
    justifyContent: "flex-start",
    alignItems: "stretch",
  },

  photoWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  photoImg: { width: "100%", height: "100%" },
  photoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  photoPlaceholderText: { color: "#fff", fontWeight: "900" },

  logosLeft: {
    width: "100%",
    alignSelf: "flex-start",
  },

  fields: { flex: 1, justifyContent: "center", gap: 10 },

  faixa: {
    backgroundColor: "#000",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  faixaLabel: { color: "#fff", fontWeight: "900", width: 72, fontSize: 12 },
  faixaValue: { color: "#fff", fontWeight: "800", flex: 1, fontSize: 13 },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 32,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBarText: { color: "#fff", fontWeight: "900", letterSpacing: 1, fontSize: 12 },

  fab: {
    position: "absolute",
    right: -10,
    top: 6,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#0ea5ff",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 7 },
    }),
  },
  fabText: { color: "#fff", fontWeight: "900" },

  // verso
  backTop: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
  },
  backTitle: { fontSize: 14, fontWeight: "900", color: "#0f172a" },
  backSub: { marginTop: 2, color: "#334155", fontWeight: "700", fontSize: 12 },

  backCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  qrBox: {
    width: 120,
    height: 120,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  qrText: { fontWeight: "900", color: "#0f172a", fontSize: 22 },
  backSmall: { marginTop: 10, color: "#334155", fontWeight: "800" },

  rulesBox: {
    marginTop: 12,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 12,
    padding: 10,
  },
  ruleText: { color: "#0f172a", fontWeight: "800", fontSize: 12, marginTop: 4 },

  logosBack: {
    position: "absolute",
    right: 14,
    bottom: 36,
    width: 140,
    height: 44,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { color: "rgba(255,255,255,0.75)", marginTop: 10 },
  btn: { marginTop: 10, backgroundColor: "#000", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "900" },
});