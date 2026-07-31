import { useMemo } from "react";
import { Info } from "lucide-react";

const CORES_CALIBRES = [
  "#2563EB",
  "#065F46",
  "#14B8A6",
  "#84CC16",
  "#7C3AED",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
];

const CORES_AREAS = [
  { label: "#065F46", barra: "linear-gradient(180deg, #065F46 0%, #064E3B 100%)" },
  { label: "#14B8A6", barra: "linear-gradient(180deg, #2DD4BF 0%, #0F766E 100%)" },
  { label: "#2563EB", barra: "linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)" },
  { label: "#7C3AED", barra: "linear-gradient(180deg, #A78BFA 0%, #7C3AED 100%)" },
];

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function formatarPercentual(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function normalizarNumero(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;

  if (typeof valor === "string") {
    const limpo = valor.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
    const numero = Number(limpo);
    return Number.isFinite(numero) ? numero : 0;
  }

  return 0;
}

function compararTexto(a, b) {
  return String(a || "").localeCompare(String(b || ""), "pt-BR", {
    sensitivity: "base",
    numeric: true,
  });
}

function obterValorPorCaminho(obj, caminho) {
  return caminho.split(".").reduce((acc, chave) => {
    if (acc == null) return undefined;
    return acc[chave];
  }, obj);
}

function obterPrimeiroValor(obj, caminhos = []) {
  for (const caminho of caminhos) {
    const valor = obterValorPorCaminho(obj, caminho);
    if (valor !== undefined && valor !== null && valor !== "") return valor;
  }

  return null;
}

function obterAreaId(item) {
  return String(
    obterPrimeiroValor(item, [
      "area_pivo_id",
      "area_id",
      "areaId",
      "area.id",
      "area_pivo.id",
      "areaPivo.id",
      "pivo_id",
      "pivo.id",
      "area_fazenda_id",
    ]) || ""
  );
}

function obterAreaNome(item) {
  return (
    obterPrimeiroValor(item, [
      "area_pivo_nome",
      "area_nome",
      "areaNome",
      "area.nome",
      "area_pivo.nome",
      "areaPivo.nome",
      "pivo_nome",
      "pivo.nome",
    ]) || "Sem área"
  );
}

function obterCalibreId(item) {
  return String(
    obterPrimeiroValor(item, ["calibre_id", "calibreId", "calibre.id", "calibre.id_calibre"]) || ""
  );
}

function obterCalibreCodigo(item) {
  return (
    obterPrimeiroValor(item, [
      "calibre_codigo",
      "calibreCodigo",
      "calibre.codigo",
      "calibre.nome",
      "calibre_name",
      "calibre_label",
      "calibreNome",
    ]) || "Sem calibre"
  );
}

function obterCalibreOrdem(item) {
  const ordemExplicita = obterPrimeiroValor(item, [
    "calibre_ordem",
    "calibreOrdem",
    "calibre.ordem",
  ]);

  if (ordemExplicita !== null && ordemExplicita !== undefined) {
    return normalizarNumero(ordemExplicita);
  }

  const codigo = String(obterCalibreCodigo(item) || "");
  const match = codigo.match(/\d+/);
  if (match) return Number(match[0]);

  return 9999;
}

function obterSaldoAtual(item) {
  return normalizarNumero(
    obterPrimeiroValor(item, [
      "saldo_classificado_caixas",
      "saldo_atual",
      "saldoAtual",
      "saldo",
      "saldo_caixas",
      "saldo_disponivel_caixas",
      "caixas_disponiveis",
      "quantidade_caixas",
      "quantidade",
      "total_caixas",
    ])
  );
}

function calcularTotalEntrada(item) {
  return normalizarNumero(
    obterPrimeiroValor(item, [
      "total_caixas",
      "total_caixas_manual",
      "total_caixas_calculado",
      "quantidade_caixas",
      "caixas",
      "caixas_classificadas",
      "quantidade",
      "classificado_caixas",
      "entrada_classificado_caixas",
    ])
  );
}

function obterCorCalibre(indice) {
  return CORES_CALIBRES[indice % CORES_CALIBRES.length];
}

function obterCorArea(indice) {
  return CORES_AREAS[indice % CORES_AREAS.length];
}

function TituloGrafico({ titulo }) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-[15px] font-semibold text-slate-900">{titulo}</h3>
      <Info className="h-4 w-4 text-slate-300" />
    </div>
  );
}

function LegendaCalibres({ calibres }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
      {calibres.map((calibre, indice) => (
        <div key={calibre.id} className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: obterCorCalibre(indice) }}
          />
          <span className="text-sm font-medium text-slate-600">{calibre.codigo}</span>
        </div>
      ))}
    </div>
  );
}

function PainelSemDados({ mensagem = "Nenhum dado para exibir." }) {
  return (
    <div className="flex h-[220px] items-center justify-center border border-dashed border-slate-200 bg-slate-50/80">
      <span className="text-sm text-slate-400">{mensagem}</span>
    </div>
  );
}

function GraficoBarraEmpilhadaArea({ titulo, dados, calibres }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <TituloGrafico titulo={titulo} />
      </div>

      {!dados.length ? (
        <PainelSemDados />
      ) : (
        <>
          <div className="mb-3 grid items-center gap-4 md:grid-cols-[92px_minmax(0,1fr)_86px]">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Área / pivô
            </div>

            <div className="text-center text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Distribuição por calibre (caixas)
            </div>

            <div className="text-right text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Total
            </div>
          </div>

          <div className="space-y-4">
            {dados.map((area) => {
              const partesVisiveis = area.partes.filter((parte) => parte.valor > 0);

              return (
                <div
                  key={area.id}
                  className="grid items-center gap-4 md:grid-cols-[92px_minmax(0,1fr)_86px]"
                >
                  <div className="text-sm font-semibold text-slate-700">{area.nome}</div>

                  <div className="overflow-hidden border border-slate-200 bg-slate-50">
                    <div className="flex min-h-[62px] items-stretch">
                      {partesVisiveis.map((parte) => {
                        const largura = area.total > 0 ? (parte.valor / area.total) * 100 : 0;
                        const percentual = area.total > 0 ? (parte.valor / area.total) * 100 : 0;
                        const larguraProtegida = Math.max(largura, 7);

                        return (
                          <div
                            key={parte.id}
                            className="flex min-w-0 items-center justify-center border-r border-white/40 px-2 last:border-r-0"
                            style={{
                              width: `${larguraProtegida}%`,
                              backgroundColor: parte.cor,
                            }}
                            title={`${area.nome} • ${parte.label}: ${formatarNumero(
                              parte.valor
                            )} caixas (${formatarPercentual(percentual)}%)`}
                          >
                            <div className="flex flex-col items-center justify-center leading-tight text-white">
                              <span className="text-[13px] font-semibold">
                                {formatarNumero(parte.valor)}
                              </span>
                              <span className="mt-1 text-[12px] font-medium text-white/90">
                                {formatarPercentual(percentual)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[15px] font-semibold text-slate-900">
                      {formatarNumero(area.total)}
                    </div>
                    <div className="text-xs text-slate-400">caixas</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5">
            <LegendaCalibres calibres={calibres} />
          </div>
        </>
      )}
    </section>
  );
}

function GraficoDistribuicaoCalibresPorArea({ mapaDistribuicao, areas, calibres }) {
  const maximoBase = useMemo(() => {
    let maior = 0;

    calibres.forEach((calibre) => {
      areas.forEach((area) => {
        const valor = normalizarNumero(mapaDistribuicao?.[calibre.id]?.[area.id] || 0);
        if (valor > maior) maior = valor;
      });
    });

    return maior || 1;
  }, [mapaDistribuicao, areas, calibres]);

  const maximoEscala = useMemo(() => Math.ceil(maximoBase * 1.22), [maximoBase]);
  const niveis = 4;
  const alturaUtil = 245;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <TituloGrafico titulo="Distribuição dos calibres por área" />

        <div className="flex flex-wrap items-center gap-5">
          {areas.map((area, indice) => (
            <div key={area.id} className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded" style={{ background: obterCorArea(indice).barra }} />
              <span className="text-sm font-medium text-slate-600">{area.nome}</span>
            </div>
          ))}
        </div>
      </div>

      {!calibres.length || !areas.length ? (
        <PainelSemDados />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[940px]">
            <div className="mb-3 text-xs font-medium text-slate-400">Caixas</div>

            <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-4">
              <div className="flex h-[340px] flex-col justify-between pb-12 pt-6">
                {Array.from({ length: niveis + 1 }).map((_, indice) => {
                  const valor = Math.round((maximoEscala / niveis) * (niveis - indice));

                  return (
                    <span key={`label-y-${indice}`} className="text-xs font-medium text-slate-400">
                      {formatarNumero(valor)}
                    </span>
                  );
                })}
              </div>

              <div className="relative h-[340px]">
                <div className="absolute inset-x-0 bottom-12 top-6">
                  {Array.from({ length: niveis + 1 }).map((_, indice) => (
                    <div
                      key={`linha-${indice}`}
                      className="absolute left-0 right-0 border-t border-dashed border-slate-200"
                      style={{ top: `${(indice / niveis) * 100}%` }}
                    />
                  ))}
                </div>

                <div className="absolute inset-x-0 bottom-12 top-6 flex items-end justify-around gap-6">
                  {calibres.map((calibre) => (
                    <div
                      key={calibre.id}
                      className="flex h-full min-w-[150px] flex-col items-center justify-end"
                    >
                      <div className="flex h-full items-end justify-center gap-4">
                        {areas.map((area, areaIndice) => {
                          const valor = normalizarNumero(
                            mapaDistribuicao?.[calibre.id]?.[area.id] || 0
                          );

                          const altura =
                            valor > 0 ? Math.max((valor / maximoEscala) * alturaUtil, 8) : 0;

                          return (
                            <div
                              key={`${calibre.id}-${area.id}`}
                              className="flex flex-col items-center justify-end"
                              title={`${calibre.codigo} • ${area.nome}: ${formatarNumero(valor)} caixas`}
                            >
                              {valor > 0 ? (
                                <span className="mb-3 text-sm font-semibold text-slate-800">
                                  {formatarNumero(valor)}
                                </span>
                              ) : (
                                <span className="mb-3 h-[20px]" />
                              )}

                              <div
                                className="w-16 rounded-t-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                                style={{
                                  height: `${altura}px`,
                                  background: obterCorArea(areaIndice).barra,
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 text-sm font-semibold text-slate-700">
                        {calibre.codigo}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="absolute bottom-12 left-0 right-0 border-t border-slate-200" />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function montarCalibres(entradas, estoqueClassificado) {
  const mapa = new Map();

  [...entradas, ...estoqueClassificado].forEach((item) => {
    const id = obterCalibreId(item);
    if (!id) return;

    const atual = mapa.get(id);

    const novo = {
      id,
      codigo: obterCalibreCodigo(item),
      ordem: obterCalibreOrdem(item),
    };

    if (!atual) {
      mapa.set(id, novo);
      return;
    }

    if (novo.ordem < atual.ordem) {
      mapa.set(id, novo);
    }
  });

  return Array.from(mapa.values()).sort((a, b) => {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return compararTexto(a.codigo, b.codigo);
  });
}

function montarAreas(estoqueClassificado) {
  const mapa = new Map();

  estoqueClassificado.forEach((item) => {
    const areaId = obterAreaId(item);
    if (!areaId) return;

    if (!mapa.has(areaId)) {
      mapa.set(areaId, {
        id: areaId,
        nome: obterAreaNome(item),
      });
    }
  });

  return Array.from(mapa.values()).sort((a, b) => compararTexto(a.nome, b.nome));
}

function montarBarraPorArea(lista, calibres, tipo = "saldo") {
  const mapaAreas = new Map();

  lista.forEach((item) => {
    const areaId = obterAreaId(item);
    const calibreId = obterCalibreId(item);
    const valor = tipo === "saldo" ? obterSaldoAtual(item) : calcularTotalEntrada(item);

    if (!areaId || !calibreId || valor <= 0) return;

    if (!mapaAreas.has(areaId)) {
      mapaAreas.set(areaId, {
        id: areaId,
        nome: obterAreaNome(item),
        total: 0,
        partes: new Map(),
      });
    }

    const area = mapaAreas.get(areaId);
    area.total += valor;

    if (!area.partes.has(calibreId)) {
      area.partes.set(calibreId, {
        id: calibreId,
        label: obterCalibreCodigo(item),
        ordem: obterCalibreOrdem(item),
        valor: 0,
      });
    }

    const parte = area.partes.get(calibreId);
    parte.valor += valor;
    area.partes.set(calibreId, parte);

    mapaAreas.set(areaId, area);
  });

  return Array.from(mapaAreas.values())
    .map((area) => {
      const partesOrdenadas = Array.from(area.partes.values())
        .sort((a, b) => {
          if (a.ordem !== b.ordem) return a.ordem - b.ordem;
          return compararTexto(a.label, b.label);
        })
        .map((parte) => {
          const indiceCor = calibres.findIndex((item) => item.id === parte.id);

          return {
            ...parte,
            cor: obterCorCalibre(indiceCor >= 0 ? indiceCor : 0),
          };
        });

      return {
        ...area,
        partes: partesOrdenadas,
      };
    })
    .sort((a, b) => compararTexto(a.nome, b.nome));
}

function montarDistribuicaoSaldo(estoqueClassificado) {
  const mapa = {};

  estoqueClassificado.forEach((item) => {
    const areaId = obterAreaId(item);
    const calibreId = obterCalibreId(item);
    const saldo = obterSaldoAtual(item);

    if (!areaId || !calibreId || saldo <= 0) return;

    if (!mapa[calibreId]) mapa[calibreId] = {};
    if (!mapa[calibreId][areaId]) mapa[calibreId][areaId] = 0;

    mapa[calibreId][areaId] += saldo;
  });

  return mapa;
}

export default function AlhoClassificadoQuebraAreaCalibre({
  entradas = [],
  estoqueClassificado = [],
}) {
  const calibres = useMemo(
    () => montarCalibres(entradas, estoqueClassificado),
    [entradas, estoqueClassificado]
  );

  const areas = useMemo(() => montarAreas(estoqueClassificado), [estoqueClassificado]);

  const saldoDisponivelPorArea = useMemo(
    () => montarBarraPorArea(estoqueClassificado, calibres, "saldo"),
    [estoqueClassificado, calibres]
  );

  const totalClassificadoPorArea = useMemo(
    () => montarBarraPorArea(entradas, calibres, "total"),
    [entradas, calibres]
  );

  const distribuicaoSaldoPorCalibreArea = useMemo(
    () => montarDistribuicaoSaldo(estoqueClassificado),
    [estoqueClassificado]
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-2">
        <GraficoBarraEmpilhadaArea
          titulo="Saldo disponível por Área / Pivô"
          dados={saldoDisponivelPorArea}
          calibres={calibres}
        />

        <GraficoBarraEmpilhadaArea
          titulo="Total classificado por Área / Pivô"
          dados={totalClassificadoPorArea}
          calibres={calibres}
        />
      </section>

      <GraficoDistribuicaoCalibresPorArea
        mapaDistribuicao={distribuicaoSaldoPorCalibreArea}
        areas={areas}
        calibres={calibres}
      />
    </div>
  );
}
