import {
  AlertTriangle,
  CheckCircle,
  Info,
  Trash2,
  X,
} from "lucide-react";

function ConfirmModal({
  open,
  title = "Confirmar ação",
  description = "",
  details = null,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  const variants = {
    danger: {
      iconWrapper: "bg-red-50 text-red-700",
      button: "bg-red-600 text-white border-red-600 hover:bg-red-700",
      Icon: Trash2,
    },
    warning: {
      iconWrapper: "bg-orange-50 text-orange-700",
      button: "bg-orange-500 text-white border-orange-500 hover:bg-orange-600",
      Icon: AlertTriangle,
    },
    success: {
      iconWrapper: "bg-green-50 text-green-700",
      button: "bg-green-700 text-white border-green-700 hover:bg-green-800",
      Icon: CheckCircle,
    },
    info: {
      iconWrapper: "bg-blue-50 text-blue-700",
      button:
        "bg-[var(--color-green-primary)] text-white border-[var(--color-green-primary)] hover:bg-[var(--color-green-dark)]",
      Icon: Info,
    },
  };

  const atual = variants[variant] || variants.danger;
  const Icon = atual.Icon;

  return (
    <div
      className="
        fixed
        inset-0
        z-[999]
        flex
        items-center
        justify-center
        bg-slate-950/55
        p-4
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
          p-5
          shadow-2xl
          sm:p-6
        "
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className={`
                flex
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-2xl
                ${atual.iconWrapper}
              `}
            >
              <Icon size={26} />
            </div>

            <div className="min-w-0">
              <h3 className="text-xl font-black text-[var(--color-text-primary)]">
                {title}
              </h3>

              {description && (
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">
                  {description}
                </p>
              )}
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
              text-[var(--color-text-muted)]
              transition
              hover:bg-slate-100
              disabled:opacity-60
            "
          >
            <X size={20} />
          </button>
        </div>

        {details && (
          <div
            className="
              mt-6
              rounded-2xl
              border
              border-[var(--color-border-soft)]
              bg-slate-50
              p-4
              text-sm
              font-semibold
              leading-6
              text-[var(--color-text-secondary)]
            "
          >
            {details}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="
              inline-flex
              min-h-12
              items-center
              justify-center
              rounded-2xl
              border
              border-[var(--color-border)]
              bg-white
              px-5
              text-sm
              font-black
              text-[var(--color-text-primary)]
              shadow-sm
              transition
              hover:bg-slate-50
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
              min-h-12
              items-center
              justify-center
              rounded-2xl
              border
              px-5
              text-sm
              font-black
              shadow-sm
              transition
              disabled:opacity-60
              ${atual.button}
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