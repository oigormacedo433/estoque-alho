import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import {
  AlertBox,
  Badge,
  Button,
  Card,
  DataTable,
} from "../../components/ui";

import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle,
  Download,
  FileSpreadsheet,
  HelpCircle,
  MapPinned,
  PackageCheck,
  RefreshCcw,
  Scale,
  ShieldAlert,
  ShoppingCart,
  Truck,
  Warehouse,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  buscarDadosBI,
  prepararPlanilhasBI,
} from "../../services/biService";

const EXPLICACOES_BI = {
  painel: {
    titulo: "Dashboard gerencial",
    texto:
      "Esse painel mostra o estoque do jeito que a operação precisa enxergar: por Área / Pivô e por Calibre.",
    uso:
      "Use para saber exatamente onde existe produto disponível antes de fazer uma saída.",
    calculo:
      "Saldo = produto final lançado na Área + Calibre menos saídas da mesma Área + Calibre.",
  },

  saldoDisponivel: {
    titulo: "Saldo disponível",
    texto:
      "Mostra o total de caixas que ainda podem sair do estoque.",
    uso:
      "Serve para ter uma visão rápida do volume disponível para venda ou expedição.",
    calculo:
      "Soma o saldo disponível de todas as combinações Área / Pivô + Calibre.",
  },

  areasComSaldo: {
    titulo: "Áreas com saldo",
    texto:
      "Mostra quantas áreas ainda possuem produto disponível.",
    uso:
      "Ajuda a saber se o estoque está concentrado em poucas áreas ou distribuído em várias.",
    calculo:
      "Conta as áreas que possuem pelo menos um calibre com saldo disponível.",
  },

  calibresComSaldo: {
    titulo: "Calibres com saldo",
    texto:
      "Mostra quantos calibres ainda existem disponíveis no estoque.",
    uso:
      "Ajuda a saber se ainda existe variedade de calibre para venda.",
    calculo:
      "Conta os calibres que possuem saldo disponível em uma ou mais áreas.",
  },

  areaCalibre: {
    titulo: "Área + Calibre",
    texto:
      "Mostra quantas combinações de área e calibre possuem saldo.",
    uso:
      "Essa é uma leitura mais precisa do estoque, porque mostra não só o calibre, mas onde ele está.",
    calculo:
      "Conta cada combinação Área / Pivô + Calibre com saldo maior que zero.",
  },

  produtoFinal: {
    titulo: "Produto final",
    texto:
      "Mostra quantas caixas foram lançadas como produto final no período.",
    uso:
      "Serve para acompanhar o volume que virou estoque pronto para saída.",
    calculo:
      "Soma as caixas lançadas na tela de Produto Final dentro do período selecionado.",
  },

  saidas: {
    titulo: "Saídas",
    texto:
      "Mostra quantas caixas foram baixadas do estoque por venda ou expedição.",
    uso:
      "Serve para acompanhar o quanto saiu do estoque no período.",
    calculo:
      "Soma as caixas lançadas na tela de Saída / Venda dentro do período selecionado.",
  },

  estoqueCritico: {
    titulo: "Estoque crítico",
    texto:
      "Mostra combinações Área + Calibre que estão com estoque baixo ou sem estoque.",
    uso:
      "Use para identificar rapidamente onde pode faltar produto.",
    calculo:
      "Conta os itens marcados como estoque baixo ou sem estoque.",
  },

  giroGeral: {
    titulo: "Giro geral",
    texto:
      "Mostra a relação entre o que foi produzido e o que saiu.",
    uso:
      "Ajuda a entender se o estoque está girando ou ficando parado.",
    calculo:
      "Saídas ÷ Produto final produzido no período.",
  },

  graficoAreaCalibre: {
    titulo: "Top saldos por Área / Pivô + Calibre",
    texto:
      "Mostra os maiores saldos disponíveis separando área e calibre.",
    uso:
      "Use para saber rapidamente onde existe mais produto disponível para saída.",
    calculo:
      "Ordena as combinações Área + Calibre pelo maior saldo disponível.",
  },

  graficoArea: {
    titulo: "Saldo disponível por Área / Pivô",
    texto:
      "Mostra o saldo total de cada área, somando todos os calibres daquela área.",
    uso:
      "Use para saber quais áreas ainda concentram mais estoque.",
    calculo:
      "Soma o saldo disponível de todos os calibres dentro de cada área.",
  },

  tabelaPrincipal: {
    titulo: "Tabela principal — Área / Pivô + Calibre",
    texto:
      "Essa é a tabela mais importante do dashboard.",
    uso:
      "Use essa tabela para decidir de qual área e calibre sairão as caixas.",
    calculo:
      "Produto final da Área + Calibre menos as saídas da mesma Área + Calibre.",
  },

  resumoArea: {
    titulo: "Resumo por Área / Pivô",
    texto:
      "Mostra o saldo consolidado de cada área.",
    uso:
      "Use para comparar áreas e entender onde existe mais estoque disponível.",
    calculo:
      "Soma produto final, saídas e saldo de todos os calibres dentro da área.",
  },

  alertas: {
    titulo: "Alertas objetivos",
    texto:
      "Mostra apenas os problemas que precisam de atenção.",
    uso:
      "Use para verificar saldo negativo, estoque crítico e pendências de conferência.",
    calculo:
      "Analisa as combinações Área + Calibre e aponta riscos.",
  },

  exportacao: {
    titulo: "Exportação gerencial",
    texto:
      "Exporta os dados do dashboard para Excel.",
    uso:
      "Use para conferir números, enviar para gestão ou guardar histórico.",
    calculo:
      "A planilha usa os mesmos dados exibidos no dashboard.",
  },
};

function obterDataAtual() {
  const data = new Date();
  const dataLocal = new Date(data.getTime() - data.getTimezoneOffset() * 60000);

  return dataLocal.toISOString().slice(0, 10);
}

function obterDataMenosDias(dias) {
  const data = new Date();

  data.setDate(data.getDate() - dias);

  const dataLocal = new Date(data.getTime() - data.getTimezoneOffset() * 60000);

  return dataLocal.toISOString().slice(0, 10);
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

function formatarPercentual(valor) {
  return `${Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
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

function CampoDataCompacto({ label, name, value, onChange }) {
  return (
    <label className="block">
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
          w-[155px]
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
      />
    </label>
  );
}

function AjudaHover({ info, align = "right" }) {
  if (!info) return null;

  return (
    <div className="group relative shrink-0">
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
}) {
  const variantMap = {
    info: "bg-blue-50 text-blue-700",
    success: "bg-green-50 text-green-700",
    warning: "bg-orange-50 text-orange-700",
    danger: "bg-red-50 text-red-700",
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`
              flex
              h-12
              w-12
              shrink-0
              items-center
              justify-center
              rounded-2xl
              ${variantMap[variant] || variantMap.info}
            `}
          >
            <Icon size={24} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              {title}
            </p>

            <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white p-3 shadow-lg">
      <p className="mb-2 text-sm font-bold text-[var(--color-text-primary)]">
        {label}
      </p>

      <div className="space-y-1">
        {payload.map((item) => (
          <p
            key={item.dataKey}
            className="text-xs font-semibold text-[var(--color-text-secondary)]"
          >
            {item.name || item.dataKey}:{" "}
            <span className="text-[var(--color-text-primary)]">
              {formatarNumero(item.value)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

function BI() {
  const [filtros, setFiltros] = useState({
    dataInicial: obterDataMenosDias(30),
    dataFinal: obterDataAtual(),
  });

  const [bi, setBi] = useState(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const indicadoresCards = useMemo(() => {
    if (!bi) return [];

    return [
      {
        title: "Saldo disponível",
        value: formatarNumero(bi.indicadores.saldoDisponivel),
        description: formatarKg(bi.indicadores.pesoDisponivelKg),
        icon: BarChart3,
        variant: "info",
        info: EXPLICACOES_BI.saldoDisponivel,
      },
      {
        title: "Áreas com saldo",
        value: formatarNumero(bi.indicadores.areasComSaldo),
        description: "Áreas / Pivôs disponíveis",
        icon: MapPinned,
        variant: "success",
        info: EXPLICACOES_BI.areasComSaldo,
      },
      {
        title: "Calibres com saldo",
        value: formatarNumero(bi.indicadores.calibresComSaldo),
        description: "Calibres disponíveis",
        icon: PackageCheck,
        variant: "success",
        info: EXPLICACOES_BI.calibresComSaldo,
      },
      {
        title: "Área + Calibre",
        value: formatarNumero(bi.indicadores.combinacoesComSaldo),
        description: "Combinações com saldo",
        icon: Warehouse,
        variant: "info",
        info: EXPLICACOES_BI.areaCalibre,
      },
      {
        title: "Produto final",
        value: formatarNumero(bi.indicadores.caixasFinaisProduzidas),
        description: formatarKg(bi.indicadores.pesoFinalProduzido),
        icon: ShoppingCart,
        variant: "success",
        info: EXPLICACOES_BI.produtoFinal,
      },
      {
        title: "Saídas",
        value: formatarNumero(bi.indicadores.saidasCaixas),
        description: formatarKg(bi.indicadores.saidasPesoKg),
        icon: Truck,
        variant: "warning",
        info: EXPLICACOES_BI.saidas,
      },
      {
        title: "Estoque crítico",
        value: formatarNumero(bi.indicadores.estoqueCritico),
        description: `${formatarNumero(bi.indicadores.semEstoque)} sem estoque`,
        icon: AlertTriangle,
        variant: bi.indicadores.estoqueCritico > 0 ? "warning" : "success",
        info: EXPLICACOES_BI.estoqueCritico,
      },
      {
        title: "Giro geral",
        value: formatarPercentual(bi.indicadores.giroSaida),
        description: "Saída sobre produto final",
        icon: Scale,
        variant: "info",
        info: EXPLICACOES_BI.giroGeral,
      },
    ];
  }, [bi]);

  const estoqueAreaCalibreColumns = [
    {
      key: "area",
      label: "Área / Pivô",
      render: (value) => (
        <p className="font-bold text-[var(--color-text-primary)]">
          {value}
        </p>
      ),
    },
    {
      key: "calibre",
      label: "Calibre",
      render: (value) => (
        <p className="font-bold text-[var(--color-text-primary)]">
          {value}
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
            {value}
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
      key: "giro_area",
      label: "Giro",
      render: (value) => formatarPercentual(value),
    },
    {
      key: "status_area",
      label: "Status",
      render: (value) => (
        <Badge variant={statusVariant(value)}>{statusTexto(value)}</Badge>
      ),
    },
  ];

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
    carregarBI();
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
    carregarBI(filtros);
  }

  function limparFiltros() {
    const filtrosLimpos = {
      dataInicial: obterDataMenosDias(30),
      dataFinal: obterDataAtual(),
    };

    setFiltros(filtrosLimpos);
    carregarBI(filtrosLimpos);
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
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                Dashboard gerencial — Área / Pivô + Calibre
              </h3>

              <AjudaHover info={EXPLICACOES_BI.painel} align="left" />
            </div>

            <p className="mt-1 max-w-3xl text-sm text-[var(--color-text-secondary)]">
              Visão direta do que existe disponível para saída, separado por área e calibre.
            </p>
          </div>

          <div className="flex flex-wrap items-end justify-end gap-3">
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

            <Button
              type="button"
              variant="secondary"
              onClick={limparFiltros}
              disabled={carregando}
            >
              <RefreshCcw size={16} />
              Limpar
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={aplicarFiltros}
              disabled={carregando}
            >
              <CalendarDays size={16} />
              {carregando ? "Carregando..." : "Atualizar"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={baixarPlanilhaExcel}
              disabled={carregando || !bi}
            >
              <FileSpreadsheet size={16} />
              Baixar Excel
            </Button>
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
          description="Buscando produto final, saídas e estoque por Área / Pivô + Calibre."
        />
      )}

      {bi && (
        <>
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {indicadoresCards.map((card) => (
              <BiKpiCard
                key={card.title}
                title={card.title}
                value={card.value}
                description={card.description}
                icon={card.icon}
                variant={card.variant}
                info={card.info}
              />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card>
              <CardHeaderInfo
                title="Top saldos por Área / Pivô + Calibre"
                description="Mostra onde existe mais produto disponível para saída."
                info={EXPLICACOES_BI.graficoAreaCalibre}
              />

              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bi.graficos.saldoPorAreaCalibre}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="area_calibre" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="saldo_disponivel_caixas"
                      name="Saldo disponível"
                      fill="#2563eb"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeaderInfo
                title="Saldo disponível por Área / Pivô"
                description="Mostra quais áreas ainda concentram estoque disponível."
                info={EXPLICACOES_BI.graficoArea}
              />

              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bi.graficos.estoquePorArea}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="area" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="saldo_disponivel_caixas"
                      name="Saldo disponível"
                      fill="#0f766e"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-green-light)] text-[var(--color-green-primary)]">
                  <CheckCircle size={24} />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                    Eficiência de produção
                  </h3>

                  <p className="mt-1 text-3xl font-bold text-[var(--color-green-primary)]">
                    {formatarPercentual(bi.indicadores.eficienciaProducao)}
                  </p>

                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Produto final sobre caixas equivalentes classificadas.
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                  <Truck size={24} />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                    Giro de saída
                  </h3>

                  <p className="mt-1 text-3xl font-bold text-orange-700">
                    {formatarPercentual(bi.indicadores.giroSaida)}
                  </p>

                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Saídas sobre produto final produzido.
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                  <ShieldAlert size={24} />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                    Risco de estoque
                  </h3>

                  <p className="mt-1 text-3xl font-bold text-red-700">
                    {formatarNumero(
                      bi.indicadores.estoqueCritico +
                        bi.alertas.saldoNegativo.length
                    )}
                  </p>

                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Estoque crítico + saldo negativo.
                  </p>
                </div>
              </div>
            </Card>
          </section>

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
              data={bi.tabelas.estoqueAreaCalibre}
              emptyMessage="Nenhum estoque por Área / Pivô + Calibre encontrado."
            />
          </Card>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
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
                data={bi.tabelas.estoquePorArea}
                emptyMessage="Nenhuma área com estoque."
              />
            </Card>

            <Card>
              <div className="mb-5">
                <CardHeaderInfo
                  title="Alertas objetivos"
                  description="Somente os pontos que precisam de atenção."
                  info={EXPLICACOES_BI.alertas}
                />
              </div>

              <div className="space-y-4">
                <AlertBox
                  variant={
                    bi.alertas.saldoNegativo.length > 0 ? "danger" : "success"
                  }
                  title="Saldo negativo"
                  description={
                    bi.alertas.saldoNegativo.length > 0
                      ? `${formatarNumero(
                          bi.alertas.saldoNegativo.length
                        )} combinação(ões) Área + Calibre com saldo negativo.`
                      : "Nenhum saldo negativo encontrado."
                  }
                />

                <AlertBox
                  variant={
                    bi.alertas.combinacoesCriticas.length > 0
                      ? "warning"
                      : "success"
                  }
                  title="Estoque crítico"
                  description={
                    bi.alertas.combinacoesCriticas.length > 0
                      ? `${formatarNumero(
                          bi.alertas.combinacoesCriticas.length
                        )} combinação(ões) Área + Calibre em alerta.`
                      : "Nenhuma combinação Área + Calibre em alerta."
                  }
                />

                <AlertBox
                  variant="info"
                  title="Área com maior produto final"
                  description={
                    bi.alertas.maiorAreaProduto
                      ? `${bi.alertas.maiorAreaProduto.area}: ${formatarNumero(
                          bi.alertas.maiorAreaProduto.caixas
                        )} caixas finais.`
                      : "Sem produto final no período."
                  }
                />

                <AlertBox
                  variant={
                    bi.alertas.totalPendencias > 0 ? "warning" : "success"
                  }
                  title="Conferências pendentes"
                  description={`${formatarNumero(
                    bi.alertas.totalPendencias
                  )} pendência(s) no período.`}
                />
              </div>
            </Card>
          </section>

          <Card>
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
              <CardHeaderInfo
                title="Exportação gerencial"
                description="Baixe o Excel com estoque por Área + Calibre, resumo por área, produto final e saídas."
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