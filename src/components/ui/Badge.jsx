// Badge de status.
// Usado para mostrar status como ativo, conferido, pendente, crítico etc.

function Badge({ children, variant = "success" }) {
  const variants = {
    success:
      "bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-green-border)]",

    warning:
      "bg-[var(--color-warning-light)] text-[var(--color-warning)] border-orange-200",

    danger:
      "bg-[var(--color-danger-light)] text-[var(--color-danger)] border-red-200",

    info:
      "bg-[var(--color-info-light)] text-[var(--color-info)] border-blue-200",

    neutral:
      "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-3
        py-1
        text-xs
        font-semibold
        ${variants[variant]}
      `}
    >
      {children}
    </span>
  );
}

export default Badge;