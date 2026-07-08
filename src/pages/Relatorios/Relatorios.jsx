// Tela Relatórios.
//
// Etapa 20:
// - Tipos de relatório
// - Filtros
// - Exportar CSV
// - Exportar Excel
// - Imprimir relatório
// - Baixar PDF via impressão do navegador
//
// Tudo vem do Supabase.
// Não usamos dados fictícios.

import { useEffect, useMemo, useState } from "react";

import {
  AlertBox,
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  KpiCard,
  Select,
} from "../../components/ui";

import {
  Download,
  FileBarChart,
  FileDown,
  FileSpreadsheet,
  Filter,
  PackageCheck,
  Printer,
  RotateCcw,
  Search,
  Truck,
} from "lucide-react";

import {
  TIPOS_RELATORIO,
  calcularResumoRelatorio,
  gerarRelatorio,
  listarOpcoesRelatorios,
  obterColunasRelatorio,
  prepararLinhasRelatorio,
} from "../../services/relatoriosService";

function obterDataAtual() {
  const data = new Date();
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

function escaparCsv(valor) {
  const texto = String(valor ?? "");

  if (texto.includes(";") || texto.includes('"') || texto.includes("\n")) {
    return `"${texto.replaceAll('"', '""')}"`;
  }

  return texto;
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function baixarArquivo(nomeArquivo, conteudo, tipo) {
  const blob = new Blob([conteudo], {
    type: tipo,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  link.click();

  URL.revokeObjectURL(url);
}

function Relatorios() {
  const [calibres, setCalibres] = useState([]);
  const [fazendas, setFazendas] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);

  const [dadosRelatorio, setDadosRelatorio] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [filtros, setFiltros] = useState({
    tipoRelatorio: "recebimento_fazenda",
    dataInicial: "",
    dataFinal: obterDataAtual(),
    calibreId: "",
    fazendaId: "",
    responsavelId: "",
    cliente: "",
  });

  const tipoSelecionado = useMemo(() => {
    return (
      TIPOS_RELATORIO.find((item) => item.value === filtros.tipoRelatorio) ||
      TIPOS_RELATORIO[0]
    );
  }, [filtros.tipoRelatorio]);

  const calibreOptions = useMemo(() => {
    return calibres.map((calibre) => ({
      value: calibre.id,
      label: `${calibre.codigo} — ${calibre.nome}`,
    }));
  }, [calibres]);

  const fazendaOptions = useMemo(() => {
    return fazendas.map((fazenda) => ({
      value: fazenda.id,
      label: fazenda.nome,
    }));
  }, [fazendas]);

  const responsavelOptions = useMemo(() => {
    return responsaveis.map((responsavel) => ({
      value: responsavel.id,
      label: responsavel.nome,
    }));
  }, [responsaveis]);

  const colunas = useMemo(() => {
    return obterColunasRelatorio(filtros.tipoRelatorio);
  }, [filtros.tipoRelatorio]);

  const linhasTabela = useMemo(() => {
    return prepararLinhasRelatorio(filtros.tipoRelatorio, dadosRelatorio);
  }, [filtros.tipoRelatorio, dadosRelatorio]);

  const resumo = useMemo(() => {
    return calcularResumoRelatorio(filtros.tipoRelatorio, dadosRelatorio);
  }, [filtros.tipoRelatorio, dadosRelatorio]);

  const cardsResumo = useMemo(() => {
    if (filtros.tipoRelatorio === "estoque_atual") {
      return [
        {
          title: "Classificado",
          value: formatarNumero(resumo.totalClassificado),
          description: "Caixas classificadas",
          icon: PackageCheck,
          variant: "info",
        },
        {
          title: "Produto final",
          value: formatarNumero(resumo.totalProdutoFinal),
          description: "Caixas produzidas",
          icon: FileBarChart,
          variant: "success",
        },
        {
          title: "Saídas",
          value: formatarNumero(resumo.totalSaidas),
          description: "Caixas expedidas",
          icon: Truck,
          variant: "warning",
        },
        {
          title: "Saldo disponível",
          value: formatarNumero(resumo.extraValor),
          description: resumo.extraLabel,
          icon: Download,
          variant: "success",
        },
      ];
    }

    if (filtros.tipoRelatorio === "consolidado_calibre") {
      return [
        {
          title: "Classificado",
          value: formatarNumero(resumo.totalClassificado),
          description: "Caixas no período",
          icon: PackageCheck,
          variant: "info",
        },
        {
          title: "Produto final",
          value: formatarNumero(resumo.totalProdutoFinal),
          description: "Caixas no período",
          icon: FileBarChart,
          variant: "success",
        },
        {
          title: "Saídas",
          value: formatarNumero(resumo.totalSaidas),
          description: "Caixas no período",
          icon: Truck,
          variant: "warning",
        },
        {
          title: "Saldo período",
          value: formatarNumero(resumo.extraValor),
          description: formatarKg(resumo.totalPesoKg),
          icon: Download,
          variant: "success",
        },
      ];
    }

    return [
      {
        title: "Registros",
        value: formatarNumero(resumo.totalRegistros),
        description: "Linhas encontradas",
        icon: FileBarChart,
        variant: "info",
      },
      {
        title: "Caixas",
        value: formatarNumero(resumo.totalCaixas),
        description: "Total do relatório",
        icon: PackageCheck,
        variant: "success",
      },
      {
        title: "Peso total",
        value: formatarKg(resumo.totalPesoKg),
        description: "Peso calculado",
        icon: Truck,
        variant: "warning",
      },
      {
        title: resumo.extraLabel || "Extra",
        value: formatarNumero(resumo.extraValor),
        description: "Indicador do relatório",
        icon: Download,
        variant: "info",
      },
    ];
  }, [filtros.tipoRelatorio, resumo]);

  async function carregarTela() {
    try {
      setCarregando(true);
      setErro("");

      const opcoes = await listarOpcoesRelatorios();

      setCalibres(opcoes.calibres);
      setFazendas(opcoes.fazendas);
      setResponsaveis(opcoes.responsaveis);

      const dados = await gerarRelatorio(filtros.tipoRelatorio, filtros);

      setDadosRelatorio(dados);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);

      setErro(
        error.message ||
          "Não foi possível carregar os relatórios. Confira as permissões no Supabase."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarTela();
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

  async function gerarRelatorioAtual() {
    try {
      setGerando(true);
      setErro("");
      setSucesso("");

      if (
        filtros.dataInicial &&
        filtros.dataFinal &&
        filtros.dataInicial > filtros.dataFinal
      ) {
        setErro("A data inicial não pode ser maior que a data final.");
        return;
      }

      const dados = await gerarRelatorio(filtros.tipoRelatorio, filtros);

      setDadosRelatorio(dados);
      setSucesso("Relatório gerado com dados reais do banco.");
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);

      setErro(error.message || "Não foi possível gerar o relatório.");
    } finally {
      setGerando(false);
    }
  }

  async function limparFiltros() {
    const filtrosLimpos = {
      tipoRelatorio: "recebimento_fazenda",
      dataInicial: "",
      dataFinal: obterDataAtual(),
      calibreId: "",
      fazendaId: "",
      responsavelId: "",
      cliente: "",
    };

    try {
      setGerando(true);
      setErro("");
      setSucesso("");

      setFiltros(filtrosLimpos);

      const dados = await gerarRelatorio(
        filtrosLimpos.tipoRelatorio,
        filtrosLimpos
      );

      setDadosRelatorio(dados);
      setSucesso("Filtros limpos e relatório atualizado.");
    } catch (error) {
      console.error("Erro ao limpar filtros:", error);

      setErro(error.message || "Não foi possível limpar os filtros.");
    } finally {
      setGerando(false);
    }
  }

  function obterNomeArquivo(extensao) {
    const data = new Date().toISOString().slice(0, 10);

    return `relatorio-${filtros.tipoRelatorio}-${data}.${extensao}`;
  }

  function validarExportacao() {
    if (linhasTabela.length === 0) {
      setErro("Não existem dados para exportar.");
      return false;
    }

    return true;
  }

  function exportarCsv() {
    if (!validarExportacao()) return;

    const cabecalho = colunas.map((coluna) => coluna.label);

    const linhas = linhasTabela.map((linha) => {
      return colunas.map((coluna) => linha[coluna.key] ?? "");
    });

    const conteudo = [
      cabecalho.map(escaparCsv).join(";"),
      ...linhas.map((linha) => linha.map(escaparCsv).join(";")),
    ].join("\n");

    baixarArquivo(
      obterNomeArquivo("csv"),
      "\uFEFF" + conteudo,
      "text/csv;charset=utf-8;"
    );

    setSucesso("CSV exportado com sucesso.");
  }

  function exportarExcel() {
    if (!validarExportacao()) return;

    const cabecalhoHtml = colunas
      .map((coluna) => `<th>${escaparHtml(coluna.label)}</th>`)
      .join("");

    const linhasHtml = linhasTabela
      .map((linha) => {
        const celulas = colunas
          .map((coluna) => `<td>${escaparHtml(linha[coluna.key] ?? "")}</td>`)
          .join("");

        return `<tr>${celulas}</tr>`;
      })
      .join("");

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table border="1">
            <thead>
              <tr>${cabecalhoHtml}</tr>
            </thead>
            <tbody>
              ${linhasHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    baixarArquivo(
      obterNomeArquivo("xls"),
      html,
      "application/vnd.ms-excel;charset=utf-8;"
    );

    setSucesso("Excel exportado com sucesso.");
  }

  function abrirImpressao() {
    if (!validarExportacao()) return;

    const cabecalhoHtml = colunas
      .map((coluna) => `<th>${escaparHtml(coluna.label)}</th>`)
      .join("");

    const linhasHtml = linhasTabela
      .map((linha) => {
        const celulas = colunas
          .map((coluna) => `<td>${escaparHtml(linha[coluna.key] ?? "")}</td>`)
          .join("");

        return `<tr>${celulas}</tr>`;
      })
      .join("");

    const janela = window.open("", "_blank");

    if (!janela) {
      setErro("O navegador bloqueou a janela de impressão.");
      return;
    }

    janela.document.write(`
      <html>
        <head>
          <title>${escaparHtml(tipoSelecionado.label)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #1f2933;
            }

            h1 {
              margin-bottom: 4px;
              color: #12372a;
            }

            p {
              margin-top: 0;
              color: #65726b;
              font-size: 13px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 12px;
            }

            th {
              background: #e8f5ee;
              color: #12372a;
              text-align: left;
              padding: 8px;
              border: 1px solid #dfe7e2;
            }

            td {
              padding: 8px;
              border: 1px solid #dfe7e2;
            }
          </style>
        </head>
        <body>
          <h1>${escaparHtml(tipoSelecionado.label)}</h1>
          <p>Relatório gerado pelo sistema Estoque de Alho.</p>

          <table>
            <thead>
              <tr>${cabecalhoHtml}</tr>
            </thead>
            <tbody>
              ${linhasHtml}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    janela.document.close();

    setSucesso("Janela de impressão aberta. Para PDF, escolha 'Salvar como PDF'.");
  }

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cardsResumo.map((card) => (
          <KpiCard
            key={card.title}
            title={card.title}
            value={card.value}
            description={card.description}
            icon={card.icon}
            variant={card.variant}
          />
        ))}
      </section>

      {erro && (
        <AlertBox
          variant="danger"
          title="Atenção"
          description={erro}
        />
      )}

      {sucesso && (
        <AlertBox
          variant="success"
          title="Operação concluída"
          description={sucesso}
        />
      )}

      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-green-light)] text-[var(--color-green-primary)]">
            <Filter size={24} />
          </div>

          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Filtros do relatório
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Escolha o tipo de relatório e aplique os filtros necessários.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Select
            label="Tipo de relatório"
            name="tipoRelatorio"
            value={filtros.tipoRelatorio}
            onChange={atualizarFiltro}
            options={TIPOS_RELATORIO}
          />

          <Input
            label="Data inicial"
            name="dataInicial"
            type="date"
            value={filtros.dataInicial}
            onChange={atualizarFiltro}
          />

          <Input
            label="Data final"
            name="dataFinal"
            type="date"
            value={filtros.dataFinal}
            onChange={atualizarFiltro}
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
            label="Fazenda"
            name="fazendaId"
            value={filtros.fazendaId}
            onChange={atualizarFiltro}
            options={fazendaOptions}
            placeholder="Todas as fazendas"
          />

          <Select
            label="Responsável"
            name="responsavelId"
            value={filtros.responsavelId}
            onChange={atualizarFiltro}
            options={responsavelOptions}
            placeholder="Todos os responsáveis"
          />

          <Input
            label="Cliente"
            name="cliente"
            value={filtros.cliente}
            onChange={atualizarFiltro}
            placeholder="Usado em saídas/vendas"
          />
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={limparFiltros}
            disabled={gerando}
          >
            <RotateCcw size={16} />
            Limpar
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={gerarRelatorioAtual}
            disabled={gerando}
          >
            <Search size={16} />
            {gerando ? "Gerando..." : "Gerar relatório"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Exportações
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Exporte ou imprima o relatório gerado.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={exportarCsv}>
              <Download size={16} />
              Exportar CSV
            </Button>

            <Button type="button" variant="secondary" onClick={exportarExcel}>
              <FileSpreadsheet size={16} />
              Exportar Excel
            </Button>

            <Button type="button" variant="secondary" onClick={abrirImpressao}>
              <Printer size={16} />
              Imprimir relatório
            </Button>

            <Button type="button" variant="secondary" onClick={abrirImpressao}>
              <FileDown size={16} />
              Baixar PDF
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              {tipoSelecionado.label}
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Resultado do relatório com dados reais do banco.
            </p>
          </div>

          <Badge variant="info">
            {carregando
              ? "Carregando"
              : `${formatarNumero(linhasTabela.length)} linhas`}
          </Badge>
        </div>

        {carregando ? (
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Carregando relatório do banco...
          </div>
        ) : (
          <DataTable
            columns={colunas}
            data={linhasTabela}
            emptyMessage="Nenhum dado encontrado para os filtros aplicados."
          />
        )}
      </Card>
    </div>
  );
}

export default Relatorios;