import { useMemo } from "react";
import { Info, MapPin, Package, TrendingUp } from "lucide-react";

const CORES_CALIBRES = [
  "#047857",
  "#3B82F6",
  "#F59E0B",
  "#7C3AED",
  "#EC4899",
  "#EF4444",
  "#0EA5E9",
  "#84CC16",
];

const CORES_AREAS = [
  "#065F46",
  "#14B8A6",
  "#2563EB",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#0EA5E9",
  "#84CC16",
];

function numero(valor) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function formatarNumero(valor) {
  return numero(valor).toLocaleString("pt-BR");
}

function formatarNumeroDecimal(valor, casas = 0) {
  return numero(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function formatarDataCurta(data) {
  if (!data) return "-";
  const partes = String(data).slice(0, 10).split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}`;
  }
  return String(data);
}

function obterAreaId(item) {
  return item?.area_id || item?.area_fazenda_id || "";
}

function obterAreaNome(item) {
  return item?.area_nome || item?.nome_area || "Sem área";
}

function obterCalibreId(item) {
  return item?.calibre_id || "";
}

function obterCalibreCodigo(item) {
  return item?.calibre_codigo || item?.calibre_nome || item?.codigo || "Sem calibre";
}

function obterCalibreOrdem(item) {
  return numero(item?.calibre_ordem || item?.ordem || 9999);
}

function obterSaldoClassificado(item) {
  if (item?.saldo_classificado_caixas !== undefined && item?.saldo_classificado_caixas !== null) {
    return numero(item.saldo_classificado_caixas);
  }

  const entradas =
    numero(item?.entrada_classificado_caixas) || numero(item?.classificado_caixas);

  const saidas =
    numero(item?.saida_classificado_caixas) || numero(item?.saidas_classificado_caixas);

  return entradas - saidas;
}

function obterEntradaClassificada(item) {
  if (item?.entrada_classificado_caixas !== undefined && item?.entrada_classificado_caixas !== null) {
    return numero(item.entrada_classificado_caixas);
  }

  return numero(item?.classificado_caixas);
}

function calcularTotalEntrada(registro) {
  if (!registro) return 0;

  if (
    Boolean(registro.permitir_edicao_total_caixas) &&
    registro.total_caixas_manual !== undefined &&
    registro.total_caixas_manual !== null
  ) {
    return numero(registro.total_caixas_manual);
  }

  if (registro.total_caixas !== undefined && registro.total_caixas !== null) {
    return numero(registro.total_caixas);
  }

  if (registro.total_caixas_calculado !== undefined && registro.total_caixas_calculado !== null) {
    return numero(registro.total_caixas_calculado);
  }

  if (registro.quantidade_caixas !== undefined && registro.quantidade_caixas !== null) {
    return numero(registro.quantidade_caixas);
  }

  return numero(registro.quantidade_paletes) * numero(registro.caixas_por_palete);
}

function calcularTotalSaida(registro) {
  return numero(registro?.quantidade_caixas);
}

function obterCorCalibre(indice) {
  return CORES_CALIBRES[indice % CORES_CALIBRES.length];
}

function obterCorArea(indice) {
  return CORES_AREAS[indice % CORES_AREAS.length];
}

function compararTexto(a, b) {
  return String(a || "").localeCompare(String(b || ""), "pt-BR", { numeric: true });
}

function EmptyState({ mensagem }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center text-sm font-medium text-slate-400">
      {mensagem}
    </div>
  );
}

function TituloCard({ titulo }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <h3 className="text-lg font-black text-slate-900">{titulo}</h3>
      <Info className="h-4 w-4 text-slate-300" />
    </div>
  );
}

function CardDestaque({ icone, cor, titulo, valor, subtitulo }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${cor}`}>
        {icone}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{titulo}</p>
        <p className="mt-1 text-2xl font-black leading-none text-slate-900">{valor}</p>
        <p className="mt-1 text-sm font-medium text-slate-500">{subtitulo}</p>
      </div>
    </div>
  );
}

function GraficoMovimentacaoDiaria({ dados }) {
  if (!dados.length) {
    return <EmptyState mensagem="Nenhuma movimentação encontrada no período." />;
  }

  const largura = 1080;
  const altura = 340;
  const paddingTop = 28;
  const paddingRight = 28;
  const paddingBottom = 58;
  const paddingLeft = 42;

  const larguraUtil = largura - paddingLeft - paddingRight;
  const alturaUtil = altura - paddingTop - paddingBottom;

  const maximoBruto = Math.max(
    ...dados.map((item) => Math.max(numero(item.entradas), numero(item.saidas))),
    1
  );

  const maximo = Math.max(Math.ceil(maximoBruto * 1.15), 1);
  const baseY = paddingTop + alturaUtil;

  function obterX(indice) {
    if (dados.length === 1) return paddingLeft + larguraUtil / 2;
    return paddingLeft + (indice * larguraUtil) / (dados.length - 1);
  }

  function obterY(valor) {
    return paddingTop + alturaUtil - (numero(valor) / maximo) * alturaUtil;
  }

  const pontosEntradas = dados
    .map((item, indice) => `${obterX(indice)},${obterY(item.entradas)}`)
    .join(" ");

  const pontosSaidas = dados
    .map((item, indice) => `${obterX(indice)},${obterY(item.saidas)}`)
    .join(" ");

  const pontosPreenchimento = [
    `${obterX(0)},${baseY}`,
    ...dados.map((item, indice) => `${obterX(indice)},${obterY(item.entradas)}`),
    `${obterX(dados.length - 1)},${baseY}`,
  ].join(" ");

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${largura} ${altura}`} className="min-w-[860px] w-full">
          {[0, 1, 2, 3, 4].map((linha) => {
            const y = paddingTop + (linha / 4) * alturaUtil;

            return (
              <line
                key={linha}
                x1={paddingLeft}
                y1={y}
                x2={largura - paddingRight}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
            );
          })}

          <polygon points={pontosPreenchimento} fill="#DDF4EC" opacity="0.95" />

          <polyline
            points={pontosEntradas}
            fill="none"
            stroke="#047857"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <polyline
            points={pontosSaidas}
            fill="none"
            stroke="#EF4444"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {dados.map((item, indice) => {
            const x = obterX(indice);
            const yEntrada = obterY(item.entradas);
            const ySaida = obterY(item.saidas);

            return (
              <g key={`${item.data}-${indice}`}>
                <circle cx={x} cy={yEntrada} r="6.5" fill="#047857" stroke="#FFFFFF" strokeWidth="3" />
                <text x={x} y={yEntrada - 16} textAnchor="middle" fontSize="16" fontWeight="700" fill="#065F46">
                  {formatarNumero(item.entradas)}
                </text>

                <circle cx={x} cy={ySaida} r="6.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="3" />
                <text x={x} y={ySaida + 24} textAnchor="middle" fontSize="16" fontWeight="700" fill="#DC2626">
                  {formatarNumero(item.saidas)}
                </text>

                <text x={x} y={altura - 12} textAnchor="middle" fontSize="15" fontWeight="600" fill="#64748B">
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <span className="h-3 w-3 rounded-full bg-emerald-700" />
          Entradas
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <span className="h-3 w-3 rounded-full bg-red-500" />
          Saídas
        </div>
      </div>
    </div>
  );
}

function GraficoBarrasEmpilhadas({ titulo, dados, calibresOrdenados }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <TituloCard titulo={titulo} />

      {!dados.length ? (
        <EmptyState mensagem="Nenhum dado encontrado para este gráfico." />
      ) : (
        <>
          <div className="space-y-5">
            {dados.map((area) => (
              <div key={area.id} className="grid grid-cols-[90px_minmax(0,1fr)_92px] items-center gap-4">
                <div className="text-sm font-bold text-slate-700">{area.nome}</div>

                <div className="overflow-hidden rounded-full bg-slate-100">
                  <div className="flex h-8 overflow-hidden rounded-full">
                    {area.partes
                      .filter((parte) => parte.valor > 0)
                      .map((parte) => {
                        const percentual = area.total > 0 ? (parte.valor / area.total) * 100 : 0;

                        return (
                          <div
                            key={`${area.id}-${parte.id}`}
                            className="flex h-full items-center justify-center text-xs font-black text-white"
                            style={{
                              width: `${percentual}%`,
                              background: parte.cor,
                              minWidth: percentual > 0 ? "8px" : "0px",
                            }}
                            title={`${parte.label}: ${formatarNumero(parte.valor)} caixas`}
                          >
                            {percentual >= 12 ? formatarNumero(parte.valor) : ""}
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-black text-slate-900">{formatarNumero(area.total)}</p>
                  <p className="text-xs font-semibold text-slate-500">caixas</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
            {calibresOrdenados.map((calibre, indice) => (
              <div key={calibre.id} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: obterCorCalibre(indice) }} />
                {calibre.codigo}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function GraficoDistribuicaoCalibresPorArea({ dadosMapa, areasOrdenadas, calibresOrdenados }) {
  const maximo = Math.max(
    ...calibresOrdenados.flatMap((calibre) =>
      areasOrdenadas.map((area) => numero(dadosMapa?.[calibre.id]?.[area.id] || 0))
    ),
    1
  );

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <TituloCard titulo="Distribuição dos calibres por área" />

      {!calibresOrdenados.length || !areasOrdenadas.length ? (
        <EmptyState mensagem="Nenhum saldo disponível para distribuição por área." />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {areasOrdenadas.map((area, indice) => (
              <div key={area.id} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <span className="h-3.5 w-3.5 rounded" style={{ backgroundColor: obterCorArea(indice) }} />
                {area.nome}
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="mb-2 text-sm font-semibold text-slate-500">Caixas</div>

              <div className="flex h-[320px] items-end gap-10 border-b border-slate-100 pb-2">
                {calibresOrdenados.map((calibre) => (
                  <div key={calibre.id} className="flex min-w-[140px] flex-1 flex-col items-center gap-4">
                    <div className="flex h-[250px] items-end gap-4">
                      {areasOrdenadas.map((area, areaIndice) => {
                        const valor = numero(dadosMapa?.[calibre.id]?.[area.id] || 0);
                        const altura = valor > 0 ? Math.max((valor / maximo) * 210, 12) : 0;

                        return (
                          <div key={`${calibre.id}-${area.id}`} className="flex flex-col items-center justify-end gap-2">
                            <span className="text-sm font-black text-slate-800">
                              {valor > 0 ? formatarNumero(valor) : ""}
                            </span>

                            <div
                              className="w-14 rounded-t-2xl"
                              style={{
                                height: `${altura}px`,
                                backgroundColor: obterCorArea(areaIndice),
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-center text-lg font-black text-slate-700">
                      {calibre.codigo}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default function AlhoClassificadoBiGraficos({
  entradas = [],
  saidas = [],
  estoqueClassificado = [],
}) {
  const calibresOrdenados = useMemo(() => {
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
  }, [entradas, estoqueClassificado]);

  const seriesMovimentacao = useMemo(() => {
    const mapa = new Map();

    entradas.forEach((item) => {
      const data = item?.data_classificacao;
      if (!data) return;

      if (!mapa.has(data)) mapa.set(data, { data, entradas: 0, saidas: 0 });

      const atual = mapa.get(data);
      atual.entradas += calcularTotalEntrada(item);
      mapa.set(data, atual);
    });

    saidas.forEach((item) => {
      const data = item?.data_saida;
      if (!data) return;

      if (!mapa.has(data)) mapa.set(data, { data, entradas: 0, saidas: 0 });

      const atual = mapa.get(data);
      atual.saidas += calcularTotalSaida(item);
      mapa.set(data, atual);
    });

    return Array.from(mapa.values())
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(-25)
      .map((item) => ({
        ...item,
        label: formatarDataCurta(item.data),
      }));
  }, [entradas, saidas]);

  const saldoDisponivelPorArea = useMemo(() => {
    const mapaAreas = new Map();

    estoqueClassificado.forEach((item) => {
      const areaId = obterAreaId(item);
      const calibreId = obterCalibreId(item);
      const saldo = obterSaldoClassificado(item);

      if (!areaId || !calibreId || saldo <= 0) return;

      if (!mapaAreas.has(areaId)) {
        mapaAreas.set(areaId, {
          id: areaId,
          nome: obterAreaNome(item),
          total: 0,
          partes: new Map(),
        });
      }

      const area = mapaAreas.get(areaId);
      area.total += saldo;

      if (!area.partes.has(calibreId)) {
        area.partes.set(calibreId, {
          id: calibreId,
          label: obterCalibreCodigo(item),
          ordem: obterCalibreOrdem(item),
          valor: 0,
        });
      }

      const parte = area.partes.get(calibreId);
      parte.valor += saldo;
      area.partes.set(calibreId, parte);
      mapaAreas.set(areaId, area);
    });

    return Array.from(mapaAreas.values())
      .map((area) => ({
        ...area,
        partes: Array.from(area.partes.values())
          .sort((a, b) => {
            if (a.ordem !== b.ordem) return a.ordem - b.ordem;
            return compararTexto(a.label, b.label);
          })
          .map((parte) => {
            const indiceCor = calibresOrdenados.findIndex((item) => item.id === parte.id);
            return {
              ...parte,
              cor: obterCorCalibre(indiceCor >= 0 ? indiceCor : 0),
            };
          }),
      }))
      .sort((a, b) => compararTexto(a.nome, b.nome));
  }, [estoqueClassificado, calibresOrdenados]);

  const totalClassificadoPorArea = useMemo(() => {
    const mapaAreas = new Map();

    entradas.forEach((item) => {
      const areaId = obterAreaId(item);
      const calibreId = obterCalibreId(item);
      const total = calcularTotalEntrada(item);

      if (!areaId || !calibreId || total <= 0) return;

      if (!mapaAreas.has(areaId)) {
        mapaAreas.set(areaId, {
          id: areaId,
          nome: obterAreaNome(item),
          total: 0,
          partes: new Map(),
        });
      }

      const area = mapaAreas.get(areaId);
      area.total += total;

      if (!area.partes.has(calibreId)) {
        area.partes.set(calibreId, {
          id: calibreId,
          label: obterCalibreCodigo(item),
          ordem: obterCalibreOrdem(item),
          valor: 0,
        });
      }

      const parte = area.partes.get(calibreId);
      parte.valor += total;
      area.partes.set(calibreId, parte);
      mapaAreas.set(areaId, area);
    });

    return Array.from(mapaAreas.values())
      .map((area) => ({
        ...area,
        partes: Array.from(area.partes.values())
          .sort((a, b) => {
            if (a.ordem !== b.ordem) return a.ordem - b.ordem;
            return compararTexto(a.label, b.label);
          })
          .map((parte) => {
            const indiceCor = calibresOrdenados.findIndex((item) => item.id === parte.id);
            return {
              ...parte,
              cor: obterCorCalibre(indiceCor >= 0 ? indiceCor : 0),
            };
          }),
      }))
      .sort((a, b) => compararTexto(a.nome, b.nome));
  }, [entradas, calibresOrdenados]);

  const dadosDistribuicao = useMemo(() => {
    const mapa = {};

    estoqueClassificado.forEach((item) => {
      const areaId = obterAreaId(item);
      const calibreId = obterCalibreId(item);
      const saldo = obterSaldoClassificado(item);

      if (!areaId || !calibreId || saldo <= 0) return;

      if (!mapa[calibreId]) mapa[calibreId] = {};
      if (!mapa[calibreId][areaId]) mapa[calibreId][areaId] = 0;

      mapa[calibreId][areaId] += saldo;
    });

    return mapa;
  }, [estoqueClassificado]);

  const areasOrdenadasDistribuicao = useMemo(() => {
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
  }, [estoqueClassificado]);

  const areaMaiorSaldo = useMemo(() => {
    if (!saldoDisponivelPorArea.length) return null;
    return [...saldoDisponivelPorArea].sort((a, b) => b.total - a.total)[0];
  }, [saldoDisponivelPorArea]);

  const calibreMaiorSaldo = useMemo(() => {
    const mapa = new Map();

    estoqueClassificado.forEach((item) => {
      const calibreId = obterCalibreId(item);
      const saldo = obterSaldoClassificado(item);
      if (!calibreId || saldo <= 0) return;

      if (!mapa.has(calibreId)) {
        mapa.set(calibreId, {
          id: calibreId,
          nome: obterCalibreCodigo(item),
          total: 0,
        });
      }

      const atual = mapa.get(calibreId);
      atual.total += saldo;
      mapa.set(calibreId, atual);
    });

    const lista = Array.from(mapa.values()).sort((a, b) => b.total - a.total);
    return lista[0] || null;
  }, [estoqueClassificado]);

  const mediaPorLancamento = useMemo(() => {
    if (!entradas.length) return 0;
    const totalEntradas = entradas.reduce((total, item) => total + calcularTotalEntrada(item), 0);
    return totalEntradas / entradas.length;
  }, [entradas]);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <TituloCard titulo="Movimentação diária de entradas e saídas" />
          <GraficoMovimentacaoDiaria dados={seriesMovimentacao} />
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-black text-slate-900">Destaques do período</h3>

          <div className="space-y-4">
            <CardDestaque
              icone={<MapPin className="h-5 w-5 text-blue-600" />}
              cor="bg-blue-50"
              titulo="Área com maior saldo"
              valor={areaMaiorSaldo?.nome || "-"}
              subtitulo={
                areaMaiorSaldo
                  ? `${formatarNumero(areaMaiorSaldo.total)} caixas`
                  : "Sem saldo disponível"
              }
            />

            <CardDestaque
              icone={<Package className="h-5 w-5 text-violet-600" />}
              cor="bg-violet-50"
              titulo="Calibre com maior saldo"
              valor={calibreMaiorSaldo?.nome || "-"}
              subtitulo={
                calibreMaiorSaldo
                  ? `${formatarNumero(calibreMaiorSaldo.total)} caixas`
                  : "Sem saldo disponível"
              }
            />

            <CardDestaque
              icone={<TrendingUp className="h-5 w-5 text-orange-600" />}
              cor="bg-orange-50"
              titulo="Média por lançamento"
              valor={`${formatarNumeroDecimal(mediaPorLancamento)} caixas`}
              subtitulo="entradas classificadas"
            />
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <GraficoBarrasEmpilhadas
          titulo="Saldo disponível por Área / Pivô"
          dados={saldoDisponivelPorArea}
          calibresOrdenados={calibresOrdenados}
        />

        <GraficoBarrasEmpilhadas
          titulo="Total classificado por Área / Pivô"
          dados={totalClassificadoPorArea}
          calibresOrdenados={calibresOrdenados}
        />
      </section>

      <GraficoDistribuicaoCalibresPorArea
        dadosMapa={dadosDistribuicao}
        areasOrdenadas={areasOrdenadasDistribuicao}
        calibresOrdenados={calibresOrdenados}
      />
    </div>
  );
}
