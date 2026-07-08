// Tabela padrão do sistema.
// Recebe colunas e linhas de dados.

function DataTable({ columns = [], data = [], emptyMessage = "Nenhum registro encontrado." }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          {/* Cabeçalho da tabela */}
          <thead>
            <tr className="bg-slate-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="
                    px-5
                    py-4
                    text-left
                    text-xs
                    font-bold
                    uppercase
                    tracking-wide
                    text-[var(--color-text-secondary)]
                    border-b
                    border-[var(--color-border-soft)]
                  "
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Corpo da tabela */}
          <tbody>
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className="transition hover:bg-[var(--color-green-light)]/40"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="
                        px-5
                        py-4
                        text-sm
                        text-[var(--color-text-primary)]
                        border-b
                        border-[var(--color-border-soft)]
                      "
                    >
                      {/* 
                        Se a coluna tiver uma função render, usa ela.
                        Se não tiver, mostra o valor direto.
                      */}
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;