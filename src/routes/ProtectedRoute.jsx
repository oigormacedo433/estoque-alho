// Rota protegida.
//
// Se o usuário estiver logado, libera o acesso.
// Se não estiver logado, manda para /login.
//
// Correção:
// A tela de "Verificando sessão" aparece apenas na primeira
// verificação de login. Trocar de aba não deve limpar o sistema.

import { Navigate, Outlet } from "react-router";

import { useAuth } from "../contexts/AuthContext";

function ProtectedRoute() {
  const { estaLogado, carregandoAuth } = useAuth();

  if (carregandoAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="rounded-3xl border border-[var(--color-border-soft)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-green-light)] text-3xl">
            🧄
          </div>

          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            Estoque de Alho
          </h1>

          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Verificando sessão...
          </p>
        </div>
      </div>
    );
  }

  if (!estaLogado) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;