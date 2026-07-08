import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../services/supabaseClient";

const AuthContext = createContext(null);

async function tentarBuscarPerfilEmTabela(nomeTabela, usuario) {
  try {
    const { data, error } = await supabase
      .from(nomeTabela)
      .select("*")
      .eq("id", usuario.id)
      .maybeSingle();

    if (error) {
      return null;
    }

    return data || null;
  } catch {
    return null;
  }
}

async function buscarPerfilUsuario(usuario) {
  if (!usuario?.id) {
    return null;
  }

  const tabelasPossiveis = ["perfis", "usuarios", "profiles"];

  for (const tabela of tabelasPossiveis) {
    const perfilEncontrado = await tentarBuscarPerfilEmTabela(tabela, usuario);

    if (perfilEncontrado) {
      return perfilEncontrado;
    }
  }

  return {
    id: usuario.id,
    nome:
      usuario.user_metadata?.nome_completo ||
      usuario.user_metadata?.nome ||
      usuario.user_metadata?.name ||
      usuario.user_metadata?.full_name ||
      "Igor Macedo",
    tipo: "Administrador",
  };
}

function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroAuth, setErroAuth] = useState("");

  async function carregarSessaoInicial() {
    try {
      setCarregando(true);
      setErroAuth("");

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      const sessaoAtual = data?.session || null;
      const usuarioAtual = sessaoAtual?.user || null;

      setSessao(sessaoAtual);
      setUsuario(usuarioAtual);

      if (usuarioAtual) {
        const perfilBanco = await buscarPerfilUsuario(usuarioAtual);
        setPerfil(perfilBanco);
      } else {
        setPerfil(null);
      }
    } catch (error) {
      console.error("Erro ao carregar sessão:", error);

      setErroAuth(error.message || "Não foi possível carregar a sessão.");
      setSessao(null);
      setUsuario(null);
      setPerfil(null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarSessaoInicial();

    const { data } = supabase.auth.onAuthStateChange(
      async (_evento, novaSessao) => {
        const novoUsuario = novaSessao?.user || null;

        setSessao(novaSessao || null);
        setUsuario(novoUsuario);

        if (novoUsuario) {
          const perfilBanco = await buscarPerfilUsuario(novoUsuario);
          setPerfil(perfilBanco);
        } else {
          setPerfil(null);
        }

        setCarregando(false);
      }
    );

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  async function entrar(email, senha) {
    try {
      setErroAuth("");
      setCarregando(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        throw error;
      }

      const usuarioLogado = data?.user || data?.session?.user || null;

      setSessao(data?.session || null);
      setUsuario(usuarioLogado);

      if (usuarioLogado) {
        const perfilBanco = await buscarPerfilUsuario(usuarioLogado);
        setPerfil(perfilBanco);
      }

      return data;
    } catch (error) {
      console.error("Erro ao entrar:", error);

      const mensagem =
        error.message === "Invalid login credentials"
          ? "E-mail ou senha inválidos."
          : error.message || "Não foi possível entrar no sistema.";

      setErroAuth(mensagem);

      throw new Error(mensagem);
    } finally {
      setCarregando(false);
    }
  }

  async function sair() {
    try {
      setErroAuth("");
      setCarregando(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setSessao(null);
      setUsuario(null);
      setPerfil(null);
    } catch (error) {
      console.error("Erro ao sair:", error);

      setErroAuth(error.message || "Não foi possível sair do sistema.");

      throw error;
    } finally {
      setCarregando(false);
    }
  }

  const autenticado = Boolean(sessao && usuario);

  const value = useMemo(() => {
    return {
      sessao,
      usuario,
      perfil,
      autenticado,
      carregando,
      loading: carregando,
      erroAuth,

      entrar,
      login: entrar,
      signIn: entrar,

      sair,
      logout: sair,
      signOut: sair,

      recarregarSessao: carregarSessaoInicial,
    };
  }, [sessao, usuario, perfil, autenticado, carregando, erroAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider.");
  }

  return context;
}

export { AuthProvider, useAuth };