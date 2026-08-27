import { useState } from "react";
import { Outlet, useNavigate } from "react-router";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import { supabase } from "../../services/supabaseClient";

function MainLayout() {
  const navigate = useNavigate();
  const [sidebarAberta, setSidebarAberta] = useState(false);

  async function sair() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-page)]">
      <Sidebar
        mobileOpen={sidebarAberta}
        onClose={() => setSidebarAberta(false)}
        onLogout={sair}
      />

      
      


      {/* BOTAO_MENU_MOBILE_FIXO_20260826 */}
      {!sidebarAberta ? (
        <button
          type="button"
          onClick={() => setSidebarAberta(true)}
          aria-label="Abrir menu"
          className="
            fixed
            bottom-4
            left-4
            z-[1600]
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-2xl
            bg-emerald-700
            text-3xl
            font-black
            leading-none
            text-white
            shadow-2xl
            ring-1
            ring-white/30
            transition
            active:scale-95
            lg:hidden
          "
        >
          ☰
        </button>
      ) : null}

<div className="min-h-screen lg:pl-[290px]">
        <Topbar
          onMenuClick={() => setSidebarAberta(true)}
          onMobileMenuClick={() => setSidebarAberta(true)}
        />

        <main className="px-3 py-4 sm:px-6 sm:py-6 lg:px-8 max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;