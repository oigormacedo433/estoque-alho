import { NavLink } from "react-router";

import {
  BarChart3,
  Boxes,
  ChevronDown,
  ClipboardList,
  DoorOpen,
  PackageCheck,
  Search,
  Settings,
  SlidersHorizontal,
  Truck,
  Warehouse,
  X,
} from "lucide-react";

const gruposMenu = [
  {
    titulo: "BI",
    itens: [
      {
        label: "BI",
        path: "/bi",
        icon: BarChart3,
      },
    ],
  },
  {
    titulo: "Chegada da Fazenda",
    icon: ClipboardList,
    itens: [
      {
        label: "Lançamento",
        path: "/chegada-fazenda",
        icon: ClipboardList,
      },
      {
        label: "Consulta",
        path: "/consulta-chegada-fazenda",
        icon: Search,
      },
    ],
  },
  {
    titulo: "Alho Classificado",
    icon: Boxes,
    itens: [
      {
        label: "Lançamento",
        path: "/alho-classificado",
        icon: Boxes,
      },
      {
        label: "Consulta",
        path: "/consulta-estoque-classificado",
        icon: Search,
      },
    ],
  },
  {
    titulo: "Produto Final",
    icon: PackageCheck,
    itens: [
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
    titulo: "Saída / Venda",
    icon: Truck,
    itens: [
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
    titulo: "Estoque Atual",
    itens: [
      {
        label: "Estoque Atual",
        path: "/estoque-atual",
        icon: Warehouse,
      },
    ],
  },
  {
    titulo: "Cadastro de Calibres",
    itens: [
      {
        label: "Cadastro de Calibres",
        path: "/calibres",
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    titulo: "Configurações",
    itens: [
      {
        label: "Configurações",
        path: "/configuracoes",
        icon: Settings,
      },
    ],
  },
];

function SidebarLink({ item, onNavigate }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        `
          flex
          min-h-11
          w-full
          items-center
          gap-3
          rounded-2xl
          px-4
          py-3
          text-sm
          font-bold
          transition
          ${
            isActive
              ? "bg-white text-[var(--color-green-primary)] shadow-sm"
              : "text-white/85 hover:bg-white/10 hover:text-white"
          }
        `
      }
    >
      {Icon && <Icon size={18} className="shrink-0" />}

      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

function SidebarGroup({ grupo, onNavigate }) {
  const GrupoIcon = grupo.icon;

  if (grupo.itens.length === 1 && grupo.itens[0].label === grupo.titulo) {
    return <SidebarLink item={grupo.itens[0]} onNavigate={onNavigate} />;
  }

  return (
    <details className="group" open>
      <summary
        className="
          flex
          cursor-pointer
          list-none
          items-center
          justify-between
          gap-3
          rounded-2xl
          px-4
          py-3
          text-sm
          font-black
          text-white/95
          transition
          hover:bg-white/10
        "
      >
        <div className="flex min-w-0 items-center gap-3">
          {GrupoIcon && <GrupoIcon size={18} className="shrink-0" />}

          <span className="truncate">{grupo.titulo}</span>
        </div>

        <ChevronDown
          size={16}
          className="shrink-0 transition group-open:rotate-180"
        />
      </summary>

      <div className="mt-1 space-y-1 pl-4">
        {grupo.itens.map((item) => (
          <SidebarLink
            key={item.path}
            item={item}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </details>
  );
}

function Sidebar({ openMobile = false, onCloseMobile, onLogout }) {
  function fecharAoNavegar() {
    if (onCloseMobile) {
      onCloseMobile();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onCloseMobile}
        aria-label="Fechar menu"
        className={`
          fixed
          inset-0
          z-40
          bg-slate-950/55
          backdrop-blur-sm
          transition
          lg:hidden
          ${openMobile ? "block" : "hidden"}
        `}
      />

      <aside
        className={`
          fixed
          left-0
          top-0
          z-50
          flex
          h-dvh
          w-[280px]
          max-w-[86vw]
          flex-col
          overflow-hidden
          bg-[var(--color-sidebar-dark)]
          px-4
          py-5
          text-white
          shadow-2xl
          transition-transform
          duration-300
          ease-out
          sm:px-5
          sm:py-6
          lg:translate-x-0
          ${openMobile ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-2xl
                border
                border-white/15
                bg-white/10
                text-2xl
              "
            >
              🧄
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-black leading-tight text-white">
                Estoque de Alho
              </h1>

              <p className="truncate text-xs font-semibold text-white/65">
                Controle agrícola
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-2xl
              bg-white/10
              text-white
              transition
              hover:bg-white/15
              lg:hidden
            "
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav
          className="
            sidebar-scroll
            min-h-0
            flex-1
            space-y-2
            overflow-y-auto
            overflow-x-hidden
            pr-1
          "
        >
          {gruposMenu.map((grupo) => (
            <SidebarGroup
              key={grupo.titulo}
              grupo={grupo}
              onNavigate={fecharAoNavegar}
            />
          ))}
        </nav>

        <div className="mt-5 border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={onLogout}
            className="
              flex
              h-12
              w-full
              items-center
              justify-center
              gap-3
              rounded-2xl
              border
              border-white/15
              bg-white/10
              px-4
              text-sm
              font-bold
              text-white
              transition
              hover:bg-white/15
            "
          >
            <DoorOpen size={18} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;