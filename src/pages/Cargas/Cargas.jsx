import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Edit3,
  Hourglass,
  RefreshCw,
  Scale,
  Trash2,
  Trophy,
  Truck,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../../services/supabaseClient";

import { confirmarCargaComoSaida } from "../../services/cargasSaidasService";

const REGISTROS_POR_PAGINA_CARGAS = 10;

const filtrosIniciais = {
  dataInicial: "",
  dataFinal: "",
  cliente: "",
  status: "",
  metrica: "peso",
};

function dataHoje() {
  return new Date().toISOString().slice(0, 10);
}

function horaAgora() {
  return new Date().toTimeString().slice(0, 5);
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;

  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  let textoValor = String(valor).trim().replace(/\s/g, "");

  if (!textoValor) return 0;

  const temVirgula = textoValor.includes(",");
  const temPonto = textoValor.includes(".");

  if (temVirgula && temPonto) {
    textoValor = textoValor.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    textoValor = textoValor.replace(",", ".");
  } else if (temPonto && /^\d{1,3}(\.\d{3})+$/.test(textoValor)) {
    textoValor = textoValor.replace(/\./g, "");
  }

  textoValor = textoValor.replace(/[^0-9.-]/g, "");

  const convertido = Number(textoValor);

  return Number.isFinite(convertido) ? convertido : 0;
}

function texto(valor) {
  return String(valor || "").trim();
}

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 0,
  });
}

function formatarPeso(valor) {
  return `${Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
}

function obterCaixasCarga(carga) {
  if (!carga) return 0;

  const direto = numero(
    carga.quantidade_total_caixas ??
      carga.quantidade_caixas ??
      carga.total_caixas ??
      carga.quantidade_total_unidades ??
      carga.quantidade_unidades ??
      carga.unidades ??
      carga.caixas ??
      0
  );

  if (direto > 0) return direto;

  if (Array.isArray(carga.itens)) {
    return carga.itens.reduce((total, item) => {
      return total + numero(item.quantidade_caixas ?? item.quantidade ?? item.caixas ?? 0);
    }, 0);
  }

  return 0;
}

function obterPesoCarga(carga) {
  if (!carga) return 0;

  const direto = numero(carga.peso_total_kg ?? carga.peso_total ?? carga.peso ?? 0);

  if (direto > 0) return direto;

  const caixas = obterCaixasCarga(carga);
  const pesoUnitario = numero(
    carga.peso_por_unidade_kg ??
      carga.peso_por_caixa_kg ??
      carga.peso_caixa_kg ??
      0
  );

  return caixas * pesoUnitario;
}

function valorCargaMetrica(carga, metrica) {
  return metrica === "caixas" ? obterCaixasCarga(carga) : obterPesoCarga(carga);
}

function valorClienteMetrica(cliente, metrica) {
  return metrica === "caixas" ? numero(cliente?.caixas) : numero(cliente?.peso);
}

function formatarMetricaCarga(valor, metrica) {
  if (metrica === "caixas") return formatarNumero(valor) + " caixas";
  return formatarPeso(valor);
}

function rotuloMetricaCarga(metrica) {
  return metrica === "caixas" ? "Caixas" : "Peso";
}

function formatarData(data) {
  if (!data) return "-";

  const [ano, mes, dia] = String(data).split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarDataCurta(data) {
  if (!data) return "-";

  const [, mes, dia] = String(data).split("-");
  return `${dia}/${mes}`;
}

function textoStatus(status) {
  if (status === "confirmada") return "Confirmada";
  if (status === "cancelada") return "Cancelada";
  return "Pendente";
}

function classeStatus(status) {
  if (status === "confirmada") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "cancelada") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function classeEstoque(status) {
  if (status === "sim") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "parcial") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function textoEstoque(status) {
  if (status === "sim") return "Sim";
  if (status === "parcial") return "Parcial";
  return "Nao";
}

function estadoInicialFormulario(numeroCarga = "") {
  return {
    data_carga: dataHoje(),
    hora: horaAgora(),
    numero_carga: numeroCarga,
    cliente: "",
    area_id: "",
    numero_pedido: "",
    status: "pendente",
    tipo_embalagem: "caixa",
    quantidade_total_caixas: "",
    peso_por_unidade_kg: "",
    responsavel_id: "",
    observacao: "",
    itens: [{ calibre_id: "", quantidade_caixas: "" }],
  };
}

function gerarProximoNumeroCarga(cargas = []) {
  const maior = cargas.reduce((maiorAtual, carga) => {
    const numeroCarga = String(carga.numero_carga || "");
    const encontrado = numeroCarga.match(/(\d+)/g);
    const valor = encontrado ? Number(encontrado[encontrado.length - 1]) : 0;

    if (!Number.isFinite(valor)) return maiorAtual;

    return Math.max(maiorAtual, valor);
  }, 0);

  return `CGA-${String(maior + 1).padStart(4, "0")}`;
}

function ordenarLista(lista, ordenacao) {
  const direcao = ordenacao.direcao === "asc" ? 1 : -1;

  return [...lista].sort((a, b) => {
    const valorA = a[ordenacao.campo];
    const valorB = b[ordenacao.campo];

    if (typeof valorA === "number" || typeof valorB === "number") {
      return (numero(valorA) - numero(valorB)) * direcao;
    }

    return String(valorA || "").localeCompare(String(valorB || ""), "pt-BR") * direcao;
  });
}

function proximaOrdenacao(ordenacaoAtual, campo) {
  if (ordenacaoAtual.campo !== campo) {
    return {
      campo,
      direcao: "asc",
    };
  }

  return {
    campo,
    direcao: ordenacaoAtual.direcao === "asc" ? "desc" : "asc",
  };
}

function IndicadorOrdenacao({ ativo, direcao }) {
  if (!ativo) return <span className="text-slate-300">↕</span>;

  return <span className="text-emerald-700">{direcao === "asc" ? "↑" : "↓"}</span>;
}

function BotaoOrdenacao({ children, campo, ordenacao, onClick, alinhado = "left" }) {
  const ativo = ordenacao.campo === campo;

  return (
    <button
      type="button"
      onClick={() => onClick((estadoAtual) => proximaOrdenacao(estadoAtual, campo))}
      className={`inline-flex w-full items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 transition hover:text-emerald-700 ${
        alinhado === "right" ? "justify-end" : "justify-start"
      }`}
    >
      {children}
      <IndicadorOrdenacao ativo={ativo} direcao={ordenacao.direcao} />
    </button>
  );
}

function normalizarCarga(carga, itensPorCarga, responsaveisPorId) {
  const itens = itensPorCarga.get(carga.id) || [];
  const quantidadeTotal = numero(carga.quantidade_total_caixas ?? carga.quantidade_total_caixas);
  const pesoTotal = numero(carga.peso_total_kg);
  const pesoPorCaixa = quantidadeTotal > 0 ? pesoTotal / quantidadeTotal : 0;

  return {
    ...carga,
    quantidade_total_caixas: quantidadeTotal,
    peso_total_kg: pesoTotal,
    peso_por_unidade_kg: pesoPorCaixa,
    responsavel_nome: responsaveisPorId.get(carga.responsavel_id)?.nome || "",
    itens,
  };
}

function montarTextoCalibres(carga) {
  if (!Array.isArray(carga.itens) || carga.itens.length === 0) return "-";

  return carga.itens
    .map((item) => {
      const area =
        item.area_nome ||
        item.areas_fazenda?.nome ||
        item.area?.nome ||
        item.area_pivo_nome ||
        "Área não informada";

      const calibre =
        item.calibre_codigo ||
        item.calibres?.codigo ||
        item.calibre?.codigo ||
        item.calibre_nome ||
        item.calibres?.nome ||
        "-";

      const quantidade = numero(
        item.quantidade_caixas ??
          item.quantidade_unidades ??
          item.quantidade ??
          0
      );

      return `${area} · ${calibre} · ${formatarNumero(quantidade)}`;
    })
    .join(" | ");
}

function montarMapaEstoque(estoqueAtual = []) {
  const mapa = new Map();

  estoqueAtual.forEach((item) => {
    const calibreId = item.calibre_id;

    if (!calibreId) return;

    const atual = mapa.get(calibreId) || {
      calibre_id: calibreId,
      calibre_codigo: item.calibre_codigo || "",
      calibre_nome: item.calibre_nome || "",
      saldo_unidades: 0,
      peso_kg: 0,
    };

    atual.saldo_unidades += numero(
      item.saldo_disponivel_unidades ||
        item.saldo_unidades ||
        item.disponivel_unidades ||
        item.estoque_unidades
    );

    atual.peso_kg += numero(
      item.peso_disponivel_kg ||
        item.saldo_disponivel_peso_kg ||
        item.saldo_peso_kg ||
        item.peso_kg
    );

    mapa.set(calibreId, atual);
  });

  return mapa;
}

function analisarEstoqueCarga(carga, estoquePorCalibre) {
  const itens = obterItensDaCarga(carga);

  if (itens.length === 0) {
    return {
      status: "nao",
      texto: "Nao",
      resumo: "Sem calibres",
      detalhes: [],
    };
  }

  const detalhes = itens.map((item) => {
    const estoque = estoquePorCalibre.get(item.calibre_id);
    const necessario = numero(item.quantidade_caixas);
    const disponivel = numero(estoque?.saldo_unidades);
    const suficiente = disponivel >= necessario && necessario > 0;
    const possuiAlgumSaldo = disponivel > 0;

    return {
      calibre_id: item.calibre_id,
      calibre_codigo: item.calibre_codigo || estoque?.calibre_codigo || "-",
      necessario,
      disponivel,
      suficiente,
      possuiAlgumSaldo,
    };
  });

  const todosSuficientes = detalhes.every((item) => item.suficiente);
  const algumComSaldo = detalhes.some((item) => item.possuiAlgumSaldo);

  let status = "nao";

  if (todosSuficientes) {
    status = "sim";
  } else if (algumComSaldo) {
    status = "parcial";
  }

  const resumo = detalhes
    .map((item) => {
      return `${item.calibre_codigo}: precisa ${formatarNumero(
        item.necessario
      )}, estoque ${formatarNumero(item.disponivel)}`;
    })
    .join(" | ");

  return {
    status,
    texto: textoEstoque(status),
    resumo,
    detalhes,
  };
}

function CardResumo({ titulo, valor, subtitulo, icone, cor = "emerald" }) {
  const cores = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="flex items-center gap-4 rounded-3xl bg-white px-5 py-4 shadow-sm">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          cores[cor] || cores.emerald
        }`}
      >
        {icone}
      </div>

      <div>
        <p className="text-sm font-medium text-slate-500">{titulo}</p>
        <strong className="mt-1 block text-2xl font-medium text-slate-950">
          {valor}
        </strong>
        <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
      </div>
    </div>
  );
}

function GraficoLinhaCargas(props = {}) {
  const listaOriginal = Array.isArray(props)
    ? props
    : Array.isArray(props.dados)
      ? props.dados
      : Array.isArray(props.data)
        ? props.data
        : Array.isArray(props.lista)
          ? props.lista
          : Array.isArray(props.itens)
            ? props.itens
            : [];

  const dados = listaOriginal.slice(-25).map((item) => {
    const valorBruto =
      item.quantidade_cargas ??
      item.total_cargas ??
      item.cargas ??
      item.quantidade ??
      item.total ??
      item.valor ??
      item.registros ??
      0;

    const dataBruta =
      item.data ??
      item.data_carga ??
      item.dia ??
      item.label ??
      item.nome ??
      "";

    const valorNumerico = Number(valorBruto);

    function formatarLabelData(valor) {
      const texto = String(valor || "").trim();

      if (!texto) return "-";

      if (texto.includes("-")) {
        const dataLimpa = texto.slice(0, 10);
        const partes = dataLimpa.split("-");

        if (partes.length === 3 && partes[0].length === 4) {
          return partes[2] + "/" + partes[1];
        }
      }

      if (texto.includes("/")) {
        const partes = texto.split("/");

        if (partes.length >= 2) {
          return String(partes[0]).padStart(2, "0") + "/" + String(partes[1]).padStart(2, "0");
        }
      }

      return texto;
    }

    return {
      label: formatarLabelData(dataBruta),
      valor: Number.isFinite(valorNumerico) ? valorNumerico : 0,
    };
  });

  if (dados.length === 0) {
    return (
      <div className="flex h-[360px] w-full items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-400">
        Nenhum dado para exibir.
      </div>
    );
  }

  const largura = 1160;
  const altura = 360;
  const esquerda = 28;
  const direita = 28;
  const topo = 34;
  const baixo = 58;
  const areaLargura = largura - esquerda - direita;
  const areaAltura = altura - topo - baixo;

  const maiorValor = Math.max(...dados.map((item) => item.valor), 1);

  function obterX(indice) {
    if (dados.length === 1) {
      return esquerda + areaLargura / 2;
    }

    return esquerda + (indice / (dados.length - 1)) * areaLargura;
  }

  function obterY(valor) {
    return topo + areaAltura - (Number(valor || 0) / maiorValor) * areaAltura;
  }

  function formatarNumeroLocal(valor) {
    return Number(valor || 0).toLocaleString("pt-BR");
  }

  const pontosLinha = dados
    .map((item, indice) => obterX(indice) + "," + obterY(item.valor))
    .join(" ");

  const pontosArea = [
    esquerda + "," + (topo + areaAltura),
    pontosLinha,
    largura - direita + "," + (topo + areaAltura),
  ].join(" ");

  return (
    <div className="flex h-[360px] w-full items-center justify-center">
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="graficoCargasPlanejadasDataCurta" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#047857" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((linha) => {
          const y = topo + (linha / 3) * areaAltura;

          return (
            <line
              key={linha}
              x1={esquerda}
              x2={largura - direita}
              y1={y}
              y2={y}
              stroke="#E8EEF2"
              strokeWidth="1"
            />
          );
        })}

        <polygon points={pontosArea} fill="url(#graficoCargasPlanejadasDataCurta)" />

        <polyline
          points={pontosLinha}
          fill="none"
          stroke="#047857"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {dados.map((item, indice) => {
          const x = obterX(indice);
          const y = obterY(item.valor);

          return (
            <g key={item.label + "-" + indice}>
              <circle cx={x} cy={y} r="7" fill="#047857" stroke="#FFFFFF" strokeWidth="4" />

              <text
                x={x}
                y={y - 16}
                textAnchor="middle"
                fontSize="18"
                fontWeight="600"
                fill="#0F172A"
              >
                {formatarNumeroLocal(item.valor)}
              </text>

              <text
                x={x}
                y={altura - 18}
                textAnchor="middle"
                fontSize="17"
                fontWeight="500"
                fill="#64748B"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function GraficoStatus({ resumo }) {
  const total = resumo.totalCargas;

  const segmentos = [
    { nome: "Confirmadas", valor: resumo.confirmadas, cor: "#059669" },
    { nome: "Pendentes", valor: resumo.pendentes, cor: "#F59E0B" },
    { nome: "Canceladas", valor: resumo.canceladas, cor: "#EF4444" },
  ];

  const raio = 53;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;

  return (
    <div className="flex h-[260px] flex-col items-center justify-center gap-5">
      <div className="relative h-[150px] w-[150px]">
        <svg viewBox="0 0 150 150" className="h-full w-full">
          <circle
            cx="75"
            cy="75"
            r={raio}
            fill="none"
            stroke="#EEF2F6"
            strokeWidth="22"
          />

          {total > 0
            ? segmentos.map((segmento) => {
                const tamanho = (segmento.valor / total) * circunferencia;
                const dashOffset = -acumulado;
                acumulado += tamanho;

                return (
                  <circle
                    key={segmento.nome}
                    cx="75"
                    cy="75"
                    r={raio}
                    fill="none"
                    stroke={segmento.cor}
                    strokeWidth="22"
                    strokeLinecap="butt"
                    strokeDasharray={`${tamanho} ${circunferencia - tamanho}`}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 75 75)"
                  />
                );
              })
            : null}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <strong className="text-2xl font-medium text-slate-950">
            {formatarNumero(total)}
          </strong>
          <span className="text-xs text-slate-500">Total</span>
        </div>
      </div>

      <div className="grid w-full grid-cols-3 gap-2 text-center text-xs">
        {segmentos.map((segmento) => {
          const percentual = total > 0 ? (segmento.valor / total) * 100 : 0;

          return (
            <button
              key={segmento.nome}
              type="button"
              className="rounded-xl border border-slate-100 px-2 py-2"
            >
              <span
                className="mx-auto mb-1 block h-3 w-3 rounded-full"
                style={{ backgroundColor: segmento.cor }}
              />
              <span className="block text-slate-500">{segmento.nome}</span>
              <strong className="mt-1 block font-medium text-slate-950">
                {formatarNumero(segmento.valor)} ({percentual.toFixed(1)}%)
              </strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ListaPendentes({ cargas, ordenacao, setOrdenacao, metrica = "peso" }) {
  const ordenacaoAtual =
    ordenacao?.campo === "peso"
      ? {
          ...ordenacao,
          campo: "valor_metrica",
        }
      : ordenacao;

  const pendentes = ordenarLista(
    cargas
      .filter((carga) => carga.status === "pendente")
      .map((carga) => ({
        ...carga,
        peso: obterPesoCarga(carga),
        caixas: obterCaixasCarga(carga),
        valor_metrica: valorCargaMetrica(carga, metrica),
      })),
    ordenacaoAtual
  );

  return (
    <div className="h-[260px]">
      <div className="mb-2 grid grid-cols-[70px_1fr_120px] items-center gap-3 px-1">
        <BotaoOrdenacao campo="data_carga" ordenacao={ordenacao} onClick={setOrdenacao}>
          Data
        </BotaoOrdenacao>

        <BotaoOrdenacao campo="cliente" ordenacao={ordenacao} onClick={setOrdenacao}>
          Cliente
        </BotaoOrdenacao>

        <BotaoOrdenacao campo="valor_metrica" ordenacao={ordenacaoAtual} onClick={setOrdenacao} alinhado="right">
          {rotuloMetricaCarga(metrica)}
        </BotaoOrdenacao>
      </div>

      {pendentes.length === 0 ? (
        <div className="flex h-[215px] items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-400">
          Nenhuma carga pendente.
        </div>
      ) : (
        <div className="max-h-[215px] space-y-3 overflow-y-auto pr-1">
          {pendentes.map((carga) => (
            <div
              key={carga.id}
              className="grid grid-cols-[70px_1fr_120px] items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm"
            >
              <div className="text-slate-500">{formatarDataCurta(carga.data_carga)}</div>

              <div className="min-w-0">
                <strong className="truncate font-medium text-slate-950">{carga.cliente}</strong>
                <div className="mt-1 flex flex-wrap gap-1">
                  {carga.itens.slice(0, 2).map((item) => (
                    <span
                      key={item.id || item.calibre_id + item.area_id}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                    >
                      {item.area_nome ? item.area_nome + " " : ""}
                      {item.calibre_codigo || item.calibre_nome || "-"}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-right text-xs font-semibold text-slate-950">
                {formatarMetricaCarga(carga.valor_metrica, metrica)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GraficoClientes({ dados, ordenacao, setOrdenacao, metrica = "peso" }) {
  const dadosComValor = (dados || []).map((item) => ({
    ...item,
    valor_metrica: valorClienteMetrica(item, metrica),
  }));

  const ordenacaoAtual =
    ordenacao?.campo === "peso"
      ? {
          ...ordenacao,
          campo: "valor_metrica",
        }
      : ordenacao;

  const ordenados = ordenarLista(dadosComValor, ordenacaoAtual);
  const maior = Math.max(...ordenados.map((item) => item.valor_metrica), 1);

  return (
    <div className="h-[260px]">
      <div className="mb-2 grid grid-cols-[150px_1fr_120px] items-center gap-3 px-1">
        <BotaoOrdenacao campo="cliente" ordenacao={ordenacao} onClick={setOrdenacao}>
          Cliente
        </BotaoOrdenacao>
        <span />
        <BotaoOrdenacao campo="valor_metrica" ordenacao={ordenacaoAtual} onClick={setOrdenacao} alinhado="right">
          {rotuloMetricaCarga(metrica)} total
        </BotaoOrdenacao>
      </div>

      {ordenados.length === 0 ? (
        <div className="flex h-[215px] items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-400">
          Nenhum dado para exibir.
        </div>
      ) : (
        <div className="max-h-[215px] space-y-3 overflow-y-auto pr-1">
          {ordenados.map((item) => (
            <div key={item.cliente} className="grid grid-cols-[150px_1fr_120px] items-center gap-3 text-sm">
              <span className="truncate text-slate-700">{item.cliente}</span>

              <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-700"
                  style={{ width: `${Math.max((item.valor_metrica / maior) * 100, 4)}%` }}
                />
              </div>

              <strong className="text-right font-medium text-slate-950">
                {formatarMetricaCarga(item.valor_metrica, metrica)}
              </strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaginacaoCargas({ paginaAtual, totalPaginas, totalRegistros, onChange }) {
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm md:flex-row md:items-center md:justify-between">
      <p className="text-slate-500">
        10 registros por página • {formatarNumero(totalRegistros)} registro(s)
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={paginaAtual <= 1}
          onClick={() => onChange(paginaAtual - 1)}
          className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>

        <span className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white">
          {paginaAtual}
        </span>

        <span className="text-slate-400">de {totalPaginas}</span>

        <button
          type="button"
          disabled={paginaAtual >= totalPaginas}
          onClick={() => onChange(paginaAtual + 1)}
          className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}



function obterTextoAreaItemCarga(item, carga) {
  return (
    item?.area_nome ||
    item?.area_pivo_nome ||
    item?.area ||
    item?.nome_area ||
    item?.areas_fazenda?.nome ||
    item?.area_fazenda?.nome ||
    item?.area_pivo?.nome ||
    item?.area_ref?.nome ||
    item?.area?.nome ||
    carga?.area_nome ||
    carga?.area_pivo_nome ||
    "Sem área"
  );
}


function obterTextoCalibreItemCarga(item) {
  return (
    item?.calibre_codigo ||
    item?.calibre_nome ||
    item?.calibre ||
    item?.codigo_calibre ||
    item?.calibres?.codigo ||
    item?.calibres?.nome ||
    item?.calibre_ref?.codigo ||
    item?.calibre_ref?.nome ||
    item?.calibre_dados?.codigo ||
    item?.calibre_dados?.nome ||
    item?.calibre_obj?.codigo ||
    item?.calibre_obj?.nome ||
    item?.calibre?.codigo ||
    item?.calibre?.nome ||
    "Sem calibre"
  );
}

function obterCaixasItemCarga(item) {
  return numero(
    item?.quantidade_caixas ??
      item?.quantidade ??
      item?.caixas ??
      item?.total_caixas ??
      item?.unidades ??
      0
  );
}

function obterPesoItemCarga(item, carga) {
  const pesoDireto = numero(
    item?.peso_total_kg ??
      item?.peso_total ??
      item?.peso_kg ??
      0
  );

  if (pesoDireto > 0) return pesoDireto;

  const caixas = obterCaixasItemCarga(item);

  const pesoUnitario = numero(
    item?.peso_unitario_kg ??
      item?.peso_unidade_kg ??
      item?.peso_por_unidade_kg ??
      item?.peso_por_caixa_kg ??
      carga?.peso_unitario_kg ??
      carga?.peso_unidade_kg ??
      carga?.peso_por_unidade_kg ??
      carga?.peso_por_caixa_kg ??
      carga?.peso_caixa_kg ??
      0
  );

  return caixas * pesoUnitario;
}

function formatarValorAreaCalibreCarga(valor, metrica) {
  if (metrica === "peso") return formatarPeso(valor);
  return formatarNumero(valor) + " caixas";
}

function obterItensDaCarga(carga) {
  if (!carga) return [];

  const possibilidades = [
    carga.itens,
    carga.carga_itens,
    carga.carga_items,
    carga.itens_carga,
    carga.cargas_itens,
    carga.items,
    carga.produtos,
    carga.calibres,
  ];

  const lista = possibilidades.find((valor) => Array.isArray(valor));

  return Array.isArray(lista) ? lista : [];
}

function montarDadosAreaCalibreCargas(cargas, metrica) {
  const mapaAreas = new Map();
  const mapaCalibres = new Map();

  const lista = Array.isArray(cargas) ? cargas : [];

  lista.forEach((carga) => {
    if (!carga || carga.status === "cancelada") return;

    const itens = Array.isArray(carga.itens) ? carga.itens : [];

    itens.forEach((item) => {
      const area = String(obterTextoAreaItemCarga(item, carga) || "").trim();
      const calibre = String(obterTextoCalibreItemCarga(item) || "").trim();

      if (!area || area === "Sem área") return;
      if (!calibre || calibre === "Sem calibre") return;

      const valor =
        metrica === "peso"
          ? obterPesoItemCarga(item, carga)
          : obterCaixasItemCarga(item);

      if (valor <= 0) return;

      if (!mapaAreas.has(area)) {
        mapaAreas.set(area, {
          area,
          total: 0,
          valores: new Map(),
        });
      }

      const linha = mapaAreas.get(area);
      linha.total += valor;
      linha.valores.set(calibre, (linha.valores.get(calibre) || 0) + valor);

      mapaCalibres.set(calibre, (mapaCalibres.get(calibre) || 0) + valor);
    });
  });

  const areas = Array.from(mapaAreas.values()).sort((a, b) => {
    const numeroA = Number(String(a.area).match(/\d+/)?.[0] || 9999);
    const numeroB = Number(String(b.area).match(/\d+/)?.[0] || 9999);

    if (numeroA !== numeroB) return numeroA - numeroB;

    return String(a.area).localeCompare(String(b.area), "pt-BR", {
      numeric: true,
      sensitivity: "base",
    });
  });

  const calibres = Array.from(mapaCalibres.entries())
    .map(([calibre, total]) => ({
      calibre,
      total,
      ordem: Number(String(calibre).match(/\d+/)?.[0] || 9999),
    }))
    .sort((a, b) => {
      if (a.ordem !== b.ordem) return a.ordem - b.ordem;

      return String(a.calibre).localeCompare(String(b.calibre), "pt-BR", {
        numeric: true,
        sensitivity: "base",
      });
    });

  return {
    areas,
    calibres,
    totalGeral: areas.reduce((total, area) => total + area.total, 0),
  };
}

function corCelulaCargaAreaCalibre(percentual, valor) {
  if (valor <= 0) {
    return "bg-slate-50 text-slate-300 border-slate-100";
  }

  if (percentual >= 35) return "bg-emerald-100 text-emerald-950 border-emerald-200";
  if (percentual >= 20) return "bg-teal-100 text-teal-950 border-teal-200";
  if (percentual >= 10) return "bg-amber-100 text-amber-950 border-amber-200";
  if (percentual >= 4) return "bg-orange-100 text-orange-950 border-orange-200";

  return "bg-red-100 text-red-950 border-red-200";
}

function GraficoCargasPorAreaCalibre({ cargas = [], metrica = "caixas" }) {
  const dados = useMemo(() => {
    return montarDadosAreaCalibreCargas(cargas, metrica);
  }, [cargas, metrica]);

  if (!dados.areas.length || !dados.calibres.length) {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 xl:col-span-2">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              {metrica === "peso"
                ? "Peso por Área/Pivô e Calibre"
                : "Caixas por Área/Pivô e Calibre"}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Mostra quanto saiu em cada calibre, separado pela Área/Pivô da carga.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
            Sem dados por Área/Pivô e Calibre no filtro atual.
          </div>
        </div>
      </section>
    );
  }

  const gridTemplateColumns =
    "120px repeat(" + dados.calibres.length + ", minmax(82px, 1fr)) 96px";

  const minWidth = 120 + dados.calibres.length * 82 + 96;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 xl:col-span-2">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            {metrica === "peso"
              ? "Peso por Área/Pivô e Calibre"
              : "Caixas por Área/Pivô e Calibre"}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Mostra quanto saiu em cada calibre, separado pela Área/Pivô da carga. Cargas canceladas não entram no cálculo.
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
            Total no filtro
          </p>
          <strong className="mt-1 block text-lg font-semibold text-emerald-950">
            {formatarValorAreaCalibreCarga(dados.totalGeral, metrica)}
          </strong>
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
                className="text-center text-[11px] font-semibold uppercase leading-tight text-slate-700"
              >
                {calibre.calibre}
              </div>
            ))}

            <div className="text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Total
            </div>
          </div>

          <div className="mt-2 max-h-[430px] space-y-2 overflow-y-auto pr-1">
            {dados.areas.map((area) => (
              <div
                key={area.area}
                className="grid items-center gap-2"
                style={{ gridTemplateColumns }}
              >
                <div className="truncate text-sm font-semibold text-slate-950">
                  {area.area}
                </div>

                {dados.calibres.map((calibre) => {
                  const valor = numero(area.valores.get(calibre.calibre));
                  const percentual = area.total > 0 ? (valor / area.total) * 100 : 0;

                  return (
                    <div
                      key={area.area + "-" + calibre.calibre}
                      className={[
                        "flex h-[58px] flex-col items-center justify-center rounded-xl border px-2 text-center",
                        corCelulaCargaAreaCalibre(percentual, valor),
                      ].join(" ")}
                      title={
                        area.area +
                        " • " +
                        calibre.calibre +
                        " • " +
                        formatarValorAreaCalibreCarga(valor, metrica)
                      }
                    >
                      {valor > 0 ? (
                        <>
                          <strong className="text-[12.5px] leading-4">
                            {metrica === "peso" ? formatarPeso(valor) : formatarNumero(valor)}
                          </strong>

                          <span className="mt-0.5 text-[10.5px] font-medium opacity-75">
                            {percentual.toLocaleString("pt-BR", {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                            %
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-semibold">-</span>
                      )}
                    </div>
                  );
                })}

                <div className="flex h-[58px] items-center justify-end rounded-xl border border-emerald-100 bg-emerald-50 px-3 text-right text-sm font-semibold text-emerald-950">
                  {formatarValorAreaCalibreCarga(area.total, metrica)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}



function obterItensCargaParticipacao(carga) {
  if (!carga) return [];

  const possibilidades = [
    carga.itens,
    carga.carga_itens,
    carga.carga_items,
    carga.itens_carga,
    carga.cargas_itens,
    carga.items,
    carga.produtos,
  ];

  const lista = possibilidades.find((valor) => Array.isArray(valor));

  return Array.isArray(lista) ? lista : [];
}

function obterCalibreParticipacaoCarga(item) {
  return (
    item?.calibre_codigo ||
    item?.calibre_nome ||
    item?.calibre ||
    item?.codigo_calibre ||
    item?.calibres?.codigo ||
    item?.calibres?.nome ||
    item?.calibre_ref?.codigo ||
    item?.calibre_ref?.nome ||
    item?.calibre_dados?.codigo ||
    item?.calibre_dados?.nome ||
    item?.calibre_obj?.codigo ||
    item?.calibre_obj?.nome ||
    item?.calibre?.codigo ||
    item?.calibre?.nome ||
    "Sem calibre"
  );
}

function obterCaixasParticipacaoCarga(item) {
  return numero(
    item?.quantidade_caixas ??
      item?.quantidade ??
      item?.caixas ??
      item?.total_caixas ??
      item?.unidades ??
      0
  );
}

function obterPesoParticipacaoCarga(item, carga) {
  const pesoDireto = numero(
    item?.peso_total_kg ??
      item?.peso_total ??
      item?.peso_kg ??
      0
  );

  if (pesoDireto > 0) return pesoDireto;

  const caixas = obterCaixasParticipacaoCarga(item);

  const pesoUnitario = numero(
    item?.peso_unitario_kg ??
      item?.peso_unidade_kg ??
      item?.peso_por_unidade_kg ??
      item?.peso_por_caixa_kg ??
      carga?.peso_unitario_kg ??
      carga?.peso_unidade_kg ??
      carga?.peso_por_unidade_kg ??
      carga?.peso_por_caixa_kg ??
      carga?.peso_caixa_kg ??
      0
  );

  return caixas * pesoUnitario;
}

function formatarValorParticipacaoCarga(valor, metrica) {
  if (metrica === "peso") return formatarPeso(valor);
  return formatarNumero(valor) + " caixas";
}

function montarParticipacaoCargasPorCalibre(cargas, metrica) {
  const mapa = new Map();
  const lista = Array.isArray(cargas) ? cargas : [];

  lista.forEach((carga) => {
    if (!carga || carga.status === "cancelada") return;

    const itens = obterItensCargaParticipacao(carga);

    itens.forEach((item) => {
      const calibre = String(obterCalibreParticipacaoCarga(item) || "Sem calibre").trim();

      if (!calibre || calibre === "Sem calibre") return;

      const caixas = obterCaixasParticipacaoCarga(item);
      const peso = obterPesoParticipacaoCarga(item, carga);
      const valor = metrica === "peso" ? peso : caixas;

      if (valor <= 0) return;

      const atual =
        mapa.get(calibre) || {
          calibre,
          caixas: 0,
          peso: 0,
          valor: 0,
          registros: 0,
        };

      atual.caixas += caixas;
      atual.peso += peso;
      atual.valor += valor;
      atual.registros += 1;

      mapa.set(calibre, atual);
    });
  });

  const dados = Array.from(mapa.values()).sort((a, b) => {
    if (b.valor !== a.valor) return b.valor - a.valor;

    return String(a.calibre).localeCompare(String(b.calibre), "pt-BR", {
      numeric: true,
      sensitivity: "base",
    });
  });

  const total = dados.reduce((soma, item) => soma + numero(item.valor), 0);

  return {
    dados,
    total,
  };
}


function GraficoParticipacaoCargasPorCalibre({ cargas = [], metrica = "caixas" }) {
  const [calibresSelecionados, setCalibresSelecionados] = useState([]);

  const resultadoCompleto = useMemo(() => {
    return montarParticipacaoCargasPorCalibre(cargas, metrica);
  }, [cargas, metrica]);

  const opcoesCalibres = useMemo(() => {
    return resultadoCompleto.dados.map((item) => item.calibre);
  }, [resultadoCompleto.dados]);

  useEffect(() => {
    setCalibresSelecionados((selecionadosAtuais) => {
      return selecionadosAtuais.filter((calibre) => opcoesCalibres.includes(calibre));
    });
  }, [opcoesCalibres]);

  const dados = useMemo(() => {
    if (!calibresSelecionados.length) {
      return resultadoCompleto.dados;
    }

    return resultadoCompleto.dados.filter((item) =>
      calibresSelecionados.includes(item.calibre)
    );
  }, [resultadoCompleto.dados, calibresSelecionados]);

  const total = useMemo(() => {
    return dados.reduce((soma, item) => soma + numero(item.valor), 0);
  }, [dados]);

  const cores = [
    "#047857",
    "#2563EB",
    "#F59E0B",
    "#DC2626",
    "#7C3AED",
    "#0F766E",
    "#334155",
    "#16A34A",
    "#EA580C",
    "#0891B2",
    "#BE123C",
    "#4F46E5",
  ];

  function alternarCalibre(calibre) {
    setCalibresSelecionados((selecionadosAtuais) => {
      if (selecionadosAtuais.includes(calibre)) {
        return selecionadosAtuais.filter((item) => item !== calibre);
      }

      return [...selecionadosAtuais, calibre];
    });
  }

  let acumulado = 0;

  const gradiente = dados
    .map((item, index) => {
      const percentual = total > 0 ? (numero(item.valor) / total) * 100 : 0;
      const inicioFatia = acumulado;
      const fimFatia = acumulado + percentual;
      acumulado = fimFatia;

      return cores[index % cores.length] + " " + inicioFatia + "% " + fimFatia + "%";
    })
    .join(", ");

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 xl:col-span-2">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            {metrica === "peso"
              ? "Participação das cargas por calibre (Peso)"
              : "Participação das cargas por calibre (Caixas)"}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Escolha um ou mais calibres abaixo para montar o gráfico apenas com eles.
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
            Total selecionado
          </p>
          <strong className="mt-1 block text-lg font-semibold text-emerald-950">
            {formatarValorParticipacaoCarga(total, metrica)}
          </strong>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Filtrar calibres deste gráfico
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {calibresSelecionados.length
                ? calibresSelecionados.length + " calibre(s) selecionado(s)"
                : "Nenhum selecionado: mostrando todos"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCalibresSelecionados([])}
            className={[
              "inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-xs font-semibold transition",
              calibresSelecionados.length === 0
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
            ].join(" ")}
          >
            Ver todos
          </button>
        </div>

        {!resultadoCompleto.dados.length ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm font-semibold text-slate-400">
            Sem calibres disponíveis no filtro atual da tela.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {resultadoCompleto.dados.map((item) => {
              const ativo = calibresSelecionados.includes(item.calibre);

              return (
                <button
                  key={item.calibre}
                  type="button"
                  onClick={() => alternarCalibre(item.calibre)}
                  className={[
                    "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition",
                    ativo
                      ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-2.5 w-2.5 rounded-full",
                      ativo ? "bg-white" : "bg-emerald-600",
                    ].join(" ")}
                  />
                  {item.calibre}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!dados.length || total <= 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-400">
          Nenhum dado para os calibres selecionados.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
          <div className="relative mx-auto h-52 w-52 rounded-full sm:h-60 sm:w-60" style={{ background: "conic-gradient(" + gradiente + ")" }}>
            <div className="absolute inset-12 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner sm:inset-14">
              <span className="text-xs font-medium text-slate-500">Total</span>
              <strong className="mt-1 text-2xl font-semibold leading-none text-slate-950">
                {metrica === "peso" ? formatarPeso(total) : formatarNumero(total)}
              </strong>
              <span className="mt-1 text-xs text-slate-500">
                {metrica === "peso" ? "kg" : "caixas"}
              </span>
            </div>
          </div>

          <div className="grid gap-2 xl:grid-cols-2">
            {dados.map((item, index) => {
              const percentual = total > 0 ? (numero(item.valor) / total) * 100 : 0;

              return (
                <div
                  key={item.calibre}
                  className="grid gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm shadow-sm md:grid-cols-[minmax(0,1fr)_120px] md:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cores[index % cores.length] }}
                    />

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{item.calibre}</p>
                      <p className="text-xs text-slate-500">
                        {formatarNumero(item.registros)} lançamento(s)
                      </p>
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="font-semibold text-slate-950">
                      {formatarValorParticipacaoCarga(item.valor, metrica)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {percentual.toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                      %
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default function Cargas() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [todasCargas, setTodasCargas] = useState([]);
  const [cargas, setCargas] = useState([]);
  const [calibres, setCalibres] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [estoqueAtual, setEstoqueAtual] = useState([]);

  const [modalAberto, setModalAberto] = useState(false);
  const [registroEditando, setRegistroEditando] = useState(null);
  const [formulario, setFormulario] = useState(estadoInicialFormulario());

  const [ordenacaoTabela, setOrdenacaoTabela] = useState({
    campo: "data_carga",
    direcao: "desc",
  });

  const [ordenacaoPendentes, setOrdenacaoPendentes] = useState({
    campo: "data_carga",
    direcao: "asc",
  });

  const [ordenacaoClientes, setOrdenacaoClientes] = useState({
    campo: "peso",
    direcao: "desc",
  });

  const [paginaTabela, setPaginaTabela] = useState(1);

  useEffect(() => {
    const alterados = [];
    const elementosAlterados = new Set();

    function guardarEstilo(elemento) {
      if (elementosAlterados.has(elemento)) return;

      elementosAlterados.add(elemento);

      alterados.push({
        elemento,
        position: elemento.style.position,
        top: elemento.style.top,
        zIndex: elemento.style.zIndex,
        backdropFilter: elemento.style.backdropFilter,
        WebkitBackdropFilter: elemento.style.WebkitBackdropFilter,
        background: elemento.style.background,
        boxShadow: elemento.style.boxShadow,
        display: elemento.style.display,
      });
    }

    function ajustarTopoPadrao() {
      const candidatos = Array.from(
        document.querySelectorAll(
          "header, [class*='sticky'], [class*='fixed'], [class*='backdrop-blur']"
        )
      );

      candidatos.forEach((elemento) => {
        const conteudo = texto(elemento.textContent);

        const contemUsuario =
          conteudo.includes("Igor Macedo") || conteudo.includes("Administrador");

        const contemTituloPadrao =
          conteudo.includes("Estoque de Alho") ||
          conteudo.includes("Controle agricola") ||
          conteudo.includes("Controle agrícola");

        if (!contemUsuario && !contemTituloPadrao) return;
        if (elemento.closest("aside") || elemento.closest("nav")) return;

        guardarEstilo(elemento);

        elemento.style.position = "static";
        elemento.style.top = "auto";
        elemento.style.zIndex = "auto";
        elemento.style.backdropFilter = "none";
        elemento.style.WebkitBackdropFilter = "none";
        elemento.style.background = "transparent";
        elemento.style.boxShadow = "none";
      });

      const textosPadrao = Array.from(
        document.querySelectorAll("main h1, main h2, main p, header h1, header h2, header p")
      );

      textosPadrao.forEach((elemento) => {
        const conteudo = texto(elemento.textContent);

        if (
          conteudo !== "Estoque de Alho" &&
          conteudo !== "Controle agricola" &&
          conteudo !== "Controle agrícola"
        ) {
          return;
        }

        if (elemento.closest("aside") || elemento.closest("nav")) return;

        const alvo = elemento.parentElement || elemento;

        guardarEstilo(alvo);
        alvo.style.display = "none";
      });
    }

    ajustarTopoPadrao();

    const intervalo = setInterval(ajustarTopoPadrao, 250);
    const parada = setTimeout(() => clearInterval(intervalo), 2500);

    return () => {
      clearInterval(intervalo);
      clearTimeout(parada);

      alterados.forEach((item) => {
        item.elemento.style.position = item.position;
        item.elemento.style.top = item.top;
        item.elemento.style.zIndex = item.zIndex;
        item.elemento.style.backdropFilter = item.backdropFilter;
        item.elemento.style.WebkitBackdropFilter = item.WebkitBackdropFilter;
        item.elemento.style.background = item.background;
        item.elemento.style.boxShadow = item.boxShadow;
        item.elemento.style.display = item.display;
      });
    };
  }, []);

  const metricaCargas = filtros.metrica === "caixas" ? "caixas" : "peso";

  const estoquePorCalibre = useMemo(() => {
    const mapa = new Map();

    estoqueAtual.forEach((item) => {
      const areaId = item.area_id || item.area_fazenda_id || "";
      const calibreId = item.calibre_id || "";

      if (!calibreId) return;

      const saldo =
        item.saldo_disponivel_caixas !== null &&
        item.saldo_disponivel_caixas !== undefined
          ? numero(item.saldo_disponivel_caixas)
          : item.saldo_disponivel_unidades !== null &&
              item.saldo_disponivel_unidades !== undefined
            ? numero(item.saldo_disponivel_unidades)
            : item.saldo_unidades !== null && item.saldo_unidades !== undefined
              ? numero(item.saldo_unidades)
              : numero(item.produto_final_caixas) - numero(item.saidas_caixas);

      const registro = {
        ...item,
        saldo_unidades: saldo,
        saldo_disponivel_unidades: saldo,
        saldo_disponivel_caixas: saldo,
      };

      if (areaId) {
        mapa.set(`${areaId}-${calibreId}`, registro);
      }

      const agregado = mapa.get(calibreId) || {
        ...registro,
        saldo_unidades: 0,
        saldo_disponivel_unidades: 0,
        saldo_disponivel_caixas: 0,
      };

      agregado.saldo_unidades += saldo;
      agregado.saldo_disponivel_unidades += saldo;
      agregado.saldo_disponivel_caixas += saldo;

      mapa.set(calibreId, agregado);
    });

    return mapa;
  }, [estoqueAtual]);

  const opcoesAreaFormulario = useMemo(() => {
    const mapa = new Map();

    estoqueAtual.forEach((item) => {
      const areaId = item.area_id || item.area_fazenda_id;

      if (!areaId) return;

      const saldo =
        item.saldo_disponivel_caixas !== null &&
        item.saldo_disponivel_caixas !== undefined
          ? numero(item.saldo_disponivel_caixas)
          : item.saldo_disponivel_unidades !== null &&
              item.saldo_disponivel_unidades !== undefined
            ? numero(item.saldo_disponivel_unidades)
            : item.saldo_unidades !== null && item.saldo_unidades !== undefined
              ? numero(item.saldo_unidades)
              : numero(item.produto_final_caixas) - numero(item.saidas_caixas);

      const atual = mapa.get(areaId) || {
        id: areaId,
        nome: item.area_nome || item.area_pivo_nome || "Área sem nome",
        saldo: 0,
      };

      atual.saldo += saldo;
      mapa.set(areaId, atual);
    });

    return Array.from(mapa.values()).sort((a, b) =>
      String(a.nome).localeCompare(String(b.nome), "pt-BR")
    );
  }, [estoqueAtual]);

  const totalDistribuido = useMemo(() => {
    return formulario.itens.reduce((total, item) => total + numero(item.quantidade_caixas), 0);
  }, [formulario.itens]);

  const totalCaixasFormulario = useMemo(() => {
    return totalDistribuido;
  }, [totalDistribuido]);

  const pesoPorCaixaFormulario = useMemo(() => {
    return numero(formulario.peso_por_unidade_kg);
  }, [formulario.peso_por_unidade_kg]);

  const pesoTotalFormulario = useMemo(() => {
    return totalDistribuido * pesoPorCaixaFormulario;
  }, [totalDistribuido, pesoPorCaixaFormulario]);

  const diferencaDistribuicao = useMemo(() => {
    return 0;
  }, []);

  const formularioPodeSalvar = useMemo(() => {
    if (salvando) return false;
    if (!formulario.data_carga) return false;
    if (!formulario.hora) return false;
    if (!texto(formulario.cliente)) return false;
    if (!texto(formulario.numero_carga)) return false;
    if (!formulario.responsavel_id) return false;
    if (pesoPorCaixaFormulario <= 0) return false;
    if (!Array.isArray(formulario.itens) || formulario.itens.length === 0) return false;

    const itensValidos = formulario.itens.every((item) => {
      const areaId = item.area_id || formulario.area_id || "";
      const calibreId = item.calibre_id || "";
      const quantidade = numero(item.quantidade_caixas);

      return areaId && calibreId && quantidade > 0;
    });

    if (!itensValidos) return false;

    const combinacoes = formulario.itens.map((item) => {
      return `${item.area_id || formulario.area_id || ""}-${item.calibre_id || ""}`;
    });

    return new Set(combinacoes).size === combinacoes.length;
  }, [salvando, formulario, pesoPorCaixaFormulario]);

  const clientesFiltro = useMemo(() => {
    return Array.from(new Set(todasCargas.map((carga) => carga.cliente).filter(Boolean))).sort(
      (a, b) => String(a).localeCompare(String(b), "pt-BR")
    );
  }, [todasCargas]);

  const resumo = useMemo(() => {
    const totalCargas = cargas.length;
    const confirmadas = cargas.filter((carga) => carga.status === "confirmada").length;
    const pendentes = cargas.filter((carga) => carga.status === "pendente").length;
    const canceladas = cargas.filter((carga) => carga.status === "cancelada").length;

    const pesoTotal = cargas.reduce((total, carga) => total + obterPesoCarga(carga), 0);
    const caixasTotal = cargas.reduce((total, carga) => total + obterCaixasCarga(carga), 0);

    return {
      totalCargas,
      confirmadas,
      pendentes,
      canceladas,
      pesoTotal,
      caixasTotal,
    };
  }, [cargas]);

  const dadosLinha = useMemo(() => {
    const mapa = new Map();

    cargas.forEach((carga) => {
      const chave = carga.data_carga || "";
      if (!chave) return;

      const atual = mapa.get(chave) || {
        data: chave,
        label: formatarDataCurta(chave),
        total: 0,
      };

      atual.total += 1;
      mapa.set(chave, atual);
    });

    return Array.from(mapa.values())
      .sort((a, b) => String(a.data).localeCompare(String(b.data)))
      .slice(-12);
  }, [cargas]);

  const dadosClientes = useMemo(() => {
    const mapa = new Map();

    cargas.forEach((carga) => {
      const cliente = carga.cliente || "Cliente sem nome";
      const atual = mapa.get(cliente) || {
        cliente,
        peso: 0,
        caixas: 0,
        cargas: 0,
      };

      atual.peso += obterPesoCarga(carga);
      atual.caixas += obterCaixasCarga(carga);
      atual.cargas += 1;
      mapa.set(cliente, atual);
    });

    return Array.from(mapa.values());
  }, [cargas]);

  const destaques = useMemo(() => {
    const maiorCarga = [...cargas].sort((a, b) => {
      return valorCargaMetrica(b, metricaCargas) - valorCargaMetrica(a, metricaCargas);
    })[0];

    const clienteMaior = [...dadosClientes].sort((a, b) => {
      return valorClienteMetrica(b, metricaCargas) - valorClienteMetrica(a, metricaCargas);
    })[0];

    const pesoMedio = resumo.totalCargas > 0 ? resumo.pesoTotal / resumo.totalCargas : 0;
    const caixasMedia = resumo.totalCargas > 0 ? resumo.caixasTotal / resumo.totalCargas : 0;
    const valorMedioMetrica = metricaCargas === "peso" ? pesoMedio : caixasMedia;

    const taxaConfirmacao =
      resumo.totalCargas > 0 ? (resumo.confirmadas / resumo.totalCargas) * 100 : 0;

    const proximaPendente = cargas
      .filter((carga) => carga.status === "pendente")
      .sort((a, b) => String(a.data_carga).localeCompare(String(b.data_carga)))[0];

    return {
      maiorCarga,
      clienteMaior,
      pesoMedio,
      caixasMedia,
      valorMedioMetrica,
      taxaConfirmacao,
      proximaPendente,
    };
  }, [cargas, dadosClientes, resumo, metricaCargas]);

  const cargasOrdenadas = useMemo(() => {
    const base = cargas.map((carga) => {
      const analiseEstoque = analisarEstoqueCarga(carga, estoquePorCalibre);

      return {
        ...carga,
        caixas: obterCaixasCarga(carga),
        unidades: obterCaixasCarga(carga),
        peso_total: obterPesoCarga(carga),
        calibres_texto: montarTextoCalibres(carga),
        confirmada_texto: carga.status === "confirmada" ? "Sim" : "Nao",
        estoque_status: analiseEstoque.status,
        estoque_texto: analiseEstoque.texto,
        estoque_resumo: analiseEstoque.resumo,
      };
    });

    return ordenarLista(base, ordenacaoTabela);
  }, [cargas, estoquePorCalibre, ordenacaoTabela]);

  const totalPaginasTabela = useMemo(() => {
    return Math.max(Math.ceil(cargasOrdenadas.length / REGISTROS_POR_PAGINA_CARGAS), 1);
  }, [cargasOrdenadas.length]);

  const cargasPaginadas = useMemo(() => {
    const inicio = (paginaTabela - 1) * REGISTROS_POR_PAGINA_CARGAS;
    return cargasOrdenadas.slice(inicio, inicio + REGISTROS_POR_PAGINA_CARGAS);
  }, [cargasOrdenadas, paginaTabela]);

  useEffect(() => {
    if (paginaTabela > totalPaginasTabela) {
      setPaginaTabela(totalPaginasTabela);
    }
  }, [paginaTabela, totalPaginasTabela]);

  useEffect(() => {
    setPaginaTabela(1);
  }, [filtros.dataInicial, filtros.dataFinal, filtros.cliente, filtros.status]);

  async function carregarDados(filtrosAtuais = filtros) {
    try {
      setCarregando(true);
      setErro("");

      const [
        respostaCargas,
        respostaCalibres,
        respostaResponsaveis,
        respostaEstoque,
      ] = await Promise.all([
        supabase
          .from("cargas")
          .select("*")
          .order("data_carga", { ascending: false })
          .order("hora", { ascending: false }),
        supabase
          .from("calibres")
          .select("*")
          .order("ordem", { ascending: true })
          .order("codigo", { ascending: true }),
        supabase
          .from("responsaveis")
          .select("*")
          .order("nome", { ascending: true }),
        supabase
          .from("vw_estoque_area_atual")
          .select("*"),
      ]);

      if (respostaCargas.error) {
        throw new Error(respostaCargas.error.message || "Nao foi possivel carregar cargas.");
      }

      if (respostaCalibres.error) {
        throw new Error(respostaCalibres.error.message || "Nao foi possivel carregar calibres.");
      }

      if (respostaResponsaveis.error) {
        throw new Error(
          respostaResponsaveis.error.message || "Nao foi possivel carregar responsaveis."
        );
      }

      if (respostaEstoque.error) {
        throw new Error(
          respostaEstoque.error.message || "Nao foi possivel carregar o estoque atual."
        );
      }

      const cargasBanco = respostaCargas.data || [];
      const calibresBanco = respostaCalibres.data || [];
      const responsaveisBanco = respostaResponsaveis.data || [];
      const estoqueBanco = respostaEstoque.data || [];
      const cargasIds = cargasBanco.map((carga) => carga.id).filter(Boolean);

      let itensBanco = [];

      if (cargasIds.length > 0) {
        const respostaItens = await supabase
          .from("carga_itens")
          .select("*, areas_fazenda!carga_itens_area_id_fkey(id, nome), calibres(id, codigo, nome, ordem)")
          .in("carga_id", cargasIds);

        if (respostaItens.error) {
          throw new Error(
            respostaItens.error.message || "Nao foi possivel carregar itens das cargas."
          );
        }

        itensBanco = respostaItens.data || [];
      }

      const calibresPorId = new Map(calibresBanco.map((calibre) => [calibre.id, calibre]));
      const responsaveisPorId = new Map(
        responsaveisBanco.map((responsavel) => [responsavel.id, responsavel])
      );

      const itensPorCarga = new Map();

      itensBanco.forEach((item) => {
        const calibre = calibresPorId.get(item.calibre_id);

        const itemNormalizado = {
          ...item,
          quantidade_caixas: numero(item.quantidade_caixas),
          calibre_codigo: calibre?.codigo || "-",
          calibre_nome: calibre?.nome || "-",
          calibre_ordem: numero(calibre?.ordem),
        };

        const lista = itensPorCarga.get(item.carga_id) || [];
        lista.push(itemNormalizado);
        itensPorCarga.set(item.carga_id, lista);
      });

      const todasNormalizadas = cargasBanco.map((carga) =>
        normalizarCarga(carga, itensPorCarga, responsaveisPorId)
      );

      const filtradas = todasNormalizadas.filter((carga) => {
        if (filtrosAtuais.dataInicial && carga.data_carga < filtrosAtuais.dataInicial) {
          return false;
        }

        if (filtrosAtuais.dataFinal && carga.data_carga > filtrosAtuais.dataFinal) {
          return false;
        }

        if (filtrosAtuais.cliente && carga.cliente !== filtrosAtuais.cliente) {
          return false;
        }

        if (filtrosAtuais.status && carga.status !== filtrosAtuais.status) {
          return false;
        }

        return true;
      });

      setTodasCargas(todasNormalizadas);
      setCargas(filtradas);
      setCalibres(calibresBanco.filter((calibre) => calibre.ativo !== false));
      setResponsaveis(responsaveisBanco);
      setEstoqueAtual(estoqueBanco);
    } catch (error) {
      setErro(error.message || "Nao foi possivel carregar a tela de cargas.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados(filtrosIniciais);
  }, []);

  async function aplicarFiltros() {
    await carregarDados(filtros);
  }

  async function limparFiltros() {
    setFiltros(filtrosIniciais);
    await carregarDados(filtrosIniciais);
  }

  function atualizarFormulario(campo, valor) {
    setFormulario((estadoAtual) => ({
      ...estadoAtual,
      [campo]: valor,
    }));
  }

  function atualizarItem(index, campo, valor) {
    setFormulario((estadoAtual) => {
      const itens = estadoAtual.itens.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          [campo]: valor,
        };
      });

      const totalItens = itens.reduce((total, item) => {
        return total + numero(item.quantidade_caixas);
      }, 0);

      return {
        ...estadoAtual,
        itens,
        quantidade_total_caixas: totalItens > 0 ? String(totalItens) : "",
      };
    });
  }

  function adicionarCalibre() {
    setFormulario((estadoAtual) => ({
      ...estadoAtual,
      itens: [...estadoAtual.itens, { calibre_id: "", quantidade_caixas: "" }],
    }));
  }

  function removerCalibre(indice) {
    setFormulario((estadoAtual) => {
      if (estadoAtual.itens.length === 1) {
        return {
          ...estadoAtual,
          itens: [{ calibre_id: "", quantidade_caixas: "" }],
        };
      }

      return {
        ...estadoAtual,
        itens: estadoAtual.itens.filter((_, index) => index !== indice),
      };
    });
  }

  async function obterNumeroDisponivel(registroAtualId = null) {
    const resposta = await supabase.from("cargas").select("id, numero_carga");

    if (resposta.error) {
      throw new Error(resposta.error.message || "Nao foi possivel gerar o numero da carga.");
    }

    const lista = resposta.data || [];
    let proximo = gerarProximoNumeroCarga(lista);
    const numeroAtual = texto(formulario.numero_carga);

    if (numeroAtual) {
      const repetido = lista.some((carga) => {
        return carga.numero_carga === numeroAtual && carga.id !== registroAtualId;
      });

      if (!repetido) return numeroAtual;
    }

    while (
      lista.some((carga) => carga.numero_carga === proximo && carga.id !== registroAtualId)
    ) {
      proximo = gerarProximoNumeroCarga([...lista, { numero_carga: proximo }]);
    }

    return proximo;
  }

  async function abrirNovaCarga() {
    try {
      setErro("");
      setSucesso("");

      const resposta = await supabase.from("cargas").select("numero_carga");

      if (resposta.error) {
        throw new Error(resposta.error.message || "Nao foi possivel gerar o numero da carga.");
      }

      setRegistroEditando(null);
      setFormulario(estadoInicialFormulario(gerarProximoNumeroCarga(resposta.data || [])));
      setModalAberto(true);
    } catch (error) {
      setErro(error.message || "Nao foi possivel abrir nova carga.");
    }
  }

    function abrirEdicao(carga) {
    const quantidadeTotal = numero(
      carga.quantidade_total_caixas ??
        carga.quantidade_total_unidades ??
        carga.quantidade_caixas ??
        0
    );

    const pesoTotal = numero(carga.peso_total_kg);
    const pesoPorUnidade = quantidadeTotal > 0 ? pesoTotal / quantidadeTotal : 0;

    const itensEditaveis =
      Array.isArray(carga.itens) && carga.itens.length > 0
        ? carga.itens.map((item) => ({
            area_id:
              item.area_id ||
              item.area_fazenda_id ||
              carga.area_id ||
              carga.area_fazenda_id ||
              "",
            calibre_id: item.calibre_id || "",
            quantidade_caixas:
              item.quantidade_caixas ??
              item.quantidade_unidades ??
              item.quantidade ??
              "",
          }))
        : [
            {
              area_id: carga.area_id || carga.area_fazenda_id || "",
              calibre_id: "",
              quantidade_caixas: "",
            },
          ];

    setRegistroEditando(carga);

    setFormulario({
      ...estadoInicialFormulario(carga.numero_carga || ""),
      data_carga: carga.data_carga || dataHoje(),
      hora: String(carga.hora || horaAgora()).slice(0, 5),
      numero_carga: carga.numero_carga || "",
      cliente: carga.cliente || "",
      area_id: "",
      numero_pedido: "",
      status: carga.status || "pendente",
      tipo_embalagem: carga.tipo_embalagem || "caixa",
      quantidade_total_caixas: quantidadeTotal || "",
      peso_por_unidade_kg: pesoPorUnidade || "",
      responsavel_id: carga.responsavel_id || "",
      observacao: carga.observacao || "",
      itens: itensEditaveis,
    });

    setErro("");
    setSucesso("");
    setModalAberto(true);
  }


  function fecharModal() {
    if (salvando) return;

    setModalAberto(false);
    setRegistroEditando(null);
    setFormulario(estadoInicialFormulario());
  }

  async function salvarFormulario(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      if (!formularioPodeSalvar) {
        throw new Error("Confira os campos da carga e a divisao por calibre.");
      }

      const numeroCarga = await obterNumeroDisponivel(registroEditando?.id || null);

      const payload = {
        data_carga: formulario.data_carga,
        hora: formulario.hora,
        numero_carga: numeroCarga,
        cliente: texto(formulario.cliente),
        status: formulario.status || "pendente",
        tipo_embalagem: formulario.tipo_embalagem || "caixa",
        quantidade_total_caixas: totalDistribuido,
        peso_total_kg: totalDistribuido * pesoPorCaixaFormulario,
        responsavel_id: formulario.responsavel_id || null,
        observacao: texto(formulario.observacao),
      };

      let cargaId = registroEditando?.id || null;

      if (registroEditando) {
        const respostaUpdate = await supabase
          .from("cargas")
          .update(payload)
          .eq("id", registroEditando.id);

        if (respostaUpdate.error) {
          throw new Error(respostaUpdate.error.message || "Nao foi possivel atualizar a carga.");
        }

        const respostaDeleteItens = await supabase
          .from("carga_itens")
          .delete()
          .eq("carga_id", registroEditando.id);

        if (respostaDeleteItens.error) {
          throw new Error(
            respostaDeleteItens.error.message || "Nao foi possivel atualizar os calibres."
          );
        }
      } else {
        const respostaInsert = await supabase
          .from("cargas")
          .insert(payload)
          .select("id")
          .single();

        if (respostaInsert.error) {
          throw new Error(respostaInsert.error.message || "Nao foi possivel salvar a carga.");
        }

        cargaId = respostaInsert.data.id;
      }

      const itensPayload = formulario.itens.map((item) => ({
      area_id: item.area_id || null,
        carga_id: cargaId,
        calibre_id: item.calibre_id || null,
        quantidade_caixas: numero(item.quantidade_caixas),
      }));

      const respostaItens = await supabase.from("carga_itens").insert(itensPayload);

      if (respostaItens.error) {
        throw new Error(respostaItens.error.message || "Nao foi possivel salvar os calibres.");
      }

      setModalAberto(false);
      setRegistroEditando(null);
      setFormulario(estadoInicialFormulario());
      setSucesso(registroEditando ? "Carga atualizada com sucesso." : "Carga cadastrada com sucesso.");

      await carregarDados(filtros);
    } catch (error) {
      setErro(error.message || "Nao foi possivel salvar a carga.");
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(carga, status) {
    try {
      setErro("");
      setSucesso("");

      const mensagem =
        status === "confirmada"
          ? `Confirmar a carga ${carga.numero_carga || ""}?`
          : status === "cancelada"
            ? `Cancelar a carga ${carga.numero_carga || ""}? Ela deixará de descontar do estoque.`
            : `Voltar a carga ${carga.numero_carga || ""} para pendente?`;

      const confirmado = window.confirm(mensagem);

      if (!confirmado) return;

      if (status === "confirmada") {
        await confirmarCargaComoSaida(carga);
      } else {
        const resposta = await supabase
          .from("cargas")
          .update({
            status,
            confirmada_em: status === "pendente" ? null : carga.confirmada_em || null,
          })
          .eq("id", carga.id);

        if (resposta.error) {
          throw new Error(resposta.error.message || "Não foi possível atualizar o status.");
        }
      }

      setSucesso(
        status === "cancelada"
          ? "Carga cancelada. Ela não desconta mais do estoque."
          : "Status da carga atualizado com sucesso."
      );

      await carregarDados(filtros);
    } catch (error) {
      setErro(error.message || "Não foi possível atualizar o status da carga.");
    }
  }

  async function confirmarExclusao(carga) {
    const confirmar = window.confirm(`Excluir a carga ${carga.numero_carga || ""}?`);

    if (!confirmar) return;

    try {
      setErro("");
      setSucesso("");

      const resposta = await supabase.from("cargas").delete().eq("id", carga.id);

      if (resposta.error) {
        throw new Error(resposta.error.message || "Nao foi possivel excluir a carga.");
      }

      setSucesso("Carga excluida com sucesso.");
      await carregarDados(filtros);
    } catch (error) {
      setErro(error.message || "Nao foi possivel excluir a carga.");
    }
  }

  return (
    <div className="-mt-24 space-y-4 text-[13px]">
      <div className="mb-3 pt-1">
        <h1 className="text-3xl font-medium text-slate-950">Controle de Cargas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Planejamento, acompanhamento e confirmacao das cargas por cliente.
        </p>
      </div>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_1fr_170px] xl:items-end">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Data inicial</span>
            <input
              type="date"
              value={filtros.dataInicial}
              onChange={(event) =>
                setFiltros((estado) => ({ ...estado, dataInicial: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Data final</span>
            <input
              type="date"
              value={filtros.dataFinal}
              onChange={(event) =>
                setFiltros((estado) => ({ ...estado, dataFinal: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Cliente</span>
            <select
              value={filtros.cliente}
              onChange={(event) =>
                setFiltros((estado) => ({ ...estado, cliente: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">Todos os clientes</option>
              {clientesFiltro.map((cliente) => (
                <option key={cliente} value={cliente}>
                  {cliente}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              value={filtros.status}
              onChange={(event) =>
                setFiltros((estado) => ({ ...estado, status: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="confirmada">Confirmada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </label>

            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Visualizar como</span>
              <div className="grid h-11 grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() =>
                    setFiltros((estado) => ({
                      ...estado,
                      metrica: "peso",
                    }))
                  }
                  className={[
                    "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition",
                    metricaCargas === "peso"
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white",
                  ].join(" ")}
                >
                  Peso
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFiltros((estado) => ({
                      ...estado,
                      metrica: "caixas",
                    }))
                  }
                  className={[
                    "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition",
                    metricaCargas === "caixas"
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white",
                  ].join(" ")}
                >
                  Caixas
                </button>
              </div>
            </div>

          <button
            type="button"
            onClick={abrirNovaCarga}
            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Truck size={16} />
              Nova carga
            </span>
          </button>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={limparFiltros}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-2">
              <X size={15} />
              Limpar filtros
            </span>
          </button>

          <button
            type="button"
            onClick={aplicarFiltros}
            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={15} />
              Atualizar
            </span>
          </button>
        </div>
      </section>

      {erro ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <strong>Atencao</strong>
          <p className="mt-1">{erro}</p>
        </div>
      ) : null}

      {sucesso ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          <strong>Sucesso</strong>
          <p className="mt-1">{sucesso}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CardResumo
          titulo="Cargas lancadas"
          valor={formatarNumero(resumo.totalCargas)}
          subtitulo="registros no periodo"
          cor="emerald"
          icone={<Truck size={23} />}
        />

        <CardResumo
          titulo={metricaCargas === "peso" ? "Peso total" : "Caixas totais"}
          valor={formatarMetricaCarga(metricaCargas === "peso" ? resumo.pesoTotal : resumo.caixasTotal, metricaCargas)}
          subtitulo={metricaCargas === "peso" ? formatarNumero(resumo.caixasTotal) + " caixas preparadas" : formatarPeso(resumo.pesoTotal)}
          cor="emerald"
          icone={<Scale size={23} />}
        />

        <CardResumo
          titulo="Confirmadas"
          valor={formatarNumero(resumo.confirmadas)}
          subtitulo="cargas confirmadas"
          cor="emerald"
          icone={<CheckCircle2 size={23} />}
        />

        <CardResumo
          titulo="Pendentes"
          valor={formatarNumero(resumo.pendentes)}
          subtitulo="aguardando confirmacao"
          cor="amber"
          icone={<Hourglass size={23} />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
        
      <GraficoCargasPorAreaCalibre
        cargas={cargas}
        metrica={metricaCargas}
      />


      <GraficoParticipacaoCargasPorCalibre
        cargas={cargas}
        metrica={metricaCargas}
      />

<section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-center text-lg font-medium text-slate-950">
            Cargas planejadas por dia
          </h2>
          <GraficoLinhaCargas dados={dadosLinha} />
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-center text-lg font-medium text-slate-950">
            Destaques do periodo
          </h2>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-[46px_1fr_auto] items-center gap-3 rounded-2xl border border-slate-100 p-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Trophy size={21} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Maior carga</p>
                <strong className="block text-xl font-medium text-slate-950">
                  {destaques.maiorCarga ? formatarMetricaCarga(valorCargaMetrica(destaques.maiorCarga, metricaCargas), metricaCargas) : "-"}
                </strong>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>{destaques.maiorCarga?.numero_carga || "-"}</p>
                <p>{destaques.maiorCarga ? formatarData(destaques.maiorCarga.data_carga) : "-"}</p>
              </div>
            </div>

            <div className="grid grid-cols-[46px_1fr_auto] items-center gap-3 rounded-2xl border border-slate-100 p-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Users size={21} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Cliente com mais cargas</p>
                <strong className="block text-lg font-medium text-slate-950">
                  {destaques.clienteMaior?.cliente || "-"}
                </strong>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>{formatarNumero(destaques.clienteMaior?.cargas || 0)} cargas</p>
                <p>{formatarMetricaCarga(valorClienteMetrica(destaques.clienteMaior, metricaCargas), metricaCargas)}</p>
              </div>
            </div>

            <div className="grid grid-cols-[46px_1fr_auto] items-center gap-3 rounded-2xl border border-slate-100 p-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Scale size={21} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{metricaCargas === "peso" ? "Peso medio por carga" : "Caixas medias por carga"}</p>
                <strong className="block text-lg font-medium text-slate-950">
                  {formatarMetricaCarga(destaques.valorMedioMetrica, metricaCargas)}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-[46px_1fr_auto] items-center gap-3 rounded-2xl border border-slate-100 p-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={21} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Taxa de confirmacao</p>
                <strong className="block text-lg font-medium text-slate-950">
                  {destaques.taxaConfirmacao.toFixed(1)}%
                </strong>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>
                  {formatarNumero(resumo.confirmadas)} de {formatarNumero(resumo.totalCargas)}
                </p>
                <p>confirmadas</p>
              </div>
            </div>

            <div className="grid grid-cols-[46px_1fr] items-center gap-3 rounded-2xl border border-slate-100 p-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <Clock3 size={21} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Proxima carga pendente</p>
                <strong className="block text-lg font-medium text-slate-950">
                  {destaques.proximaPendente
                    ? formatarData(destaques.proximaPendente.data_carga)
                    : "-"}
                </strong>
                <p className="text-xs text-slate-500">
                  {destaques.proximaPendente?.cliente || "Nenhuma pendencia"}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr_1fr]">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-center text-lg font-medium text-slate-950">
            Status das cargas
          </h2>
          <div className="mt-3">
            <GraficoStatus resumo={resumo} />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-center text-lg font-medium text-slate-950">
            Proximas cargas pendentes
          </h2>
          <div className="mt-3">
            <ListaPendentes
              cargas={cargas}
              ordenacao={ordenacaoPendentes}
              setOrdenacao={setOrdenacaoPendentes}
              metrica={metricaCargas}
            />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-center text-lg font-medium text-slate-950">
            Distribuicao por cliente
          </h2>
          <div className="mt-3">
            <GraficoClientes
              dados={dadosClientes}
              ordenacao={ordenacaoClientes}
              setOrdenacao={setOrdenacaoClientes}
              metrica={metricaCargas}
            />
          </div>
        </section>
      </div>
<section className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-medium text-slate-950">Cargas registradas</h2>
            <p className="mt-1 text-sm text-slate-500">
              Historico de cargas lancadas manualmente para controle.
            </p>
          </div>

          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            {formatarNumero(cargas.length)} registros
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3">
                  <BotaoOrdenacao campo="data_carga" ordenacao={ordenacaoTabela} onClick={setOrdenacaoTabela}>
                    Data
                  </BotaoOrdenacao>
                </th>
                <th className="px-4 py-3">
                  <BotaoOrdenacao campo="cliente" ordenacao={ordenacaoTabela} onClick={setOrdenacaoTabela}>
                    Cliente
                  </BotaoOrdenacao>
                </th>
                <th className="px-4 py-3">
                  <BotaoOrdenacao campo="numero_carga" ordenacao={ordenacaoTabela} onClick={setOrdenacaoTabela}>
                    Numero da carga
                  </BotaoOrdenacao>
                </th>
                <th className="px-4 py-3">
                  <BotaoOrdenacao campo="unidades" ordenacao={ordenacaoTabela} onClick={setOrdenacaoTabela} alinhado="right">
                    Caixas
                  </BotaoOrdenacao>
                </th>
                <th className="px-4 py-3">
                  <BotaoOrdenacao campo="peso_total" ordenacao={ordenacaoTabela} onClick={setOrdenacaoTabela} alinhado="right">
                    Peso total
                  </BotaoOrdenacao>
                </th>
                <th className="px-4 py-3">
                  <BotaoOrdenacao campo="calibres_texto" ordenacao={ordenacaoTabela} onClick={setOrdenacaoTabela}>
                    Calibres
                  </BotaoOrdenacao>
                </th>
                <th className="px-4 py-3">
                  <BotaoOrdenacao campo="estoque_texto" ordenacao={ordenacaoTabela} onClick={setOrdenacaoTabela}>
                    Estoque
                  </BotaoOrdenacao>
                </th>
                <th className="px-4 py-3">
                  <BotaoOrdenacao campo="status" ordenacao={ordenacaoTabela} onClick={setOrdenacaoTabela}>
                    Status
                  </BotaoOrdenacao>
                </th>
                <th className="px-4 py-3">
                  <BotaoOrdenacao campo="confirmada_texto" ordenacao={ordenacaoTabela} onClick={setOrdenacaoTabela}>
                    Confirmada?
                  </BotaoOrdenacao>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Acoes
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {carregando ? (
                <tr>
                  <td colSpan="10" className="px-4 py-10 text-center text-slate-400">
                    Carregando cargas...
                  </td>
                </tr>
              ) : cargasOrdenadas.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-10 text-center text-slate-400">
                    Nenhuma carga encontrada.
                  </td>
                </tr>
              ) : (
                cargasPaginadas.map((carga) => (
                  <tr key={carga.id}>
                    <td className="px-4 py-3 text-slate-600">{formatarData(carga.data_carga)}</td>

                    <td className="px-4 py-3 font-medium text-slate-800">{carga.cliente}</td>

                    <td className="px-4 py-3 text-slate-600">{carga.numero_carga || "-"}</td>

                    <td className="px-4 py-3 text-right font-medium text-slate-950">
                      {formatarNumero(carga.quantidade_total_caixas)}
                    </td>

                    <td className="px-4 py-3 text-right font-medium text-slate-950">
                      {formatarPeso(carga.peso_total_kg)}
                    </td>

                    <td className="px-4 py-3 text-slate-600">{montarTextoCalibres(carga)}</td>

                    <td className="px-4 py-3">
                      {carga.status === "pendente" ? (
                        <>
                          <span
                        title={carga.estoque_resumo}
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${classeEstoque(
                          carga.estoque_status
                        )}`}
                      >
                        {carga.estoque_texto}
                      </span>
                      <p className="mt-1 max-w-[180px] truncate text-xs text-slate-400" title={carga.estoque_resumo}>
                        {carga.estoque_resumo}
                      </p>
                        </>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${classeStatus(
                          carga.status
                        )}`}
                      >
                        {textoStatus(carga.status)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                          carga.status === "confirmada"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {carga.status === "confirmada" ? "Sim" : "Nao"}
                      </span>
                    </td>

                    <td className="px-4 py-3 relative z-40 pointer-events-auto">
                      <div className="flex flex-wrap justify-end gap-2">
                        {carga.status === "pendente" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => mudarStatus(carga, "confirmada")}
                              className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                            >
                              Confirmar
                            </button>

                            <button
                              type="button"
                              onClick={() => mudarStatus(carga, "cancelada")}
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : null}

                        {carga.status === "confirmada" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => mudarStatus(carga, "pendente")}
                              className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
                            >
                              Pendente
                            </button>

                            <button
                              type="button"
                              onClick={() => mudarStatus(carga, "cancelada")}
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : null}

                        {carga.status === "cancelada" ? (
                          <button
                            type="button"
                            onClick={() => mudarStatus(carga, "pendente")}
                            className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
                          >
                            Pendente
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            abrirEdicao(carga);
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 relative z-50 pointer-events-auto cursor-pointer"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Edit3 size={13} />
                            Editar
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => confirmarExclusao(carga)}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-700"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Trash2 size={13} />
                            Excluir
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          Mostrando {formatarNumero(cargas.length)} carga(s).
        </p>
      

        <PaginacaoCargas
          paginaAtual={paginaTabela}
          totalPaginas={totalPaginasTabela}
          totalRegistros={cargasOrdenadas.length}
          onChange={setPaginaTabela}
        />
      </section>

      {modalAberto ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-medium text-slate-950">
                  {registroEditando ? "Editar carga" : "Nova carga"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Lance a carga manualmente e divida a quantidade por calibre.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={salvarFormulario} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Data da carga</span>
                  <input
                    type="date"
                    value={formulario.data_carga}
                    onChange={(event) => atualizarFormulario("data_carga", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Hora</span>
                  <input
                    type="time"
                    value={formulario.hora}
                    onChange={(event) => atualizarFormulario("hora", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Numero da carga</span>
                  <input
                    type="text"
                    value={formulario.numero_carga}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                  />
                </label>

                <label className="space-y-2 xl:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Cliente</span>
                  <input
                    type="text"
                    value={formulario.cliente}
                    onChange={(event) => atualizarFormulario("cliente", event.target.value)}
                    placeholder="Digite o nome do cliente"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                


                

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Status</span>
                  <select
                    value={formulario.status}
                    onChange={(event) => atualizarFormulario("status", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">
                    Tipo de embalagem
                  </span>
                  <select
                    value={formulario.tipo_embalagem || "caixa"}
                    onChange={(event) =>
                      atualizarFormulario("tipo_embalagem", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="caixa">Caixa</option>
                    <option value="saco">Saco</option>
                  </select>
                </label>

                


                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">
                    Peso por unidade em kg
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formulario.peso_por_unidade_kg}
                    onChange={(event) =>
                      atualizarFormulario("peso_por_unidade_kg", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Peso total</span>
                  <input
                    type="text"
                    value={formatarPeso(pesoTotalFormulario)}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Responsavel</span>
                  <select
                    value={formulario.responsavel_id}
                    onChange={(event) =>
                      atualizarFormulario("responsavel_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {responsaveis.map((responsavel) => (
                      <option key={responsavel.id} value={responsavel.id}>
                        {responsavel.nome}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <section className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-slate-950">Divisao por calibre</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      A soma dos calibres precisa bater com o total da carga. O estoque abaixo e apenas informativo.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={adicionarCalibre}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    + Adicionar calibre
                  </button>
                </div>

                <div className="space-y-4">
                  {formulario.itens.map((item, index) => {
                    const areaItemId = item.area_id || formulario.area_id || "";
                    const estoque =
                      areaItemId && item.calibre_id
                        ? estoquePorCalibre.get(`${areaItemId}-${item.calibre_id}`)
                        : null;

                    const saldoDisponivel = numero(
                      estoque?.saldo_unidades ??
                        estoque?.saldo_disponivel_caixas ??
                        estoque?.saldo_disponivel_unidades
                    );

                    const quantidadePedida = numero(item.quantidade_caixas);
                    const possuiArea = Boolean(areaItemId);
                    const possuiCalibre = Boolean(item.calibre_id);

                    let mensagemEstoque = "Selecione área e calibre para ver o saldo atual.";
                    let classeMensagemEstoque = "border-blue-200 bg-blue-50 text-blue-700";

                    if ((possuiArea || possuiCalibre) && (!possuiArea || !possuiCalibre)) {
                      mensagemEstoque = "Selecione área e calibre para ver o saldo atual.";
                      classeMensagemEstoque = "border-blue-200 bg-blue-50 text-blue-700";
                    }

                    if (possuiArea && possuiCalibre && saldoDisponivel <= 0) {
                      mensagemEstoque =
                        "Sem saldo nessa Área/Pivô para este calibre. Pode salvar; o estoque ficará negativo.";
                      classeMensagemEstoque = "border-amber-200 bg-amber-50 text-amber-700";
                    }

                    if (possuiArea && possuiCalibre && saldoDisponivel > 0) {
                      mensagemEstoque = `Estoque atual: ${formatarNumero(saldoDisponivel)} unidades.`;
                      classeMensagemEstoque = "border-emerald-200 bg-emerald-50 text-emerald-700";
                    }

                    if (
                      possuiArea &&
                      possuiCalibre &&
                      quantidadePedida > 0 &&
                      saldoDisponivel < quantidadePedida
                    ) {
                      mensagemEstoque = `Aviso: ${formatarNumero(
                        saldoDisponivel
                      )} unidades disponíveis para ${formatarNumero(
                        quantidadePedida
                      )} solicitadas. Pode salvar; o estoque ficará negativo.`;
                      classeMensagemEstoque = "border-amber-200 bg-amber-50 text-amber-700";
                    }

                    return (
                      <div
                        key={index}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="grid gap-4 md:grid-cols-[1fr_180px_130px] md:items-end">
                                                    <label className="space-y-2">
                            <span className="text-sm font-medium text-slate-700">
                              Área / Pivô
                            </span>
                            <select
                              value={item.area_id || ""}
                              onChange={(event) =>
                                atualizarItem(index, "area_id", event.target.value)
                              }
                              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                            >
                              <option value="">Selecione a área</option>
                              {opcoesAreaFormulario.map((area) => (
                                <option key={area.id} value={area.id}>
                                  {area.nome} — saldo {formatarNumero(area.saldo)} unidades
                                </option>
                              ))}
                            </select>
                          </label>

<label className="space-y-2">
                            <span className="text-sm font-medium text-slate-700">
                              Calibre {index + 1}
                            </span>
                            <select
                              value={item.calibre_id}
                              onChange={(event) =>
                                atualizarItem(index, "calibre_id", event.target.value)
                              }
                              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                            >
                              <option value="">Selecione</option>
                              {calibres.map((calibre) => (
                                <option key={calibre.id} value={calibre.id}>
                                  {calibre.codigo} - {calibre.nome}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-2">
                            <span className="text-sm font-medium text-slate-700">
                              Quantidade
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.quantidade_caixas}
                              onChange={(event) =>
                                atualizarItem(index, "quantidade_caixas", event.target.value)
                              }
                              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => removerCalibre(index)}
                            className="inline-flex h-11 w-auto items-center justify-center justify-self-start rounded-xl bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700"
                          >
                            Remover
                          </button>
                        </div>

                        <div className={`mt-3 rounded-xl border px-4 py-2 text-sm ${classeMensagemEstoque}`}>
                          {mensagemEstoque}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-white px-4 py-3">
                    <p className="text-xs font-medium uppercase text-slate-400">Total informado</p>
                    <strong className="mt-1 block text-lg font-medium text-slate-950">
                      {formatarNumero(totalCaixasFormulario)} unidades
                    </strong>
                  </div>

                  <div className="rounded-xl bg-white px-4 py-3">
                    <p className="text-xs font-medium uppercase text-slate-400">Total distribuido</p>
                    <strong className="mt-1 block text-lg font-medium text-slate-950">
                      {formatarNumero(totalDistribuido)} unidades
                    </strong>
                  </div>

                  <div className="rounded-xl bg-white px-4 py-3">
                    <p className="text-xs font-medium uppercase text-slate-400">Diferenca</p>
                    <strong
                      className={`mt-1 block text-lg font-medium ${
                        diferencaDistribuicao === 0 ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {formatarNumero(diferencaDistribuicao)} unidades
                    </strong>
                  </div>
                </div>
              </section>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Observacao</span>
                <textarea
                  value={formulario.observacao}
                  onChange={(event) => atualizarFormulario("observacao", event.target.value)}
                  rows="3"
                  placeholder="Observacoes sobre a carga..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={!formularioPodeSalvar}
                  className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar carga"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
