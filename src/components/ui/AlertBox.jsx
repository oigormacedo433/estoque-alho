// Caixa de alerta informativo.
// Usada para avisos de estoque baixo, pendência, erro ou informação.

import { AlertCircle, CheckCircle, Info, TriangleAlert } from "lucide-react";

function AlertBox({
  title,
  description,
  variant = "info",
}) {
  const variants = {
    success: {
      icon: CheckCircle,
      box: "bg-[var(--color-success-light)] border-[var(--color-green-border)]",
      iconColor: "text-[var(--color-success)]",
      titleColor: "text-[var(--color-success)]",
    },
    warning: {
      icon: TriangleAlert,
      box: "bg-[var(--color-warning-light)] border-orange-200",
      iconColor: "text-[var(--color-warning)]",
      titleColor: "text-[var(--color-warning)]",
    },
    danger: {
      icon: AlertCircle,
      box: "bg-[var(--color-danger-light)] border-red-200",
      iconColor: "text-[var(--color-danger)]",
      titleColor: "text-[var(--color-danger)]",
    },
    info: {
      icon: Info,
      box: "bg-[var(--color-info-light)] border-blue-200",
      iconColor: "text-[var(--color-info)]",
      titleColor: "text-[var(--color-info)]",
    },
  };

  const selectedVariant = variants[variant];
  const Icon = selectedVariant.icon;

  return (
    <div
      className={`
        flex
        items-start
        gap-3
        rounded-2xl
        border
        p-4
        ${selectedVariant.box}
      `}
    >
      {/* Ícone do alerta */}
      <Icon size={22} className={selectedVariant.iconColor} />

      <div>
        {/* Título do alerta */}
        <p className={`text-sm font-bold ${selectedVariant.titleColor}`}>
          {title}
        </p>

        {/* Descrição do alerta */}
        {description && (
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default AlertBox;