import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/supabase";

export default function Index() {
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/(public)/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      // se não tiver profile ainda, manda pro login por enquanto
      if (error || !profile) {
        router.replace("/(public)/login");
        return;
      }

      const role = profile.role;
      const isLider =
        role === "resp_bonde" || role === "resp_zona" || role === "resp_socio" || role === "diretoria";

      router.replace(isLider ? "/(lider)/(tabs)/carteirinha" : "/(membro)/(tabs)/carteirinha");
    })();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}