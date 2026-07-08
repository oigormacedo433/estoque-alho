// Componente de card padrão.
// Usado para caixas brancas, formulários, blocos de resumo e tabelas.

function Card({ children, className = "" }) {
  return (
    <div
      className={`
        bg-[var(--color-card)]
        border border-[var(--color-border-soft)]
        rounded-[var(--radius-card)]
        shadow-[var(--shadow-card)]
        p-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default Card;