// Layout principal do sistema.
// Ele mantém a Sidebar fixa, a Topbar e a área de conteúdo.
// As páginas entram no lugar do <Outlet />.

import { Outlet } from "react-router";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function MainLayout() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Sidebar fixa à esquerda */}
      <Sidebar />

      {/* Área principal deslocada para a direita por causa da sidebar */}
      <div className="min-h-screen pl-[280px]">
        {/* Topbar aparece em todas as telas */}
        <Topbar />

        {/* Conteúdo principal da tela atual */}
        <main className="px-8 py-8">
          <div className="mx-auto max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;