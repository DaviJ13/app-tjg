import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { supabase } from "@/supabase";

export default function Ping() {
  const [msg, setMsg] = useState("testando...");

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("id").limit(1);
        setMsg(error ? `erro: ${error.message}` : `ok: ${JSON.stringify(data)}`);
      } catch (e: any) {
        setMsg(`catch: ${e?.message ?? String(e)}`);
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Text>{msg}</Text>
    </View>
  );
}