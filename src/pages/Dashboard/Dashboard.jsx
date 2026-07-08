// Dashboard / Tela inicial.
//
// Etapa 8:
// - Cards principais
// - Gráficos
// - Tabela de estoque atual
// - Alertas
//
// Não usamos dados fictícios.
// Tudo vem do Supabase.

import { useEffect, useMemo, useState } from "react";

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
  AlertBox,
  Badge,
  Button,
  Card,
  DataTable,
  KpiCard,
} from "../../components/ui";

import {
  AlertTriangle,
  Boxes,
  PackageCheck,
  RefreshCcw,
  ShoppingCart,
  Truck,
  Warehouse,
  Wheat,
} from "lucide-react";

import {
  buscarDadosDashboard,
  calcularCardsDashboard,
  montarAlertasDashboard,
  montarGraficosDashboard,
} from "../../services/dashboardService";

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function formatarKg(valor) {
  return `${Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
}

function obterBadgeStatus(status) {
  if (status === "sem_estoque") {
    return <Badge variant="danger">Sem estoque</Badge>;
  }

  if (status === "baixo") {
    return <Badge variant="warning">Estoque baixo</Badge>;
  }

  return <Badge variant="success">Normal</Badge>;
}

function GraficoBarras({
  titulo,
  descricao,
  dados,
  dataKey = "total",
  eixoX = "label",
  sufixo = " caixas",
}) {
  return (
    <Card>
      <div className="mb-5">
        <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
          {titulo}
        </h3>

        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {descricao}
        </p>
      </div>

      {dados.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 text-sm font-semibold text-[var(--color-text-muted)]">
          Nenhum dado registrado no banco.
        </div>
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey={eixoX}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatarNumero(value)}
              />
              <Tooltip
                formatter={(value) => [
                  `${formatarNumero(value)}${sufixo}`,
                  "Total",
                ]}
                labelStyle={{
                  color: "var(--color-text-primary)",
                  fontWeight: 700,
                }}
              />
              <Bar
                dataKey={dataKey}
                radius={[10, 10, 0, 0]}
                fill="var(--color-green-primary)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function Dashboard() {
  const [dados, setDados] = useState({
    chegadas: [],
    classificados: [],
    produtosFinais: [],
    saidas: [],
    estoqueAtual: [],
    alertas: [],
  });

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const cards = useMemo(() => {
    return calcularCardsDashboard(dados);
  }, [dados]);

  const graficos = useMemo(() => {
    return montarGraficosDashboard(dados);
  }, [dados]);

  const alertasDashboard = useMemo(() => {
    return montarAlertasDashboard(dados);
  }, [dados]);

  async function carregarDashboard() {
    try {
      setCarregando(true);
      setErro("");
      setSucesso("");

      const dadosBanco = await buscarDadosDashboard();

      setDados(dadosBanco);

      setSucesso("Dashboard carregado com dados reais do banco.");
    } catch (error) {
      console.error("Erro ao carregar Dashboard:", error);

      setErro(
        error.message ||
          "Não foi possível carregar o Dashboard. Confira as views, permissões e tabelas no Supabase."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDashboard();
  }, []);

  const columnsEstoque = [
    {
      key: "calibre_codigo",
      label: "Código",
    },
    {
      key: "calibre_nome",
      label: "Calibre",
    },
    {
      key: "estoque_classificado_caixas",
      label: "Classificado",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "produto_final_caixas",
      label: "Produto Final",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "saldo_disponivel_caixas",
      label: "Saldo Disponível",
      render: (value) =>
        Number(value) > 0 ? (
          <Badge variant="success">{formatarNumero(value)} caixas</Badge>
        ) : (
          <Badge variant="danger">0 caixas</Badge>
        ),
    },
    {
      key: "peso_disponivel_kg",
      label: "Peso Disponível",
      render: (value) => formatarKg(value),
    },
    {
      key: "status_estoque",
      label: "Status",
      render: (value) => obterBadgeStatus(value),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          title="Recebido da Fazenda"
          value={formatarNumero(cards.recebidoFazenda)}
          description="Caixas recebidas"
          icon={Wheat}
          variant="info"
        />

        <KpiCard
          title="Alho Classificado"
          value={formatarNumero(cards.alhoClassificado)}
          description="Caixas classificadas"
          icon={Boxes}
          variant="success"
        />

        <KpiCard
          title="Produto Final"
          value={formatarNumero(cards.produtoFinal)}
          description="Caixas prontas"
          icon={PackageCheck}
          variant="success"
        />

        <KpiCard
          title="Saídas / Vendas"
          value={formatarNumero(cards.saidasVendas)}
          description="Caixas expedidas"
          icon={Truck}
          variant="warning"
        />

        <KpiCard
          title="Saldo Disponível"
          value={formatarNumero(cards.saldoDisponivel)}
          description="Produto final - saídas"
          icon={Warehouse}
          variant={
            alertasDashboard.totalProdutoFinalDisponivel > 0
              ? "success"
              : "danger"
          }
        />
      </section>

      {erro && (
        <AlertBox
          variant="danger"
          title="Erro ao carregar Dashboard"
          description={erro}
        />
      )}

      {sucesso && !erro && (
        <AlertBox
          variant="success"
          title="Dashboard atualizado"
          description={sucesso}
        />
      )}

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Alertas do sistema
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Alertas calculados com base nos dados reais do estoque.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={carregarDashboard}
            disabled={carregando}
          >
            <RefreshCcw size={16} />
            {carregando ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {alertasDashboard.estoquesBaixos.length > 0 ? (
            <AlertBox
              variant="warning"
              title="Estoque baixo"
              description={`${formatarNumero(
                alertasDashboard.estoquesBaixos.length
              )} calibre(s) com estoque baixo ou sem estoque.`}
            />
          ) : (
            <AlertBox
              variant="success"
              title="Estoque sem alerta crítico"
              description="Nenhum calibre com estoque baixo no momento."
            />
          )}

          {alertasDashboard.recebimentosPendentes.length > 0 ? (
            <AlertBox
              variant="warning"
              title="Conferência pendente"
              description={`${formatarNumero(
                alertasDashboard.recebimentosPendentes.length
              )} recebimento(s) ainda não conferido(s).`}
            />
          ) : (
            <AlertBox
              variant="success"
              title="Conferências em dia"
              description="Nenhum recebimento pendente de conferência."
            />
          )}

          {alertasDashboard.maiorVolume && (
            <AlertBox
              variant="info"
              title="Alto volume em calibre"
              description={`${alertasDashboard.maiorVolume.calibre_codigo} — ${
                alertasDashboard.maiorVolume.calibre_nome
              } possui ${formatarNumero(
                alertasDashboard.maiorVolume.saldo_disponivel_caixas
              )} caixas disponíveis.`}
            />
          )}

          {alertasDashboard.totalProdutoFinalDisponivel > 0 ? (
            <AlertBox
              variant="success"
              title="Produto final disponível"
              description={`${formatarNumero(
                alertasDashboard.totalProdutoFinalDisponivel
              )} caixas prontas para venda.`}
            />
          ) : (
            <AlertBox
              variant="danger"
              title="Sem produto final disponível"
              description="Não existe saldo disponível para venda no momento."
            />
          )}
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <GraficoBarras
          titulo="Recebimento por dia"
          descricao="Total de caixas recebidas da fazenda por data."
          dados={graficos.recebimentoPorDia}
          eixoX="label"
        />

        <GraficoBarras
          titulo="Classificação por calibre"
          descricao="Total de caixas classificadas por calibre."
          dados={graficos.classificacaoPorCalibre}
          eixoX="calibre"
        />

        <GraficoBarras
          titulo="Produto final por dia"
          descricao="Total de caixas finais produzidas por data."
          dados={graficos.produtoFinalPorDia}
          eixoX="label"
        />

        <GraficoBarras
          titulo="Estoque atual por calibre"
          descricao="Saldo disponível por calibre."
          dados={graficos.estoqueAtualPorCalibre}
          eixoX="calibre"
        />
      </section>

      <Card>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Estoque atual por calibre
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Classificado, produto final, saldo disponível e status.
            </p>
          </div>

          <Badge variant="info">
            {carregando
              ? "Carregando"
              : `${formatarNumero(dados.estoqueAtual.length)} calibres`}
          </Badge>
        </div>

        {carregando ? (
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Carregando dados reais do banco...
          </div>
        ) : (
          <DataTable
            columns={columnsEstoque}
            data={dados.estoqueAtual}
            emptyMessage="Nenhum estoque encontrado no banco."
          />
        )}
      </Card>
    </div>
  );
}

export default Dashboard;