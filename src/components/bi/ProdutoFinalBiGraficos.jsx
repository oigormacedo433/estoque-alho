import { useMemo } from "react";
import { Boxes, MapPinned, Package2, Scale, TrendingUp } from "lucide-react";

const CORES_CALIBRE = [
  "#047857",
  "#14b8a6",
  "#2563eb",
  "#f59e0b",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#65a30d",
  "#0f766e",
  "#22c55e",
];

function numero(valor) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function formatarNumero(valor) {
  return numero(valor).toLocaleString("pt-BR");
}

function formatarPeso(valor) {
  return `${numero(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
}

function formatarPercentual(valor, total) {
  const totalNumero = numero(total);

  if (totalNumero <= 0) {
    return "0,0%";
  }

  return `${((numero(valor) / totalNumero) * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatarDataCurta(data) {
  if (!data) return "-";

  const [ano, mes, dia] = String(data).split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}`;
}

function LinhaVazia() {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      Sem dados para exibir.
    </div>
  );
}

function TituloGrafico({ titulo, subtitulo }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-medium text-slate-950">{titulo}</h2>
      {subtitulo ? <p className="mt-1 text-sm text-slate-500">{subtitulo}</p> : null}
    </div>
  );
}

function CardDestaque({ icon: Icon, titulo, valor, detalhe, tone = "emerald" }) {
  const tons = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            tons[tone] || tons.emerald
          }`}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">{titulo}</p>
          <p className="mt-1 truncate text-base font-medium text-slate-950">{valor}</p>
          <p className="mt-1 text-xs text-slate-500">{detalhe}</p>
        </div>
      </div>
    </div>
  );
}

function GraficoLinhaProdutoFinal({ dados }) {
  const largura = 920;
  const altura = 280;
  const margemTopo = 30;
  const margemBaixo = 45;
  const margemEsquerda = 45;
  const margemDireita = 25;
  const alturaUtil = altura - margemTopo - margemBaixo;
  const larguraUtil = largura - margemEsquerda - margemDireita;

  const maior = Math.max(...dados.map((item) => numero(item.caixas)), 1);

  function posX(indice) {
    if (dados.length <= 1) {
      return margemEsquerda + larguraUtil / 2;
    }

    return margemEsquerda + (indice / (dados.length - 1)) * larguraUtil;
  }

  function posY(valor) {
    return margemTopo + alturaUtil - (numero(valor) / maior) * alturaUtil;
  }

  const pontosLinha = dados
    .map((item, indice) => `${posX(indice)},${posY(item.caixas)}`)
    .join(" ");

  const pontosArea = dados.length
    ? [
        `${posX(0)},${margemTopo + alturaUtil}`,
        ...dados.map((item, indice) => `${posX(indice)},${posY(item.caixas)}`),
        `${posX(dados.length - 1)},${margemTopo + alturaUtil}`,
      ].join(" ")
    : "";

  if (!dados.length) {
    return <LinhaVazia />;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[850px]">
        <svg viewBox={`0 0 ${largura} ${altura}`} className="h-[280px] w-full">
          <defs>
            <linearGradient id="produto-final-linha-gradiente" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#047857" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3, 4].map((item) => {
            const y = margemTopo + (item / 4) * alturaUtil;

            return (
              <line
                key={item}
                x1={margemEsquerda}
                x2={largura - margemDireita}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 6"
              />
            );
          })}

          <polygon points={pontosArea} fill="url(#produto-final-linha-gradiente)" />

          <polyline
            points={pontosLinha}
            fill="none"
            stroke="#047857"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {dados.map((item, indice) => {
            const x = posX(indice);
            const y = posY(item.caixas);

            return (
              <g key={`${item.data}-${indice}`}>
                <circle cx={x} cy={y} r="6" fill="#047857" stroke="#ffffff" strokeWidth="4" />

                <text
                  x={x}
                  y={y - 14}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="600"
                  fill="#0f172a"
                >
                  {formatarNumero(item.caixas)}
                </text>

                <text
                  x={x}
                  y={altura - 12}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="500"
                  fill="#64748b"
                >
                  {formatarDataCurta(item.data)}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
            Unidades finais
          </div>
        </div>
      </div>
    </div>
  );
}

function GraficoBarrasHorizontal({ dados, titulo, subtitulo }) {
  const maior = Math.max(...dados.map((item) => numero(item.caixas)), 1);

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <TituloGrafico titulo={titulo} subtitulo={subtitulo} />

      {!dados.length ? (
        <LinhaVazia />
      ) : (
        <div className="space-y-4">
          {dados.slice(0, 8).map((item, index) => {
            const largura = Math.max((numero(item.caixas) / maior) * 100, 4);
            const cor = CORES_CALIBRE[index % CORES_CALIBRE.length];

            return (
              <div
                key={item.id || item.nome}
                className="grid grid-cols-[110px_1fr_78px] items-center gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{item.nome}</p>
                  <p className="text-xs text-slate-400">{formatarNumero(item.registros)} lanç.</p>
                </div>

                <div className="h-8 overflow-hidden rounded-r-2xl rounded-l-md bg-slate-100">
                  <div
                    className="flex h-full items-center justify-end rounded-r-2xl px-3 text-xs font-medium text-white"
                    style={{ width: `${largura}%`, backgroundColor: cor }}
                  >
                    {formatarNumero(item.caixas)}
                  </div>
                </div>

                <div className="text-right text-xs text-slate-500">
                  {formatarPeso(item.peso)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function GraficoColunasCalibre({ dados }) {
  const maior = Math.max(...dados.map((item) => numero(item.caixas)), 1);

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <TituloGrafico
        titulo="Produto final por calibre"
        subtitulo="Quantidade de unidades finais produzidas por calibre."
      />

      {!dados.length ? (
        <LinhaVazia />
      ) : (
        <div className="overflow-x-auto">
          <div className="flex h-[340px] min-w-[980px] items-end justify-around gap-6 border-b border-slate-200 px-4 pb-10 pt-8">
            {dados.slice(0, 10).map((item, index) => {
              const altura = Math.max((numero(item.caixas) / maior) * 230, 22);
              const cor = CORES_CALIBRE[index % CORES_CALIBRE.length];
              const mostrarDentro = altura >= 46;

              return (
                <div
                  key={item.id || item.nome}
                  className="flex min-w-[92px] flex-col items-center justify-end"
                >
                  <div
                    className="flex w-16 items-start justify-center rounded-t-2xl px-1 pt-2 text-[11px] font-medium text-white"
                    style={{
                      height: `${altura}px`,
                      backgroundColor: cor,
                    }}
                    title={`${item.nome}: ${formatarNumero(item.caixas)} unidades`}
                  >
                    {mostrarDentro ? formatarNumero(item.caixas) : ""}
                  </div>

                  {!mostrarDentro ? (
                    <p className="mt-1 text-[11px] font-medium text-slate-700">
                      {formatarNumero(item.caixas)}
                    </p>
                  ) : null}

                  <p className="mt-3 max-w-[120px] truncate text-xs font-medium text-slate-600">
                    {item.nome}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function GraficoAreaCalibreEmpilhado({ dados }) {
  const maior = Math.max(...dados.map((item) => numero(item.total)), 1);

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <TituloGrafico
        titulo="Distribuição da produção por Área / Pivô e calibre"
        subtitulo="Composição dos calibres produzidos em cada área, com quantidade e participação percentual."
      />

      {!dados.length ? (
        <LinhaVazia />
      ) : (
        <div className="space-y-6">
          {dados.map((area) => (
            <div key={area.id} className="space-y-3">
              <div className="grid grid-cols-[110px_1fr_72px] items-center gap-3">
                <div>
                  <p className="truncate text-sm font-medium text-slate-800">{area.nome}</p>
                  <p className="text-xs text-slate-400">{formatarNumero(area.total)} un.</p>
                </div>

                <div className="h-9 overflow-hidden rounded-r-2xl rounded-l-md bg-slate-100">
                  <div
                    className="flex h-full overflow-hidden rounded-r-2xl"
                    style={{ width: `${Math.max((area.total / maior) * 100, 4)}%` }}
                  >
                    {area.partes.map((parte, index) => {
                      const largura = area.total > 0 ? (parte.caixas / area.total) * 100 : 0;
                      const cor = CORES_CALIBRE[index % CORES_CALIBRE.length];

                      return (
                        <div
                          key={parte.id}
                          className="flex min-w-[42px] items-center justify-center px-2 text-xs font-medium text-white"
                          style={{ width: `${largura}%`, backgroundColor: cor }}
                          title={`${parte.nome}: ${formatarNumero(parte.caixas)} unidades — ${formatarPercentual(
                            parte.caixas,
                            area.total
                          )}`}
                        >
                          {formatarNumero(parte.caixas)}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-right text-sm font-medium text-slate-900">
                  {formatarNumero(area.total)}
                </p>
              </div>

              <div className="ml-[110px] flex flex-wrap gap-2 border-b border-slate-100 pb-4">
                {area.partes.map((parte, index) => (
                  <div
                    key={parte.id}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: CORES_CALIBRE[index % CORES_CALIBRE.length] }}
                    />
                    <span className="font-medium text-slate-800">{parte.nome}</span>
                    <span>{formatarPercentual(parte.caixas, area.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ProdutoFinalBiGraficos({ registros = [], registrosLinha = null }) {
  const dados = Array.isArray(registros) ? registros : [];
  const dadosDaLinha = Array.isArray(registrosLinha) ? registrosLinha : dados;

  const serieDiaria = useMemo(() => {
    const mapa = new Map();

    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

    dadosDaLinha.forEach((item) => {
      const data = item.data_producao || item.data_registro;
      if (!data) return;

      const dataTexto = String(data);

      if (!dataTexto.startsWith(mesAtual)) {
        return;
      }

      const atual = mapa.get(dataTexto) || {
        data: dataTexto,
        caixas: 0,
        peso: 0,
        registros: 0,
      };

      atual.caixas += numero(item.quantidade_caixas);
      atual.peso += numero(item.peso_total_kg);
      atual.registros += 1;

      mapa.set(dataTexto, atual);
    });

    return Array.from(mapa.values()).sort((a, b) =>
      String(a.data).localeCompare(String(b.data))
    );
  }, [dadosDaLinha]);

  const porCalibre = useMemo(() => {
    const mapa = new Map();

    dados.forEach((item) => {
      const id = item.calibre_id || "sem-calibre";

      const atual = mapa.get(id) || {
        id,
        nome: item.calibre_codigo || item.calibre_nome || "Sem calibre",
        caixas: 0,
        peso: 0,
        registros: 0,
      };

      atual.caixas += numero(item.quantidade_caixas);
      atual.peso += numero(item.peso_total_kg);
      atual.registros += 1;

      mapa.set(id, atual);
    });

    return Array.from(mapa.values()).sort((a, b) => b.caixas - a.caixas);
  }, [dados]);

  const porArea = useMemo(() => {
    const mapa = new Map();

    dados.forEach((item) => {
      const id = item.area_id || item.area_fazenda_id || "sem-area";

      const atual = mapa.get(id) || {
        id,
        nome: item.area_nome || "Sem área",
        caixas: 0,
        peso: 0,
        registros: 0,
        partes: new Map(),
      };

      atual.caixas += numero(item.quantidade_caixas);
      atual.peso += numero(item.peso_total_kg);
      atual.registros += 1;

      const calibreId = item.calibre_id || "sem-calibre";
      const parteAtual = atual.partes.get(calibreId) || {
        id: calibreId,
        nome: item.calibre_codigo || item.calibre_nome || "Sem calibre",
        caixas: 0,
      };

      parteAtual.caixas += numero(item.quantidade_caixas);
      atual.partes.set(calibreId, parteAtual);

      mapa.set(id, atual);
    });

    return Array.from(mapa.values()).sort((a, b) => b.caixas - a.caixas);
  }, [dados]);

  const areaCalibre = useMemo(() => {
    return porArea.map((area) => ({
      id: area.id,
      nome: area.nome,
      total: area.caixas,
      partes: Array.from(area.partes.values()).sort((a, b) => b.caixas - a.caixas),
    }));
  }, [porArea]);

  const destaques = useMemo(() => {
    const maiorDia = [...serieDiaria].sort((a, b) => b.caixas - a.caixas)[0] || null;
    const maiorArea = porArea[0] || null;
    const maiorCalibre = porCalibre[0] || null;

    const totalPeso = dados.reduce((total, item) => total + numero(item.peso_total_kg), 0);
    const totalCaixas = dados.reduce((total, item) => total + numero(item.quantidade_caixas), 0);
    const pesoMedio = totalCaixas > 0 ? totalPeso / totalCaixas : 0;

    const totalSacos = dados
      .filter((item) => item.tipo_embalagem === "saco")
      .reduce((total, item) => total + numero(item.quantidade_caixas), 0);

    const totalCaixasEmbalagem = dados
      .filter((item) => item.tipo_embalagem !== "saco")
      .reduce((total, item) => total + numero(item.quantidade_caixas), 0);

    return {
      maiorDia,
      maiorArea,
      maiorCalibre,
      pesoMedio,
      totalSacos,
      totalCaixasEmbalagem,
    };
  }, [dados, porArea, porCalibre, serieDiaria]);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <TituloGrafico
            titulo="Produção diária de produto final"
            subtitulo="Unidades finais produzidas no mês atual, respeitando área, calibre e responsável filtrados."
          />

          <GraficoLinhaProdutoFinal dados={serieDiaria} />
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <TituloGrafico titulo="Destaques do período" />

          <div className="space-y-3">
            <CardDestaque
              icon={TrendingUp}
              tone="emerald"
              titulo="Maior produção diária"
              valor={destaques.maiorDia ? formatarNumero(destaques.maiorDia.caixas) : "-"}
              detalhe={destaques.maiorDia ? formatarDataCurta(destaques.maiorDia.data) : "Sem dados"}
            />

            <CardDestaque
              icon={MapPinned}
              tone="blue"
              titulo="Área com maior produção"
              valor={destaques.maiorArea?.nome || "-"}
              detalhe={destaques.maiorArea ? `${formatarNumero(destaques.maiorArea.caixas)} un.` : "Sem dados"}
            />

            <CardDestaque
              icon={Package2}
              tone="amber"
              titulo="Calibre mais produzido"
              valor={destaques.maiorCalibre?.nome || "-"}
              detalhe={destaques.maiorCalibre ? `${formatarNumero(destaques.maiorCalibre.caixas)} un.` : "Sem dados"}
            />

            <CardDestaque
              icon={Scale}
              tone="violet"
              titulo="Peso médio por unidade"
              valor={formatarPeso(destaques.pesoMedio)}
              detalhe="média do período filtrado"
            />

            <CardDestaque
              icon={Boxes}
              tone="slate"
              titulo="Caixa / saco"
              valor={`${formatarNumero(destaques.totalCaixasEmbalagem)} caixas`}
              detalhe={`${formatarNumero(destaques.totalSacos)} sacos`}
            />
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <GraficoBarrasHorizontal
          titulo="Produto final por Área / Pivô"
          subtitulo="Ranking de áreas por quantidade produzida."
          dados={porArea}
        />

        <GraficoColunasCalibre dados={porCalibre} />
      </section>

      <GraficoAreaCalibreEmpilhado dados={areaCalibre} />
    </div>
  );
}
