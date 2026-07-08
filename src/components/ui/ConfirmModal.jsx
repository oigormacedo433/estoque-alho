import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Trash2,
  X,
} from "lucide-react";

function ConfirmModal({
  open = false,
  title = "Confirmar ação",
  description = "Tem certeza que deseja continuar?",
  details = [],
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open) {
    return null;
  }

  const variantConfig = {
    danger: {
      icon: Trash2,
      iconBox: "bg-red-100 text-red-700",
      button:
        "bg-red-600 text-white hover:bg-red-700 focus:ring-red-200 disabled:bg-red-300",
    },
    warning: {
      icon: AlertTriangle,
      iconBox: "bg-orange-100 text-orange-700",
      button:
        "bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-200 disabled:bg-orange-300",
    },
    success: {
      icon: CheckCircle2,
      iconBox: "bg-green-100 text-green-700",
      button:
        "bg-green-700 text-white hover:bg-green-800 focus:ring-green-200 disabled:bg-green-300",
    },
    info: {
      icon: Info,
      iconBox: "bg-blue-100 text-blue-700",
      button:
        "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-200 disabled:bg-blue-300",
    },
  };

  const config = variantConfig[variant] || variantConfig.danger;
  const Icon = config.icon;

  return (
    <div
      className="
        fixed
        inset-0
        z-[999]
        flex
        items-center
        justify-center
        bg-slate-950/60
        px-4
        backdrop-blur-sm
      "
    >
      <div
        className="
          w-full
          max-w-xl
          rounded-3xl
          border
          border-[var(--color-border-soft)]
          bg-white
          p-6
          shadow-2xl
        "
      >
        <div className="flex items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div
              className={`
                flex
                h-13
                w-13
                shrink-0
                items-center
                justify-center
                rounded-2xl
                ${config.iconBox}
              `}
            >
              <Icon size={26} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                {title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-2xl
              border
              border-[var(--color-border-soft)]
              bg-slate-50
              text-[var(--color-text-secondary)]
              transition
              hover:bg-slate-100
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            <X size={18} />
          </button>
        </div>

        {details.length > 0 && (
          <div
            className="
              mt-6
              rounded-2xl
              border
              border-[var(--color-border-soft)]
              bg-slate-50
              p-4
            "
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {details.map((item) => (
                <div key={item.label}>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {item.label}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                    {item.value || "-"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-col justify-end gap-3 md:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="
              inline-flex
              h-12
              items-center
              justify-center
              rounded-2xl
              border
              border-[var(--color-border)]
              bg-white
              px-5
              text-sm
              font-bold
              text-[var(--color-text-secondary)]
              transition
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`
              inline-flex
              h-12
              items-center
              justify-center
              rounded-2xl
              px-5
              text-sm
              font-bold
              shadow-sm
              transition
              focus:outline-none
              focus:ring-4
              disabled:cursor-not-allowed
              ${config.button}
            `}
          >
            {loading ? "Processando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;