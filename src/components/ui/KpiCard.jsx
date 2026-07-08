// Card de KPI.
// Usado no dashboard para mostrar indicadores principais.

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "success",
}) {
  const variants = {
    success: {
      iconBg: "bg-[var(--color-success-light)]",
      iconColor: "text-[var(--color-success)]",
    },
    warning: {
      iconBg: "bg-[var(--color-warning-light)]",
      iconColor: "text-[var(--color-warning)]",
    },
    danger: {
      iconBg: "bg-[var(--color-danger-light)]",
      iconColor: "text-[var(--color-danger)]",
    },
    info: {
      iconBg: "bg-[var(--color-info-light)]",
      iconColor: "text-[var(--color-info)]",
    },
  };

  const selectedVariant = variants[variant];

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
      <div className="flex items-start justify-between gap-4">
        <div>
          {/* Título do indicador */}
          <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
            {title}
          </p>

          {/* Valor principal */}
          <h3 className="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">
            {value}
          </h3>

          {/* Descrição curta */}
          {description && (
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {description}
            </p>
          )}
        </div>

        {/* Ícone circular */}
        {Icon && (
          <div
            className={`
              flex h-12 w-12 items-center justify-center
              rounded-2xl
              ${selectedVariant.iconBg}
              ${selectedVariant.iconColor}
            `}
          >
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
}

export default KpiCard;