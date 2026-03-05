# TJG App (Carteirinha + Sócio) — Setup do Zero (Notebook Novo)

Este projeto é um app **React Native (Expo)** usando **Expo Router** e **Supabase** (Auth + tabela `profiles`).

Objetivo: você pegar um **notebook novo**, instalar o necessário e conseguir **rodar o app sem erros**.

---

# 1) Pré-requisitos (instalar no notebook)

## 1.1 Instalar Node.js (versão LTS)

Baixe e instale o **Node.js LTS**.

Depois confirme no terminal:

```bash
node -v
npm -v
```

Se aparecer as versões, está tudo certo.

---

## 1.2 Instalar Git

Instale o **Git**.

Confirme no terminal:

```bash
git --version
```

---

## 1.3 Instalar Expo Go no celular

No celular (Android ou iPhone):

1. Abra a loja de aplicativos
2. Procure por **Expo Go**
3. Instale

Esse app será usado para rodar o projeto no celular.

---

# 2) Baixar o projeto no notebook

## Se estiver usando Git

```bash
git clone URL_DO_REPOSITORIO
cd NOME_DA_PASTA_DO_PROJETO
```

## Se estiver usando ZIP

1. Extraia o arquivo ZIP
2. Abra a pasta no **VSCode**
3. Abra o **terminal dentro da pasta**

---

# 3) Instalar as dependências do projeto

Dentro da pasta do projeto, rode:

```bash
npm install
```

Se acontecer algum erro estranho, rode:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

# 4) Criar arquivo de variáveis de ambiente (.env)

Na **raiz do projeto** (mesmo lugar do `package.json`), crie um arquivo chamado:

```
.env
```

Dentro dele coloque:

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SEU_PUBLISHABLE_KEY
```

⚠️ Importante:

No Expo, as variáveis **precisam começar com**:

```
EXPO_PUBLIC_
```

Se usar `NEXT_PUBLIC` não funciona.

---

# 5) Onde pegar as chaves no Supabase

Entre no painel do Supabase.

Vá em:

```
Project Settings
```

Pegue:

- **Project URL**
- **Publishable Key**

Se você só tiver o **Project ID**, a URL normalmente é:

```
https://PROJECT_ID.supabase.co
```

Exemplo:

```
https://abcd1234.supabase.co
```

---

# 6) Rodar o projeto

No terminal:

```bash
npx expo start
```

Isso vai abrir uma página no navegador e gerar um **QR Code**.

---

# 7) Abrir o app no celular

1. Conecte o **celular e o notebook na mesma rede Wi-Fi**
2. Abra o **Expo Go**
3. Escaneie o **QR Code**

O app irá abrir no celular.

---

# 8) Caso o celular não consiga conectar

Às vezes a rede bloqueia o modo padrão.

Tente rodar com:

```bash
npx expo start --tunnel
```

Isso resolve na maioria dos casos.

---

# 9) Limpar cache do Expo (se algo der bug)

Se o app abrir com erros estranhos, rode:

```bash
npx expo start -c
```

Isso limpa o cache.

---

# 10) Problemas comuns

## Erro: `supabaseUrl is required`

Significa que o `.env` não foi carregado.

Verifique:

- O arquivo se chama **.env**
- Ele está na **raiz do projeto**
- As variáveis começam com **EXPO_PUBLIC_**

Depois rode:

```bash
npx expo start -c
```

---

## Erro de URL do Supabase

Teste no navegador:

```
https://SEU_PROJECT_ID.supabase.co/auth/v1/health
```

Se abrir, a URL está correta.

---

## Erro: `column profiles.zona does not exist`

Significa que o banco não tem a coluna.

A tabela `profiles` precisa ter:

- id
- nome
- role
- zona
- bonde
- tipo_socio
- foto_url

Crie ou ajuste essas colunas no **Supabase SQL Editor**.

---

## Login retorna "Invalid credentials"

Você precisa criar um usuário no Supabase:

1. Vá em **Authentication**
2. Clique em **Users**
3. Clique em **Add User**

Exemplo:

```
Email: 12345678901@tjg.com
Senha: 123456
```

---

# 11) Comandos úteis

Instalar dependências:

```bash
npm install
```

Rodar projeto:

```bash
npx expo start
```

Rodar limpando cache:

```bash
npx expo start -c
```

Rodar usando tunnel:

```bash
npx expo start --tunnel
```

---

# 12) Checklist rápido para rodar em outra máquina

1. Instalar **Node.js LTS**
2. Instalar **Git**
3. Clonar ou baixar o projeto
4. Rodar:

```bash
npm install
```

5. Criar arquivo `.env`
6. Rodar:

```bash
npx expo start -c
```

7. Abrir **Expo Go** no celular e escanear o QR Code.

---

Se tudo isso for feito, o projeto roda normalmente.
