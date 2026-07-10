import { Navigate, Route, Routes } from "react-router";

import MainLayout from "../layouts/MainLayout";

import Login from "../pages/Login/Login";
import BI from "../pages/BI/BI";

import ChegadaFazenda from "../pages/ChegadaFazenda/ChegadaFazenda";
import AlhoClassificado from "../pages/AlhoClassificado/AlhoClassificado";
import ProdutoFinal from "../pages/ProdutoFinal/ProdutoFinal";
import SaidaVenda from "../pages/SaidaVenda/SaidaVenda";
import EstoqueAtual from "../pages/EstoqueAtual/EstoqueAtual";
import Calibres from "../pages/Calibres/Calibres";
import Configuracoes from "../pages/Configuracoes/Configuracoes";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/bi" replace />} />
        <Route path="/dashboard" element={<Navigate to="/bi" replace />} />
        <Route path="/relatorios" element={<Navigate to="/bi" replace />} />

        <Route path="/bi" element={<BI />} />

        <Route path="/chegada-fazenda" element={<ChegadaFazenda />} />
        <Route path="/alho-classificado" element={<AlhoClassificado />} />
        <Route path="/produto-final" element={<ProdutoFinal />} />
        <Route path="/saida-venda" element={<SaidaVenda />} />
        <Route path="/estoque-atual" element={<EstoqueAtual />} />
        <Route path="/calibres" element={<Calibres />} />
        <Route path="/configuracoes" element={<Configuracoes />} />

        <Route
          path="/consulta-chegada-fazenda"
          element={<Navigate to="/chegada-fazenda" replace />}
        />

        <Route
          path="/consulta-estoque-classificado"
          element={<Navigate to="/alho-classificado" replace />}
        />

        <Route
          path="/consulta-produto-final"
          element={<Navigate to="/produto-final" replace />}
        />

        <Route
          path="/consulta-saidas"
          element={<Navigate to="/saida-venda" replace />}
        />

        <Route path="*" element={<Navigate to="/bi" replace />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;