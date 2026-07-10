import { X } from "lucide-react";

function LancamentoModal({
  open,
  title,
  description,
  badge,
  children,
  onClose,
  disabled = false,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border-soft)] px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-black text-[var(--color-text-primary)]">
                {title}
              </h2>

              {badge}
            </div>

            {description && (
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={onClose}
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
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-86px)] overflow-y-auto px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default LancamentoModal;