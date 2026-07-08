// Barra de busca padrão.
// Usada no topo das consultas e também na Topbar futuramente.

import { Search } from "lucide-react";

function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
}) {
  return (
    <div className="relative w-full">
      {/* Ícone de busca */}
      <Search
        size={18}
        className="
          absolute
          left-4
          top-1/2
          -translate-y-1/2
          text-[var(--color-text-muted)]
        "
      />

      {/* Campo de busca */}
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="
          w-full
          rounded-[var(--radius-input)]
          border
          border-[var(--color-border)]
          bg-white
          py-3
          pl-11
          pr-4
          text-sm
          text-[var(--color-text-primary)]
          outline-none
          transition
          placeholder:text-[var(--color-text-muted)]
          focus:border-[var(--color-green-primary)]
          focus:ring-2
          focus:ring-[var(--color-green-light)]
        "
      />
    </div>
  );
}

export default SearchInput;