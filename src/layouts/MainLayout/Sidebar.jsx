// Sidebar principal do sistema.
//
// Correção:
// - Dashboard removido
// - Relatórios removido
// - BI virou a tela principal
//
// Menus expansíveis:
// - Chegada da Fazenda
// - Alho Classificado
// - Produto Final
// - Saída / Venda

import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";

import {
  BarChart3,
  Boxes,
  ChevronDown,
  Gauge,
  LogOut,
  PackageCheck,
  Search,
  Settings,
  SlidersHorizontal,
  Truck,
  Warehouse,
  Wheat,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { logout } = useAuth();

  const [grupoAberto, setGrupoAberto] = useState(null);

  const menuItems = [
    {
      type: "link",
      label: "BI",
      path: "/bi",
      icon: BarChart3,
    },
    {
      type: "group",
      id: "chegada",
      label: "Chegada da Fazenda",
      icon: Wheat,
      paths: ["/chegada-fazenda", "/consulta-chegada-fazenda"],
      items: [
        {
          label: "Lançamento",
          path: "/chegada-fazenda",
          icon: Wheat,
        },
        {
          label: "Consulta",
          path: "/consulta-chegada-fazenda",
          icon: Search,
        },
      ],
    },
    {
      type: "group",
      id: "classificado",
      label: "Alho Classificado",
      icon: Boxes,
      paths: ["/alho-classificado", "/consulta-estoque-classificado"],
      items: [
        {
          label: "Lançamento",
          path: "/alho-classificado",
          icon: Boxes,
        },
        {
          label: "Consulta Estoque",
          path: "/consulta-estoque-classificado",
          icon: Search,
        },
      ],
    },
    {
      type: "group",
      id: "produto-final",
      label: "Produto Final",
      icon: PackageCheck,
      paths: ["/produto-final", "/consulta-produto-final"],
      items: [
        {
          label: "Lançamento",
          path: "/produto-final",
          icon: PackageCheck,
        },
        {
          label: "Consulta",
          path: "/consulta-produto-final",
          icon: Search,
        },
      ],
    },
    {
      type: "group",
      id: "saida-venda",
      label: "Saída / Venda",
      icon: Truck,
      paths: ["/saida-venda", "/consulta-saidas"],
      items: [
        {
          label: "Lançamento",
          path: "/saida-venda",
          icon: Truck,
        },
        {
          label: "Consulta",
          path: "/consulta-saidas",
          icon: Search,
        },
      ],
    },
    {
      type: "link",
      label: "Estoque Atual",
      path: "/estoque-atual",
      icon: Warehouse,
    },
    {
      type: "link",
      label: "Cadastro de Calibres",
      path: "/calibres",
      icon: SlidersHorizontal,
    },
    {
      type: "link",
      label: "Configurações",
      path: "/configuracoes",
      icon: Settings,
    },
  ];

  useEffect(() => {
    const grupoAtual = menuItems.find((item) => {
      return item.type === "group" && item.paths.includes(location.pathname);
    });

    if (grupoAtual) {
      setGrupoAberto(grupoAtual.id);
    }
  }, [location.pathname]);

  async function sair() {
    try {
      await logout();

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Erro ao sair:", error);

      alert("Não foi possível sair do sistema.");
    }
  }

  function alternarGrupo(id) {
    setGrupoAberto((grupoAtual) => {
      if (grupoAtual === id) {
        return null;
      }

      return id;
    });
  }

  function renderLink(item, pequeno = false) {
    const Icon = item.icon;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) => `
          group/link
          flex
          w-full
          items-center
          gap-3
          rounded-2xl
          text-left
          font-semibold
          transition-all
          duration-300
          ease-out
          ${pequeno ? "px-3 py-2.5 text-xs" : "px-4 py-3 text-sm"}
          ${
            isActive
              ? "bg-white text-[var(--color-sidebar-dark)] shadow-sm"
              : "text-white/75 hover:bg-white/10 hover:text-white"
          }
        `}
      >
        {({ isActive }) => (
          <>
            <Icon
              size={pequeno ? 17 : 20}
              className={`
                shrink-0
                transition-all
                duration-300
                ease-out
                ${
                  isActive
                    ? "text-[var(--color-green-primary)]"
                    : "text-white/75 group-hover/link:text-white"
                }
              `}
            />

            <span className="text-clamp">{item.label}</span>
          </>
        )}
      </NavLink>
    );
  }

  function renderGroup(group) {
    const Icon = group.icon;

    const grupoAtivo = group.paths.includes(location.pathname);
    const estaAberto = grupoAberto === group.id;

    return (
      <div key={group.id} className="space-y-1">
        <button
          type="button"
          onClick={() => alternarGrupo(group.id)}
          className={`
            group/button
            flex
            w-full
            items-center
            justify-between
            gap-3
            rounded-2xl
            px-4
            py-3
            text-left
            text-sm
            font-semibold
            transition-all
            duration-300
            ease-out
            ${
              grupoAtivo || estaAberto
                ? "bg-white text-[var(--color-sidebar-dark)] shadow-sm"
                : "text-white/75 hover:bg-white/10 hover:text-white"
            }
          `}
        >
          <span className="flex min-w-0 items-center gap-3">
            <Icon
              size={20}
              className={`
                shrink-0
                transition-all
                duration-300
                ease-out
                ${
                  grupoAtivo || estaAberto
                    ? "text-[var(--color-green-primary)]"
                    : "text-white/75 group-hover/button:text-white"
                }
              `}
            />

            <span className="text-clamp">{group.label}</span>
          </span>

          <ChevronDown
            size={18}
            className={`
              shrink-0
              transition-all
              duration-300
              ease-out
              ${estaAberto ? "rotate-180 scale-110" : "rotate-0 scale-100"}
              ${
                grupoAtivo || estaAberto
                  ? "text-[var(--color-green-primary)]"
                  : "text-white/75 group-hover/button:text-white"
              }
            `}
          />
        </button>

        <div
          className={`
            overflow-hidden
            transition-all
            duration-300
            ease-out
            ${estaAberto ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}
          `}
        >
          <div
            className={`
              ml-4
              space-y-1
              border-l
              border-white/15
              pl-3
              pt-1
              transition-all
              duration-300
              ease-out
              ${estaAberto ? "translate-y-0" : "-translate-y-2"}
            `}
          >
            {group.items.map((item) => renderLink(item, true))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside
      className="
        fixed
        left-0
        top-0
        z-40
        flex
        h-screen
        w-[280px]
        flex-col
        bg-gradient-to-b
        from-[var(--color-sidebar-dark)]
        to-[var(--color-sidebar-medium)]
        px-5
        py-6
        text-white
      "
    >
      <div className="mb-8 flex items-center gap-3 px-2">
        <div
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-2xl
            border
            border-white/15
            bg-white/12
            shadow-sm
          "
        >
          <div
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-full
              bg-white
              text-xl
            "
          >
            🧄
          </div>
        </div>

        <div>
          <h1 className="text-lg font-bold leading-tight text-white">
            Estoque de Alho
          </h1>

          <p className="mt-0.5 text-xs font-medium text-white/65">
            Controle agrícola
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
        {menuItems.map((item) => {
          if (item.type === "group") {
            return renderGroup(item);
          }

          return renderLink(item);
        })}
      </nav>

      <button
        type="button"
        onClick={sair}
        className="
          mt-5
          flex
          w-full
          items-center
          gap-3
          rounded-2xl
          border
          border-white/10
          bg-white/8
          px-4
          py-3
          text-sm
          font-semibold
          text-white/75
          transition-all
          duration-300
          ease-out
          hover:bg-white/10
          hover:text-white
        "
      >
        <LogOut size={20} />
        Sair
      </button>
    </aside>
  );
}

export default Sidebar;