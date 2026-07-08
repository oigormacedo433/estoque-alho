// Campo select/dropdown padrão.
// Usado para selecionar calibre, fazenda, responsável, status etc.

function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = "Selecione uma opção",
  error,
  disabled = false,
}) {
  return (
    <div className="w-full">
      {/* Label do campo */}
      {label && (
        <label
          htmlFor={name}
          className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]"
        >
          {label}
        </label>
      )}

      {/* Select */}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-full
          rounded-[var(--radius-input)]
          border
          bg-white
          px-4
          py-3
          text-sm
          text-[var(--color-text-primary)]
          outline-none
          transition
          disabled:bg-slate-100
          disabled:text-slate-400
          ${
            error
              ? "border-[var(--color-danger)] focus:ring-2 focus:ring-[var(--color-danger-light)]"
              : "border-[var(--color-border)] focus:border-[var(--color-green-primary)] focus:ring-2 focus:ring-[var(--color-green-light)]"
          }
        `}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Mensagem de erro */}
      {error && (
        <p className="mt-2 text-xs font-medium text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

export default Select;