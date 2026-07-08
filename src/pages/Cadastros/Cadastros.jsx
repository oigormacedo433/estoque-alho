// Tela Cadastros.
// Serve como área geral para acessar cadastros auxiliares.

import { Card } from "../../components/ui";

function Cadastros() {
  return (
    <Card>
      <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
        Cadastros
      </h3>

      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Área geral para gerenciar cadastros auxiliares do sistema.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-5">
          <h4 className="font-bold text-[var(--color-text-primary)]">
            Cadastro de Calibres
          </h4>

          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Gerencie os tamanhos do alho: 4, 5, 6, 7, 8 e indústria.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-5">
          <h4 className="font-bold text-[var(--color-text-primary)]">
            Configurações
          </h4>

          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Configure caixas por palete, peso da caixa e parâmetros gerais.
          </p>
        </div>
      </div>
    </Card>
  );
}

export default Cadastros;