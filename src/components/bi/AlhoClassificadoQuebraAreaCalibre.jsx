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
    </div>
  );
}

export default AlhoClassificadoQuebraAreaCalibre;
