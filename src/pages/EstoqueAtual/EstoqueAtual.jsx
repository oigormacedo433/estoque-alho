import { useEffect, useMemo, useState } from "react";

import {
  AlertBox,
  Badge,
  Button,
  Card,
  DataTable,
  KpiCard,
  Select,
} from "../../components/ui";

import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Download,
  MapPinned,
  PackageCheck,
  RefreshCcw,
  Scale,
  Truck,
} from "lucide-react";

import { listarAreasAtivas } from "../../services/areasFazendaService";
import { listarCalibresAtivos } from "../../services/calibresService";

import {
  calcularResumoEstoqueArea,
  calcularResumoPorArea,
  calcularResumoPorCalibreDentroDasAreas,
  listarEstoqueAtualPorArea,
  obterStatusTextoEstoque,
} from "../../services/estoqueAtualService";

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

function baixarCSV(nomeArquivo, linhas = []) {
  if (!linhas.length) {
    return;
  }

  const colunas = Object.keys(linhas[0]);

  const cabecalho = colunas.join(";");

  const corpo = linhas
    .map((linha) => {
      return colunas
        .map((coluna) => {
          const valor = linha[coluna] ?? "";
          return `"${String(valor).replaceAll('"', '""')}"`;
        })
        .join(";");
    })
    .join("\n");

  const csv = `${cabecalho}\n${corpo}`;
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  link.click();

  URL.revokeObjectURL(url);
}

function EstoqueAtual() {
  const [areas, setAreas] = useState([]);
  const [calibres, setCalibres] = useState([]);
  const [estoque, setEstoque] = useState([]);

  const [filtros, setFiltros] = useState({
    areaId: "",
    calibreId: "",
    status: "",
  });

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const areaOptions = useMemo(() => {
    return areas.map((area) => ({
      value: area.id,
      label: area.nome,
    }));
  }, [areas]);

  const calibreOptions = useMemo(() => {
    return calibres.map((calibre) => ({
      value: calibre.id,
      label: `${calibre.codigo} — ${calibre.nome}`,
    }));
  }, [calibres]);

  const resumo = useMemo(() => {
    return calcularResumoEstoqueArea(estoque);
  }, [estoque]);

  const resumoPorArea = useMemo(() => {
    return calcularResumoPorArea(estoque);
  }, [estoque]);

  const resumoPorCalibre = useMemo(() => {
    return calcularResumoPorCalibreDentroDasAreas(estoque);
  }, [estoque]);

  async function carregarDados(filtrosAtuais = filtros) {
    try {
      setCarregando(true);
      setErro("");
      setSucesso("");

      const [areasBanco, calibresBanco, estoqueBanco] = await Promise.all([
        listarAreasAtivas(),
        listarCalibresAtivos(),
        listarEstoqueAtualPorArea(filtrosAtuais),
      ]);

      setAreas(areasBanco || []);
      setCalibres(calibresBanco || []);
      setEstoque(estoqueBanco || []);
    } catch (error) {
      console.error("Erro ao carregar estoque atual:", error);

      setErro(
        error.message ||
          "Não foi possível carregar o estoque atual por Área / Pivô."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
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
    carregarDados(filtros);
  }

  function limparFiltros() {
    const filtrosLimpos = {
      areaId: "",
      calibreId: "",
      status: "",
    };

    setFiltros(filtrosLimpos);
    carregarDados(filtrosLimpos);
  }

  function exportarEstoqueArea() {
    const linhas = estoque.map((item) => ({
      "Área / Pivô": item.area_nome || "-",
      Calibre: `${item.calibre_codigo || "-"} — ${item.calibre_nome || "-"}`,
      "Produto final caixas": item.produto_final_caixas,
      "Produto final peso kg": item.produto_final_peso_kg,
      "Saídas caixas": item.saidas_caixas,
      "Saídas peso kg": item.saidas_peso_kg,
      "Saldo disponível caixas": item.saldo_disponivel_caixas,
      "Peso disponível kg": item.peso_disponivel_kg,
      Status: obterStatusTextoEstoque(item.status_estoque_area),
    }));

    if (!linhas.length) {
      setErro("Não há dados para exportar.");
      return;
    }

    baixarCSV("estoque-atual-por-area.csv", linhas);

    setSucesso("CSV do estoque por Área / Pivô baixado com sucesso.");
  }

  const columnsEstoqueAreaCalibre = [
    {
      key: "area_nome",
      label: "Área / Pivô",
      render: (value) => (
        <p className="font-bold text-[var(--color-text-primary)]">
          {value || "-"}
        </p>
      ),
    },
    {
      key: "calibre_codigo",
      label: "Calibre",
      render: (value, row) => (
        <div>
          <p className="font-bold text-[var(--color-text-primary)]">
            {value} — {row.calibre_nome}
          </p>

          <p className="text-xs font-semibold text-[var(--color-text-muted)]">
            {row.calibre_tipo || "-"}
          </p>
        </div>
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
      key: "estoque_minimo_por_calibre",
      label: "Mínimo",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "status_estoque_area",
      label: "Status",
      render: (value) => (
        <Badge variant={statusVariant(value)}>
          {obterStatusTextoEstoque(value)}
        </Badge>
      ),
    },
  ];

  const columnsResumoArea = [
    {
      key: "area_nome",
      label: "Área / Pivô",
      render: (value, row) => (
        <div>
          <p className="font-bold text-[var(--color-text-primary)]">
            {value || "-"}
          </p>

          <p className="text-xs font-semibold text-[var(--color-text-muted)]">
            {formatarNumero(row.total_calibres)} calibre(s) lançados ·{" "}
            {formatarNumero(row.calibres_com_saldo)} com saldo
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
      label: "Peso disponível",
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
      render: (value, row) => (
        <div>
          <Badge variant={statusVariant(value)}>
            {obterStatusTextoEstoque(value)}
          </Badge>

          {row.alertas > 0 && (
            <p className="mt-1 text-xs font-semibold text-orange-700">
              {formatarNumero(row.alertas)} alerta(s)
            </p>
          )}
        </div>
      ),
    },
  ];

  const columnsResumoCalibre = [
    {
      key: "calibre_codigo",
      label: "Calibre",
      render: (value, row) => (
        <div>
          <p className="font-bold text-[var(--color-text-primary)]">
            {value} — {row.calibre_nome}
          </p>

          <p className="text-xs font-semibold text-[var(--color-text-muted)]">
            Presente em {formatarNumero(row.total_areas)} área(s)
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
      label: "Peso disponível",
      render: (value) => formatarKg(value),
    },
    {
      key: "status_calibre",
      label: "Status",
      render: (value) => (
        <Badge variant={statusVariant(value)}>
          {obterStatusTextoEstoque(value)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Produto final"
          value={formatarNumero(resumo.totalProdutoFinal)}
          description={formatarKg(resumo.totalProdutoFinalPeso)}
          icon={PackageCheck}
          variant="success"
        />

        <KpiCard
          title="Saídas"
          value={formatarNumero(resumo.totalSaidas)}
          description={formatarKg(resumo.totalSaidasPeso)}
          icon={Truck}
          variant="warning"
        />

        <KpiCard
          title="Saldo disponível"
          value={formatarNumero(resumo.saldoDisponivel)}
          description={formatarKg(resumo.pesoDisponivel)}
          icon={BarChart3}
          variant="info"
        />

        <KpiCard
          title="Áreas com estoque"
          value={formatarNumero(resumo.areasComEstoque)}
          description={`${formatarNumero(resumo.areasEmAlerta)} área(s) em alerta`}
          icon={MapPinned}
          variant={resumo.areasEmAlerta > 0 ? "warning" : "success"}
        />

        <KpiCard
          title="Calibres com estoque"
          value={formatarNumero(resumo.calibresComEstoque)}
          description="Calibres disponíveis nas áreas"
          icon={Boxes}
          variant="info"
        />

        <KpiCard
          title="Estoque normal"
          value={formatarNumero(resumo.itensNormais)}
          description="Área + calibre sem alerta"
          icon={Scale}
          variant="success"
        />

        <KpiCard
          title="Estoque baixo"
          value={formatarNumero(resumo.itensEstoqueBaixo)}
          description="Área + calibre abaixo do mínimo"
          icon={AlertTriangle}
          variant="warning"
        />

        <KpiCard
          title="Sem estoque"
          value={formatarNumero(resumo.itensSemEstoque)}
          description="Área + calibre zerado"
          icon={AlertTriangle}
          variant="danger"
        />
      </section>

      {erro && <AlertBox variant="danger" title="Atenção" description={erro} />}

      {sucesso && (
        <AlertBox
          variant="success"
          title="Operação concluída"
          description={sucesso}
        />
      )}

      <Card>
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Estoque atual por Área / Pivô
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Veja o saldo real separado por Área / Pivô e calibre.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:min-w-[760px]">
            <Select
              label="Área / Pivô"
              name="areaId"
              value={filtros.areaId}
              onChange={atualizarFiltro}
              options={areaOptions}
              placeholder="Todas as áreas"
            />

            <Select
              label="Calibre"
              name="calibreId"
              value={filtros.calibreId}
              onChange={atualizarFiltro}
              options={calibreOptions}
              placeholder="Todos os calibres"
            />

            <Select
              label="Status"
              name="status"
              value={filtros.status}
              onChange={atualizarFiltro}
              options={[
                { value: "normal", label: "Normal" },
                { value: "baixo", label: "Estoque baixo" },
                { value: "sem_estoque", label: "Sem estoque" },
              ]}
              placeholder="Todos os status"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={limparFiltros}
            disabled={carregando}
          >
            <RefreshCcw size={16} />
            Limpar filtros
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={aplicarFiltros}
            disabled={carregando}
          >
            <RefreshCcw size={16} />
            {carregando ? "Carregando..." : "Atualizar"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={exportarEstoqueArea}
            disabled={carregando || estoque.length === 0}
          >
            <Download size={16} />
            Exportar CSV
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Tabela principal: Área / Pivô + Calibre
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Essa é a visão mais importante: mostra o estoque de cada calibre dentro de cada área.
            </p>
          </div>

          <Badge variant="info">
            {carregando
              ? "Carregando"
              : `${formatarNumero(estoque.length)} combinações`}
          </Badge>
        </div>

        {carregando ? (
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Carregando estoque por Área / Pivô...
          </div>
        ) : (
          <DataTable
            columns={columnsEstoqueAreaCalibre}
            data={estoque}
            emptyMessage="Nenhum estoque encontrado por Área / Pivô."
          />
        )}
      </Card>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <div className="mb-5">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Resumo por Área / Pivô
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Total produzido, vendido, disponível e alertas de cada área.
            </p>
          </div>

          <DataTable
            columns={columnsResumoArea}
            data={resumoPorArea}
            emptyMessage="Nenhuma área com estoque."
          />
        </Card>

        <Card>
          <div className="mb-5">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Resumo por calibre nas áreas
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Mostra cada calibre somado entre todas as áreas.
            </p>
          </div>

          <DataTable
            columns={columnsResumoCalibre}
            data={resumoPorCalibre}
            emptyMessage="Nenhum calibre com estoque."
          />
        </Card>
      </section>

      <Card>
        <AlertBox
          variant="info"
          title="Leitura correta do estoque"
          description="O estoque agora é controlado por Área / Pivô + Calibre. Produto Final cria saldo nessa área, Saída baixa dessa mesma área, e o saldo disponível mostra o que ainda existe em cada área."
        />
      </Card>
    </div>
  );
}

export default EstoqueAtual;