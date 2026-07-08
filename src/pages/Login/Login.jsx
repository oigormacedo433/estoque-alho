// Tela de Login.
//
// Etapa 7:
// - Fundo claro
// - Card central
// - Logo de alho
// - Nome Estoque de Alho
// - Campo e-mail
// - Campo senha
// - Botão verde Entrar
// - Validação de campos obrigatórios
// - Login com Supabase Auth
// - Redirecionamento para Dashboard
// - Erro se login inválido

import { useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { Eye, EyeOff, Lock, Mail } from "lucide-react";

import { AlertBox, Button, Card, Input } from "../../components/ui";

import { useAuth } from "../../contexts/AuthContext";

function Login() {
  const navigate = useNavigate();

  const { login, estaLogado, carregandoAuth } = useAuth();

  const [form, setForm] = useState({
    email: "",
    senha: "",
  });

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Se já estiver logado, não precisa ver login.
  if (!carregandoAuth && estaLogado) {
    return <Navigate to="/dashboard" replace />;
  }

  function atualizarCampo(event) {
    const { name, value } = event.target;

    setForm((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));

    setErro("");
  }

  function validarFormulario() {
    if (!form.email.trim()) {
      return "Informe o e-mail.";
    }

    if (!form.senha.trim()) {
      return "Informe a senha.";
    }

    return "";
  }

  async function entrar(event) {
    event.preventDefault();

    try {
      setErro("");

      const mensagemErro = validarFormulario();

      if (mensagemErro) {
        setErro(mensagemErro);
        return;
      }

      setCarregando(true);

      await login(form.email.trim(), form.senha);

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Erro ao fazer login:", error);

      const mensagem =
        error.message === "Invalid login credentials"
          ? "E-mail ou senha inválidos."
          : error.message || "Não foi possível fazer login.";

      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-[var(--color-green-light)] opacity-70" />
        <div className="absolute bottom-[-140px] right-[-140px] h-[380px] w-[380px] rounded-full bg-[var(--color-green-light)] opacity-70" />
      </div>

      <div className="relative z-10 w-full max-w-[460px]">
        <Card className="p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-[var(--color-green-border)] bg-[var(--color-green-light)] text-5xl shadow-sm">
              🧄
            </div>

            <h1 className="mt-5 text-3xl font-bold text-[var(--color-text-primary)]">
              Estoque de Alho
            </h1>

            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Controle de recebimento, classificação, produto final e saídas
            </p>
          </div>

          {erro && (
            <div className="mb-5">
              <AlertBox
                variant="danger"
                title="Erro no login"
                description={erro}
              />
            </div>
          )}

          <form onSubmit={entrar}>
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  <Mail size={17} className="text-[var(--color-green-primary)]" />
                  E-mail
                </div>

                <Input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={atualizarCampo}
                  placeholder="Digite seu e-mail"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  <Lock size={17} className="text-[var(--color-green-primary)]" />
                  Senha
                </div>

                <div className="relative">
                  <Input
                    name="senha"
                    type={mostrarSenha ? "text" : "password"}
                    value={form.senha}
                    onChange={atualizarCampo}
                    placeholder="Digite sua senha"
                  />

                  <button
                    type="button"
                    onClick={() => setMostrarSenha((valorAtual) => !valorAtual)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] transition hover:text-[var(--color-green-primary)]"
                  >
                    {mostrarSenha ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={carregando || carregandoAuth}
              className="mt-7 w-full"
            >
              {carregando ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-center text-xs leading-5 text-[var(--color-text-muted)]">
            Acesso restrito ao controle interno da fazenda.
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Login;