import { View, Text, Pressable } from "react-native";
import { supabase } from "@/supabase";

export default function GerarCodigo() {

  async function gerarCodigo() {

    const codigo = "TJG-" + Math.floor(Math.random() * 9000 + 1000);

    await supabase.from("convites").insert({
      codigo,
      expira_em: new Date(Date.now() + 10 * 60 * 1000),
    });

    alert("Código: " + codigo);
  }

  return (
    <View>
      <Pressable onPress={gerarCodigo}>
        <Text>Gerar Código</Text>
      </Pressable>
    </View>
  );
}