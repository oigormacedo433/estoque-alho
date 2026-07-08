import { useState } from "react";
import { Outlet } from "react-router";

import { useAuth } from "../../contexts/AuthContext";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function MainLayout() {
  const { sair, logout } = useAuth();

  const [sidebarMobileAberta, setSidebarMobileAberta] = useState(false);

  async function sairDoSistema() {
    if (sair) {
      await sair();
      return;
    }

    if (logout) {
      await logout();
    }
  }

  function abrirMenuMobile() {
    setSidebarMobileAberta(true);
  }

  function fecharMenuMobile() {
    setSidebarMobileAberta(false);
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg-page)]">
      <Sidebar
        openMobile={sidebarMobileAberta}
        onCloseMobile={fecharMenuMobile}
        onLogout={sairDoSistema}
      />

      <div className="min-h-dvh w-full transition-all duration-300 lg:pl-[280px]">
        <Topbar onOpenSidebar={abrirMenuMobile} />

        <main
          className="
            mx-auto
            w-full
            max-w-[1800px]
            overflow-visible
            px-4
            py-5
            sm:px-5
            sm:py-6
            md:px-6
            lg:px-7
            xl:px-8
            xl:py-8
          "
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;