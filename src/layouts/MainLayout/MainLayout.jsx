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

      <div className="min-h-screen lg:pl-[290px]">
        <Topbar
          onMenuClick={() => setSidebarAberta(true)}
          onMobileMenuClick={() => setSidebarAberta(true)}
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;