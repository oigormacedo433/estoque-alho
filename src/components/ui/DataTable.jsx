import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

function normalizarValor(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  if (typeof valor === "number") {
    return valor;
  }

  if (typeof valor === "boolean") {
    return valor ? "sim" : "nao";
  }

  if (valor instanceof Date) {
    return valor.getTime();
  }

  if (typeof valor === "object") {
    if ("nome" in valor && "codigo" in valor) {
      return `${valor.codigo || ""} ${valor.nome || ""}`;
    }

    if ("nome" in valor) {
      return valor.nome || "";
    }

    if ("codigo" in valor) {
      return valor.codigo || "";
    }

    if ("label" in valor) {
      return valor.label || "";
    }

    if ("descricao" in valor) {
      return valor.descricao || "";
    }

    try {
      return JSON.stringify(valor);
    } catch {
      return "";
    }
  }

  return String(valor);
}

function compararValores(valorA, valorB) {
  const a = normalizarValor(valorA);
  const b = normalizarValor(valorB);

  const numeroA =
    typeof a === "number" ? a : String(a).trim() !== "" ? Number(a) : NaN;

  const numeroB =
    typeof b === "number" ? b : String(b).trim() !== "" ? Number(b) : NaN;

  if (Number.isFinite(numeroA) && Number.isFinite(numeroB)) {
    return numeroA - numeroB;
  }

  return String(a || "").localeCompare(String(b || ""), "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
}

function obterValorOrdenacao(row, column) {
  if (!row || !column) {
    return "";
  }

  if (typeof column.sortAccessor === "function") {
    return column.sortAccessor(row);
  }

  if (typeof column.sortValue === "function") {
    return column.sortValue(row);
  }

  return row[column.key];
}

function colunaPodeOrdenar(column) {
  if (!column) {
    return false;
  }

  if (column.sortable === false) {
    return false;
  }

  if (column.key === "acoes" || column.key === "actions") {
    return false;
  }

  if (column.sortable === true) {
    return true;
  }

  return typeof column.label === "string";
}

function SortIcon({ active, direction }) {
  if (!active) {
    return <ArrowUpDown size={14} className="opacity-60" />;
  }

  if (direction === "asc") {
    return <ArrowUp size={14} />;
  }

  return <ArrowDown size={14} />;
}

function DataTable({
  columns = [],
  data = [],
  emptyMessage = "Nenhum registro encontrado.",
}) {
  const [ordenacao, setOrdenacao] = useState({
    key: "",
    direction: "asc",
  });

  function alterarOrdenacao(column) {
    if (!colunaPodeOrdenar(column)) {
      return;
    }

    setOrdenacao((estadoAtual) => {
      if (estadoAtual.key === column.key) {
        return {
          key: column.key,
          direction: estadoAtual.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key: column.key,
        direction: "asc",
      };
    });
  }

  const dadosOrdenados = useMemo(() => {
    if (!ordenacao.key) {
      return data;
    }

    const colunaOrdenada = columns.find((column) => column.key === ordenacao.key);

    if (!colunaOrdenada || !colunaPodeOrdenar(colunaOrdenada)) {
      return data;
    }

    const lista = [...data];

    lista.sort((rowA, rowB) => {
      const valorA = obterValorOrdenacao(rowA, colunaOrdenada);
      const valorB = obterValorOrdenacao(rowB, colunaOrdenada);

      const resultado = compararValores(valorA, valorB);

      return ordenacao.direction === "asc" ? resultado : resultado * -1;
    });

    return lista;
  }, [columns, data, ordenacao]);

  if (!dadosOrdenados.length) {
    return (
      <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[900px] border-separate border-spacing-y-0">
        <thead>
          <tr>
            {columns.map((column) => {
              const podeOrdenar = colunaPodeOrdenar(column);
              const ativo = ordenacao.key === column.key;

              return (
                <th
                  key={column.key}
                  className="
                    border-b
                    border-[var(--color-border-soft)]
                    bg-slate-50
                    px-4
                    py-4
                    text-left
                    text-xs
                    font-black
                    uppercase
                    tracking-wide
                    text-[var(--color-text-muted)]
                    first:rounded-tl-2xl
                    last:rounded-tr-2xl
                  "
                >
                  {podeOrdenar ? (
                    <button
                      type="button"
                      onClick={() => alterarOrdenacao(column)}
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-lg
                        text-left
                        font-black
                        uppercase
                        tracking-wide
                        text-[var(--color-text-muted)]
                        transition
                        hover:text-[var(--color-green-primary)]
                      "
                      title={`Ordenar por ${column.label}`}
                    >
                      <span>{column.label}</span>

                      <SortIcon
                        active={ativo}
                        direction={ordenacao.direction}
                      />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {dadosOrdenados.map((row, rowIndex) => (
            <tr
              key={row?.id || rowIndex}
              className="
                border-b
                border-[var(--color-border-soft)]
                transition
                hover:bg-slate-50
              "
            >
              {columns.map((column) => {
                const value = row?.[column.key];

                return (
                  <td
                    key={column.key}
                    className="
                      border-b
                      border-[var(--color-border-soft)]
                      bg-white
                      px-4
                      py-4
                      text-sm
                      font-semibold
                      text-[var(--color-text-secondary)]
                    "
                  >
                    {column.render
                      ? column.render(value, row, rowIndex)
                      : value ?? "-"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;