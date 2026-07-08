// Componente de botão reutilizável.
// Ele mantém o mesmo padrão visual dos botões do sistema.

function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  onClick,
}) {
  // Estilos base usados em todos os botões
  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  // Variações visuais do botão
  const variants = {
    primary:
      "bg-[var(--color-green-primary)] text-white hover:bg-[var(--color-green-primary-hover)] focus:ring-[var(--color-green-primary)] shadow-sm",

    secondary:
      "bg-white text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-slate-50 focus:ring-[var(--color-green-primary)]",

    danger:
      "bg-[var(--color-danger)] text-white hover:brightness-95 focus:ring-[var(--color-danger)]",

    ghost:
      "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-green-light)] hover:text-[var(--color-green-primary)]",
  };

  // Tamanhos do botão
  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-5 py-3 text-sm",
    lg: "px-6 py-4 text-base",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export default Button;