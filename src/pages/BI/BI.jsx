import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import * as XLSX from "xlsx";

import {
  AlertBox,
  Badge,
  Button,
  Card,
  DataTable,
  Select,
} from "../../components/ui";

import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CalendarDays,
  Download,
  FileSpreadsheet,
  HelpCircle,
  MapPinned,
  PackageCheck,
  RefreshCcw,
  Shapes,
  Truck,
} from "lucide-react";

import { listarAreasFazendaAtivas } from "../../services/areasFazendaService";

import {
  buscarDadosBI,
  prepararPlanilhasBI,
} from "../../services/biService";

const EXPLICACOES_BI = {
  painel: {
    titulo: "Dashboard gerencial",
    texto: "Mostra o estoque disponível separado por Área / Pivô e Calibre.",
    uso: "Use para saber rapidamente onde existe produto pronto para saída.",
    calculo:
      "Saldo disponível = Produto Final lançado menos Saídas registradas na mesma Área / Pivô e Calibre.",
  },

  produtoFinal: {
    titulo: "Produto final",
    texto: "Total de caixas finais lançadas.",
    uso: "Clique no card para abrir a tela Produto Final.",
    calculo:
      "Soma todos os lançamentos da tela Produto Final conforme os filtros de data e área.",
  },

  saidas: {
    titulo: "Saídas",
    texto: "Total de caixas que saíram por venda ou expedição.",
    uso: "Clique no card para abrir a tela Saída / Venda.",
    calculo:
      "Soma todas as saídas registradas conforme os filtros de data e área.",
  },

  saldoDisponivel: {
    titulo: "Saldo disponível",
    texto: "Total de caixas disponíveis no estoque.",
    uso: "Clique no card para abrir a tela Estoque Atual.",
    calculo:
      "Produto Final menos Saídas, respeitando o filtro de data e área.",
  },

  areasComSaldo: {
    titulo: "Áreas com saldo",
    texto: "Quantidade de áreas que ainda possuem produto disponível.",
    uso: "Clique no card para abrir a tela Estoque Atual.",
    calculo:
      "Conta as áreas com saldo considerando o período selecionado. Esse card não depende do filtro de área.",
  },

  calibresComSaldo: {
    titulo: "Calibres com saldo",
    texto: "Quantidade de calibres que possuem produto disponível.",
    uso: "Clique no card para abrir a tela Estoque Atual.",
    calculo:
      "Conta os calibres com saldo considerando o período selecionado. Esse card não depende do filtro de área.",
  },

  graficoAreaCalibre: {
    titulo: "Top saldos por Área / Pivô + Calibre",
    texto:
      "Mostra quais combinações de área e calibre têm mais produto disponível.",
    uso:
      "Use o filtro de área e os botões Nome, Caixas e Peso para organizar a visualização.",
    calculo:
      "Mostra o saldo disponível de cada combinação Área / Pivô + Calibre.",
  },

  graficoArea: {
    titulo: "Saldo disponível por Área / Pivô",
    texto: "Mostra o saldo total agrupado por área.",
    uso: "Use para saber quais áreas concentram mais estoque.",
    calculo:
      "Soma todos os calibres disponíveis dentro de cada Área / Pivô.",
  },

  graficoChegada: {
    titulo: "Entrada da fazenda por dia",
    texto:
      "Mostra quantas caixas chegaram da fazenda em cada dia com lançamento.",
    uso:
      "Quando não houver filtro de data, mostra automaticamente apenas o mês atual.",
    calculo:
      "Agrupa os lançamentos de Chegada da Fazenda por data e soma a quantidade de caixas.",
  },

  tabelaPrincipal: {
    titulo: "Tabela principal — Estoque por Área / Pivô + Calibre",
    texto: "Tabela principal do BI.",
    uso: "Use para decidir de qual área e calibre sairão as caixas.",
    calculo:
      "Produto Final menos Saídas, separado por Área / Pivô e Calibre.",
  },

  resumoArea: {
    titulo: "Resumo por Área / Pivô",
    texto: "Resumo consolidado por área.",
    uso: "Use para comparar o estoque disponível entre áreas.",
    calculo:
      "Soma produto final, saídas, saldo e peso disponível de cada área.",
  },

  exportacao: {
    titulo: "Exportação gerencial",
    texto: "Gera uma planilha Excel com os dados do BI.",
    uso: "Use para enviar, conferir ou arquivar os dados.",
    calculo: "Exporta os mesmos dados exibidos no dashboard.",
  },
};

function numero(valor) {
  const convertido = Number(valor);

  if (!Number.isFinite(convertido)) {
    return 0;
  }

  return convertido;
}

function arraySeguro(valor) {
  return Array.isArray(valor) ? valor : [];
}

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function formatarKg(valor) {
  return `${Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
}

function formatarData(data) {
  if (!data) return "-";

  const [ano, mes, dia] = String(data).split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

function statusVariant(status) {
  if (status === "sem_estoque") return "danger";
  if (status === "baixo") return "warning";
  return "success";
}

function statusTexto(status) {
  if (status === "sem_estoque") return "Sem estoque";
  if (status === "baixo") return "Estoque baixo";
  return "Normal";
}

function obterArea(item) {
  return (
    item?.area ||
    item?.area_nome ||
    item?.nome_area ||
    item?.areas_fazenda?.nome ||
    "Sem Área / Pivô"
  );
}

function obterCalibre(item) {
  if (item?.calibre) return item.calibre;

  if (item?.calibre_codigo || item?.calibre_nome) {
    return `${item.calibre_codigo || "-"} — ${item.calibre_nome || "-"}`;
  }

  if (item?.calibres?.codigo || item?.calibres?.nome) {
    return `${item.calibres?.codigo || "-"} — ${item.calibres?.nome || "-"}`;
  }

  return "Sem calibre";
}

function obterAreaChave(item) {
  return item?.area_fazenda_id || item?.area || item?.nome || "";
}

function extrairSaldoCaixas(item) {
  return numero(
    item?.saldo_disponivel_caixas ??
      item?.saldo_caixas ??
      item?.valor ??
      item?.total_caixas ??
      item?.total
  );
}

function extrairPesoKg(item) {
  return numero(
    item?.peso_disponivel_kg ??
      item?.saldo_disponivel_peso_kg ??
      item?.peso_total_kg ??
      item?.peso
  );
}

function normalizarTabelaEstoqueAreaCalibre(bi) {
  const tabelas = bi?.tabelas || {};

  const origem =
    arraySeguro(tabelas.estoqueAreaCalibre).length > 0
      ? arraySeguro(tabelas.estoqueAreaCalibre)
      : arraySeguro(bi?.resumoAreaCalibre);

  return origem;
}

function normalizarTabelaEstoquePorArea(bi) {
  const tabelas = bi?.tabelas || {};
  const origemArea = arraySeguro(tabelas.estoquePorArea);

  if (origemArea.length > 0) {
    return origemArea;
  }

  const origemAreaCalibre = normalizarTabelaEstoqueAreaCalibre(bi);
  const mapa = new Map();

  origemAreaCalibre.forEach((item) => {
    const area = obterArea(item);
    const areaId = item.area_fazenda_id || area;

    if (!mapa.has(areaId)) {
      mapa.set(areaId, {
        area_fazenda_id: areaId,
        area,
        produto_final_caixas: 0,
        produto_final_peso_kg: 0,
        saidas_caixas: 0,
        saidas_peso_kg: 0,
        saldo_disponivel_caixas: 0,
        peso_disponivel_kg: 0,
        calibres_com_saldo: 0,
        status_area: "normal",
      });
    }

    const atual = mapa.get(areaId);

    atual.produto_final_caixas += numero(item.produto_final_caixas);
    atual.produto_final_peso_kg += numero(item.produto_final_peso_kg);
    atual.saidas_caixas += numero(item.saidas_caixas);
    atual.saidas_peso_kg += numero(item.saidas_peso_kg);
    atual.saldo_disponivel_caixas += numero(item.saldo_disponivel_caixas);
    atual.peso_disponivel_kg += numero(item.peso_disponivel_kg);

    if (numero(item.saldo_disponivel_caixas) > 0) {
      atual.calibres_com_saldo += 1;
    }
  });

  return Array.from(mapa.values()).map((item) => ({
    ...item,
    status_area: item.saldo_disponivel_caixas <= 0 ? "sem_estoque" : "normal",
  }));
}

function normalizarGraficoAreaCalibre(bi) {
  const tabela = normalizarTabelaEstoqueAreaCalibre(bi);

  return tabela
    .map((item) => {
      const area = obterArea(item);
      const calibre = obterCalibre(item);
      const saldo = extrairSaldoCaixas(item);
      const peso = extrairPesoKg(item);

      return {
        area_fazenda_id: item.area_fazenda_id || area,
        nome: `${area} + ${calibre}`,
        area,
        calibre,
        valor: saldo,
        peso,
      };
    })
    .filter((item) => item.valor > 0);
}

function normalizarGraficoArea(bi) {
  const tabelaArea = normalizarTabelaEstoquePorArea(bi);

  return tabelaArea
    .map((item) => {
      const area = obterArea(item);
      const saldo = extrairSaldoCaixas(item);
      const peso = extrairPesoKg(item);

      return {
        area_fazenda_id: item.area_fazenda_id || area,
        nome: area,
        area,
        valor: saldo,
        peso,
      };
    })
    .filter((item) => item.valor > 0)
    .sort((a, b) => numero(b.valor) - numero(a.valor))
    .slice(0, 10);
}

function normalizarGraficoChegadas(bi) {
  return arraySeguro(bi?.graficos?.chegadasPorDia).map((item) => ({
    data: item.data,
    nome: formatarData(item.data),
    valor: numero(item.caixas),
    peso: numero(item.peso_kg),
    registros: numero(item.registros),
  }));
}

function ordenarGrafico(lista, ordenacao) {
  const dados = [...lista];

  dados.sort((a, b) => {
    let resultado = 0;

    if (ordenacao.campo === "nome") {
      resultado = String(a.nome).localeCompare(String(b.nome), "pt-BR", {
        numeric: true,
        sensitivity: "base",
      });
    }

    if (ordenacao.campo === "valor") {
      resultado = numero(a.valor) - numero(b.valor);
    }

    if (ordenacao.campo === "peso") {
      resultado = numero(a.peso) - numero(b.peso);
    }

    return ordenacao.direcao === "asc" ? resultado : resultado * -1;
  });

  return dados;
}

function CampoDataCompacto({ label, name, value, onChange }) {
  return (
    <label className="block w-full xl:w-auto">
      <span className="mb-1 block text-xs font-bold text-[var(--color-text-primary)]">
        {label}
      </span>

      <input
        type="date"
        name={name}
        value={value}
        onChange={onChange}
        className="
          h-11
          w-full
          rounded-2xl
          border
          border-[var(--color-border)]
          bg-white
          px-3
          text-sm
          font-semibold
          text-[var(--color-text-primary)]
          outline-none
          transition
          focus:border-[var(--color-green-primary)]
          focus:ring-2
          focus:ring-[var(--color-green-light)]
          xl:w-[155px]
        "
      />
    </label>
  );
}

function AjudaHover({ info, align = "right" }) {
  if (!info) return null;

  return (
    <div
      className="group relative shrink-0"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-xl
          border
          border-[var(--color-border-soft)]
          bg-slate-50
          text-[var(--color-text-muted)]
          transition
          hover:border-[var(--color-green-primary)]
          hover:bg-[var(--color-green-light)]
          hover:text-[var(--color-green-primary)]
        "
        aria-label="Explicação"
      >
        <HelpCircle size={17} />
      </button>

      <div
        className={`
          pointer-events-none
          absolute
          top-10
          z-[999]
          w-[340px]
          rounded-2xl
          border
          border-[var(--color-border-soft)]
          bg-white
          p-4
          text-left
          opacity-0
          shadow-2xl
          transition-all
          duration-200
          ease-out
          group-hover:pointer-events-auto
          group-hover:translate-y-1
          group-hover:opacity-100
          ${align === "left" ? "left-0" : "right-0"}
        `}
      >
        <p className="text-sm font-bold text-[var(--color-text-primary)]">
          {info.titulo}
        </p>

        <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">
          {info.texto}
        </p>

        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            Como usar
          </p>

          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-primary)]">
            {info.uso}
          </p>
        </div>

        <div className="mt-3 rounded-xl bg-[var(--color-green-light)] p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-green-primary)]">
            Leitura simples
          </p>

          <p className="mt-1 text-xs font-bold leading-5 text-[var(--color-sidebar-dark)]">
            {info.calculo}
          </p>
        </div>
      </div>
    </div>
  );
}

function BiKpiCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "info",
  info,
  destino,
  compacto = false,
}) {
  const navigate = useNavigate();

  const variantMap = {
    info: "bg-blue-50 text-blue-700",
    success: "bg-green-50 text-green-700",
    warning: "bg-orange-50 text-orange-700",
    danger: "bg-red-50 text-red-700",
  };

  function abrirDestino() {
    if (!destino) return;
    navigate(destino);
  }

  return (
    <div
      role={destino ? "button" : undefined}
      tabIndex={destino ? 0 : undefined}
      onClick={abrirDestino}
      onKeyDown={(event) => {
        if (destino && event.key === "Enter") {
          abrirDestino();
        }
      }}
      className={
        destino
          ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-xl"
          : ""
      }
      title={destino ? "Clique para abrir a tela relacionada" : ""}
    >
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`
                flex
                ${compacto ? "h-10 w-10" : "h-12 w-12"}
                shrink-0
                items-center
                justify-center
                rounded-2xl
                ${variantMap[variant] || variantMap.info}
              `}
            >
              <Icon size={compacto ? 20 : 24} />
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                {title}
              </p>

              <p
                className={`
                  mt-2
                  font-bold
                  text-[var(--color-text-primary)]
                  ${compacto ? "text-xl" : "text-2xl"}
                `}
              >
                {value}
              </p>

              <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                {description}
              </p>
            </div>
          </div>

          <AjudaHover info={info} />
        </div>
      </Card>
    </div>
  );
}

function CardHeaderInfo({ title, description, info }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
          {title}
        </h3>

        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {description}
        </p>
      </div>

      <AjudaHover info={info} />
    </div>
  );
}

function BotaoOrdenacaoGrafico({ campo, label, ordenacao, onClick }) {
  const ativo = ordenacao.campo === campo;

  return (
    <button
      type="button"
      onClick={() => onClick(campo)}
      className={`
        inline-flex
        h-10
        items-center
        gap-1.5
        rounded-2xl
        border
        px-4
        text-xs
        font-black
        transition
        ${
          ativo
            ? "border-[var(--color-green-primary)] bg-[var(--color-green-light)] text-[var(--color-green-primary)]"
            : "border-[var(--color-border-soft)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-green-primary)] hover:text-[var(--color-green-primary)]"
        }
      `}
    >
      {label}

      {ativo && ordenacao.direcao === "asc" && <ArrowUp size={14} />}
      {ativo && ordenacao.direcao === "desc" && <ArrowDown size={14} />}
    </button>
  );
}

function GraficoBarrasInterno({ dados, variante = "azul" }) {
  const maiorValor = Math.max(...dados.map((item) => numero(item.valor)), 0);

  const barraClasse =
    variante === "verde"
      ? "bg-[var(--color-green-primary)]"
      : "bg-blue-600";

  if (!dados || dados.length === 0) {
    return (
      <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-soft)] bg-slate-50">
        <div className="text-center">
          <p className="text-sm font-bold text-[var(--color-text-primary)]">
            Sem dados para o gráfico
          </p>

          <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
            Quando houver saldo disponível, o gráfico aparecerá aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 min-h-[320px] rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-5">
      <div className="space-y-4">
        {dados.map((item, index) => {
          const largura =
            maiorValor > 0
              ? Math.max(6, Math.round((numero(item.valor) / maiorValor) * 100))
              : 0;

          return (
            <div key={`${item.nome}-${index}`}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                  {item.nome}
                </p>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-black text-[var(--color-text-primary)]">
                    {formatarNumero(item.valor)} caixas
                  </p>

                  <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                    {formatarKg(item.peso)}
                  </p>
                </div>
              </div>

              <div className="h-4 overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full rounded-full ${barraClasse}`}
                  style={{
                    width: `${largura}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GraficoLinhaChegada({ dados }) {
  const maiorValor = Math.max(...dados.map((item) => numero(item.valor)), 0);

  if (!dados || dados.length === 0) {
    return (
      <div className="mt-5 flex min-h-[340px] items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-soft)] bg-slate-50">
        <div className="text-center">
          <p className="text-sm font-bold text-[var(--color-text-primary)]">
            Sem entradas da fazenda no período
          </p>

          <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
            O gráfico aparece quando houver lançamento de chegada.
          </p>
        </div>
      </div>
    );
  }

  const largura = 1000;
  const altura = 300;
  const paddingX = 56;
  const paddingY = 44;

  const pontos = dados.map((item, index) => {
    const x =
      dados.length === 1
        ? largura / 2
        : paddingX +
          (index * (largura - paddingX * 2)) / Math.max(1, dados.length - 1);

    const y =
      altura -
      paddingY -
      (numero(item.valor) / Math.max(1, maiorValor)) * (altura - paddingY * 2);

    return {
      ...item,
      x,
      y,
    };
  });

  const linha = pontos.map((ponto) => `${ponto.x},${ponto.y}`).join(" ");

  return (
    <div className="mt-5 rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-5">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${largura} ${altura}`}
          className="h-[300px] min-w-[760px] w-full"
          role="img"
        >
          <line
            x1={paddingX}
            y1={altura - paddingY}
            x2={largura - paddingX}
            y2={altura - paddingY}
            stroke="#dbe3df"
            strokeWidth="2"
          />

          <line
            x1={paddingX}
            y1={paddingY}
            x2={paddingX}
            y2={altura - paddingY}
            stroke="#dbe3df"
            strokeWidth="2"
          />

          <polyline
            fill="none"
            stroke="#2f855a"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={linha}
          />

          {pontos.map((ponto, index) => (
            <g key={`${ponto.data}-${index}`}>
              <circle
                cx={ponto.x}
                cy={ponto.y}
                r="7"
                fill="#2f855a"
                stroke="white"
                strokeWidth="4"
              />

              <text
                x={ponto.x}
                y={ponto.y - 16}
                textAnchor="middle"
                className="fill-slate-900 text-[13px] font-bold"
              >
                {formatarNumero(ponto.valor)}
              </text>

              <text
                x={ponto.x}
                y={altura - 10}
                textAnchor="middle"
                className="fill-slate-500 text-[12px] font-semibold"
              >
                {ponto.nome}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function BI() {
  const [filtros, setFiltros] = useState({
    dataInicial: "",
    dataFinal: "",
    areaFazendaId: "",
  });

  const [areas, setAreas] = useState([]);
  const [bi, setBi] = useState(null);

  const [areaGraficoId, setAreaGraficoId] = useState("");

  const [ordenacaoGrafico, setOrdenacaoGrafico] = useState({
    campo: "valor",
    direcao: "desc",
  });

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const indicadores = bi?.indicadores || {};

  const tabelaEstoqueAreaCalibre = useMemo(() => {
    return normalizarTabelaEstoqueAreaCalibre(bi);
  }, [bi]);

  const tabelaEstoquePorArea = useMemo(() => {
    return normalizarTabelaEstoquePorArea(bi);
  }, [bi]);

  const dadosGraficoAreaCalibreBase = useMemo(() => {
    return normalizarGraficoAreaCalibre(bi);
  }, [bi]);

  const dadosGraficoArea = useMemo(() => {
    return normalizarGraficoArea(bi);
  }, [bi]);

  const dadosGraficoChegadas = useMemo(() => {
    return normalizarGraficoChegadas(bi);
  }, [bi]);

  const dadosGraficoAreaCalibre = useMemo(() => {
    let dados = [...dadosGraficoAreaCalibreBase];

    if (areaGraficoId) {
      dados = dados.filter((item) => obterAreaChave(item) === areaGraficoId);
    }

    dados = ordenarGrafico(dados, ordenacaoGrafico);

    return dados.slice(0, 10);
  }, [dadosGraficoAreaCalibreBase, areaGraficoId, ordenacaoGrafico]);

  const areaOptions = useMemo(() => {
    return [
      { value: "", label: "Todas as áreas" },
      ...areas.map((area) => ({
        value: area.id,
        label: area.nome,
      })),
    ];
  }, [areas]);

  const indicadoresCards = useMemo(() => {
    if (!bi) return [];

    return [
      {
        title: "Produto final",
        value: formatarNumero(indicadores.caixasFinaisProduzidas),
        description: formatarKg(indicadores.pesoFinalProduzido),
        icon: PackageCheck,
        variant: "success",
        info: EXPLICACOES_BI.produtoFinal,
        destino: "/produto-final",
        compacto: false,
      },
      {
        title: "Saídas",
        value: formatarNumero(indicadores.saidasCaixas),
        description: formatarKg(indicadores.saidasPesoKg),
        icon: Truck,
        variant: "warning",
        info: EXPLICACOES_BI.saidas,
        destino: "/saida-venda",
        compacto: false,
      },
      {
        title: "Saldo disponível",
        value: formatarNumero(indicadores.saldoDisponivel),
        description: formatarKg(indicadores.pesoDisponivelKg),
        icon: BarChart3,
        variant: "info",
        info: EXPLICACOES_BI.saldoDisponivel,
        destino: "/estoque-atual",
        compacto: false,
      },
      {
        title: "Áreas com saldo",
        value: formatarNumero(indicadores.areasComSaldo),
        description: "Áreas disponíveis",
        icon: MapPinned,
        variant: "success",
        info: EXPLICACOES_BI.areasComSaldo,
        destino: "/estoque-atual",
        compacto: true,
      },
      {
        title: "Calibres com saldo",
        value: formatarNumero(indicadores.calibresComSaldo),
        description: "Calibres disponíveis",
        icon: Shapes,
        variant: "info",
        info: EXPLICACOES_BI.calibresComSaldo,
        destino: "/estoque-atual",
        compacto: true,
      },
    ];
  }, [bi, indicadores]);

  const estoqueAreaCalibreColumns = [
    {
      key: "area",
      label: "Área / Pivô",
      render: (value, row) => (
        <p className="font-bold text-[var(--color-text-primary)]">
          {value || obterArea(row)}
        </p>
      ),
    },
    {
      key: "calibre",
      label: "Calibre",
      render: (value, row) => (
        <p className="font-bold text-[var(--color-text-primary)]">
          {value || obterCalibre(row)}
        </p>
      ),
    },
    {
      key: "produto_final_caixas",
      label: "Produto final",
      render: (value, row) => (
        <div>
          <p>{formatarNumero(value)} caixas</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {formatarKg(row.produto_final_peso_kg)}
          </p>
        </div>
      ),
    },
    {
      key: "saidas_caixas",
      label: "Saídas",
      render: (value, row) => (
        <div>
          <p>{formatarNumero(value)} caixas</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {formatarKg(row.saidas_peso_kg)}
          </p>
        </div>
      ),
    },
    {
      key: "saldo_disponivel_caixas",
      label: "Saldo disponível",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "peso_disponivel_kg",
      label: "Peso disponível",
      render: (value) => formatarKg(value),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge variant={statusVariant(value)}>{statusTexto(value)}</Badge>
      ),
    },
  ];

  const areaColumns = [
    {
      key: "area",
      label: "Área / Pivô",
      render: (value, row) => (
        <div>
          <p className="font-bold text-[var(--color-text-primary)]">
            {value || obterArea(row)}
          </p>

          <p className="text-xs font-semibold text-[var(--color-text-muted)]">
            {formatarNumero(row.calibres_com_saldo)} calibre(s) com saldo
          </p>
        </div>
      ),
    },
    {
      key: "produto_final_caixas",
      label: "Produto final",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "saidas_caixas",
      label: "Saídas",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "saldo_disponivel_caixas",
      label: "Saldo",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "peso_disponivel_kg",
      label: "Peso",
      render: (value) => formatarKg(value),
    },
    {
      key: "status_area",
      label: "Status",
      render: (value) => (
        <Badge variant={statusVariant(value)}>{statusTexto(value)}</Badge>
      ),
    },
  ];

  async function carregarAreas() {
    const areasBanco = await listarAreasFazendaAtivas();
    setAreas(areasBanco || []);
  }

  async function carregarBI(filtrosAtuais = filtros) {
    try {
      setCarregando(true);
      setErro("");
      setSucesso("");

      if (
        filtrosAtuais.dataInicial &&
        filtrosAtuais.dataFinal &&
        filtrosAtuais.dataInicial > filtrosAtuais.dataFinal
      ) {
        setErro("A data inicial não pode ser maior que a data final.");
        return;
      }

      const dados = await buscarDadosBI(filtrosAtuais);

      setBi(dados);
    } catch (error) {
      console.error("Erro ao carregar BI:", error);

      setErro(
        error.message ||
          "Não foi possível carregar o dashboard. Confira as permissões no Supabase."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    async function iniciarTela() {
      try {
        await carregarAreas();
      } catch (error) {
        console.error("Erro ao carregar áreas no BI:", error);
      }

      await carregarBI();
    }

    iniciarTela();
  }, []);

  function atualizarFiltro(event) {
    const { name, value } = event.target;

    setFiltros((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));

    setErro("");
    setSucesso("");
  }

  function aplicarFiltros() {
    setAreaGraficoId("");
    carregarBI(filtros);
  }

  function limparFiltros() {
    const filtrosLimpos = {
      dataInicial: "",
      dataFinal: "",
      areaFazendaId: "",
    };

    setFiltros(filtrosLimpos);
    setAreaGraficoId("");
    carregarBI(filtrosLimpos);
  }

  function alterarOrdenacaoGrafico(campo) {
    setOrdenacaoGrafico((estadoAtual) => {
      if (estadoAtual.campo === campo) {
        return {
          campo,
          direcao: estadoAtual.direcao === "asc" ? "desc" : "asc",
        };
      }

      return {
        campo,
        direcao: campo === "nome" ? "asc" : "desc",
      };
    });
  }

  function baixarPlanilhaExcel() {
    try {
      if (!bi) {
        setErro("Carregue o dashboard antes de baixar a planilha.");
        return;
      }

      const planilhas = prepararPlanilhasBI(bi);
      const workbook = XLSX.utils.book_new();

      Object.entries(planilhas).forEach(([nome, linhas]) => {
        const dados = linhas.length > 0 ? linhas : [{ Aviso: "Sem dados" }];
        const worksheet = XLSX.utils.json_to_sheet(dados);

        XLSX.utils.book_append_sheet(workbook, worksheet, nome.slice(0, 31));
      });

      const dataArquivo = new Date().toISOString().slice(0, 10);

      XLSX.writeFile(workbook, `dashboard-estoque-alho-${dataArquivo}.xlsx`);

      setSucesso("Planilha Excel do dashboard baixada com sucesso.");
    } catch (error) {
      console.error("Erro ao baixar planilha:", error);
      setErro("Não foi possível baixar a planilha.");
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3 sm:items-center">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                Dashboard gerencial — Área / Pivô + Calibre
              </h3>

              <AjudaHover info={EXPLICACOES_BI.painel} align="left" />
            </div>

            <p className="mt-1 max-w-3xl text-sm text-[var(--color-text-secondary)]">
              Visão direta do que existe disponível para saída, separado por área
              e calibre.
            </p>
          </div>

          <div className="w-full xl:w-auto">
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:w-auto xl:items-end xl:justify-end">
              <CampoDataCompacto
                label="Data inicial"
                name="dataInicial"
                value={filtros.dataInicial}
                onChange={atualizarFiltro}
              />

              <CampoDataCompacto
                label="Data final"
                name="dataFinal"
                value={filtros.dataFinal}
                onChange={atualizarFiltro}
              />

              <div className="w-full xl:w-[230px]">
                <Select
                  label="Área / Pivô"
                  name="areaFazendaId"
                  value={filtros.areaFazendaId}
                  onChange={atualizarFiltro}
                  options={areaOptions}
                  placeholder="Todas as áreas"
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={limparFiltros}
                disabled={carregando}
                className="w-full xl:w-auto"
              >
                <RefreshCcw size={16} />
                Limpar
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={aplicarFiltros}
                disabled={carregando}
                className="w-full xl:w-auto"
              >
                <CalendarDays size={16} />
                {carregando ? "Carregando..." : "Atualizar"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={baixarPlanilhaExcel}
                disabled={carregando || !bi}
                className="w-full sm:col-span-2 xl:col-span-1 xl:w-auto"
              >
                <FileSpreadsheet size={16} />
                Baixar Excel
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {erro && <AlertBox variant="danger" title="Atenção" description={erro} />}

      {sucesso && (
        <AlertBox
          variant="success"
          title="Operação concluída"
          description={sucesso}
        />
      )}

      {carregando && (
        <AlertBox
          variant="info"
          title="Carregando dashboard"
          description="Buscando produto final, saídas, estoque e chegada da fazenda."
        />
      )}

      {bi && (
        <>
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
            {indicadoresCards.map((card) => (
              <BiKpiCard
                key={card.title}
                title={card.title}
                value={card.value}
                description={card.description}
                icon={card.icon}
                variant={card.variant}
                info={card.info}
                destino={card.destino}
                compacto={card.compacto}
              />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card>
              <div className="space-y-5">
                <CardHeaderInfo
                  title="Top saldos por Área / Pivô + Calibre"
                  description="Mostra onde existe mais produto disponível para saída."
                  info={EXPLICACOES_BI.graficoAreaCalibre}
                />

                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div className="w-full xl:max-w-[260px]">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-[var(--color-text-primary)]">
                        Filtrar gráfico por área
                      </span>

                      <select
                        value={areaGraficoId}
                        onChange={(event) =>
                          setAreaGraficoId(event.target.value)
                        }
                        className="
                          h-11
                          w-full
                          rounded-2xl
                          border
                          border-[var(--color-border)]
                          bg-white
                          px-3
                          text-sm
                          font-semibold
                          text-[var(--color-text-primary)]
                          outline-none
                          transition
                          focus:border-[var(--color-green-primary)]
                          focus:ring-2
                          focus:ring-[var(--color-green-light)]
                        "
                      >
                        <option value="">Todas as áreas</option>

                        {areas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <BotaoOrdenacaoGrafico
                      campo="nome"
                      label="Nome"
                      ordenacao={ordenacaoGrafico}
                      onClick={alterarOrdenacaoGrafico}
                    />

                    <BotaoOrdenacaoGrafico
                      campo="valor"
                      label="Caixas"
                      ordenacao={ordenacaoGrafico}
                      onClick={alterarOrdenacaoGrafico}
                    />

                    <BotaoOrdenacaoGrafico
                      campo="peso"
                      label="Peso"
                      ordenacao={ordenacaoGrafico}
                      onClick={alterarOrdenacaoGrafico}
                    />
                  </div>
                </div>
              </div>

              <GraficoBarrasInterno
                dados={dadosGraficoAreaCalibre}
                variante="azul"
              />
            </Card>

            <Card>
              <CardHeaderInfo
                title="Saldo disponível por Área / Pivô"
                description="Mostra quais áreas ainda concentram estoque disponível."
                info={EXPLICACOES_BI.graficoArea}
              />

              <GraficoBarrasInterno dados={dadosGraficoArea} variante="verde" />
            </Card>
          </section>

          <Card>
            <CardHeaderInfo
              title="Entrada da fazenda por dia"
              description="Mostra a quantidade de caixas que entrou da fazenda nos dias com lançamento."
              info={EXPLICACOES_BI.graficoChegada}
            />

            <GraficoLinhaChegada dados={dadosGraficoChegadas} />
          </Card>

          <Card>
            <div className="mb-5">
              <CardHeaderInfo
                title="Tabela principal — Estoque por Área / Pivô + Calibre"
                description="Mostra exatamente o que existe disponível em cada área e em cada calibre."
                info={EXPLICACOES_BI.tabelaPrincipal}
              />
            </div>

            <DataTable
              columns={estoqueAreaCalibreColumns}
              data={tabelaEstoqueAreaCalibre}
              emptyMessage="Nenhum estoque por Área / Pivô + Calibre encontrado."
            />
          </Card>

          <Card>
            <div className="mb-5">
              <CardHeaderInfo
                title="Resumo por Área / Pivô"
                description="Produto final, saídas, saldo, peso e calibres disponíveis em cada área."
                info={EXPLICACOES_BI.resumoArea}
              />
            </div>

            <DataTable
              columns={areaColumns}
              data={tabelaEstoquePorArea}
              emptyMessage="Nenhuma área com estoque."
            />
          </Card>

          <Card>
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
              <CardHeaderInfo
                title="Exportação gerencial"
                description="Baixe o Excel com estoque por Área + Calibre, resumo por área, produto final, saídas e entradas da fazenda."
                info={EXPLICACOES_BI.exportacao}
              />

              <Button
                type="button"
                variant="primary"
                onClick={baixarPlanilhaExcel}
              >
                <Download size={16} />
                Baixar Excel completo
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default BI;