import { useAuth } from "@/contexts/AuthContext";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Alert, View } from "react-native";

const LEADER_ROLES = [
  "resp_bonde",
  "resp_zona",
  "resp_socio",
  "diretoria",
];

export default function Index() {
  const auth = useAuth();

  console.log("[INDEX] useAuth retorno:", auth);

  const { user, profile, loading, signOut } = auth || {};

  useEffect(() => {
    if (loading) return;

    verificarAcesso();
  }, [loading, user, profile]);

  async function verificarAcesso() {
    try {
      console.log("[INDEX] user:", user);
      console.log("[INDEX] profile:", profile);
      console.log("[INDEX] loading:", loading);

      if (!user) {
        console.log("[INDEX] sem usuário");
        router.replace("/(public)/login");
        return;
      }

      if (!profile) {
        console.log("[INDEX] usuário existe mas profile não existe");

        await signOut?.();
        router.replace("/(public)/login");
        return;
      }

      if (
        profile.status === "suspenso" ||
        profile.status === "expulso"
      ) {
        console.log("[INDEX] usuário bloqueado:", profile.status);

        await signOut?.();

        Alert.alert(
          "Acesso bloqueado",
          profile.status === "expulso"
            ? "Sua conta foi expulsa."
            : "Sua conta está suspensa."
        );

        router.replace("/(public)/login");
        return;
      }

      const isLider = LEADER_ROLES.includes(profile.role);

      console.log("[INDEX] role:", profile.role);
      console.log("[INDEX] isLider:", isLider);

      router.replace(
        isLider
          ? "/(lider)/(tabs)/carteirinha"
          : "/(membro)/(tabs)/carteirinha"
      );
    } catch (err) {
      console.error("[INDEX ERROR]", err);
      router.replace("/(public)/login");
    }
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator size="large" />
    </View>
  );
}