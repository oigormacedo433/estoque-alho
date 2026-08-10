import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Box,
  CheckCircle2,
  Download,
  Filter,
  Info,
  Layers,
  MapPin,
  PieChart,
  RefreshCw,
  Scale,
  Truck,
} from "lucide-react";
import { supabase } from "../../services/supabaseClient";

const CORES = ["#047857", "#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#64748b", "#22c55e", "#0ea5e9", "#fb923c"];

const STATUS_LABEL = {
  normal: "Normal",
  baixo: "Estoque baixo",
  sem_estoque: "Sem estoque",
  negativo: "Negativo",
};

function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;

  const normalizado = String(valor).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(normalizado);

  return Number.isFinite(n) ? n : 0;
}

function primeiroNumero(obj, campos) {
  for (const campo of campos) {
    if (obj && obj[campo] !== undefined && obj[campo] !== null && obj[campo] !== "") {
      return numero(obj[campo]);
    }
  }

  return 0;
}

function texto(valor, fallback = "") {
  if (valor === null || valor === undefined) return fallback;
  const t = String(valor).trim();
  return t || fallback;
}

function formatarNumero(valor, casas = 0) {
  return numero(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function formatarPeso(valor) {
  return formatarNumero(valor, 2) + " kg";
}

function formatarMetrica(valor, metrica) {
  return metrica === "peso" ? formatarPeso(valor) : formatarNumero(valor, 0) + " caixas";
}

function percentual(valor, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (numero(valor) / numero(total)) * 100));
}

function normalizarStatus(valor, saldo) {
  const base = texto(valor).toLowerCase();

  if (saldo < 0) return "negativo";
  if (base.includes("sem")) return "sem_estoque";
  if (base.includes("baixo")) return "baixo";

  return "normal";
}

function nomeArea(row) {
  return texto(
    row.area_nome ||
      row.nome_area ||
      row.area_pivo ||
      row.area ||
      row.pivo ||
      row.nome_pivo ||
      row.areas_fazenda?.nome,
    "Área não informada"
  );
}

function idArea(row) {
  return texto(
    row.area_id ||
      row.area_fazenda_id ||
      row.area_pivo_id ||
      row.areas_fazenda?.id ||
      nomeArea(row),
    nomeArea(row)
  );
}

function nomeCalibre(row) {
  const codigo = texto(row.calibre_codigo || row.codigo_calibre || row.codigo, "");
  const nome = texto(row.calibre_nome || row.nome_calibre || row.calibre || row.nome, "");

  if (codigo && nome && codigo !== nome) return codigo + " — " + nome;
  return nome || codigo || "Calibre não informado";
}

function idCalibre(row) {
  return texto(row.calibre_id || row.calibre_codigo || row.codigo_calibre || nomeCalibre(row), nomeCalibre(row));
}

function linhaNormalizada(row) {
  const produtoCaixas = primeiroNumero(row, [
    "produto_final_caixas",
    "total_produto_final_caixas",
    "quantidade_produto_final",
    "quantidade_final_caixas",
    "entrada_caixas",
    "total_entradas_caixas",
    "caixas_produto_final",
  ]);

  const saidasCaixas = primeiroNumero(row, [
    "saidas_caixas",
    "saida_caixas",
    "total_saidas_caixas",
    "quantidade_saidas",
    "quantidade_saida_caixas",
    "cargas_caixas",
    "total_cargas_caixas",
  ]);

  let saldoCaixas = primeiroNumero(row, [
    "saldo_disponivel_caixas",
    "saldo_caixas",
    "saldo_disponivel",
    "saldo_atual_caixas",
    "estoque_atual_caixas",
  ]);

  if (!saldoCaixas && produtoCaixas - saidasCaixas !== 0) {
    saldoCaixas = produtoCaixas - saidasCaixas;
  }

  const produtoPeso = primeiroNumero(row, [
    "produto_final_peso_kg",
    "peso_produto_final_kg",
    "peso_total_produto_final",
    "produto_final_kg",
    "entrada_peso_kg",
    "peso_entrada_kg",
  ]);

  const saidasPeso = primeiroNumero(row, [
    "saidas_peso_kg",
    "saida_peso_kg",
    "total_saidas_peso_kg",
    "peso_saidas_kg",
    "cargas_peso_kg",
    "peso_cargas_kg",
  ]);

  let saldoPeso = primeiroNumero(row, [
    "peso_disponivel_kg",
    "saldo_disponivel_peso_kg",
    "saldo_peso_kg",
    "peso_saldo_kg",
    "estoque_atual_peso_kg",
  ]);

  if (!saldoPeso && produtoPeso - saidasPeso !== 0) {
    saldoPeso = produtoPeso - saidasPeso;
  }

  const minimoCaixas = primeiroNumero(row, [
    "estoque_minimo_por_calibre",
    "minimo_caixas",
    "estoque_minimo_caixas",
    "minimo",
  ]);

  const status = normalizarStatus(row.status_estoque || row.status, saldoCaixas);

  return {
    id: texto(row.id || idArea(row) + "-" + idCalibre(row)),
    areaId: idArea(row),
    area: nomeArea(row),
    calibreId: idCalibre(row),
    calibre: nomeCalibre(row),
    calibreTipo: texto(row.calibre_tipo || row.tipo_calibre || row.tipo, ""),
    produtoCaixas,
    produtoPeso,
    saidasCaixas,
    saidasPeso,
    saldoCaixas,
    saldoPeso,
    minimoCaixas,
    status,
  };
}

function dataLinha(row) {
  const valor =
    row.data ||
    row.data_lancamento ||
    row.data_producao ||
    row.data_produto_final ||
    row.data_carga ||
    row.created_at ||
    row.createdAt;

  if (!valor) return null;

  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;

  return d;
}

function chaveDia(date) {
  return String(date.getDate()).padStart(2, "0") + "/" + String(date.getMonth() + 1).padStart(2, "0");
}

function diasMesAtual() {
  const hoje = new Date();
  const dias = [];

  for (let dia = 1; dia <= hoje.getDate(); dia++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), dia);

    dias.push({
      chave: d.toISOString().slice(0, 10),
      label: chaveDia(d),
      produtoCaixas: 0,
      produtoPeso: 0,
      saidasCaixas: 0,
      saidasPeso: 0,
      saldoCaixas: 0,
      saldoPeso: 0,
    });
  }

  return dias;
}

function caixasProduto(row) {
  return primeiroNumero(row, ["quantidade_caixas", "total_caixas", "caixas", "quantidade", "quantidade_total_caixas"]);
}

function pesoProduto(row) {
  return primeiroNumero(row, ["peso_total_kg", "peso_total", "total_peso_kg", "peso_kg", "peso"]);
}

function caixasCarga(row) {
  return primeiroNumero(row, ["quantidade_total_caixas", "quantidade_caixas", "total_caixas", "caixas", "quantidade"]);
}

function pesoCarga(row) {
  return primeiroNumero(row, ["peso_total_kg", "peso_total", "total_peso_kg", "peso_kg", "peso"]);
}

function agrupar(lista, chaveFn) {
  const mapa = new Map();

  for (const item of lista) {
    const chave = chaveFn(item);
    const atual = mapa.get(chave) || {
      id: chave,
      nome: chave,
      produtoCaixas: 0,
      produtoPeso: 0,
      saidasCaixas: 0,
      saidasPeso: 0,
      saldoCaixas: 0,
      saldoPeso: 0,
      minimoCaixas: 0,
      itens: [],
    };

    atual.produtoCaixas += item.produtoCaixas;
    atual.produtoPeso += item.produtoPeso;
    atual.saidasCaixas += item.saidasCaixas;
    atual.saidasPeso += item.saidasPeso;
    atual.saldoCaixas += item.saldoCaixas;
    atual.saldoPeso += item.saldoPeso;
    atual.minimoCaixas += item.minimoCaixas;
    atual.itens.push(item);

    mapa.set(chave, atual);
  }

  return Array.from(mapa.values());
}

function valorMetrica(item, metrica, campo = "saldo") {
  if (campo === "produto") return metrica === "peso" ? item.produtoPeso : item.produtoCaixas;
  if (campo === "saidas") return metrica === "peso" ? item.saidasPeso : item.saidasCaixas;
  return metrica === "peso" ? item.saldoPeso : item.saldoCaixas;
}

function CardBase({ children, className = "" }) {
  return (
    <section className={"rounded-2xl border border-slate-200 bg-white shadow-sm " + className}>
      {children}
    </section>
  );
}

function Ajuda({ texto }) {
  return (
    <span className="group relative inline-flex">
      <Info className="h-4 w-4 cursor-help text-slate-300" />
      <span className="pointer-events-none absolute left-1/2 top-6 z-50 hidden w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600 shadow-xl group-hover:block">
        {texto}
      </span>
    </span>
  );
}

function KpiCard({ titulo, valor, detalhe, ajuda, icon: Icon, tone = "green" }) {
  const toneClass = {
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-600",
  }[tone];

  return (
    <CardBase className="min-h-[126px] p-4">
      <div className="flex h-full items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <p className="text-[13px] leading-5 text-slate-600">{titulo}</p>
            <Ajuda texto={ajuda} />
          </div>
          <p className="mt-2 text-[28px] leading-none tracking-tight text-slate-950">{valor}</p>
          <p className="mt-2 text-[12px] leading-5 text-slate-500">{detalhe}</p>
        </div>

        <div className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl " + toneClass}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardBase>
  );
}

function ChartCard({ titulo, subtitulo, ajuda, icon: Icon, children, className = "" }) {
  return (
    <CardBase className={"p-4 " + className}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] leading-6 text-slate-950">{titulo}</h2>
            <Ajuda texto={ajuda || subtitulo} />
          </div>
          {subtitulo ? <p className="mt-1 text-[12px] leading-5 text-slate-500">{subtitulo}</p> : null}
        </div>

        {Icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>

      {children}
    </CardBase>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-xl bg-slate-50 text-[13px] text-slate-400">
      Nenhum dado encontrado para os filtros atuais.
    </div>
  );
}

function GraficoBarraHorizontal({ dados, metrica, campo = "saldo", limite = 7 }) {
  const ordenados = [...dados]
    .sort((a, b) => valorMetrica(b, metrica, campo) - valorMetrica(a, metrica, campo))
    .slice(0, limite);

  const max = Math.max(...ordenados.map((item) => Math.abs(valorMetrica(item, metrica, campo))), 0);

  if (!ordenados.length) return <EmptyState />;

  const width = 720;
  const left = 118;
  const right = 98;
  const top = 26;
  const rowH = 42;
  const bottom = 58;
  const chartW = width - left - right;
  const height = top + ordenados.length * rowH + bottom;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={"0 0 " + width + " " + height} className="h-auto w-full" role="img">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line
              x1={left + chartW * tick}
              y1={top - 8}
              x2={left + chartW * tick}
              y2={top + ordenados.length * rowH - 8}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text
              x={left + chartW * tick}
              y={top + ordenados.length * rowH + 22}
              textAnchor="middle"
              fontSize="12"
              fill="#64748b"
            >
              {tick === 0 ? "0" : formatarNumero((max * tick) / 1000, 0) + " mil"}
            </text>
          </g>
        ))}

        {ordenados.map((item, index) => {
          const v = valorMetrica(item, metrica, campo);
          const largura = Math.max(2, percentual(Math.abs(v), max)) / 100 * chartW;
          const y = top + index * rowH;

          return (
            <g key={item.id || item.nome}>
              <text x="0" y={y + 17} fontSize="13" fill="#0f172a">
                {String(item.nome).length > 20 ? String(item.nome).slice(0, 20) + "..." : item.nome}
              </text>

              <rect x={left} y={y + 2} width={chartW} height="18" fill="#f1f5f9" />
              <rect x={left} y={y + 2} width={largura} height="18" fill={v < 0 ? "#ef4444" : "#047857"} />

              <text x={width - 4} y={y + 17} textAnchor="end" fontSize="13" fill="#0f172a">
                {formatarMetrica(v, metrica)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 border-t border-slate-100 pt-3 text-[12px] leading-5 text-slate-500">
        Total: {formatarMetrica(ordenados.reduce((acc, item) => acc + valorMetrica(item, metrica, campo), 0), metrica)}
      </div>
    </div>
  );
}

function ComposicaoAreaCalibre({ areas, calibres, metrica }) {
  if (!areas.length || !calibres.length) return <EmptyState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-[12px] text-slate-600">
        {calibres.slice(0, 8).map((calibre, index) => (
          <span key={calibre.id} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5" style={{ background: CORES[index % CORES.length] }} />
            {calibre.nome}
          </span>
        ))}
      </div>

      <div className="space-y-4">
        {areas.slice(0, 5).map((area) => {
          const total = Math.max(0, valorMetrica(area, metrica, "saldo"));

          return (
            <div key={area.id} className="grid grid-cols-[92px_1fr_94px] items-center gap-3">
              <span className="text-[13px] text-slate-700">{area.nome}</span>

              <div className="flex h-8 overflow-hidden bg-slate-100">
                {calibres.slice(0, 8).map((calibre, index) => {
                  const item = area.itens.find((x) => x.calibre === calibre.nome);
                  const v = item ? Math.max(0, valorMetrica(item, metrica, "saldo")) : 0;
                  const w = percentual(v, Math.max(total, 1));

                  if (w <= 0) return null;

                  return (
                    <div
                      key={calibre.id + area.id}
                      className="flex h-full min-w-[28px] items-center justify-center px-1 text-[11px] text-white"
                      style={{
                        width: w + "%",
                        background: CORES[index % CORES.length],
                      }}
                    >
                      {w >= 9 ? formatarNumero(v, 0) : ""}
                    </div>
                  );
                })}
              </div>

              <span className="text-right text-[13px] text-slate-950">{formatarMetrica(total, metrica)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Donut({ dados, metrica }) {
  const positivos = dados
    .map((item, index) => ({
      ...item,
      cor: CORES[index % CORES.length],
      valor: Math.max(0, valorMetrica(item, metrica, "saldo")),
    }))
    .filter((item) => item.valor > 0);

  const total = positivos.reduce((acc, item) => acc + item.valor, 0);

  if (!positivos.length || !total) return <EmptyState />;

  let acumulado = 0;

  const partes = positivos.map((item) => {
    const ini = percentual(acumulado, total);
    acumulado += item.valor;
    const fim = percentual(acumulado, total);
    return item.cor + " " + ini + "% " + fim + "%";
  });

  return (
    <div className="grid min-h-[260px] grid-cols-[220px_1fr] items-center gap-5">
      <div
        className="relative mx-auto h-[205px] w-[205px] rounded-full"
        style={{ background: "conic-gradient(" + partes.join(", ") + ")" }}
      >
        <div className="absolute inset-[48px] flex flex-col items-center justify-center rounded-full bg-white">
          <span className="text-[28px] leading-none text-slate-950">{formatarNumero(total, 0)}</span>
          <span className="mt-1 text-[12px] text-slate-500">{metrica === "peso" ? "kg" : "caixas"}</span>
        </div>
      </div>

      <div className="space-y-3">
        {positivos.slice(0, 8).map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.cor }} />
              <span className="truncate">{item.nome}</span>
            </span>
            <span className="shrink-0 text-right text-slate-950">
              {formatarMetrica(item.valor, metrica)} · {formatarNumero(percentual(item.valor, total), 1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MapaSaldo({ areas, calibres, metrica }) {
  if (!areas.length || !calibres.length) return <EmptyState />;

  const calibresVisiveis = calibres.slice(0, 10);
  const areasVisiveis = areas.slice(0, 8);

  const valores = [];

  areasVisiveis.forEach((area) => {
    calibresVisiveis.forEach((calibre) => {
      const item = area.itens.find((x) => x.calibre === calibre.nome);
      valores.push(item ? Math.max(0, valorMetrica(item, metrica, "saldo")) : 0);
    });
  });

  const max = Math.max(...valores, 1);

  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[760px]">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: "128px repeat(" + calibresVisiveis.length + ", minmax(76px, 1fr))" }}
        >
          <div />
          {calibresVisiveis.map((calibre) => (
            <div key={calibre.id} className="bg-slate-50 px-2 py-2 text-center text-[12px] text-slate-600">
              {String(calibre.nome).length > 10 ? String(calibre.nome).slice(0, 10) + "..." : calibre.nome}
            </div>
          ))}

          {areasVisiveis.map((area) => (
            <div key={area.id} className="contents">
              <div className="bg-slate-50 px-3 py-3 text-[13px] text-slate-950">
                {area.nome}
              </div>

              {calibresVisiveis.map((calibre) => {
                const item = area.itens.find((x) => x.calibre === calibre.nome);
                const v = item ? valorMetrica(item, metrica, "saldo") : 0;
                const opacidade = v <= 0 ? 0 : 0.12 + percentual(v, max) / 110;

                return (
                  <div
                    key={area.id + calibre.id}
                    className="px-2 py-3 text-center text-[13px] text-slate-950"
                    style={{
                      background: v > 0 ? "rgba(16, 185, 129, " + opacidade + ")" : "#f8fafc",
                    }}
                  >
                    {v ? formatarNumero(v, 0) : "-"}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Evolucao({ dados, metrica }) {
  if (!dados.length) return <EmptyState />;

  const width = 780;
  const height = 285;
  const left = 54;
  const right = 26;
  const top = 26;
  const bottom = 44;
  const chartW = width - left - right;
  const chartH = height - top - bottom;

  const valores = dados.flatMap((item) => [
    metrica === "peso" ? item.produtoPeso : item.produtoCaixas,
    metrica === "peso" ? item.saidasPeso : item.saidasCaixas,
    metrica === "peso" ? item.saldoPeso : item.saldoCaixas,
  ]);

  const max = Math.max(...valores, 1);

  function ponto(item, index, campo) {
    const x = left + (chartW / Math.max(dados.length - 1, 1)) * index;
    const valor = metrica === "peso" ? item[campo + "Peso"] : item[campo + "Caixas"];
    const y = top + chartH - percentual(valor, max) / 100 * chartH;

    return { x, y, valor };
  }

  const prod = dados.map((item, index) => ponto(item, index, "produto"));
  const saidas = dados.map((item, index) => ponto(item, index, "saidas"));
  const saldo = dados.map((item, index) => ponto(item, index, "saldo"));

  function path(lista) {
    return lista.map((item) => item.x + "," + item.y).join(" ");
  }

  function serie(lista, cor, nome) {
    return (
      <g>
        <polyline points={path(lista)} fill="none" stroke={cor} strokeWidth="2.5" />
        {lista.map((p, index) => (
          <g key={nome + index}>
            <circle cx={p.x} cy={p.y} r="4" fill={cor} />
            {p.valor > 0 ? (
              <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="12" fill={cor}>
                {formatarNumero(p.valor, 0)}
              </text>
            ) : null}
          </g>
        ))}
      </g>
    );
  }

  const mostrarLabels = dados.filter((_, index) => {
    if (dados.length <= 12) return true;
    return index === 0 || index === dados.length - 1 || index % Math.ceil(dados.length / 8) === 0;
  }).map((item) => item.chave);

  return (
    <div className="w-full overflow-hidden">
      <div className="mb-3 flex flex-wrap justify-center gap-5 text-[12px] text-slate-600">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-700" />Produto final</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" />Saídas</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" />Saldo disponível</span>
      </div>

      <svg viewBox={"0 0 " + width + " " + height} className="h-auto w-full" role="img">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line
              x1={left}
              y1={top + chartH - chartH * tick}
              x2={width - right}
              y2={top + chartH - chartH * tick}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text x={left - 8} y={top + chartH - chartH * tick + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {formatarNumero((max * tick) / 1000, 0)} mil
            </text>
          </g>
        ))}

        {serie(prod, "#047857", "produto")}
        {serie(saidas, "#f97316", "saidas")}
        {serie(saldo, "#2563eb", "saldo")}

        {dados.map((item, index) => {
          const x = left + (chartW / Math.max(dados.length - 1, 1)) * index;
          if (!mostrarLabels.includes(item.chave)) return null;

          return (
            <text key={item.chave} x={x} y={height - 12} textAnchor="middle" fontSize="11" fill="#64748b">
              {item.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function InsightCard({ titulo, valor, texto, tone = "green" }) {
  const classes = {
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    red: "border-red-100 bg-red-50 text-red-700",
  }[tone];

  return (
    <div className={"rounded-2xl border p-5 " + classes}>
      <p className="text-[13px]">{titulo}</p>
      <p className="mt-3 text-[25px] leading-none text-slate-950">{valor}</p>
      <p className="mt-3 text-[13px] leading-5 text-slate-600">{texto}</p>
    </div>
  );
}

function exportarCsv(linhas) {
  const header = [
    "Área / Pivô",
    "Calibre",
    "Produto Final Caixas",
    "Produto Final Peso kg",
    "Saídas Caixas",
    "Saídas Peso kg",
    "Saldo Caixas",
    "Saldo Peso kg",
    "Mínimo",
    "Status",
  ];

  const csv = [
    header.join(";"),
    ...linhas.map((item) =>
      [
        item.area,
        item.calibre,
        item.produtoCaixas,
        item.produtoPeso,
        item.saidasCaixas,
        item.saidasPeso,
        item.saldoCaixas,
        item.saldoPeso,
        item.minimoCaixas,
        STATUS_LABEL[item.status] || item.status,
      ]
        .map((valor) => '"' + String(valor).replace(/"/g, '""') + '"')
        .join(";")
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "estoque-atual.csv";
  link.click();

  URL.revokeObjectURL(url);
}

export default function EstoqueAtual() {
  const [linhasOriginais, setLinhasOriginais] = useState([]);
  const [produtoHistorico, setProdutoHistorico] = useState([]);
  const [cargasHistorico, setCargasHistorico] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [metrica, setMetrica] = useState("caixas");
  const [filtros, setFiltros] = useState({
    area: "",
    calibre: "",
    status: "",
  });

  async function carregar() {
    setCarregando(true);
    setErro("");

    const tentativas = ["vw_estoque_area_atual", "vw_estoque_atual"];

    for (const tabela of tentativas) {
      const { data, error } = await supabase.from(tabela).select("*");

      if (!error) {
        setLinhasOriginais(Array.isArray(data) ? data : []);
        setCarregando(false);
        break;
      }

      setErro(error.message || "Erro ao carregar estoque.");
      setCarregando(false);
    }

    const [produto, cargas] = await Promise.all([
      supabase.from("produto_final").select("*"),
      supabase.from("cargas").select("*"),
    ]);

    if (!produto.error) setProdutoHistorico(Array.isArray(produto.data) ? produto.data : []);
    if (!cargas.error) setCargasHistorico(Array.isArray(cargas.data) ? cargas.data : []);
  }

  useEffect(() => {
    carregar();
  }, []);

  const linhas = useMemo(() => {
    return linhasOriginais.map(linhaNormalizada);
  }, [linhasOriginais]);

  const areasFiltro = useMemo(() => {
    return [...new Set(linhas.map((item) => item.area))].filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [linhas]);

  const calibresFiltro = useMemo(() => {
    return [...new Set(linhas.map((item) => item.calibre))].filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [linhas]);

  const linhasFiltradas = useMemo(() => {
    return linhas.filter((item) => {
      if (filtros.area && item.area !== filtros.area) return false;
      if (filtros.calibre && item.calibre !== filtros.calibre) return false;
      if (filtros.status && item.status !== filtros.status) return false;
      return true;
    });
  }, [linhas, filtros]);

  const areas = useMemo(() => {
    return agrupar(linhasFiltradas, (item) => item.area)
      .map((item) => ({ ...item, nome: item.id }))
      .sort((a, b) => valorMetrica(b, metrica, "saldo") - valorMetrica(a, metrica, "saldo"));
  }, [linhasFiltradas, metrica]);

  const calibres = useMemo(() => {
    return agrupar(linhasFiltradas, (item) => item.calibre)
      .map((item) => ({ ...item, nome: item.id }))
      .sort((a, b) => valorMetrica(b, metrica, "saldo") - valorMetrica(a, metrica, "saldo"));
  }, [linhasFiltradas, metrica]);

  const totais = useMemo(() => {
    return linhasFiltradas.reduce(
      (acc, item) => {
        acc.produtoCaixas += item.produtoCaixas;
        acc.produtoPeso += item.produtoPeso;
        acc.saidasCaixas += item.saidasCaixas;
        acc.saidasPeso += item.saidasPeso;
        acc.saldoCaixas += item.saldoCaixas;
        acc.saldoPeso += item.saldoPeso;

        if (item.saldoCaixas < 0) {
          acc.negativoCaixas += Math.abs(item.saldoCaixas);
          acc.negativoPeso += Math.abs(item.saldoPeso);
        }

        return acc;
      },
      {
        produtoCaixas: 0,
        produtoPeso: 0,
        saidasCaixas: 0,
        saidasPeso: 0,
        saldoCaixas: 0,
        saldoPeso: 0,
        negativoCaixas: 0,
        negativoPeso: 0,
      }
    );
  }, [linhasFiltradas]);

  const evolucao = useMemo(() => {
    const dias = diasMesAtual();
    const porDia = new Map(dias.map((item) => [item.chave, item]));

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();

    for (const row of produtoHistorico) {
      const data = dataLinha(row);
      if (!data) continue;
      if (data.getFullYear() !== ano || data.getMonth() !== mes) continue;

      const dia = porDia.get(data.toISOString().slice(0, 10));
      if (!dia) continue;

      dia.produtoCaixas += caixasProduto(row);
      dia.produtoPeso += pesoProduto(row);
    }

    for (const row of cargasHistorico) {
      const status = texto(row.status).toLowerCase();
      if (status && !status.includes("confirm")) continue;

      const data = dataLinha(row);
      if (!data) continue;
      if (data.getFullYear() !== ano || data.getMonth() !== mes) continue;

      const dia = porDia.get(data.toISOString().slice(0, 10));
      if (!dia) continue;

      dia.saidasCaixas += caixasCarga(row);
      dia.saidasPeso += pesoCarga(row);
    }

    let saldoCaixas = 0;
    let saldoPeso = 0;

    for (const dia of dias) {
      saldoCaixas += dia.produtoCaixas - dia.saidasCaixas;
      saldoPeso += dia.produtoPeso - dia.saidasPeso;
      dia.saldoCaixas = saldoCaixas;
      dia.saldoPeso = saldoPeso;
    }

    return dias;
  }, [produtoHistorico, cargasHistorico]);

  const statusCount = useMemo(() => {
    return {
      normal: linhasFiltradas.filter((item) => item.status === "normal").length,
      baixo: linhasFiltradas.filter((item) => item.status === "baixo").length,
      sem: linhasFiltradas.filter((item) => item.status === "sem_estoque").length,
      negativo: linhasFiltradas.filter((item) => item.status === "negativo").length,
    };
  }, [linhasFiltradas]);

  const maiorArea = areas[0];
  const maiorCalibre = calibres[0];

  const limparFiltros = () => {
    setFiltros({
      area: "",
      calibre: "",
      status: "",
    });
    setMetrica("caixas");
  };

  return (
    <div className="space-y-5 pb-10 font-sans">
      {erro ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[13px] text-red-700">
          {erro}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard titulo="Produto final" valor={formatarNumero(totais.produtoCaixas)} detalhe={formatarPeso(totais.produtoPeso)} ajuda="Total criado em Produto Final. Esse valor alimenta o estoque." icon={Box} tone="green" />
        <KpiCard titulo="Saídas" valor={formatarNumero(totais.saidasCaixas)} detalhe={formatarPeso(totais.saidasPeso)} ajuda="Total retirado pela tela de Cargas." icon={Truck} tone="orange" />
        <KpiCard titulo="Saldo disponível" valor={formatarNumero(totais.saldoCaixas)} detalhe={formatarPeso(totais.saldoPeso)} ajuda="Produto Final menos Saídas." icon={BarChart3} tone="blue" />
        <KpiCard titulo="Áreas com estoque" valor={formatarNumero(areas.filter((item) => item.saldoCaixas > 0).length)} detalhe="áreas disponíveis" ajuda="Quantidade de áreas com saldo positivo." icon={MapPin} tone="green" />
        <KpiCard titulo="Calibres com estoque" valor={formatarNumero(calibres.filter((item) => item.saldoCaixas > 0).length)} detalhe="calibres disponíveis" ajuda="Quantidade de calibres com saldo positivo." icon={Layers} tone="blue" />
        <KpiCard titulo="Estoque normal" valor={formatarNumero(statusCount.normal)} detalhe="Área + calibre sem alerta" ajuda="Combinações sem alerta." icon={Scale} tone="green" />
        <KpiCard titulo="Estoque baixo" valor={formatarNumero(statusCount.baixo)} detalhe="Área + calibre abaixo do mínimo" ajuda="Combinações abaixo do mínimo configurado." icon={AlertTriangle} tone="orange" />
        <KpiCard titulo="Sem estoque" valor={formatarNumero(statusCount.sem)} detalhe="Área + calibre zerado" ajuda="Combinações com saldo zero." icon={AlertTriangle} tone={statusCount.sem > 0 ? "red" : "slate"} />
      </div>

      <CardBase className="p-5">
        <div className="grid gap-4 xl:grid-cols-[70px_1fr_1fr_1fr_240px_125px_125px_125px] xl:items-end">
          <div className="hidden border-r border-slate-200 pr-4 xl:block">
            <p className="mb-2 text-[13px] text-slate-950">Filtros</p>
            <Filter className="h-6 w-6 text-slate-500" />
          </div>

          <label className="grid gap-2 text-[13px] text-slate-700">
            Área / Pivô
            <select value={filtros.area} onChange={(event) => setFiltros((old) => ({ ...old, area: event.target.value }))} className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-[13px] text-slate-700 outline-none focus:border-emerald-500">
              <option value="">Todas as áreas</option>
              {areasFiltro.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
          </label>

          <label className="grid gap-2 text-[13px] text-slate-700">
            Calibre
            <select value={filtros.calibre} onChange={(event) => setFiltros((old) => ({ ...old, calibre: event.target.value }))} className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-[13px] text-slate-700 outline-none focus:border-emerald-500">
              <option value="">Todos os calibres</option>
              {calibresFiltro.map((calibre) => <option key={calibre} value={calibre}>{calibre}</option>)}
            </select>
          </label>

          <label className="grid gap-2 text-[13px] text-slate-700">
            Status
            <select value={filtros.status} onChange={(event) => setFiltros((old) => ({ ...old, status: event.target.value }))} className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-[13px] text-slate-700 outline-none focus:border-emerald-500">
              <option value="">Todos os status</option>
              <option value="normal">Normal</option>
              <option value="baixo">Estoque baixo</option>
              <option value="sem_estoque">Sem estoque</option>
              <option value="negativo">Negativo</option>
            </select>
          </label>

          <div className="grid gap-2 text-[13px] text-slate-700">
            Métrica
            <div className="grid h-12 grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button type="button" onClick={() => setMetrica("caixas")} className={metrica === "caixas" ? "bg-emerald-700 text-white" : "text-slate-600"}>Caixas</button>
              <button type="button" onClick={() => setMetrica("peso")} className={metrica === "peso" ? "bg-emerald-700 text-white" : "text-slate-600"}>Peso (kg)</button>
            </div>
          </div>

          <button type="button" onClick={limparFiltros} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] text-slate-700 hover:bg-slate-50">
            Limpar filtros
          </button>

          <button type="button" onClick={carregar} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-[13px] text-white hover:bg-emerald-800">
            <RefreshCw className={"h-4 w-4 " + (carregando ? "animate-spin" : "")} />
            Atualizar
          </button>

          <button type="button" onClick={() => exportarCsv(linhasFiltradas)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </CardBase>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard titulo={"Saldo atual por Área / Pivô (" + (metrica === "peso" ? "Peso" : "Caixas") + ")"} subtitulo="Mostra onde o estoque está concentrado." ajuda="Ranking das áreas com maior saldo disponível." icon={BarChart3}>
          <GraficoBarraHorizontal dados={areas} metrica={metrica} campo="saldo" />
        </ChartCard>

        <ChartCard titulo={"Saldo por Calibre (" + (metrica === "peso" ? "Peso" : "Caixas") + ")"} subtitulo="Ranking dos calibres com maior saldo disponível." ajuda="Mostra quais calibres têm mais estoque." icon={Layers}>
          <GraficoBarraHorizontal dados={calibres} metrica={metrica} campo="saldo" />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard titulo={"Composição do estoque por Área + Calibre (" + (metrica === "peso" ? "Peso" : "Caixas") + ")"} subtitulo="Cada área separada por calibre." ajuda="Cada barra é uma área; cada cor é um calibre." icon={BarChart3}>
          <ComposicaoAreaCalibre areas={areas} calibres={calibres} metrica={metrica} />
        </ChartCard>

        <ChartCard titulo={"Participação do estoque por calibre (" + (metrica === "peso" ? "Peso" : "Caixas") + ")"} subtitulo="Distribuição percentual do saldo por calibre." ajuda="Mostra a participação de cada calibre no saldo total." icon={PieChart}>
          <Donut dados={calibres} metrica={metrica} />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard titulo="Mapa de saldo — Área x Calibre" subtitulo="Mapa visual do saldo por combinação exata." ajuda="Cruza área e calibre para mostrar o saldo real." icon={Layers} className="min-h-[380px]">
          <MapaSaldo areas={areas} calibres={calibres} metrica={metrica} />
        </ChartCard>

        <ChartCard titulo={"Evolução (" + (metrica === "peso" ? "Peso" : "Caixas") + ") — Mês atual"} subtitulo="Produto final, saídas e saldo disponível por dia no mês atual." ajuda="Mostra a evolução diária do mês atual." icon={BarChart3} className="min-h-[380px]">
          <Evolucao dados={evolucao} metrica={metrica} />
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <InsightCard
          titulo="Maior saldo"
          valor={maiorArea?.nome || "-"}
          texto={"Concentra " + formatarMetrica(maiorArea ? valorMetrica(maiorArea, metrica, "saldo") : 0, metrica) + " de saldo."}
          tone="green"
        />

        <InsightCard
          titulo="Calibre mais concentrado"
          valor={maiorCalibre?.nome || "-"}
          texto={"Representa " + formatarMetrica(maiorCalibre ? valorMetrica(maiorCalibre, metrica, "saldo") : 0, metrica) + " no estoque."}
          tone="blue"
        />

        <InsightCard
          titulo="Alerta operacional"
          valor={totais.negativoCaixas > 0 ? formatarNumero(totais.negativoCaixas) + " negativo" : "Nenhum saldo negativo"}
          texto={totais.negativoCaixas > 0 ? "Existe saída maior que produto final em alguma combinação." : "Nenhuma combinação abaixo de zero no filtro atual."}
          tone={totais.negativoCaixas > 0 ? "red" : "green"}
        />
      </div>

      <CardBase className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5">
          <div>
            <h2 className="text-[20px] text-slate-950">Tabela principal: Área / Pivô + Calibre</h2>
            <p className="mt-1 text-[13px] text-slate-500">Essa é a visão mais importante: mostra o estoque de cada calibre dentro de cada área.</p>
          </div>

          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-[12px] text-blue-700">
            {formatarNumero(linhasFiltradas.length)} combinações
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1220px] w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 text-[12px] uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4 font-normal">Área / Pivô</th>
                <th className="px-5 py-4 font-normal">Calibre</th>
                <th className="px-5 py-4 text-right font-normal">Produto Final<br /><span className="normal-case">Caixas</span></th>
                <th className="px-5 py-4 text-right font-normal">Produto Final<br /><span className="normal-case">Peso (kg)</span></th>
                <th className="px-5 py-4 text-right font-normal">Saídas<br /><span className="normal-case">Caixas</span></th>
                <th className="px-5 py-4 text-right font-normal">Saídas<br /><span className="normal-case">Peso (kg)</span></th>
                <th className="px-5 py-4 text-right font-normal">Saldo disponível<br /><span className="normal-case">Caixas</span></th>
                <th className="px-5 py-4 text-right font-normal">Saldo disponível<br /><span className="normal-case">Peso (kg)</span></th>
                <th className="px-5 py-4 text-right font-normal">Mínimo</th>
                <th className="px-5 py-4 text-center font-normal">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-[13px]">
              {linhasFiltradas.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-slate-950">{item.area}</td>
                  <td className="px-5 py-4">
                    <p className="text-slate-950">{item.calibre}</p>
                    {item.calibreTipo ? <p className="mt-0.5 text-[12px] text-slate-400">{item.calibreTipo}</p> : null}
                  </td>
                  <td className="px-5 py-4 text-right text-slate-700">{formatarNumero(item.produtoCaixas)}</td>
                  <td className="px-5 py-4 text-right text-slate-700">{formatarNumero(item.produtoPeso, 2)}</td>
                  <td className="px-5 py-4 text-right text-slate-700">{formatarNumero(item.saidasCaixas)}</td>
                  <td className="px-5 py-4 text-right text-slate-700">{formatarNumero(item.saidasPeso, 2)}</td>
                  <td className={(item.saldoCaixas < 0 ? "text-red-600" : "text-slate-700") + " px-5 py-4 text-right"}>{formatarNumero(item.saldoCaixas)}</td>
                  <td className={(item.saldoPeso < 0 ? "text-red-600" : "text-slate-700") + " px-5 py-4 text-right"}>{formatarNumero(item.saldoPeso, 2)}</td>
                  <td className="px-5 py-4 text-right text-slate-700">{formatarNumero(item.minimoCaixas)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={
                      "inline-flex rounded-full px-3 py-1 text-[12px] " +
                      (item.status === "negativo"
                        ? "bg-red-50 text-red-700"
                        : item.status === "baixo"
                          ? "bg-orange-50 text-orange-700"
                          : item.status === "sem_estoque"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-50 text-emerald-700")
                    }>
                      {STATUS_LABEL[item.status] || item.status}
                    </span>
                  </td>
                </tr>
              ))}

              {!linhasFiltradas.length ? (
                <tr>
                  <td colSpan="10" className="px-5 py-12 text-center text-[13px] text-slate-400">
                    Nenhum estoque encontrado para os filtros atuais.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardBase>

      <div className="flex items-center justify-center gap-2 text-[12px] text-slate-400">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        Dados atualizados automaticamente pelo estoque atual.
      </div>
    </div>
  );
}
