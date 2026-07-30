import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Boxes,
  CalendarDays,
  Edit3,
  MapPin,
  PackageCheck,
  Plus,
  RefreshCw,
  Scale,
  Trash2,
  TrendingUp,
  Warehouse,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  cadastrarAlhoClassificado,
  cadastrarSaidaAlhoClassificado,
  calcularResumoAlhoClassificado,
  calcularTotalCaixas,
  editarAlhoClassificado,
  editarSaidaAlhoClassificado,
  excluirAlhoClassificado,
  excluirSaidaAlhoClassificado,
  listarAlhoClassificado,
  listarEstoqueAlhoClassificadoAtual,
  listarOpcoesAlhoClassificado,
  listarSaidasAlhoClassificado,
} from "../../services/alhoClassificadoService";

const REGISTROS_POR_PAGINA = 10;
const LIMITE_PONTOS_GRAFICO = 15;

const estadoInicialFiltros = {
  dataInicial: "",
  dataFinal: "",
  fazendaId: "",
  areaId: "",
  calibreId: "",
  status: "",
  responsavelId: "",
};

function dataHoje() {
  return new Date().toISOString().slice(0, 10);
}

function horaAgora() {
  return new Date().toTimeString().slice(0, 5);
}

function estadoInicialEntrada() {
  return {
    data_classificacao: dataHoje(),
    hora: horaAgora(),
    fazenda_id: "",
    area_fazenda_id: "",
    lote: "",
    calibre_id: "",
    quantidade_paletes: "",
    caixas_por_palete: "",
    permitir_edicao_total_caixas: false,
    total_caixas_manual: "",
    conferido: true,
    responsavel_id: "",
    observacao: "",
  };
}

function estadoInicialSaida() {
  return {
    data_saida: dataHoje(),
    hora: horaAgora(),
    area_fazenda_id: "",
    calibre_id: "",
    quantidade_caixas: "",
    responsavel_id: "",
    observacao: "",
  };
}

function numero(valor) {
  const convertido = Number(valor);

  if (!Number.isFinite(convertido)) {
    return 0;
  }

  return convertido;
}

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function formatarNumeroCompacto(valor) {
  const numeroTratado = numero(valor);

  if (Math.abs(numeroTratado) >= 1000) {
    return `${(numeroTratado / 1000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })}k`;
  }

  return numeroTratado.toLocaleString("pt-BR");
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

function classeBadgeStatus(status) {
  if (status === "sem_saldo") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (status === "pendente") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function obterSaldoClassificado(item) {
  const saldoInformado =
    item?.saldo_classificado_caixas ??
    item?.saldo_disponivel_caixas ??
    item?.saldo_caixas;

  if (
    saldoInformado !== null &&
    saldoInformado !== undefined &&
    saldoInformado !== ""
  ) {
    return Math.max(numero(saldoInformado), 0);
  }

  const entradas = numero(
    item?.entrada_classificado_caixas ||
      item?.classificado_caixas ||
      item?.entradas ||
      item?.total_entradas
  );

  const saidas = numero(
    item?.saida_classificado_caixas ||
      item?.saidas_classificado_caixas ||
      item?.saidas ||
      item?.total_saidas
  );

  return Math.max(entradas - saidas, 0);
}

function obterEntradaClassificada(item) {
  return numero(item?.entrada_classificado_caixas || item?.classificado_caixas);
}

function obterSaidaClassificada(item) {
  return numero(item?.saida_classificado_caixas || item?.saidas_classificado_caixas);
}

function normalizarTextoOrdenacao(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function obterValorOrdenacaoEntrada(registro, campo) {
  if (campo === "data") return registro.data_classificacao || "";
  if (campo === "fazenda") return normalizarTextoOrdenacao(registro.fazenda_nome);
  if (campo === "area") return normalizarTextoOrdenacao(registro.area_nome);
  if (campo === "lote") return normalizarTextoOrdenacao(registro.lote);
  if (campo === "calibre") {
    return `${String(numero(registro.calibre_ordem)).padStart(6, "0")}-${
      registro.calibre_codigo || ""
    }`;
  }
  if (campo === "paletes") return numero(registro.quantidade_paletes);
  if (campo === "caixas") return numero(registro.total_caixas_calculado);
  if (campo === "responsavel") return normalizarTextoOrdenacao(registro.responsavel_nome);
  if (campo === "status") return normalizarTextoOrdenacao(registro.status_texto);

  return "";
}

function obterValorOrdenacaoSaida(registro, campo) {
  if (campo === "data") return registro.data_saida || "";
  if (campo === "area") return normalizarTextoOrdenacao(registro.area_nome);
  if (campo === "calibre") {
    return `${String(numero(registro.calibre_ordem)).padStart(6, "0")}-${
      registro.calibre_codigo || ""
    }`;
  }
  if (campo === "caixas") return numero(registro.quantidade_caixas);
  if (campo === "responsavel") return normalizarTextoOrdenacao(registro.responsavel_nome);
  if (campo === "observacao") return normalizarTextoOrdenacao(registro.observacao);

  return "";
}

function obterValorOrdenacaoEstoque(registro, campo) {
  if (campo === "area") return normalizarTextoOrdenacao(registro.area_nome);
  if (campo === "calibre") {
    return `${String(numero(registro.calibre_ordem)).padStart(6, "0")}-${
      registro.calibre_codigo || ""
    }`;
  }
  if (campo === "entradas") return obterEntradaClassificada(registro);
  if (campo === "saidas") return obterSaidaClassificada(registro);
  if (campo === "saldo") return obterSaldoClassificado(registro);
  if (campo === "status") return normalizarTextoOrdenacao(registro.status_classificado);

  return "";
}

function ordenarRegistros(lista, ordenacao, tipo) {
  const obterValor = {
    entrada: obterValorOrdenacaoEntrada,
    saida: obterValorOrdenacaoSaida,
    estoque: obterValorOrdenacaoEstoque,
  }[tipo];

  return [...lista].sort((a, b) => {
    const valorA = obterValor(a, ordenacao.campo);
    const valorB = obterValor(b, ordenacao.campo);

    if (typeof valorA === "number" && typeof valorB === "number") {
      return ordenacao.direcao === "asc" ? valorA - valorB : valorB - valorA;
    }

    const comparacao = String(valorA).localeCompare(String(valorB), "pt-BR", {
      numeric: true,
    });

    return ordenacao.direcao === "asc" ? comparacao : comparacao * -1;
  });
}

function calcularTotalPaginas(totalRegistros) {
  return Math.max(Math.ceil(totalRegistros / REGISTROS_POR_PAGINA), 1);
}

function paginarRegistros(lista, paginaAtual) {
  const inicio = (paginaAtual - 1) * REGISTROS_POR_PAGINA;
  const fim = inicio + REGISTROS_POR_PAGINA;

  return lista.slice(inicio, fim);
}

function BotaoOrdenacao({ children, campo, ordenacao, onClick, align = "left" }) {
  const ativo = ordenacao.campo === campo;
  const icone = ativo ? (ordenacao.direcao === "asc" ? "↑" : "↓") : "↕";

  return (
    <button
      type="button"
      onClick={() => onClick(campo)}
      className={`inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide transition hover:text-emerald-700 ${
        align === "right" ? "ml-auto justify-end text-right" : "justify-start text-left"
      } ${ativo ? "text-emerald-700" : "text-slate-500"}`}
    >
      <span>{children}</span>
      <span className="text-[10px]">{icone}</span>
    </button>
  );
}

function Paginacao({ paginaAtual, totalPaginas, totalRegistros, onChange }) {
  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 text-xs md:flex-row md:items-center md:justify-between">
      <p className="text-slate-500">
        {REGISTROS_POR_PAGINA} registros por página • {formatarNumero(totalRegistros)}{" "}
        registro(s)
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={paginaAtual <= 1}
          onClick={() => onChange(paginaAtual - 1)}
          className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ‹
        </button>

        <span className="rounded-lg bg-emerald-700 px-3 py-2 font-medium text-white">
          {paginaAtual}
        </span>

        <span className="text-slate-400">de {totalPaginas}</span>

        <button
          type="button"
          disabled={paginaAtual >= totalPaginas}
          onClick={() => onChange(paginaAtual + 1)}
          className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function EmptyChart({ texto = "Sem dados para exibir." }) {
  return (
    <div className="flex h-full min-h-[230px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
      {texto}
    </div>
  );
}


function GraficoMovimentoDiario({ dados = [] }) {
  if (!dados.length) {
    return <EmptyChart />;
  }

  const largura = 1000;
  const altura = 330;
  const topo = 34;
  const direita = 34;
  const baixo = 54;
  const esquerda = 34;
  const areaLargura = largura - esquerda - direita;
  const areaAltura = altura - topo - baixo;

  const maiorValor = Math.max(
    1,
    ...dados.map((item) => Math.max(numero(item.entradas), numero(item.saidas)))
  );

  const obterX = (indice) => {
    if (dados.length === 1) return esquerda + areaLargura / 2;
    return esquerda + (indice / (dados.length - 1)) * areaLargura;
  };

  const obterY = (valor) => topo + areaAltura - (numero(valor) / maiorValor) * areaAltura;

  const pontosEntrada = dados
    .map((item, indice) => `${obterX(indice)},${obterY(item.entradas)}`)
    .join(" ");

  const pontosSaida = dados
    .map((item, indice) => `${obterX(indice)},${obterY(item.saidas)}`)
    .join(" ");

  const areaEntrada = [
    `${esquerda},${topo + areaAltura}`,
    pontosEntrada,
    `${esquerda + areaLargura},${topo + areaAltura}`,
  ].join(" ");

  return (
    <div className="h-[340px] w-full">
      <svg viewBox={`0 0 ${largura} ${altura}`} className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="graficoAlhoClassificadoEntrada" x1="0" y1="0" x2="0" y2="1">
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

        <polygon points={areaEntrada} fill="url(#graficoAlhoClassificadoEntrada)" />

        <polyline
          points={pontosEntrada}
          fill="none"
          stroke="#047857"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <polyline
          points={pontosSaida}
          fill="none"
          stroke="#DC2626"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {dados.map((item, indice) => {
          const x = obterX(indice);
          const yEntrada = obterY(item.entradas);
          const ySaida = obterY(item.saidas);

          return (
            <g key={item.data || indice}>
              <circle cx={x} cy={yEntrada} r="7" fill="#047857" stroke="#FFFFFF" strokeWidth="4" />
              <text
                x={x}
                y={yEntrada - 16}
                textAnchor="middle"
                fontSize="18"
                fontWeight="600"
                fill="#0F172A"
              >
                {formatarNumero(item.entradas)}
              </text>

              {numero(item.saidas) > 0 ? (
                <>
                  <circle cx={x} cy={ySaida} r="7" fill="#DC2626" stroke="#FFFFFF" strokeWidth="4" />
                  <text
                    x={x}
                    y={ySaida + 28}
                    textAnchor="middle"
                    fontSize="16"
                    fontWeight="600"
                    fill="#DC2626"
                  >
                    {formatarNumero(item.saidas)}
                  </text>
                </>
              ) : null}

              <text
                x={x}
                y={altura - 14}
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

      <div className="mt-1 flex justify-center gap-5 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-700" />
          Entradas
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-600" />
          Saídas
        </span>
      </div>
    </div>
  );
}

function GraficoBarrasHorizontais({ dados = [], dataKey = "saldo", sufixo = "caixas" }) {
  if (!dados.length) {
    return <EmptyChart />;
  }

  const maiorValor = Math.max(1, ...dados.map((item) => numero(item[dataKey])));

  return (
    <div className="space-y-5 py-2">
      {dados.map((item) => {
        const valor = numero(item[dataKey]);
        const larguraBarra = Math.max((valor / maiorValor) * 100, 2);

        return (
          <div key={item.nome} className="grid grid-cols-[92px_1fr_92px] items-center gap-3">
            <span className="truncate text-sm font-medium text-slate-700">{item.nome}</span>

            <div className="h-5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-700"
                style={{ width: `${larguraBarra}%` }}
              />
            </div>

            <span className="text-right text-sm font-semibold text-slate-950">
              {formatarNumero(valor)} {sufixo}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function GraficoBarrasVerticais({ dados = [], dataKey = "saldo", sufixo = "caixas" }) {
  if (!dados.length) {
    return <EmptyChart />;
  }

  const maiorValor = Math.max(1, ...dados.map((item) => numero(item[dataKey])));

  return (
    <div className="flex h-[280px] items-end gap-4 overflow-x-auto px-2 pb-2 pt-8">
      {dados.map((item) => {
        const valor = numero(item[dataKey]);
        const alturaBarra = Math.max((valor / maiorValor) * 210, 18);

        return (
          <div key={item.nome} className="flex min-w-[72px] flex-1 flex-col items-center justify-end gap-2">
            <span className="text-sm font-semibold text-slate-950">
              {formatarNumero(valor)}
            </span>

            <div
              className="w-full max-w-[54px] rounded-t-2xl bg-emerald-700"
              style={{ height: `${alturaBarra}px` }}
            />

            <span className="text-center text-sm font-medium text-slate-600">
              {item.nome}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TooltipGrafico({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-slate-900">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <p key={item.dataKey} className="flex items-center gap-2 text-slate-600">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.name}:</span>
            <span className="font-medium text-slate-900">
              {formatarNumero(item.value)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ titulo, valor, subtitulo, icon: Icon, tone = "green" }) {
  const estilos = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="flex min-h-[92px] items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          estilos[tone] || estilos.green
        }`}
      >
        <Icon size={24} strokeWidth={2} />
      </div>

      <div>
        <p className="text-sm font-medium text-slate-500">{titulo}</p>
        <strong className="mt-1 block text-2xl font-semibold tracking-tight text-slate-950">
          {valor}
        </strong>
        <p className="mt-1 text-xs text-slate-500">{subtitulo}</p>
      </div>
    </div>
  );
}

function DestaqueItem({ icon: Icon, rotulo, valor, detalhe, tone = "green" }) {
  const estilos = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="flex items-start gap-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          estilos[tone] || estilos.green
        }`}
      >
        <Icon size={22} strokeWidth={2} />
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500">{rotulo}</p>
        <strong className="mt-1 block text-xl font-semibold text-slate-950">{valor}</strong>
        <p className="mt-1 text-xs text-slate-500">{detalhe}</p>
      </div>
    </div>
  );
}

function MiniIndicador({ icon: Icon, valor, texto, tone = "blue" }) {
  const estilos = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          estilos[tone] || estilos.blue
        }`}
      >
        <Icon size={22} strokeWidth={2} />
      </div>

      <div>
        <strong className="block text-2xl font-semibold text-slate-950">{valor}</strong>
        <p className="mt-1 text-xs text-slate-500">{texto}</p>
      </div>
    </div>
  );
}

function ChartCard({ titulo, children, className = "" }) {
  return (
    <section className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 ${className}`}>
      <h2 className="text-base font-semibold text-slate-950">{titulo}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function AlhoClassificado() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [entradas, setEntradas] = useState([]);
  const [saidas, setSaidas] = useState([]);
  const [estoqueClassificado, setEstoqueClassificado] = useState([]);

  const [fazendas, setFazendas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [calibres, setCalibres] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);

  const [filtros, setFiltros] = useState(estadoInicialFiltros);

  const [paginaEstoque, setPaginaEstoque] = useState(1);
  const [paginaEntradas, setPaginaEntradas] = useState(1);
  const [paginaSaidas, setPaginaSaidas] = useState(1);

  const [ordenacaoEstoque, setOrdenacaoEstoque] = useState({
    campo: "saldo",
    direcao: "desc",
  });

  const [ordenacaoEntradas, setOrdenacaoEntradas] = useState({
    campo: "data",
    direcao: "desc",
  });

  const [ordenacaoSaidas, setOrdenacaoSaidas] = useState({
    campo: "data",
    direcao: "desc",
  });

  const [modalAberto, setModalAberto] = useState(false);
  const [modalTipo, setModalTipo] = useState("entrada");
  const [registroEditando, setRegistroEditando] = useState(null);

  const [formularioEntrada, setFormularioEntrada] = useState(estadoInicialEntrada());
  const [formularioSaida, setFormularioSaida] = useState(estadoInicialSaida());

  const resumo = useMemo(
    () => calcularResumoAlhoClassificado(entradas, saidas),
    [entradas, saidas]
  );

  const estoqueOrdenado = useMemo(() => {
    return ordenarRegistros(estoqueClassificado, ordenacaoEstoque, "estoque");
  }, [estoqueClassificado, ordenacaoEstoque]);

  const entradasOrdenadas = useMemo(() => {
    return ordenarRegistros(entradas, ordenacaoEntradas, "entrada");
  }, [entradas, ordenacaoEntradas]);

  const saidasOrdenadas = useMemo(() => {
    return ordenarRegistros(saidas, ordenacaoSaidas, "saida");
  }, [saidas, ordenacaoSaidas]);

  const totalPaginasEstoque = useMemo(() => {
    return calcularTotalPaginas(estoqueOrdenado.length);
  }, [estoqueOrdenado.length]);

  const totalPaginasEntradas = useMemo(() => {
    return calcularTotalPaginas(entradasOrdenadas.length);
  }, [entradasOrdenadas.length]);

  const totalPaginasSaidas = useMemo(() => {
    return calcularTotalPaginas(saidasOrdenadas.length);
  }, [saidasOrdenadas.length]);

  const estoquePaginado = useMemo(() => {
    return paginarRegistros(estoqueOrdenado, paginaEstoque);
  }, [estoqueOrdenado, paginaEstoque]);

  const entradasPaginadas = useMemo(() => {
    return paginarRegistros(entradasOrdenadas, paginaEntradas);
  }, [entradasOrdenadas, paginaEntradas]);

  const saidasPaginadas = useMemo(() => {
    return paginarRegistros(saidasOrdenadas, paginaSaidas);
  }, [saidasOrdenadas, paginaSaidas]);

  const areasAtivas = useMemo(() => {
    return areas.filter((area) => area.ativo !== false);
  }, [areas]);

  const areasEntradaFormulario = useMemo(() => {
    if (!formularioEntrada.fazenda_id) {
      return areasAtivas;
    }

    const areasDaFazenda = areasAtivas.filter((area) => {
      return area.fazenda_id === formularioEntrada.fazenda_id;
    });

    if (areasDaFazenda.length > 0) {
      return areasDaFazenda;
    }

    return areasAtivas;
  }, [areasAtivas, formularioEntrada.fazenda_id]);

  const areasDosFiltros = useMemo(() => {
    if (!filtros.fazendaId) {
      return areasAtivas;
    }

    const areasDaFazenda = areasAtivas.filter((area) => {
      return area.fazenda_id === filtros.fazendaId;
    });

    if (areasDaFazenda.length > 0) {
      return areasDaFazenda;
    }

    return areasAtivas;
  }, [areasAtivas, filtros.fazendaId]);

  const totalFormularioEntrada = useMemo(() => {
    return calcularTotalCaixas(formularioEntrada);
  }, [formularioEntrada]);

  const estoqueComSaldo = useMemo(() => {
    return estoqueClassificado.filter((item) => obterSaldoClassificado(item) > 0);
  }, [estoqueClassificado]);

  const areasSaidaFormulario = useMemo(() => {
    const mapa = new Map();

    estoqueComSaldo.forEach((item) => {
      const areaId = item.area_id || item.area_fazenda_id;

      if (!areaId) return;

      if (!mapa.has(areaId)) {
        mapa.set(areaId, {
          id: areaId,
          nome: item.area_nome || "Área sem nome",
          saldo: 0,
        });
      }

      const atual = mapa.get(areaId);
      atual.saldo += obterSaldoClassificado(item);

      mapa.set(areaId, atual);
    });

    if (modalTipo === "saida" && registroEditando) {
      const areaId = registroEditando.area_fazenda_id || registroEditando.area_id;

      if (areaId && !mapa.has(areaId)) {
        mapa.set(areaId, {
          id: areaId,
          nome: registroEditando.area_nome || "Área sem nome",
          saldo: numero(registroEditando.quantidade_caixas),
        });
      }
    }

    return Array.from(mapa.values()).sort((a, b) =>
      String(a.nome).localeCompare(String(b.nome), "pt-BR")
    );
  }, [estoqueComSaldo, modalTipo, registroEditando]);

  const calibresSaidaFormulario = useMemo(() => {
    if (!formularioSaida.area_fazenda_id) {
      return [];
    }

    const lista = estoqueComSaldo.filter((item) => {
      const areaId = item.area_id || item.area_fazenda_id;
      return areaId === formularioSaida.area_fazenda_id;
    });

    const jaExiste = lista.some((item) => item.calibre_id === formularioSaida.calibre_id);

    if (
      modalTipo === "saida" &&
      registroEditando &&
      formularioSaida.calibre_id &&
      !jaExiste
    ) {
      lista.push({
        area_id: formularioSaida.area_fazenda_id,
        area_fazenda_id: formularioSaida.area_fazenda_id,
        calibre_id: formularioSaida.calibre_id,
        calibre_codigo: registroEditando.calibre_codigo || "-",
        calibre_nome: registroEditando.calibre_nome || "-",
        calibre_ordem: registroEditando.calibre_ordem || 0,
        saldo_classificado_caixas: numero(registroEditando.quantidade_caixas),
      });
    }

    return lista.sort((a, b) => {
      const ordemA = numero(a.calibre_ordem);
      const ordemB = numero(b.calibre_ordem);

      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }

      return String(a.calibre_codigo || "").localeCompare(
        String(b.calibre_codigo || ""),
        "pt-BR"
      );
    });
  }, [
    estoqueComSaldo,
    formularioSaida.area_fazenda_id,
    formularioSaida.calibre_id,
    modalTipo,
    registroEditando,
  ]);

  const estoqueSaidaSelecionado = useMemo(() => {
    if (!formularioSaida.area_fazenda_id || !formularioSaida.calibre_id) {
      return null;
    }

    return (
      estoqueClassificado.find((item) => {
        const areaId = item.area_id || item.area_fazenda_id;
        return (
          areaId === formularioSaida.area_fazenda_id &&
          item.calibre_id === formularioSaida.calibre_id
        );
      }) || null
    );
  }, [estoqueClassificado, formularioSaida.area_fazenda_id, formularioSaida.calibre_id]);

  const devolucaoSaidaEdicao = useMemo(() => {
    if (modalTipo !== "saida" || !registroEditando) {
      return 0;
    }

    const mesmaArea =
      (registroEditando.area_fazenda_id || registroEditando.area_id) ===
      formularioSaida.area_fazenda_id;

    const mesmoCalibre = registroEditando.calibre_id === formularioSaida.calibre_id;

    if (!mesmaArea || !mesmoCalibre) {
      return 0;
    }

    return numero(registroEditando.quantidade_caixas);
  }, [
    modalTipo,
    registroEditando,
    formularioSaida.area_fazenda_id,
    formularioSaida.calibre_id,
  ]);

  const saldoSaidaSelecionado = useMemo(() => {
    return obterSaldoClassificado(estoqueSaidaSelecionado) + devolucaoSaidaEdicao;
  }, [estoqueSaidaSelecionado, devolucaoSaidaEdicao]);

  const quantidadeSaidaDigitada = useMemo(() => {
    return numero(formularioSaida.quantidade_caixas);
  }, [formularioSaida.quantidade_caixas]);

  const mensagemSaldoSaida = useMemo(() => {
    if (!formularioSaida.area_fazenda_id || !formularioSaida.calibre_id) {
      return {
        tipo: "neutro",
        texto: "Selecione uma Área/Pivô e um calibre para ver o saldo disponível.",
      };
    }

    if (saldoSaidaSelecionado <= 0) {
      return {
        tipo: "erro",
        texto: "Não existe saldo disponível para esta Área/Pivô e este calibre.",
      };
    }

    if (quantidadeSaidaDigitada > saldoSaidaSelecionado) {
      return {
        tipo: "erro",
        texto: `Quantidade maior que o saldo disponível. Disponível: ${formatarNumero(
          saldoSaidaSelecionado
        )} caixas.`,
      };
    }

    return {
      tipo: "ok",
      texto: `Saldo disponível no Alho Classificado: ${formatarNumero(
        saldoSaidaSelecionado
      )} caixas.`,
    };
  }, [
    formularioSaida.area_fazenda_id,
    formularioSaida.calibre_id,
    saldoSaidaSelecionado,
    quantidadeSaidaDigitada,
  ]);

  const formularioSaidaPodeSalvar = useMemo(() => {
    if (salvando) return false;
    if (!formularioSaida.data_saida) return false;
    if (!formularioSaida.hora) return false;
    if (!formularioSaida.area_fazenda_id) return false;
    if (!formularioSaida.calibre_id) return false;
    if (!formularioSaida.responsavel_id) return false;
    if (quantidadeSaidaDigitada <= 0) return false;
    if (quantidadeSaidaDigitada > saldoSaidaSelecionado) return false;

    return true;
  }, [salvando, formularioSaida, quantidadeSaidaDigitada, saldoSaidaSelecionado]);

  const movimentoDiarioCompleto = useMemo(() => {
    const mapa = new Map();

    entradas.forEach((item) => {
      const data = item.data_classificacao;
      if (!data) return;

      if (!mapa.has(data)) {
        mapa.set(data, {
          data,
          label: formatarDataCurta(data),
          entradas: 0,
          saidas: 0,
        });
      }

      const atual = mapa.get(data);
      atual.entradas += calcularTotalCaixas(item);
      mapa.set(data, atual);
    });

    saidas.forEach((item) => {
      const data = item.data_saida;
      if (!data) return;

      if (!mapa.has(data)) {
        mapa.set(data, {
          data,
          label: formatarDataCurta(data),
          entradas: 0,
          saidas: 0,
        });
      }

      const atual = mapa.get(data);
      atual.saidas += numero(item.quantidade_caixas);
      mapa.set(data, atual);
    });

    return Array.from(mapa.values()).sort((a, b) => a.data.localeCompare(b.data));
  }, [entradas, saidas]);

  const movimentoDiarioGrafico = useMemo(() => {
    if (filtros.dataInicial || filtros.dataFinal) {
      return movimentoDiarioCompleto;
    }

    if (movimentoDiarioCompleto.length <= LIMITE_PONTOS_GRAFICO) {
      return movimentoDiarioCompleto;
    }

    return movimentoDiarioCompleto.slice(-LIMITE_PONTOS_GRAFICO);
  }, [movimentoDiarioCompleto, filtros.dataInicial, filtros.dataFinal]);

  const saldoPorArea = useMemo(() => {
    const mapa = new Map();

    estoqueClassificado.forEach((item) => {
      const areaId = item.area_id || item.area_fazenda_id || item.area_nome || "sem-area";
      const saldoDisponivel = obterSaldoClassificado(item);

      if (!areaId || saldoDisponivel <= 0) return;

      const atual = mapa.get(areaId) || {
        id: areaId,
        nome: item.area_nome || "Área sem nome",
        saldo: 0,
        valor: 0,
        total: 0,
        total_caixas: 0,
        quantidade_caixas: 0,
        saldo_classificado_caixas: 0,
      };

      atual.saldo += saldoDisponivel;
      atual.valor = atual.saldo;
      atual.total = atual.saldo;
      atual.total_caixas = atual.saldo;
      atual.quantidade_caixas = atual.saldo;
      atual.saldo_classificado_caixas = atual.saldo;

      mapa.set(areaId, atual);
    });

    return Array.from(mapa.values()).sort((a, b) => {
      return numero(b.saldo) - numero(a.saldo);
    });
  }, [estoqueClassificado]);

  const saldoPorCalibre = useMemo(() => {
    const mapa = new Map();

    estoqueClassificado.forEach((item) => {
      const calibreId = item.calibre_id || item.calibre_codigo || "sem-calibre";
      const saldoDisponivel = obterSaldoClassificado(item);

      if (!calibreId || saldoDisponivel <= 0) return;

      const atual = mapa.get(calibreId) || {
        id: calibreId,
        calibre_id: calibreId,
        codigo: item.calibre_codigo || "-",
        nome: item.calibre_codigo || item.calibre_nome || "Sem calibre",
        descricao: item.calibre_nome || "",
        ordem: numero(item.calibre_ordem),
        saldo: 0,
        valor: 0,
        total: 0,
        total_caixas: 0,
        quantidade_caixas: 0,
        saldo_classificado_caixas: 0,
      };

      atual.saldo += saldoDisponivel;
      atual.valor = atual.saldo;
      atual.total = atual.saldo;
      atual.total_caixas = atual.saldo;
      atual.quantidade_caixas = atual.saldo;
      atual.saldo_classificado_caixas = atual.saldo;

      mapa.set(calibreId, atual);
    });

    return Array.from(mapa.values()).sort((a, b) => {
      if (numero(b.saldo) !== numero(a.saldo)) {
        return numero(b.saldo) - numero(a.saldo);
      }

      return numero(a.ordem) - numero(b.ordem);
    });
  }, [estoqueClassificado]);

  const destaques = useMemo(() => {
    const maiorEntrada = entradas.reduce((maior, item) => {
      return calcularTotalCaixas(item) > calcularTotalCaixas(maior || {})
        ? item
        : maior;
    }, null);

    const maiorSaida = saidas.reduce((maior, item) => {
      return numero(item.quantidade_caixas) > numero(maior?.quantidade_caixas)
        ? item
        : maior;
    }, null);

    const maiorAreaSaldo = saldoPorArea[0] || null;
    const maiorCalibreSaldo = saldoPorCalibre[0] || null;

    const mediaPorLancamento =
      entradas.length > 0 ? Math.round(resumo.totalEntradas / entradas.length) : 0;

    return {
      maiorEntrada,
      maiorSaida,
      maiorAreaSaldo,
      maiorCalibreSaldo,
      mediaPorLancamento,
    };
  }, [entradas, saidas, resumo.totalEntradas, saldoPorArea, saldoPorCalibre]);

  const indicadoresApoio = useMemo(() => {
    const combinacoesComSaldo = estoqueClassificado.filter((item) => {
      return obterSaldoClassificado(item) > 0;
    }).length;

    const diasComMovimentacao = movimentoDiarioCompleto.filter((item) => {
      return item.entradas > 0 || item.saidas > 0;
    }).length;

    const mediaSaldoPorCalibre =
      saldoPorCalibre.length > 0
        ? Math.round(
            saldoPorCalibre.reduce((total, item) => total + numero(item.saldo), 0) /
              saldoPorCalibre.length
          )
        : 0;

    return {
      combinacoesComSaldo,
      diasComMovimentacao,
      mediaSaldoPorCalibre,
    };
  }, [estoqueClassificado, movimentoDiarioCompleto, saldoPorCalibre]);

  useEffect(() => {
    if (paginaEstoque > totalPaginasEstoque) {
      setPaginaEstoque(totalPaginasEstoque);
    }
  }, [paginaEstoque, totalPaginasEstoque]);

  useEffect(() => {
    if (paginaEntradas > totalPaginasEntradas) {
      setPaginaEntradas(totalPaginasEntradas);
    }
  }, [paginaEntradas, totalPaginasEntradas]);

  useEffect(() => {
    if (paginaSaidas > totalPaginasSaidas) {
      setPaginaSaidas(totalPaginasSaidas);
    }
  }, [paginaSaidas, totalPaginasSaidas]);

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");

      const [opcoes, listaEntradas, listaSaidas, listaEstoque] = await Promise.all([
        listarOpcoesAlhoClassificado(),
        listarAlhoClassificado(filtros),
        listarSaidasAlhoClassificado(filtros),
        listarEstoqueAlhoClassificadoAtual(filtros),
      ]);

      setFazendas(opcoes.fazendas || []);
      setAreas(opcoes.areas || []);
      setCalibres(opcoes.calibres || []);
      setResponsaveis(opcoes.responsaveis || []);

      setEntradas(listaEntradas || []);
      setSaidas(listaSaidas || []);
      setEstoqueClassificado(listaEstoque || []);

      setPaginaEstoque(1);
      setPaginaEntradas(1);
      setPaginaSaidas(1);
    } catch (error) {
      setErro(error.message || "Não foi possível carregar alho classificado.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function aplicarFiltros() {
    setPaginaEstoque(1);
    setPaginaEntradas(1);
    setPaginaSaidas(1);
    await carregarDados();
  }

  async function limparFiltros() {
    setFiltros(estadoInicialFiltros);
    setPaginaEstoque(1);
    setPaginaEntradas(1);
    setPaginaSaidas(1);

    setTimeout(() => {
      carregarDados();
    }, 0);
  }

  function alternarOrdenacaoEstoque(campo) {
    setPaginaEstoque(1);

    setOrdenacaoEstoque((estadoAtual) => {
      if (estadoAtual.campo === campo) {
        return {
          campo,
          direcao: estadoAtual.direcao === "asc" ? "desc" : "asc",
        };
      }

      return {
        campo,
        direcao: ["entradas", "saidas", "saldo"].includes(campo) ? "desc" : "asc",
      };
    });
  }

  function alternarOrdenacaoEntradas(campo) {
    setPaginaEntradas(1);

    setOrdenacaoEntradas((estadoAtual) => {
      if (estadoAtual.campo === campo) {
        return {
          campo,
          direcao: estadoAtual.direcao === "asc" ? "desc" : "asc",
        };
      }

      return {
        campo,
        direcao: campo === "data" ? "desc" : "asc",
      };
    });
  }

  function alternarOrdenacaoSaidas(campo) {
    setPaginaSaidas(1);

    setOrdenacaoSaidas((estadoAtual) => {
      if (estadoAtual.campo === campo) {
        return {
          campo,
          direcao: estadoAtual.direcao === "asc" ? "desc" : "asc",
        };
      }

      return {
        campo,
        direcao: campo === "data" ? "desc" : "asc",
      };
    });
  }

  function abrirNovaEntrada() {
    setModalTipo("entrada");
    setRegistroEditando(null);
    setFormularioEntrada(estadoInicialEntrada());
    setErro("");
    setSucesso("");
    setModalAberto(true);
  }

  function abrirNovaSaida() {
    setModalTipo("saida");
    setRegistroEditando(null);
    setFormularioSaida(estadoInicialSaida());
    setErro("");
    setSucesso("");
    setModalAberto(true);
  }

  function abrirEdicaoEntrada(registro) {
    setModalTipo("entrada");
    setRegistroEditando(registro);

    setFormularioEntrada({
      data_classificacao: registro.data_classificacao || dataHoje(),
      hora: registro.hora || horaAgora(),
      fazenda_id: registro.fazenda_id || "",
      area_fazenda_id: registro.area_fazenda_id || registro.area_id || "",
      lote: registro.lote || "",
      calibre_id: registro.calibre_id || "",
      quantidade_paletes: registro.quantidade_paletes || "",
      caixas_por_palete: registro.caixas_por_palete || "",
      permitir_edicao_total_caixas: Boolean(registro.permitir_edicao_total_caixas),
      total_caixas_manual: registro.total_caixas_manual || "",
      conferido: Boolean(registro.conferido),
      responsavel_id: registro.responsavel_id || "",
      observacao: registro.observacao || "",
    });

    setErro("");
    setSucesso("");
    setModalAberto(true);
  }

  function abrirEdicaoSaida(registro) {
    setModalTipo("saida");
    setRegistroEditando(registro);

    setFormularioSaida({
      data_saida: registro.data_saida || dataHoje(),
      hora: registro.hora || horaAgora(),
      area_fazenda_id: registro.area_fazenda_id || registro.area_id || "",
      calibre_id: registro.calibre_id || "",
      quantidade_caixas: registro.quantidade_caixas || "",
      responsavel_id: registro.responsavel_id || "",
      observacao: registro.observacao || "",
    });

    setErro("");
    setSucesso("");
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) return;

    setModalAberto(false);
    setRegistroEditando(null);
    setFormularioEntrada(estadoInicialEntrada());
    setFormularioSaida(estadoInicialSaida());
  }

  function atualizarFormularioEntrada(campo, valor) {
    setFormularioEntrada((estadoAtual) => {
      const proximo = {
        ...estadoAtual,
        [campo]: valor,
      };

      if (campo === "fazenda_id") {
        const areasDaFazenda = areasAtivas.filter((area) => {
          return area.fazenda_id === valor;
        });

        if (areasDaFazenda.length === 1) {
          proximo.area_fazenda_id = areasDaFazenda[0].id;
        } else {
          proximo.area_fazenda_id = "";
        }
      }

      if (campo === "area_fazenda_id" && valor && !proximo.fazenda_id) {
        const areaSelecionada = areasAtivas.find((area) => area.id === valor);

        if (areaSelecionada?.fazenda_id) {
          proximo.fazenda_id = areaSelecionada.fazenda_id;
        }
      }

      if (campo === "permitir_edicao_total_caixas" && !valor) {
        proximo.total_caixas_manual = "";
      }

      return proximo;
    });
  }

  function atualizarFormularioSaida(campo, valor) {
    setFormularioSaida((estadoAtual) => {
      const proximo = {
        ...estadoAtual,
        [campo]: valor,
      };

      if (campo === "area_fazenda_id") {
        proximo.calibre_id = "";
        proximo.quantidade_caixas = "";
      }

      if (campo === "calibre_id") {
        proximo.quantidade_caixas = "";
      }

      return proximo;
    });
  }

  async function salvarFormulario(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      if (modalTipo === "entrada") {
        if (registroEditando) {
          await editarAlhoClassificado(registroEditando.id, formularioEntrada);
          setSucesso("Entrada atualizada com sucesso.");
        } else {
          await cadastrarAlhoClassificado(formularioEntrada);
          setSucesso("Entrada registrada com sucesso.");
        }
      }

      if (modalTipo === "saida") {
        if (!formularioSaidaPodeSalvar) {
          throw new Error("Verifique os campos da saída e o saldo disponível.");
        }

        if (registroEditando) {
          await editarSaidaAlhoClassificado(registroEditando.id, formularioSaida);
          setSucesso("Saída atualizada com sucesso.");
        } else {
          await cadastrarSaidaAlhoClassificado(formularioSaida);
          setSucesso("Saída registrada com sucesso.");
        }
      }

      setModalAberto(false);
      setRegistroEditando(null);
      setFormularioEntrada(estadoInicialEntrada());
      setFormularioSaida(estadoInicialSaida());

      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível salvar o lançamento.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusaoEntrada(registro) {
    const confirmar = window.confirm(
      `Excluir a entrada ${registro.calibre_codigo} da área ${registro.area_nome}?`
    );

    if (!confirmar) return;

    try {
      setErro("");
      setSucesso("");

      await excluirAlhoClassificado(registro.id);

      setSucesso("Entrada excluída com sucesso.");
      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível excluir a entrada.");
    }
  }

  async function confirmarExclusaoSaida(registro) {
    const confirmar = window.confirm(
      `Excluir a saída ${registro.calibre_codigo} da área ${registro.area_nome}?`
    );

    if (!confirmar) return;

    try {
      setErro("");
      setSucesso("");

      await excluirSaidaAlhoClassificado(registro.id);

      setSucesso("Saída excluída com sucesso.");
      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível excluir a saída.");
    }
  }

  return (
    <div className="space-y-5">
      {erro ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <strong className="font-semibold">Atenção</strong>
          <p className="mt-1">{erro}</p>
        </div>
      ) : null}

      {sucesso ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          <strong className="font-semibold">Sucesso</strong>
          <p className="mt-1">{sucesso}</p>
        </div>
      ) : null}

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Data inicial</span>
              <input
                type="date"
                value={filtros.dataInicial}
                onChange={(event) =>
                  setFiltros((estado) => ({
                    ...estado,
                    dataInicial: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Data final</span>
              <input
                type="date"
                value={filtros.dataFinal}
                onChange={(event) =>
                  setFiltros((estado) => ({
                    ...estado,
                    dataFinal: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Fazenda</span>
              <select
                value={filtros.fazendaId}
                onChange={(event) =>
                  setFiltros((estado) => ({
                    ...estado,
                    fazendaId: event.target.value,
                    areaId: "",
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Todas as fazendas</option>
                {fazendas.map((fazenda) => (
                  <option key={fazenda.id} value={fazenda.id}>
                    {fazenda.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Área / Pivô</span>
              <select
                value={filtros.areaId}
                onChange={(event) =>
                  setFiltros((estado) => ({
                    ...estado,
                    areaId: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Todas as áreas</option>
                {areasDosFiltros.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Calibre</span>
              <select
                value={filtros.calibreId}
                onChange={(event) =>
                  setFiltros((estado) => ({
                    ...estado,
                    calibreId: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Todos os calibres</option>
                {calibres.map((calibre) => (
                  <option key={calibre.id} value={calibre.id}>
                    {calibre.codigo} — {calibre.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                value={filtros.status}
                onChange={(event) =>
                  setFiltros((estado) => ({
                    ...estado,
                    status: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Todos</option>
                <option value="conferido">Conferido</option>
                <option value="pendente">Pendente</option>
              </select>
            </label>

            <label className="space-y-2 md:col-span-2 xl:col-span-2">
              <span className="text-sm font-medium text-slate-700">Responsável</span>
              <select
                value={filtros.responsavelId}
                onChange={(event) =>
                  setFiltros((estado) => ({
                    ...estado,
                    responsavelId: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Todos os responsáveis</option>
                {responsaveis.map((responsavel) => (
                  <option key={responsavel.id} value={responsavel.id}>
                    {responsavel.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={abrirNovaEntrada}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            >
              <Plus size={17} />
              Entrada
            </button>

            <button
              type="button"
              onClick={abrirNovaSaida}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              <Plus size={17} />
              Saída
            </button>

            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <X size={16} />
              Limpar filtros
            </button>

            <button
              type="button"
              onClick={aplicarFiltros}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              <RefreshCw size={16} />
              Atualizar
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Entradas"
          valor={formatarNumero(resumo.totalEntradas)}
          subtitulo="caixas classificadas"
          icon={ArrowDownToLine}
          tone="green"
        />

        <KpiCard
          titulo="Saídas"
          valor={formatarNumero(resumo.totalSaidas)}
          subtitulo="caixas retiradas"
          icon={ArrowUpFromLine}
          tone="red"
        />

        <KpiCard
          titulo="Saldo atual"
          valor={formatarNumero(resumo.saldoAtual)}
          subtitulo="entrada menos saída"
          icon={Scale}
          tone="green"
        />

        <KpiCard
          titulo="Paletes"
          valor={formatarNumero(resumo.totalPaletes)}
          subtitulo="total filtrado"
          icon={Warehouse}
          tone="purple"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ChartCard titulo="Movimentação diária de entradas e saídas">
          <GraficoMovimentoDiario dados={movimentoDiarioGrafico} />
        </ChartCard>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-base font-semibold text-slate-950">Destaques do período</h2>

          <div className="mt-5 space-y-5">
            <DestaqueItem
              icon={ArrowDownToLine}
              rotulo="Maior entrada"
              valor={`${formatarNumero(calcularTotalCaixas(destaques.maiorEntrada || {}))} caixas`}
              detalhe={
                destaques.maiorEntrada
                  ? `${destaques.maiorEntrada.area_nome} • ${formatarData(
                      destaques.maiorEntrada.data_classificacao
                    )}`
                  : "-"
              }
              tone="green"
            />

            <DestaqueItem
              icon={ArrowUpFromLine}
              rotulo="Maior saída"
              valor={`${formatarNumero(numero(destaques.maiorSaida?.quantidade_caixas))} caixas`}
              detalhe={
                destaques.maiorSaida
                  ? `${destaques.maiorSaida.area_nome} • ${formatarData(
                      destaques.maiorSaida.data_saida
                    )}`
                  : "-"
              }
              tone="red"
            />

            <DestaqueItem
              icon={MapPin}
              rotulo="Área com maior saldo"
              valor={destaques.maiorAreaSaldo?.nome || "-"}
              detalhe={`${formatarNumero(destaques.maiorAreaSaldo?.saldo)} caixas`}
              tone="blue"
            />

            <DestaqueItem
              icon={BarChart3}
              rotulo="Calibre com maior saldo"
              valor={destaques.maiorCalibreSaldo?.nome || "-"}
              detalhe={`${formatarNumero(destaques.maiorCalibreSaldo?.saldo)} caixas`}
              tone="purple"
            />

            <DestaqueItem
              icon={TrendingUp}
              rotulo="Média por lançamento"
              valor={`${formatarNumero(destaques.mediaPorLancamento)} caixas`}
              detalhe="entradas classificadas"
              tone="amber"
            />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
        <ChartCard titulo="Saldo disponível por Área / Pivô">
          <GraficoBarrasHorizontais dados={saldoPorArea} dataKey="saldo" sufixo="caixas" />
        </ChartCard>

        <ChartCard titulo="Saldo disponível por calibre">
          <GraficoBarrasVerticais dados={saldoPorCalibre} dataKey="saldo" sufixo="caixas" />
        </ChartCard>

        <div className="grid gap-4">
          <MiniIndicador
            icon={Boxes}
            valor={formatarNumero(indicadoresApoio.combinacoesComSaldo)}
            texto="combinações com saldo"
            tone="blue"
          />

          <MiniIndicador
            icon={CalendarDays}
            valor={formatarNumero(indicadoresApoio.diasComMovimentacao)}
            texto="dias com movimentação"
            tone="green"
          />

          <MiniIndicador
            icon={BarChart3}
            valor={formatarNumero(indicadoresApoio.mediaSaldoPorCalibre)}
            texto="média de saldo por calibre"
            tone="purple"
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">
              Estoque do Alho Classificado
            </h2>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {formatarNumero(estoqueClassificado.length)} registros
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-[760px] divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-3">
                    <BotaoOrdenacao
                      campo="area"
                      ordenacao={ordenacaoEstoque}
                      onClick={alternarOrdenacaoEstoque}
                    >
                      Área / Pivô
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3">
                    <BotaoOrdenacao
                      campo="calibre"
                      ordenacao={ordenacaoEstoque}
                      onClick={alternarOrdenacaoEstoque}
                    >
                      Calibre
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <BotaoOrdenacao
                      campo="entradas"
                      ordenacao={ordenacaoEstoque}
                      onClick={alternarOrdenacaoEstoque}
                      align="right"
                    >
                      Entradas
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <BotaoOrdenacao
                      campo="saidas"
                      ordenacao={ordenacaoEstoque}
                      onClick={alternarOrdenacaoEstoque}
                      align="right"
                    >
                      Saídas
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <BotaoOrdenacao
                      campo="saldo"
                      ordenacao={ordenacaoEstoque}
                      onClick={alternarOrdenacaoEstoque}
                      align="right"
                    >
                      Saldo
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3">
                    <BotaoOrdenacao
                      campo="status"
                      ordenacao={ordenacaoEstoque}
                      onClick={alternarOrdenacaoEstoque}
                    >
                      Status
                    </BotaoOrdenacao>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {estoquePaginado.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-3 py-8 text-center text-slate-400">
                      Nenhum estoque classificado encontrado.
                    </td>
                  </tr>
                ) : (
                  estoquePaginado.map((item) => (
                    <tr key={`${item.area_id}-${item.calibre_id}`}>
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {item.area_nome}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {item.calibre_codigo || "-"}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600">
                        {formatarNumero(obterEntradaClassificada(item))}
                      </td>
                      <td className="px-3 py-3 text-right text-red-700">
                        {formatarNumero(obterSaidaClassificada(item))}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-emerald-700">
                        {formatarNumero(obterSaldoClassificado(item))}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${classeBadgeStatus(
                            item.status_classificado
                          )}`}
                        >
                          {item.status_classificado === "sem_saldo"
                            ? "Sem saldo"
                            : "Normal"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Paginacao
            paginaAtual={paginaEstoque}
            totalPaginas={totalPaginasEstoque}
            totalRegistros={estoqueOrdenado.length}
            onChange={setPaginaEstoque}
          />
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">
              Entradas registradas
            </h2>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {formatarNumero(entradas.length)} registros
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-[820px] divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-3">
                    <BotaoOrdenacao
                      campo="data"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                    >
                      Data
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3">
                    <BotaoOrdenacao
                      campo="area"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                    >
                      Área / Pivô
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3">
                    <BotaoOrdenacao
                      campo="calibre"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                    >
                      Calibre
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <BotaoOrdenacao
                      campo="paletes"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                      align="right"
                    >
                      Paletes
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <BotaoOrdenacao
                      campo="caixas"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                      align="right"
                    >
                      Caixas
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3">
                    <BotaoOrdenacao
                      campo="responsavel"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                    >
                      Responsável
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {carregando ? (
                  <tr>
                    <td colSpan="7" className="px-3 py-8 text-center text-slate-400">
                      Carregando entradas...
                    </td>
                  </tr>
                ) : entradasOrdenadas.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-3 py-8 text-center text-slate-400">
                      Nenhuma entrada encontrada.
                    </td>
                  </tr>
                ) : (
                  entradasPaginadas.map((registro) => (
                    <tr key={registro.id}>
                      <td className="px-3 py-3 text-slate-600">
                        {formatarData(registro.data_classificacao)}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {registro.area_nome}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {registro.calibre_codigo}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600">
                        {formatarNumero(registro.quantidade_paletes)}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-slate-900">
                        {formatarNumero(registro.total_caixas_calculado)}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {registro.responsavel_nome}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => abrirEdicaoEntrada(registro)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <Edit3 size={13} />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => confirmarExclusaoEntrada(registro)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
                          >
                            <Trash2 size={13} />
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Paginacao
            paginaAtual={paginaEntradas}
            totalPaginas={totalPaginasEntradas}
            totalRegistros={entradasOrdenadas.length}
            onChange={setPaginaEntradas}
          />
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">
              Saídas registradas
            </h2>

            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
              {formatarNumero(saidas.length)} registros
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-[760px] divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-3">
                    <BotaoOrdenacao
                      campo="data"
                      ordenacao={ordenacaoSaidas}
                      onClick={alternarOrdenacaoSaidas}
                    >
                      Data
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3">
                    <BotaoOrdenacao
                      campo="area"
                      ordenacao={ordenacaoSaidas}
                      onClick={alternarOrdenacaoSaidas}
                    >
                      Área / Pivô
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3">
                    <BotaoOrdenacao
                      campo="calibre"
                      ordenacao={ordenacaoSaidas}
                      onClick={alternarOrdenacaoSaidas}
                    >
                      Calibre
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <BotaoOrdenacao
                      campo="caixas"
                      ordenacao={ordenacaoSaidas}
                      onClick={alternarOrdenacaoSaidas}
                      align="right"
                    >
                      Caixas
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3">
                    <BotaoOrdenacao
                      campo="responsavel"
                      ordenacao={ordenacaoSaidas}
                      onClick={alternarOrdenacaoSaidas}
                    >
                      Responsável
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {carregando ? (
                  <tr>
                    <td colSpan="6" className="px-3 py-8 text-center text-slate-400">
                      Carregando saídas...
                    </td>
                  </tr>
                ) : saidasOrdenadas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-3 py-8 text-center text-slate-400">
                      Nenhuma saída registrada.
                    </td>
                  </tr>
                ) : (
                  saidasPaginadas.map((registro) => (
                    <tr key={registro.id}>
                      <td className="px-3 py-3 text-slate-600">
                        {formatarData(registro.data_saida)}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {registro.area_nome}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {registro.calibre_codigo}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-red-700">
                        {formatarNumero(registro.quantidade_caixas)}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {registro.responsavel_nome}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => abrirEdicaoSaida(registro)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <Edit3 size={13} />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => confirmarExclusaoSaida(registro)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
                          >
                            <Trash2 size={13} />
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Paginacao
            paginaAtual={paginaSaidas}
            totalPaginas={totalPaginasSaidas}
            totalRegistros={saidasOrdenadas.length}
            onChange={setPaginaSaidas}
          />
        </section>
      </div>

      {modalAberto && modalTipo === "entrada" ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {registroEditando ? "Editar entrada" : "Nova entrada"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Esta entrada aumenta o estoque próprio do Alho Classificado.
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

            <form onSubmit={salvarFormulario} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Data</span>
                  <input
                    type="date"
                    value={formularioEntrada.data_classificacao}
                    onChange={(event) =>
                      atualizarFormularioEntrada("data_classificacao", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Hora</span>
                  <input
                    type="time"
                    value={formularioEntrada.hora}
                    onChange={(event) =>
                      atualizarFormularioEntrada("hora", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Fazenda</span>
                  <select
                    value={formularioEntrada.fazenda_id}
                    onChange={(event) =>
                      atualizarFormularioEntrada("fazenda_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {fazendas.map((fazenda) => (
                      <option key={fazenda.id} value={fazenda.id}>
                        {fazenda.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Área / Pivô</span>
                  <select
                    value={formularioEntrada.area_fazenda_id}
                    onChange={(event) =>
                      atualizarFormularioEntrada("area_fazenda_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {areasEntradaFormulario.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Lote</span>
                  <input
                    type="text"
                    value={formularioEntrada.lote}
                    onChange={(event) =>
                      atualizarFormularioEntrada("lote", event.target.value)
                    }
                    placeholder="Ex: Lote 01"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Calibre</span>
                  <select
                    value={formularioEntrada.calibre_id}
                    onChange={(event) =>
                      atualizarFormularioEntrada("calibre_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {calibres.map((calibre) => (
                      <option key={calibre.id} value={calibre.id}>
                        {calibre.codigo} — {calibre.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">
                    Quantidade de paletes
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formularioEntrada.quantidade_paletes}
                    onChange={(event) =>
                      atualizarFormularioEntrada("quantidade_paletes", event.target.value)
                    }
                    disabled={formularioEntrada.permitir_edicao_total_caixas}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">
                    Caixas por palete
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formularioEntrada.caixas_por_palete}
                    onChange={(event) =>
                      atualizarFormularioEntrada("caixas_por_palete", event.target.value)
                    }
                    disabled={formularioEntrada.permitir_edicao_total_caixas}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Responsável</span>
                  <select
                    value={formularioEntrada.responsavel_id}
                    onChange={(event) =>
                      atualizarFormularioEntrada("responsavel_id", event.target.value)
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

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={formularioEntrada.permitir_edicao_total_caixas}
                    onChange={(event) =>
                      atualizarFormularioEntrada(
                        "permitir_edicao_total_caixas",
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700"
                  />
                  Permitir edição manual do total de caixas
                </label>

                {formularioEntrada.permitir_edicao_total_caixas ? (
                  <label className="mt-4 block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      Total manual de caixas
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formularioEntrada.total_caixas_manual}
                      onChange={(event) =>
                        atualizarFormularioEntrada(
                          "total_caixas_manual",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
                    />
                  </label>
                ) : null}

                <div className="mt-4 rounded-xl bg-white px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Total calculado para entrada
                  </p>
                  <strong className="mt-1 block text-2xl font-semibold text-emerald-700">
                    {formatarNumero(totalFormularioEntrada)} caixas
                  </strong>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Descrição / Observação
                </span>
                <textarea
                  value={formularioEntrada.observacao}
                  onChange={(event) =>
                    atualizarFormularioEntrada("observacao", event.target.value)
                  }
                  rows="4"
                  placeholder="Digite uma observação sobre a entrada..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                />
              </label>

              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={formularioEntrada.conferido}
                  onChange={(event) =>
                    atualizarFormularioEntrada("conferido", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700"
                />
                Lançamento conferido
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
                  disabled={salvando}
                  className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  {salvando ? "Salvando..." : "Salvar entrada"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalAberto && modalTipo === "saida" ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {registroEditando ? "Editar saída" : "Nova saída"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Esta saída reduz o estoque próprio do Alho Classificado.
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

            <form onSubmit={salvarFormulario} className="space-y-6">
              <div
                className={`rounded-2xl border px-5 py-4 text-sm ${
                  mensagemSaldoSaida.tipo === "erro"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : mensagemSaldoSaida.tipo === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                <strong className="font-semibold">Saldo do Alho Classificado</strong>
                <p className="mt-1">{mensagemSaldoSaida.texto}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Data da saída</span>
                  <input
                    type="date"
                    value={formularioSaida.data_saida}
                    onChange={(event) =>
                      atualizarFormularioSaida("data_saida", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Hora</span>
                  <input
                    type="time"
                    value={formularioSaida.hora}
                    onChange={(event) =>
                      atualizarFormularioSaida("hora", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Área / Pivô</span>
                  <select
                    value={formularioSaida.area_fazenda_id}
                    onChange={(event) =>
                      atualizarFormularioSaida("area_fazenda_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {areasSaidaFormulario.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.nome} — {formatarNumero(area.saldo)} caixas
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Calibre</span>
                  <select
                    value={formularioSaida.calibre_id}
                    onChange={(event) =>
                      atualizarFormularioSaida("calibre_id", event.target.value)
                    }
                    disabled={!formularioSaida.area_fazenda_id}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
                  >
                    <option value="">Selecione</option>
                    {calibresSaidaFormulario.map((item) => (
                      <option key={item.calibre_id} value={item.calibre_id}>
                        {item.calibre_codigo} — {item.calibre_nome} —{" "}
                        {formatarNumero(
                          obterSaldoClassificado(item) +
                            (registroEditando?.calibre_id === item.calibre_id
                              ? devolucaoSaidaEdicao
                              : 0)
                        )}{" "}
                        caixas
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">
                    Quantidade de caixas
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formularioSaida.quantidade_caixas}
                    onChange={(event) =>
                      atualizarFormularioSaida("quantidade_caixas", event.target.value)
                    }
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-emerald-600 ${
                      quantidadeSaidaDigitada > saldoSaidaSelecionado
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200"
                    }`}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Responsável</span>
                  <select
                    value={formularioSaida.responsavel_id}
                    onChange={(event) =>
                      atualizarFormularioSaida("responsavel_id", event.target.value)
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

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Observação</span>
                <textarea
                  value={formularioSaida.observacao}
                  onChange={(event) =>
                    atualizarFormularioSaida("observacao", event.target.value)
                  }
                  rows="4"
                  placeholder="Observações sobre a saída..."
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
                  disabled={!formularioSaidaPodeSalvar}
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar saída"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
