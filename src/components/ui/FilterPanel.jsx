// Painel de filtros.
// Usado nas telas de consulta e relatórios.

import Button from "./Button";

function FilterPanel({ children, onApply, onClear }) {
  return (
    <div
      className="
        bg-white
        border border-[var(--color-border-soft)]
        rounded-[var(--radius-card)]
        shadow-[var(--shadow-card)]
        p-5
      "
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={onClear}>
          Limpar
        </Button>

        <Button variant="primary" onClick={onApply}>
          Aplicar filtros
        </Button>
      </div>
    </div>
  );
}

export default FilterPanel;