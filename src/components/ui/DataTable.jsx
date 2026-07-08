function DataTable({
  columns = [],
  data = [],
  emptyMessage = "Nenhum registro encontrado.",
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-white">
      <div className="w-full overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border-soft)] bg-slate-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="
                    whitespace-nowrap
                    px-4
                    py-4
                    text-left
                    text-xs
                    font-black
                    uppercase
                    tracking-wide
                    text-[var(--color-text-muted)]
                  "
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="
                    px-4
                    py-10
                    text-center
                    text-sm
                    font-semibold
                    text-[var(--color-text-muted)]
                  "
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row.id || row.area_id || row.calibre_id || rowIndex}
                  className="
                    border-b
                    border-[var(--color-border-soft)]
                    transition
                    last:border-b-0
                    hover:bg-slate-50
                  "
                >
                  {columns.map((column) => {
                    const value = row[column.key];

                    return (
                      <td
                        key={column.key}
                        className="
                          max-w-[340px]
                          px-4
                          py-4
                          align-middle
                          text-sm
                          font-semibold
                          text-[var(--color-text-secondary)]
                        "
                      >
                        <div className="min-w-0 break-words">
                          {column.render
                            ? column.render(value, row, rowIndex)
                            : value || "-"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;