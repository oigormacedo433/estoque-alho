import { useMemo } from "react";
import { Info } from "lucide-react";

function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;

  const tratado = String(valor)
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = Number(tratado);
  return Number.isFinite(n) ? n : 0;
}

function texto(valor, fallback = "") {
  if (valor === null || valor === undefined) return fallback;
  const t = String(valor).trim();
  return t || fallback;
}

function formatarNumero(valor) {
  return numero(valor).toLocaleString("pt-BR", {
    maximumFractionDigits: 0,
  });
}

function formatarPercentual(valor) {
  return (
    numero(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + "%"
  );
}

function obterValor(obj, caminhos) {
  for (const caminho of caminhos) {
    const partes = caminho.split(".");
    let atual = obj;

    for (const parte of partes) {
      if (atual === null || atual === undefined) break;
      atual = atual[parte];
    }

    if (atual !== null && atual !== undefined && atual !== "") return atual;
  }

  return null;
}

function obterArea(item) {
  return texto(
    obterValor(item, [
      "area_nome",
      "areaNome",
      "nome_area",
      "area",
      "area_pivo",
      "area_pivo_nome",
      "pivo_nome",
      "areas_fazenda.nome",
      "area.nome",
      "pivo.nome",
      "areaPivo.nome",
    ]),
    "Sem área"
  );
}

function obterNumeroArea(nome) {
  const achado = String(nome || "").match(/\d+/);
  if (!achado) return 999999;
  return Number(achado[0]);
}

function ordenarAreas(a, b) {
  const numeroA = obterNumeroArea(a.area);
  const numeroB = obterNumeroArea(b.area);

  if (numeroA !== numeroB) return numeroA - numeroB;

  return String(a.area).localeCompare(String(b.area), "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
}

function obterCalibre(item) {
  const codigo = texto(
    obterValor(item, [
      "calibre_codigo",
      "codigo_calibre",
      "codigo",
      "calibre.codigo",
      "calibres.codigo",
    ]),
    ""
  );

  const nome = texto(
    obterValor(item, [
      "calibre_nome",
      "nome_calibre",
      "calibre",
      "nome",
      "calibre.nome",
      "calibres.nome",
    ]),
    ""
  );

  return codigo || nome || "Sem calibre";
}

function obterOrdemCalibre(item) {
  const ordem = numero(
    obterValor(item, [
      "calibre_ordem",
      "ordem_calibre",
      "ordem",
      "calibre.ordem",
      "calibres.ordem",
    ])
  );

  if (ordem > 0) return ordem;

  const calibre = obterCalibre(item);
  const numeroNoNome = String(calibre || "").match(/\d+/);

  if (numeroNoNome) return Number(numeroNoNome[0]);

  return 999999;
}

function obterEntradaEstoque(item) {
  return numero(
    obterValor(item, [
      "entrada_classificado_caixas",
      "entradas_classificado_caixas",
      "classificado_caixas",
      "entradas_caixas",
      "entradas",
      "total_entradas",
      "total_caixas_calculado",
      "total_caixas",
      "quantidade_caixas",
    ])
  );
}

function obterSaidaEstoque(item) {
  return numero(
    obterValor(item, [
      "saida_classificado_caixas",
      "saidas_classificado_caixas",
      "saidas_caixas",
      "saidas",
      "total_saidas",
      "quantidade_saida_caixas",
    ])
  );
}

function obterSaldoReal(item) {
  const saldoDireto = obterValor(item, [
    "saldo_classificado_caixas",
    "saldo_disponivel_caixas",
    "saldo_caixas",
    "saldo_atual_caixas",
    "saldo_atual",
    "estoque_classificado_caixas",
    "estoque_caixas",
  ]);

  if (saldoDireto !== null) return Math.max(0, numero(saldoDireto));

  const entradas = obterEntradaEstoque(item);
  const saidas = obterSaidaEstoque(item);

  return Math.max(0, entradas - saidas);
}

function obterTotalClassificadoEntrada(item) {
  const totalDireto = obterValor(item, [
    "total_caixas_calculado",
    "total_caixas_manual",
    "total_classificado_caixas",
    "total_classificado",
    "total_caixas",
    "quantidade_caixas",
    "entradas_caixas",
    "entradas",
  ]);

  if (totalDireto !== null) return Math.max(0, numero(totalDireto));

  const paletes = numero(
    obterValor(item, [
      "quantidade_paletes",
      "paletes",
      "total_paletes",
    ])
  );

  const caixasPorPalete = numero(
    obterValor(item, [
      "caixas_por_palete",
      "caixasPalete",
      "quantidade_caixas_por_palete",
    ])
  );

  if (paletes > 0 && caixasPorPalete > 0) {
    return Math.max(0, paletes * caixasPorPalete);
  }

  return 0;
}

function registrarValor(mapaAreas, mapaCalibres, item, quantidade) {
  const area = obterArea(item);
  const calibre = obterCalibre(item);
  const ordem = obterOrdemCalibre(item);

  if (!area || area === "Sem área") return;
  if (!calibre || calibre === "Sem calibre") return;
  if (quantidade <= 0) return;

  if (!mapaAreas.has(area)) {
    mapaAreas.set(area, {
      area,
      total: 0,
      valores: new Map(),
    });
  }

  const linha = mapaAreas.get(area);
  linha.total += quantidade;
  linha.valores.set(calibre, (linha.valores.get(calibre) || 0) + quantidade);

  const calibreAtual = mapaCalibres.get(calibre) || {
    calibre,
    ordem,
    total: 0,
  };

  calibreAtual.ordem = Math.min(calibreAtual.ordem, ordem);
  calibreAtual.total += quantidade;

  mapaCalibres.set(calibre, calibreAtual);
}

function montarDadosSaldo(estoqueClassificado) {
  const mapaAreas = new Map();
  const mapaCalibres = new Map();

  const lista = Array.isArray(estoqueClassificado) ? estoqueClassificado : [];

  for (const item of lista) {
    registrarValor(mapaAreas, mapaCalibres, item, obterSaldoReal(item));
  }

  const areas = Array.from(mapaAreas.values()).sort(ordenarAreas);

  const calibres = Array.from(mapaCalibres.values()).sort((a, b) => {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;

    return String(a.calibre).localeCompare(String(b.calibre), "pt-BR", {
      numeric: true,
      sensitivity: "base",
    });
  });

  return {
    areas,
    calibres,
    totalGeral: areas.reduce((total, item) => total + item.total, 0),
  };
}

function montarDadosTotal(entradas) {
  const mapaAreas = new Map();
  const mapaCalibres = new Map();

  const lista = Array.isArray(entradas) ? entradas : [];

  for (const item of lista) {
    registrarValor(mapaAreas, mapaCalibres, item, obterTotalClassificadoEntrada(item));
  }

  const areas = Array.from(mapaAreas.values()).sort(ordenarAreas);

  const calibres = Array.from(mapaCalibres.values()).sort((a, b) => {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;

    return String(a.calibre).localeCompare(String(b.calibre), "pt-BR", {
      numeric: true,
      sensitivity: "base",
    });
  });

  return {
    areas,
    calibres,
    totalGeral: areas.reduce((total, item) => total + item.total, 0),
  };
}

function corCelula(percentual, valor) {
  if (valor <= 0) {
    return {
      background: "#F8FAFC",
      borderColor: "#E2E8F0",
      color: "#94A3B8",
    };
  }

  if (percentual >= 40) {
    return {
      background: "linear-gradient(135deg, #86EFAC, #DCFCE7)",
      borderColor: "#86EFAC",
      color: "#0F172A",
    };
  }

  if (percentual >= 25) {
    return {
      background: "linear-gradient(135deg, #BBF7D0, #E5F9CE)",
      borderColor: "#BBF7D0",
      color: "#0F172A",
    };
  }

  if (percentual >= 12) {
    return {
      background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
      borderColor: "#FDE68A",
      color: "#0F172A",
    };
  }

  if (percentual >= 4) {
    return {
      background: "linear-gradient(135deg, #FED7AA, #FDBA74)",
      borderColor: "#FDBA74",
      color: "#0F172A",
    };
  }

  return {
    background: "linear-gradient(135deg, #FECACA, #FCA5A5)",
    borderColor: "#FCA5A5",
    color: "#0F172A",
  };
}

function MatrizAreaCalibre({ dados, modo, titulo, subtitulo }) {
  if (!dados.areas.length || !dados.calibres.length) {
    return (
      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <h2 className="text-[18px] leading-7 tracking-tight text-slate-950">{titulo}</h2>
          <Info className="h-4 w-4 text-slate-300" />
        </div>
        <p className="mt-1 text-[12px] leading-5 text-slate-500">{subtitulo}</p>
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
          Sem dados suficientes para montar este gráfico.
        </div>
      </section>
    );
  }

  const larguraArea = 110;
  const larguraColuna = 86;
  const larguraTotal = 82;

  const gridTemplateColumns =
    larguraArea + "px repeat(" + dados.calibres.length + ", minmax(" + larguraColuna + "px, 1fr)) " + larguraTotal + "px";

  const minWidth = larguraArea + dados.calibres.length * larguraColuna + larguraTotal;

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] leading-7 tracking-tight text-slate-950">{titulo}</h2>
            <Info className="h-4 w-4 text-slate-300" />
          </div>

          <p className="mt-1 text-[12px] leading-5 text-slate-500">{subtitulo}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-500">
          <span>{modo === "saldo" ? "Menor saldo" : "Menor volume"}</span>

          <div className="flex overflow-hidden rounded-full ring-1 ring-slate-200">
            <span className="h-4 w-8 bg-[#FCA5A5]" />
            <span className="h-4 w-8 bg-[#FDBA74]" />
            <span className="h-4 w-8 bg-[#FDE68A]" />
            <span className="h-4 w-8 bg-[#BBF7D0]" />
            <span className="h-4 w-8 bg-[#86EFAC]" />
          </div>

          <span>{modo === "saldo" ? "Maior saldo" : "Maior volume"}</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div style={{ minWidth }}>
          <div
            className="grid items-center gap-2 border-b border-slate-100 pb-2"
            style={{ gridTemplateColumns }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Área / Pivô
            </div>

            {dados.calibres.map((calibre) => (
              <div
                key={calibre.calibre}
                className="flex min-h-[36px] items-end justify-center break-words text-center text-[10px] font-semibold uppercase leading-[1.15] text-slate-950"
              >
                {calibre.calibre}
              </div>
            ))}

            <div className="text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Total
            </div>
          </div>

          <div className="mt-2 space-y-2">
            {dados.areas.map((area) => (
              <div
                key={area.area}
                className="grid items-center gap-2"
                style={{ gridTemplateColumns }}
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-950">
                    {area.area}
                  </p>
                </div>

                {dados.calibres.map((calibre) => {
                  const valor = area.valores.get(calibre.calibre) || 0;
                  const percentual = area.total > 0 ? (valor / area.total) * 100 : 0;
                  const cor = corCelula(percentual, valor);

                  return (
                    <div
                      key={area.area + "-" + calibre.calibre}
                      className="flex h-[58px] flex-col items-center justify-center rounded-lg border px-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                      style={{
                        background: cor.background,
                        borderColor: cor.borderColor,
                        color: cor.color,
                      }}
                      title={
                        area.area +
                        " · " +
                        calibre.calibre +
                        " · " +
                        formatarNumero(valor) +
                        " caixas · " +
                        formatarPercentual(percentual)
                      }
                    >
                      {valor > 0 ? (
                        <>
                          <span className="block max-w-full truncate text-[12.5px] font-bold leading-4">
                            {formatarNumero(valor)}
                          </span>
                          <span className="mt-0.5 block text-[10.5px] font-semibold leading-3">
                            {formatarPercentual(percentual)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="block text-[13px] font-semibold leading-4 text-slate-400">-</span>
                          <span className="mt-0.5 block text-[10px] leading-3 text-slate-400">0%</span>
                        </>
                      )}
                    </div>
                  );
                })}

                <div className="flex h-[58px] flex-col items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 px-1.5 text-center">
                  <span className="text-[13px] font-bold leading-4 text-slate-950">
                    {formatarNumero(area.total)}
                  </span>
                  <span className="mt-0.5 text-[10.5px] font-semibold leading-3 text-emerald-700">
                    100%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11.5px] leading-5 text-slate-500">
        Valores em caixas e percentuais calculados sobre o total de cada linha.
      </p>
    </section>
  );
}


function quebrarTextoBarrasDistribuicao(valor) {
  const bruto = String(valor || "").trim();

  if (bruto.length <= 11) return [bruto];

  const partes = bruto.split(/\s+/);
  const linhas = [];
  let atual = "";

  for (const parte of partes) {
    const tentativa = atual ? atual + " " + parte : parte;

    if (tentativa.length <= 12) {
      atual = tentativa;
    } else {
      if (atual) linhas.push(atual);
      atual = parte;
    }
  }

  if (atual) linhas.push(atual);

  return linhas.slice(0, 2);
}

function GraficoBarrasDistribuicaoCalibresArea({ dados }) {
  if (!dados || !Array.isArray(dados.areas) || !Array.isArray(dados.calibres)) return null;
  if (!dados.areas.length || !dados.calibres.length) return null;

  const areas = dados.areas;
  const calibres = dados.calibres.filter((calibre) => {
    return areas.some((area) => numero(area.valores?.get?.(calibre.calibre)) > 0);
  });

  if (!calibres.length) return null;

  const cores = ["#047857", "#14B8A6", "#2563EB", "#7C3AED", "#EA580C", "#0EA5E9"];

  const maiorValor = Math.max(
    1,
    ...areas.flatMap((area) =>
      calibres.map((calibre) => numero(area.valores?.get?.(calibre.calibre)))
    )
  );

  const larguraCalibre = 140;
  const esquerda = 78;
  const direita = 42;
  const topo = 48;
  const base = 292;
  const alturaPlot = base - topo;
  const alturaSvg = 392;
  const larguraSvg = esquerda + calibres.length * larguraCalibre + direita;

  const larguraBarra = Math.max(15, Math.min(23, 66 / Math.max(areas.length, 1)));
  const espacoBarra = 7;
  const larguraGrupo = areas.length * larguraBarra + (areas.length - 1) * espacoBarra;

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] leading-7 tracking-tight text-slate-950">
              Distribuição dos calibres por área
            </h2>
            <Info className="h-4 w-4 text-slate-300" />
          </div>

          <p className="mt-1 text-[12px] leading-5 text-slate-500">
            Barras agrupadas usando exatamente os mesmos dados do total classificado por Área/Pivô.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[12px] text-slate-600">
          {areas.map((area, indice) => (
            <span key={area.area} className="inline-flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: cores[indice % cores.length] }}
              />
              {area.area}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <svg
          viewBox={"0 0 " + larguraSvg + " " + alturaSvg}
          className="h-[400px]"
          style={{ minWidth: larguraSvg + "px", width: "100%" }}
        >
          <defs>
            <linearGradient id="fundoBarrasDistribuicaoCalibresAreaFinal" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#ECFDF5" stopOpacity="0.9" />
              <stop offset="48%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.88" />
            </linearGradient>

            <filter id="sombraBarrasDistribuicaoCalibresAreaFinal" x="-35%" y="-35%" width="170%" height="190%">
              <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.13" />
            </filter>
          </defs>

          <rect
            x="0"
            y="0"
            width={larguraSvg}
            height={alturaSvg}
            rx="24"
            fill="url(#fundoBarrasDistribuicaoCalibresAreaFinal)"
          />

          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = base - alturaPlot * tick;
            const valorTick = maiorValor * tick;

            return (
              <g key={tick}>
                <line
                  x1={esquerda}
                  x2={larguraSvg - direita}
                  y1={y}
                  y2={y}
                  stroke="#CBD5E1"
                  strokeWidth="1"
                  strokeDasharray="7 10"
                  opacity="0.62"
                />

                <text
                  x={esquerda - 18}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fontWeight="600"
                  fill="#94A3B8"
                >
                  {formatarNumero(valorTick)}
                </text>
              </g>
            );
          })}

          {calibres.map((calibre, indiceCalibre) => {
            const centro = esquerda + indiceCalibre * larguraCalibre + larguraCalibre / 2;
            const inicioGrupo = centro - larguraGrupo / 2;

            return (
              <g key={calibre.calibre}>
                {areas.map((area, indiceArea) => {
                  const valor = numero(area.valores?.get?.(calibre.calibre));
                  if (valor <= 0) return null;

                  const altura = Math.max(10, (valor / maiorValor) * alturaPlot);
                  const x = inicioGrupo + indiceArea * (larguraBarra + espacoBarra);
                  const y = base - altura;
                  const cor = cores[indiceArea % cores.length];

                  return (
                    <g key={area.area + "-" + calibre.calibre}>
                      <rect
                        x={x}
                        y={y}
                        width={larguraBarra}
                        height={altura}
                        rx="8"
                        fill={cor}
                        filter="url(#sombraBarrasDistribuicaoCalibresAreaFinal)"
                      />

                      <text
                        x={x + larguraBarra / 2}
                        y={Math.max(16, y - 8)}
                        textAnchor="middle"
                        fontSize="11.5"
                        fontWeight="800"
                        fill="#0F172A"
                      >
                        {formatarNumero(valor)}
                      </text>
                    </g>
                  );
                })}

                <text
                  x={centro}
                  y={base + 32}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="#334155"
                >
                  {quebrarTextoBarrasDistribuicao(calibre.calibre).map((linha, indiceLinha) => (
                    <tspan
                      key={linha + indiceLinha}
                      x={centro}
                      dy={indiceLinha === 0 ? 0 : 13}
                    >
                      {linha}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}

          <line
            x1={esquerda}
            x2={larguraSvg - direita}
            y1={base}
            y2={base}
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />
        </svg>
      </div>

      <p className="mt-2 text-[11.5px] leading-5 text-slate-500">
        Esse gráfico não altera cálculo. Ele só mostra em barras os mesmos valores usados no total classificado.
      </p>
    </section>
  );
}


export function AlhoClassificadoQuebraAreaCalibre({
  entradas = [],
  estoqueClassificado = [],
}) {
  const dadosSaldo = useMemo(
    () => montarDadosSaldo(estoqueClassificado),
    [estoqueClassificado]
  );

  const dadosTotal = useMemo(
    () => montarDadosTotal(entradas),
    [entradas]
  );

  return (
    <div className="space-y-4">
      <MatrizAreaCalibre
        dados={dadosSaldo}
        modo="saldo"
        titulo="Saldo disponível por Área / Pivô"
        subtitulo="Distribuição do saldo real por calibre dentro de cada área."
      />

      <MatrizAreaCalibre
        dados={dadosTotal}
        modo="total"
        titulo="Total classificado por Área / Pivô"
        subtitulo="Distribuição de tudo que foi classificado por calibre dentro de cada área."
      />

      <GraficoBarrasDistribuicaoCalibresArea dados={dadosTotal} />
    </div>
  );
}

export default AlhoClassificadoQuebraAreaCalibre;
