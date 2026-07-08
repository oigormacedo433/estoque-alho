// Ícone circular padrão.
// Usado em cards, tabelas, resumos e alertas.

function IconCircle({ icon: Icon, variant = "success", size = "md" }) {
  const variants = {
    success: "bg-[var(--color-success-light)] text-[var(--color-success)]",
    warning: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
    danger: "bg-[var(--color-danger-light)] text-[var(--color-danger)]",
    info: "bg-[var(--color-info-light)] text-[var(--color-info)]",
    neutral: "bg-slate-100 text-slate-500",
  };

  const sizes = {
    sm: "h-9 w-9",
    md: "h-12 w-12",
    lg: "h-14 w-14",
  };

  return (
    <div
      className={`
        flex
        items-center
        justify-center
        rounded-2xl
        ${variants[variant]}
        ${sizes[size]}
      `}
    >
      {Icon && <Icon size={size === "sm" ? 18 : size === "lg" ? 28 : 22} />}
    </div>
  );
}

export default IconCircle;