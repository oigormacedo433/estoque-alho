import { NavLink, useLocation } from "react-router";

import {
  BarChart3,
  ClipboardList,
  LogOut,
  PackageCheck,
  Settings,
  SlidersHorizontal,
  Truck,
  Warehouse,
  X,
} from "lucide-react";

const menuItems = [
  {
    label: "BI",
    path: "/bi",
    icon: BarChart3,
  },
  {
    label: "Chegada da Fazenda",
    path: "/chegada-fazenda",
    icon: ClipboardList,
  },
  {
    label: "Alho Classificado",
    path: "/alho-classificado",
    icon: Warehouse,
  },
  {
    label: "Produto Final",
    path: "/produto-final",
    icon: PackageCheck,
  },
  {
    label: "Saída / Venda",
    path: "/saida-venda",
    icon: Truck,
  },
  {
    label: "Estoque Atual",
    path: "/estoque-atual",
    icon: Warehouse,
  },
  {
    label: "Cadastro de Calibres",
    path: "/calibres",
    icon: SlidersHorizontal,
  },
  {
    label: "Configurações",
    path: "/configuracoes",
    icon: Settings,
  },
];

function SidebarContent({ onClose, onLogout }) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              border
              border-white/20
              bg-white/10
              shadow-lg
            "
          >
            🧄
          </div>

          <div>
            <h1 className="text-lg font-black leading-tight text-white">
              Estoque de Alho
            </h1>

            <p className="text-xs font-semibold text-white/70">
              Controle agrícola
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-2xl
              bg-white/10
              text-white
              lg:hidden
            "
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="mt-9 flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`
                flex
                min-h-12
                items-center
                gap-3
                rounded-2xl
                px-4
                py-3
                text-sm
                font-black
                transition
                ${
                  active
                    ? "bg-white text-[var(--color-green-primary)] shadow-lg"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className="
          mt-6
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
          text-sm
          font-black
          text-white
          transition
          hover:bg-white/20
        "
      >
        <LogOut size={18} />
        Sair
      </button>
    </div>
  );
}

function Sidebar({ mobileOpen = false, onClose, onLogout }) {
  return (
    <>
      <aside
        className="
          fixed
          left-0
          top-0
          z-[900]
          hidden
          h-screen
          w-[290px]
          border-r
          border-white/10
          bg-[var(--color-sidebar-dark)]
          px-5
          py-6
          text-white
          lg:block
        "
      >
        <SidebarContent onLogout={onLogout} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[999] lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />

          <aside
            className="
              relative
              z-[1000]
              h-full
              w-[290px]
              max-w-[85vw]
              bg-[var(--color-sidebar-dark)]
              px-5
              py-6
              text-white
              shadow-2xl
            "
          >
            <SidebarContent onClose={onClose} onLogout={onLogout} />
          </aside>
        </div>
      )}
    </>
  );
}

export default Sidebar;