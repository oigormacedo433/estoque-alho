// Tela Consulta Estoque Classificado.
//
// Etapa 14:
// - Filtros por período, calibre, fazenda, lote, responsável e status
// - Resumo do período
// - Tabela de classificações
// - Detalhe rápido
// - Saldo classificado atual por calibre
// - Editar classificação
// - Excluir classificação
// - Paginação
//
// Não usamos dados fictícios.
// Tudo vem do Supabase.

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
  Textarea,
} from "../../components/ui";

import {
  Boxes,
  CheckCircle,
  Eye,
  Layers,
  Package,
  Pencil,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import { listarCalibresAtivos } from "../../services/calibresService";
import { listarFazendasAtivas } from "../../services/fazendasService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";

import {
  calcularEstoqueClassificadoPorCalibre,
  calcularResumoAlhoClassificado,
  editarAlhoClassificado,
  excluirAlhoClassificado,
  listarAlhoClassificado,
} from "../../services/alhoClassificadoService";

function obterDataAtual() {
  const data = new Date();
  const dataLocal = new Date(data.getTime() - data.getTimezoneOffset() * 60000);

  return dataLocal.toISOString().slice(0, 10);
}

function formatarData(data) {
  if (!data) return "-";

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarHora(hora) {
  if (!hora) return "-";

  return hora.slice(0, 5);
}

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function ConsultaEstoqueClassificado() {
  const [fazendas, setFazendas] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [calibres, setCalibres] = useState([]);

  const [todosRegistros, setTodosRegistros] = useState([]);
  const [registros, setRegistros] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [detalheSelecionado, setDetalheSelecionado] = useState(null);
  const [registroEditandoId, setRegistroEditandoId] = useState(null);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  const [filtros, setFiltros] = useState({
    dataInicial: "",
    dataFinal: "",
    calibreId: "",
    fazendaId: "",
    lote: "",
    responsavelId: "",
    conferido: "todos",
  });

  const [formEdicao, setFormEdicao] = useState({
    data_classificacao: "",
    hora: "",
    fazenda_id: "",
    lote: "",
    calibre_id: "",
    quantidade_paletes: "",
    caixas_por_palete: "",
    conferido: "nao",
    responsavel_id: "",
    observacao: "",
  });

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

  const calibreOptions = useMemo(() => {
    return calibres.map((calibre) => ({
      value: calibre.id,
      label: `${calibre.codigo} — ${calibre.nome}`,
    }));
  }, [calibres]);

  const resumo = useMemo(() => {
    return calcularResumoAlhoClassificado(registros);
  }, [registros]);

  const estoqueClassificadoAtual = useMemo(() => {
    return calcularEstoqueClassificadoPorCalibre(todosRegistros);
  }, [todosRegistros]);

  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(registros.length / itensPorPagina));
  }, [registros.length]);

  const registrosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;

    return registros.slice(inicio, fim);
  }, [registros, paginaAtual]);

  const totalCaixasEdicao = useMemo(() => {
    const paletes = Number(formEdicao.quantidade_paletes || 0);
    const caixasPorPalete = Number(formEdicao.caixas_por_palete || 0);

    return paletes * caixasPorPalete;
  }, [formEdicao.quantidade_paletes, formEdicao.caixas_por_palete]);

  const saldoAtualDetalhe = useMemo(() => {
    if (!detalheSelecionado) {
      return null;
    }

    const calibreId =
      detalheSelecionado.calibres?.id || detalheSelecionado.calibre_id;

    return (
      estoqueClassificadoAtual.find((item) => item.id === calibreId) || null
    );
  }, [detalheSelecionado, estoqueClassificadoAtual]);

  async function carregarOpcoes() {
    const [fazendasBanco, responsaveisBanco, calibresBanco] =
      await Promise.all([
        listarFazendasAtivas(),
        listarResponsaveisAtivos(),
        listarCalibresAtivos(),
      ]);

    setFazendas(fazendasBanco);
    setResponsaveis(responsaveisBanco);
    setCalibres(calibresBanco);
  }

  function montarFiltrosParaBusca(filtrosAtuais) {
    return {
      dataInicial: filtrosAtuais.dataInicial || "",
      dataFinal: filtrosAtuais.dataFinal || "",
      calibreId: filtrosAtuais.calibreId || "",
      fazendaId: filtrosAtuais.fazendaId || "",
      lote: filtrosAtuais.lote || "",
      responsavelId: filtrosAtuais.responsavelId || "",
      conferido:
        filtrosAtuais.conferido === "todos" ? "" : filtrosAtuais.conferido,
    };
  }

  async function carregarRegistros(filtrosAtuais = filtros) {
    try {
      setCarregando(true);
      setErro("");
      setSucesso("");

      const [todosBanco, filtradosBanco] = await Promise.all([
        listarAlhoClassificado(),
        listarAlhoClassificado(montarFiltrosParaBusca(filtrosAtuais)),
      ]);

      setTodosRegistros(todosBanco);
      setRegistros(filtradosBanco);
      setPaginaAtual(1);

      if (filtradosBanco.length === 0) {
        setDetalheSelecionado(null);
      }

      setSucesso("Consulta carregada com dados reais do banco.");
    } catch (error) {
      console.error("Erro ao consultar estoque classificado:", error);

      setErro(
        error.message ||
          "Não foi possível consultar o estoque classificado. Confira as permissões no Supabase."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function carregarTela() {
    try {
      setCarregando(true);
      setErro("");

      await carregarOpcoes();

      const dados = await listarAlhoClassificado();

      setTodosRegistros(dados);
      setRegistros(dados);
      setPaginaAtual(1);
    } catch (error) {
      console.error("Erro ao carregar consulta de estoque classificado:", error);

      setErro(
        error.message ||
          "Não foi possível carregar a consulta de estoque classificado."
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
  }

  function aplicarFiltros() {
    if (
      filtros.dataInicial &&
      filtros.dataFinal &&
      filtros.dataInicial > filtros.dataFinal
    ) {
      setErro("A data inicial não pode ser maior que a data final.");
      return;
    }

    carregarRegistros(filtros);
  }

  function limparFiltros() {
    const filtrosLimpos = {
      dataInicial: "",
      dataFinal: "",
      calibreId: "",
      fazendaId: "",
      lote: "",
      responsavelId: "",
      conferido: "todos",
    };

    setFiltros(filtrosLimpos);
    setDetalheSelecionado(null);
    setRegistroEditandoId(null);
    setErro("");
    setSucesso("");

    carregarRegistros(filtrosLimpos);
  }

  function visualizarRegistro(registro) {
    setDetalheSelecionado(registro);
    setRegistroEditandoId(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function iniciarEdicao(registro) {
    setErro("");
    setSucesso("");
    setDetalheSelecionado(registro);
    setRegistroEditandoId(registro.id);

    setFormEdicao({
      data_classificacao: registro.data_classificacao || obterDataAtual(),
      hora: formatarHora(registro.hora),
      fazenda_id: registro.fazendas?.id || registro.fazenda_id || "",
      lote: registro.lote || "",
      calibre_id: registro.calibres?.id || registro.calibre_id || "",
      quantidade_paletes: String(registro.quantidade_paletes || ""),
      caixas_por_palete: String(registro.caixas_por_palete || ""),
      conferido: registro.conferido ? "sim" : "nao",
      responsavel_id: registro.responsaveis?.id || registro.responsavel_id || "",
      observacao: registro.observacao || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelarEdicao() {
    setRegistroEditandoId(null);
  }

  function atualizarFormEdicao(event) {
    const { name, value } = event.target;

    setFormEdicao((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));

    setErro("");
  }

  function validarEdicao() {
    if (!formEdicao.data_classificacao) {
      return "Informe a data da classificação.";
    }

    if (!formEdicao.hora) {
      return "Informe a hora.";
    }

    if (!formEdicao.fazenda_id) {
      return "Selecione a fazenda/origem.";
    }

    if (!formEdicao.calibre_id) {
      return "Selecione o calibre.";
    }

    if (!formEdicao.quantidade_paletes) {
      return "Informe a quantidade de paletes.";
    }

    if (Number(formEdicao.quantidade_paletes) <= 0) {
      return "A quantidade de paletes precisa ser maior que zero.";
    }

    if (!formEdicao.caixas_por_palete) {
      return "Informe a quantidade de caixas por palete.";
    }

    if (Number(formEdicao.caixas_por_palete) <= 0) {
      return "A quantidade de caixas por palete precisa ser maior que zero.";
    }

    return "";
  }

  async function salvarEdicao(event) {
    event.preventDefault();

    try {
      setErro("");
      setSucesso("");

      const mensagemErro = validarEdicao();

      if (mensagemErro) {
        setErro(mensagemErro);
        return;
      }

      setSalvandoEdicao(true);

      const payload = {
        ...formEdicao,
        conferido: formEdicao.conferido === "sim",
      };

      await editarAlhoClassificado(registroEditandoId, payload);

      setSucesso("Classificação atualizada com sucesso.");
      setRegistroEditandoId(null);

      await carregarRegistros(filtros);
    } catch (error) {
      console.error("Erro ao editar classificação:", error);

      setErro(error.message || "Não foi possível editar a classificação.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function excluirRegistro(registro) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir esta classificação?\n\nData: ${formatarData(
        registro.data_classificacao
      )}\nCalibre: ${
        registro.calibres
          ? `${registro.calibres.codigo} — ${registro.calibres.nome}`
          : "-"
      }\nTotal de caixas: ${formatarNumero(
        registro.total_caixas
      )}\n\nEssa ação apaga o registro do banco e reduz o estoque classificado.`
    );

    if (!confirmar) {
      return;
    }

    try {
      setErro("");
      setSucesso("");
      setExcluindoId(registro.id);

      await excluirAlhoClassificado(registro.id);

      if (detalheSelecionado?.id === registro.id) {
        setDetalheSelecionado(null);
      }

      if (registroEditandoId === registro.id) {
        setRegistroEditandoId(null);
      }

      setSucesso("Classificação excluída com sucesso.");

      await carregarRegistros(filtros);
    } catch (error) {
      console.error("Erro ao excluir classificação:", error);

      setErro(error.message || "Não foi possível excluir a classificação.");
    } finally {
      setExcluindoId(null);
    }
  }

  function irParaPaginaAnterior() {
    setPaginaAtual((pagina) => Math.max(1, pagina - 1));
  }

  function irParaProximaPagina() {
    setPaginaAtual((pagina) => Math.min(totalPaginas, pagina + 1));
  }

  const columns = [
    {
      key: "data_classificacao",
      label: "Data",
      render: (value) => formatarData(value),
    },
    {
      key: "hora",
      label: "Hora",
      render: (value) => formatarHora(value),
    },
    {
      key: "fazendas",
      label: "Fazenda / Origem",
      render: (value) => value?.nome || "-",
    },
    {
      key: "lote",
      label: "Lote",
      render: (value) => value || "-",
    },
    {
      key: "calibres",
      label: "Calibre",
      render: (value) => (value ? `${value.codigo} — ${value.nome}` : "-"),
    },
    {
      key: "quantidade_paletes",
      label: "Paletes",
      render: (value) => formatarNumero(value),
    },
    {
      key: "caixas_por_palete",
      label: "Caixas/Palete",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "total_caixas",
      label: "Total de caixas",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "responsaveis",
      label: "Responsável",
      render: (value) => value?.nome || "-",
    },
    {
      key: "observacao",
      label: "Observação",
      render: (value) => value || "-",
    },
    {
      key: "acoes",
      label: "Ações",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => visualizarRegistro(row)}
          >
            <Eye size={16} />
            Ver
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={salvandoEdicao || excluindoId === row.id}
            onClick={() => iniciarEdicao(row)}
          >
            <Pencil size={16} />
            Editar
          </Button>

          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={salvandoEdicao || excluindoId === row.id}
            onClick={() => excluirRegistro(row)}
          >
            <Trash2 size={16} />
            {excluindoId === row.id ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Lançamentos"
          value={formatarNumero(resumo.totalRegistros)}
          description="Registros no período"
          icon={Boxes}
          variant="info"
        />

        <KpiCard
          title="Paletes classificados"
          value={formatarNumero(resumo.totalPaletes)}
          description="Total filtrado"
          icon={Layers}
          variant="success"
        />

        <KpiCard
          title="Caixas equivalentes"
          value={formatarNumero(resumo.totalCaixas)}
          description="Paletes x caixas por palete"
          icon={Package}
          variant="success"
        />

        <KpiCard
          title="Calibres ativos"
          value={formatarNumero(calibres.length)}
          description="Disponíveis para lançamento"
          icon={CheckCircle}
          variant="info"
        />
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
            <Search size={24} />
          </div>

          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Filtros da consulta
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Filtre as classificações por período, calibre, origem, lote,
              responsável e status.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
            label="Fazenda / Origem"
            name="fazendaId"
            value={filtros.fazendaId}
            onChange={atualizarFiltro}
            options={fazendaOptions}
            placeholder="Todas as origens"
          />

          <Input
            label="Lote / Carga"
            name="lote"
            value={filtros.lote}
            onChange={atualizarFiltro}
            placeholder="Buscar por lote/carga"
          />

          <Select
            label="Responsável"
            name="responsavelId"
            value={filtros.responsavelId}
            onChange={atualizarFiltro}
            options={responsavelOptions}
            placeholder="Todos os responsáveis"
          />

          <Select
            label="Status"
            name="conferido"
            value={filtros.conferido}
            onChange={atualizarFiltro}
            options={[
              { value: "todos", label: "Todos" },
              { value: "sim", label: "Conferidos" },
              { value: "nao", label: "Pendentes" },
            ]}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={limparFiltros}>
            Limpar
          </Button>

          <Button type="button" variant="primary" onClick={aplicarFiltros}>
            Aplicar filtros
          </Button>
        </div>
      </Card>

      {detalheSelecionado && !registroEditandoId && (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                Detalhe rápido da classificação
              </h3>

              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Visualização rápida do registro selecionado.
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setDetalheSelecionado(null)}
            >
              <X size={16} />
              Fechar
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Calibre selecionado
              </p>
              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {detalheSelecionado.calibres
                  ? `${detalheSelecionado.calibres.codigo} — ${detalheSelecionado.calibres.nome}`
                  : "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Fazenda
              </p>
              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {detalheSelecionado.fazendas?.nome || "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Lote
              </p>
              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {detalheSelecionado.lote || "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Quantidade
              </p>
              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {formatarNumero(detalheSelecionado.quantidade_paletes)} paletes
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Total equivalente
              </p>
              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {formatarNumero(detalheSelecionado.total_caixas)} caixas
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Responsável
              </p>
              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {detalheSelecionado.responsaveis?.nome || "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Status
              </p>
              <div className="mt-1">
                {detalheSelecionado.conferido ? (
                  <Badge variant="success">Conferido</Badge>
                ) : (
                  <Badge variant="warning">Pendente</Badge>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Saldo classificado atual por calibre
              </p>
              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {saldoAtualDetalhe
                  ? `${formatarNumero(
                      saldoAtualDetalhe.total_caixas
                    )} caixas classificadas`
                  : "Sem saldo calculado"}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4 md:col-span-2 xl:col-span-3">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Observação
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                {detalheSelecionado.observacao || "-"}
              </p>
            </div>
          </div>
        </Card>
      )}

      {registroEditandoId && (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                Editar classificação
              </h3>

              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Atualize as informações do lançamento selecionado.
              </p>
            </div>

            <Badge variant="warning">Editando</Badge>
          </div>

          <form onSubmit={salvarEdicao}>
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Data da classificação"
                name="data_classificacao"
                type="date"
                value={formEdicao.data_classificacao}
                onChange={atualizarFormEdicao}
              />

              <Input
                label="Hora"
                name="hora"
                type="time"
                value={formEdicao.hora}
                onChange={atualizarFormEdicao}
              />

              <Select
                label="Fazenda / Origem"
                name="fazenda_id"
                value={formEdicao.fazenda_id}
                onChange={atualizarFormEdicao}
                options={fazendaOptions}
                placeholder="Selecione a fazenda/origem"
              />

              <Input
                label="Lote / Carga"
                name="lote"
                value={formEdicao.lote}
                onChange={atualizarFormEdicao}
              />

              <Select
                label="Calibre"
                name="calibre_id"
                value={formEdicao.calibre_id}
                onChange={atualizarFormEdicao}
                options={calibreOptions}
                placeholder="Selecione o calibre"
              />

              <Input
                label="Quantidade de paletes"
                name="quantidade_paletes"
                type="number"
                value={formEdicao.quantidade_paletes}
                onChange={atualizarFormEdicao}
              />

              <Input
                label="Caixas por palete"
                name="caixas_por_palete"
                type="number"
                value={formEdicao.caixas_por_palete}
                onChange={atualizarFormEdicao}
              />

              <Input
                label="Total de caixas calculado"
                name="total_caixas"
                type="text"
                value={`${formatarNumero(totalCaixasEdicao)} caixas`}
                disabled
              />

              <Select
                label="Conferido?"
                name="conferido"
                value={formEdicao.conferido}
                onChange={atualizarFormEdicao}
                options={[
                  { value: "sim", label: "Sim" },
                  { value: "nao", label: "Não" },
                ]}
              />

              <Select
                label="Responsável"
                name="responsavel_id"
                value={formEdicao.responsavel_id}
                onChange={atualizarFormEdicao}
                options={responsavelOptions}
                placeholder="Selecione o responsável"
              />

              <div className="md:col-span-2">
                <Textarea
                  label="Observação"
                  name="observacao"
                  value={formEdicao.observacao}
                  onChange={atualizarFormEdicao}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={cancelarEdicao}
                disabled={salvandoEdicao}
              >
                <X size={16} />
                Cancelar edição
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={salvandoEdicao}
              >
                {salvandoEdicao ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Classificações encontradas
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Consulta dos lançamentos de alho classificado salvos no banco.
            </p>
          </div>

          <Badge variant="info">
            {carregando
              ? "Carregando"
              : `${formatarNumero(registros.length)} registros`}
          </Badge>
        </div>

        {carregando ? (
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Carregando classificações do banco...
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={registrosPaginados}
              emptyMessage="Nenhuma classificação encontrada para os filtros aplicados."
            />

            <div className="mt-5 flex flex-col items-center justify-between gap-3 md:flex-row">
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                Página {formatarNumero(paginaAtual)} de{" "}
                {formatarNumero(totalPaginas)} — exibindo{" "}
                {formatarNumero(registrosPaginados.length)} de{" "}
                {formatarNumero(registros.length)} registros
              </p>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={paginaAtual === 1}
                  onClick={irParaPaginaAnterior}
                >
                  Anterior
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={paginaAtual === totalPaginas}
                  onClick={irParaProximaPagina}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default ConsultaEstoqueClassificado;