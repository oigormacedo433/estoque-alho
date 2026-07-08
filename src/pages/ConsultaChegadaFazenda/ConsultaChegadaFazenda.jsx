// Tela Consulta Chegada da Fazenda.
//
// Etapa 12:
// - Filtros por período, fazenda, lote, responsável e conferência
// - Resumo do período
// - Tabela de recebimentos
// - Detalhe rápido
// - Ações visualizar, editar e excluir
// - Paginação
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
  Textarea,
} from "../../components/ui";

import {
  CheckCircle,
  ClipboardList,
  Eye,
  Package,
  Pencil,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import { listarFazendasAtivas } from "../../services/fazendasService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";

import {
  calcularResumoChegadas,
  editarChegadaFazenda,
  excluirChegadaFazenda,
  listarChegadasFazenda,
} from "../../services/chegadaFazendaService";

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

function formatarKg(valor) {
  return `${Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
}

function ConsultaChegadaFazenda() {
  const [fazendas, setFazendas] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
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
    fazendaId: "",
    lote: "",
    responsavelId: "",
    conferido: "todos",
  });

  const [formEdicao, setFormEdicao] = useState({
    data_recebimento: "",
    hora: "",
    fazenda_id: "",
    lote: "",
    quantidade_caixas: "",
    media_peso_caixa_kg: "",
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

  const resumo = useMemo(() => {
    return calcularResumoChegadas(registros);
  }, [registros]);

  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(registros.length / itensPorPagina));
  }, [registros.length]);

  const registrosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;

    return registros.slice(inicio, fim);
  }, [registros, paginaAtual]);

  const pesoTotalEstimadoEdicao = useMemo(() => {
    const caixas = Number(formEdicao.quantidade_caixas || 0);
    const mediaPeso = Number(formEdicao.media_peso_caixa_kg || 0);

    return caixas * mediaPeso;
  }, [formEdicao.quantidade_caixas, formEdicao.media_peso_caixa_kg]);

  async function carregarOpcoes() {
    const [fazendasBanco, responsaveisBanco] = await Promise.all([
      listarFazendasAtivas(),
      listarResponsaveisAtivos(),
    ]);

    setFazendas(fazendasBanco);
    setResponsaveis(responsaveisBanco);
  }

  function montarFiltrosParaBusca(filtrosAtuais) {
    return {
      dataInicial: filtrosAtuais.dataInicial || "",
      dataFinal: filtrosAtuais.dataFinal || "",
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

      const dados = await listarChegadasFazenda(
        montarFiltrosParaBusca(filtrosAtuais)
      );

      setRegistros(dados);
      setPaginaAtual(1);

      if (dados.length === 0) {
        setDetalheSelecionado(null);
      }

      setSucesso("Consulta carregada com dados reais do banco.");
    } catch (error) {
      console.error("Erro ao consultar chegada da fazenda:", error);

      setErro(
        error.message ||
          "Não foi possível consultar os recebimentos. Confira as permissões no Supabase."
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

      const dados = await listarChegadasFazenda();

      setRegistros(dados);
      setPaginaAtual(1);
    } catch (error) {
      console.error("Erro ao carregar consulta:", error);

      setErro(
        error.message ||
          "Não foi possível carregar a consulta de chegada da fazenda."
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
      data_recebimento: registro.data_recebimento || obterDataAtual(),
      hora: formatarHora(registro.hora),
      fazenda_id: registro.fazendas?.id || registro.fazenda_id || "",
      lote: registro.lote || "",
      quantidade_caixas: String(registro.quantidade_caixas || ""),
      media_peso_caixa_kg: registro.media_peso_caixa_kg
        ? String(registro.media_peso_caixa_kg)
        : "",
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
    if (!formEdicao.data_recebimento) {
      return "Informe a data do recebimento.";
    }

    if (!formEdicao.hora) {
      return "Informe a hora.";
    }

    if (!formEdicao.fazenda_id) {
      return "Selecione a fazenda/origem.";
    }

    if (!formEdicao.quantidade_caixas) {
      return "Informe a quantidade de caixas recebidas.";
    }

    if (Number(formEdicao.quantidade_caixas) <= 0) {
      return "A quantidade de caixas precisa ser maior que zero.";
    }

    if (
      formEdicao.media_peso_caixa_kg &&
      Number(formEdicao.media_peso_caixa_kg) <= 0
    ) {
      return "A média de peso da caixa precisa ser maior que zero.";
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

      await editarChegadaFazenda(registroEditandoId, payload);

      setSucesso("Recebimento atualizado com sucesso.");
      setRegistroEditandoId(null);

      await carregarRegistros(filtros);
    } catch (error) {
      console.error("Erro ao editar recebimento:", error);

      setErro(error.message || "Não foi possível editar o recebimento.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function excluirRegistro(registro) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir este recebimento?\n\nData: ${formatarData(
        registro.data_recebimento
      )}\nFazenda: ${registro.fazendas?.nome || "-"}\nCaixas: ${formatarNumero(
        registro.quantidade_caixas
      )}\n\nEssa ação apaga o registro do banco.`
    );

    if (!confirmar) {
      return;
    }

    try {
      setErro("");
      setSucesso("");
      setExcluindoId(registro.id);

      await excluirChegadaFazenda(registro.id);

      if (detalheSelecionado?.id === registro.id) {
        setDetalheSelecionado(null);
      }

      if (registroEditandoId === registro.id) {
        setRegistroEditandoId(null);
      }

      setSucesso("Recebimento excluído com sucesso.");

      await carregarRegistros(filtros);
    } catch (error) {
      console.error("Erro ao excluir recebimento:", error);

      setErro(error.message || "Não foi possível excluir o recebimento.");
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
      key: "data_recebimento",
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
      key: "quantidade_caixas",
      label: "Caixas recebidas",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "conferido",
      label: "Conferido",
      render: (value) =>
        value ? (
          <Badge variant="success">Sim</Badge>
        ) : (
          <Badge variant="warning">Não</Badge>
        ),
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
          title="Recebimentos"
          value={formatarNumero(resumo.totalRegistros)}
          description="Registros no período"
          icon={ClipboardList}
          variant="info"
        />

        <KpiCard
          title="Caixas recebidas"
          value={formatarNumero(resumo.totalCaixas)}
          description="Total filtrado"
          icon={Package}
          variant="success"
        />

        <KpiCard
          title="Conferidos"
          value={formatarNumero(resumo.totalConferidos)}
          description="Registros conferidos"
          icon={CheckCircle}
          variant="success"
        />

        <KpiCard
          title="Pendentes"
          value={formatarNumero(resumo.totalPendentes)}
          description="Aguardando conferência"
          icon={TriangleAlert}
          variant={resumo.totalPendentes > 0 ? "warning" : "success"}
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
              Filtre os recebimentos por período, origem, lote, responsável e conferência.
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
            label="Status da conferência"
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
                Detalhe rápido do recebimento
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
                Fazenda selecionada
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
                {formatarNumero(detalheSelecionado.quantidade_caixas)} caixas
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
                Peso estimado
              </p>
              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {formatarKg(detalheSelecionado.peso_total_estimado_kg)}
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
                Editar recebimento
              </h3>

              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Atualize as informações do recebimento selecionado.
              </p>
            </div>

            <Badge variant="warning">Editando</Badge>
          </div>

          <form onSubmit={salvarEdicao}>
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Data do recebimento"
                name="data_recebimento"
                type="date"
                value={formEdicao.data_recebimento}
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

              <Input
                label="Quantidade de caixas"
                name="quantidade_caixas"
                type="number"
                value={formEdicao.quantidade_caixas}
                onChange={atualizarFormEdicao}
              />

              <Input
                label="Média de peso da caixa kg"
                name="media_peso_caixa_kg"
                type="number"
                value={formEdicao.media_peso_caixa_kg}
                onChange={atualizarFormEdicao}
              />

              <Input
                label="Peso total estimado"
                name="peso_total_estimado"
                type="text"
                value={formatarKg(pesoTotalEstimadoEdicao)}
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
              Recebimentos encontrados
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Consulta dos recebimentos lançados no banco.
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
            Carregando recebimentos do banco...
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={registrosPaginados}
              emptyMessage="Nenhum recebimento encontrado para os filtros aplicados."
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

export default ConsultaChegadaFazenda;