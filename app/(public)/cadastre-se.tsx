import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { supabase } from "@/supabase";

export default function Cadastro() {
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");

  async function cadastrar() {
    try {
      // validar convite
      const { data: convite } = await supabase
        .from("convites")
        .select("*")
        .eq("codigo", codigo)
        .eq("usado", false)
        .single();

      if (!convite) {
        Alert.alert("Código inválido");
        return;
      }

      // verificar blacklist
      const { data: black } = await supabase
        .from("blacklist")
        .select("*")
        .eq("cpf", cpf)
        .single();

      if (black) {
        Alert.alert("CPF bloqueado");
        return;
      }

      // criar usuário
      const { data, error } = await supabase.auth.signUp({
        email: `${cpf}@tjg.com`,
        password: senha,
      });

      if (error) {
        Alert.alert(error.message);
        return;
      }

      const user = data.user;

      // criar profile
      await supabase.from("profiles").insert({
        id: user?.id,
        nome,
        cpf,
        telefone,
        bonde_id: convite.bonde_id,
      });

      // marcar convite como usado
      await supabase
        .from("convites")
        .update({ usado: true })
        .eq("id", convite.id);

      Alert.alert("Cadastro realizado!");
    } catch (e) {
      Alert.alert("Erro no cadastro");
    }
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>Código</Text>
      <TextInput value={codigo} onChangeText={setCodigo} />

      <Text>Nome</Text>
      <TextInput value={nome} onChangeText={setNome} />

      <Text>CPF</Text>
      <TextInput value={cpf} onChangeText={setCpf} />

      <Text>Telefone</Text>
      <TextInput value={telefone} onChangeText={setTelefone} />

      <Text>Senha</Text>
      <TextInput secureTextEntry value={senha} onChangeText={setSenha} />

      <Pressable onPress={cadastrar}>
        <Text>Cadastrar</Text>
      </Pressable>
    </View>
  );
}