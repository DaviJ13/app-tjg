import { supabase } from "@/supabase";
import { createContext, useContext, useEffect, useState } from "react";

console.log("AUTH CONTEXT CARREGADO");

type AuthContextType = {
  user: any;
  profile: any;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile() {
    console.log("[AUTH] refreshProfile");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log("[AUTH] getUser", { user, userError });

    if (!user) {
      console.log("[AUTH] usuário não encontrado");
      setUser(null);
      setProfile(null);
      return;
    }

    console.log("[AUTH] user.id =", user.id);
    setUser(user);

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    console.log("[AUTH] profile =", profileData);
    console.log("[AUTH] profileError =", profileError);

    setProfile(profileData ?? null);
  }

  async function signOut() {
    console.log("[AUTH] signOut");
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      console.log("[AUTH] inicializando");
      await refreshProfile();
      if (mounted) {
        console.log("[AUTH] loading false");
        setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AUTH] onAuthStateChange =", event, session?.user?.id);

      // Ao fazer sign in, atualiza o perfil e para o loading
      await refreshProfile();

      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}