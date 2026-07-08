import { Navigate, Route, Routes } from "react-router";

import { useAuth } from "../contexts/AuthContext";

import MainLayout from "../layouts/MainLayout";

import Login from "../pages/Login/Login";

import BI from "../pages/BI/BI";

import ChegadaFazenda from "../pages/ChegadaFazenda/ChegadaFazenda";
import ConsultaChegadaFazenda from "../pages/ConsultaChegadaFazenda/ConsultaChegadaFazenda";

import AlhoClassificado from "../pages/AlhoClassificado/AlhoClassificado";
import ConsultaEstoqueClassificado from "../pages/ConsultaEstoqueClassificado/ConsultaEstoqueClassificado";

import ProdutoFinal from "../pages/ProdutoFinal/ProdutoFinal";
import ConsultaProdutoFinal from "../pages/ConsultaProdutoFinal/ConsultaProdutoFinal";

import SaidaVenda from "../pages/SaidaVenda/SaidaVenda";
import ConsultaSaidas from "../pages/ConsultaSaidas/ConsultaSaidas";

import EstoqueAtual from "../pages/EstoqueAtual/EstoqueAtual";

import Calibres from "../pages/Calibres/Calibres";
import Configuracoes from "../pages/Configuracoes/Configuracoes";

function TelaCarregando() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg-page)]">
      <div className="rounded-3xl border border-[var(--color-border-soft)] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-green-light)] text-2xl">
          🧄
        </div>

        <h1 className="text-lg font-black text-[var(--color-text-primary)]">
          Carregando sistema
        </h1>

        <p className="mt-2 text-sm font-semibold text-[var(--color-text-secondary)]">
          Verificando login e permissões...
        </p>
      </div>
    </div>
  );
}

function RotaProtegida({ children }) {
  const { autenticado, carregando } = useAuth();

  if (carregando) {
    return <TelaCarregando />;
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RotaPublica({ children }) {
  const { autenticado, carregando } = useAuth();

  if (carregando) {
    return <TelaCarregando />;
  }

  if (autenticado) {
    return <Navigate to="/bi" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RotaPublica>
            <Login />
          </RotaPublica>
        }
      />

      <Route
        path="/"
        element={
          <RotaProtegida>
            <MainLayout />
          </RotaProtegida>
        }
      >
        <Route index element={<Navigate to="/bi" replace />} />

        <Route path="bi" element={<BI />} />

        <Route path="dashboard" element={<Navigate to="/bi" replace />} />
        <Route path="relatorios" element={<Navigate to="/bi" replace />} />

        <Route path="chegada-fazenda" element={<ChegadaFazenda />} />
        <Route
          path="consulta-chegada-fazenda"
          element={<ConsultaChegadaFazenda />}
        />

        <Route path="alho-classificado" element={<AlhoClassificado />} />
        <Route
          path="consulta-estoque-classificado"
          element={<ConsultaEstoqueClassificado />}
        />

        <Route path="produto-final" element={<ProdutoFinal />} />
        <Route
          path="consulta-produto-final"
          element={<ConsultaProdutoFinal />}
        />

        <Route path="saida-venda" element={<SaidaVenda />} />
        <Route path="consulta-saidas" element={<ConsultaSaidas />} />

        <Route path="estoque-atual" element={<EstoqueAtual />} />

        <Route path="calibres" element={<Calibres />} />

        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>

      <Route path="*" element={<Navigate to="/bi" replace />} />
    </Routes>
  );
}

export default AppRoutes;