import { useMemo } from "react";
import { useLocation } from "react-router";

import { useAuth } from "../../contexts/AuthContext";

const pageInfo = {
  "/bi": {
    title: "BI",
    subtitle: "Painel gerencial completo com análises operacionais",
  },

  "/dashboard": {
    title: "BI",
    subtitle: "Painel gerencial completo com análises operacionais",
  },

  "/chegada-fazenda": {
    title: "Chegada da Fazenda",
    subtitle: "Lançamento de entrada do alho vindo da fazenda",
  },

  "/consulta-chegada-fazenda": {
    title: "Consulta de Chegadas",
    subtitle: "Filtros, edição e conferência das chegadas da fazenda",
  },

  "/alho-classificado": {
    title: "Alho Classificado",
    subtitle: "Lançamento da classificação por calibre",
  },

  "/consulta-estoque-classificado": {
    title: "Consulta de Alho Classificado",
    subtitle: "Consulta, filtros e edição da classificação",
  },

  "/produto-final": {
    title: "Produto Final",
    subtitle: "Lançamento das caixas finais prontas para venda por Área / Pivô",
  },

  "/consulta-produto-final": {
    title: "Consulta de Produto Final",
    subtitle: "Consulta, filtros e edição do produto final",
  },

  "/saida-venda": {
    title: "Saída / Venda",
    subtitle: "Expedição e baixa do estoque por Área / Pivô e calibre",
  },

  "/consulta-saidas": {
    title: "Consulta de Saídas",
    subtitle: "Filtros, edição e exclusão de saídas/vendas",
  },

  "/estoque-atual": {
    title: "Estoque Atual",
    subtitle: "Saldo disponível por Área / Pivô e calibre",
  },

  "/calibres": {
    title: "Cadastro de Calibres",
    subtitle: "Configuração dos calibres do sistema",
  },

  "/configuracoes": {
    title: "Configurações",
    subtitle: "Fazendas, áreas/pivôs, responsáveis e parâmetros gerais",
  },
};

function montarIniciais(nome = "") {
  const partes = String(nome)
    .trim()
    .split(" ")
    .filter(Boolean);

  if (partes.length === 0) return "IM";

  return partes
    .map((parte) => parte[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function obterNomeUsuario({ perfil, usuario }) {
  const nomeDoPerfil =
    perfil?.nome_completo ||
    perfil?.nome ||
    perfil?.name ||
    perfil?.usuario_nome ||
    perfil?.display_name ||
    "";

  const nomeDoAuth =
    usuario?.user_metadata?.nome_completo ||
    usuario?.user_metadata?.nome ||
    usuario?.user_metadata?.name ||
    usuario?.user_metadata?.full_name ||
    usuario?.user_metadata?.display_name ||
    "";

  const nomeEncontrado = String(nomeDoPerfil || nomeDoAuth || "").trim();

  if (nomeEncontrado) {
    return nomeEncontrado;
  }

  return "Igor Macedo";
}

function obterPerfilUsuario(perfil) {
  return (
    perfil?.tipo ||
    perfil?.cargo ||
    perfil?.perfil ||
    perfil?.funcao ||
    "Administrador"
  );
}

function Topbar() {
  const location = useLocation();

  const { usuario, perfil } = useAuth();

  const paginaAtual = useMemo(() => {
    return (
      pageInfo[location.pathname] || {
        title: "Estoque de Alho",
        subtitle: "Controle agrícola",
      }
    );
  }, [location.pathname]);

  const nomeUsuario = obterNomeUsuario({
    perfil,
    usuario,
  });

  const perfilUsuario = obterPerfilUsuario(perfil);

  const iniciais = montarIniciais(nomeUsuario);

  return (
    <header
      className="
        sticky
        top-0
        z-30
        border-b
        border-[var(--color-border-soft)]
        bg-[var(--color-bg-page)]/90
        px-4
        py-4
        backdrop-blur-xl
        sm:px-6
        lg:px-8
      "
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-black text-[var(--color-text-primary)] sm:text-2xl">
            {paginaAtual.title}
          </h2>

          {paginaAtual.subtitle && (
            <p className="mt-1 line-clamp-2 text-xs font-semibold text-[var(--color-text-secondary)] sm:text-sm">
              {paginaAtual.subtitle}
            </p>
          )}
        </div>

        <div
          className="
            flex
            h-12
            shrink-0
            items-center
            gap-3
            rounded-2xl
            border
            border-[var(--color-border)]
            bg-white
            px-3
            shadow-sm
            sm:min-w-[170px]
          "
        >
          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-[var(--color-green-light)]
              text-sm
              font-black
              text-[var(--color-green-primary)]
            "
          >
            {iniciais}
          </div>

          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-black text-[var(--color-text-primary)]">
              {nomeUsuario}
            </p>

            <p className="truncate text-xs font-semibold text-[var(--color-text-muted)]">
              {perfilUsuario}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;