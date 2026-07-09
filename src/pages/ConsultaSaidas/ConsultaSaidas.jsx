import { useEffect, useMemo, useState } from "react";

import {
  AlertBox,
  Badge,
  Button,
  Card,
  ConfirmModal,
  DataTable,
  Input,
  KpiCard,
  Select,
  Textarea,
} from "../../components/ui";

import {
  CheckCircle,
  Eye,
  PackageCheck,
  Pencil,
  Scale,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { listarCalibresAtivos } from "../../services/calibresService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";

import {
  calcularResumoProdutoFinal,
  editarProdutoFinal,
  excluirProdutoFinal,
  listarProdutoFinal,
  listarSaldoProdutoFinalAtual,
} from "../../services/produtoFinalService";

function obterDataAtual() {
  const data = new Date();
  const dataLocal = new Date(data.getTime() - data.getTimezoneOffset() * 60000);

  return dataLocal.toISOString().slice(0, 10);
}

function formatarData(data) {
  if (!data) return "-";

  const [ano, mes, dia] = String(data).split("-");

  if (!ano || !mes || !dia) return "-";

  return `${dia}/${mes}/${ano}`;
}

function formatarHora(hora) {
  if (!hora) return "-";

  return String(hora).slice(0, 5);
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

function ConsultaProdutoFinal() {
  const [calibres, setCalibres] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);

  const [registros, setRegistros] = useState([]);
  const [saldoAtual, setSaldoAtual] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [detalheSelecionado, setDetalheSelecionado] = useState(null);
  const [registroEditandoId, setRegistroEditandoId] = useState(null);
  const [registroParaExcluir, setRegistroParaExcluir] = useState(null);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  const [filtros, setFiltros] = useState({
    dataInicial: "",
    dataFinal: "",
    calibreId: "",
    responsavelId: "",
    conferido: "todos",
  });

  const [formEdicao, setFormEdicao] = useState({
    data_registro: "",
    hora: "",
    calibre_id: "",
    quantidade_caixas: "",
    peso_por_caixa_kg: "",
    conferido: "sim",
    responsavel_id: "",
    observacao: "",
  });

  const calibreOptions = useMemo(() => {
    return calibres.map((calibre) => ({
      value: calibre.id,
      label: `${calibre.codigo} — ${calibre.nome}`,
    }));
  }, [calibres]);

  const responsavelOptions = useMemo(() => {
    return responsaveis.map((responsavel) => ({
      value: responsavel.id,
      label: responsavel.nome,
    }));
  }, [responsaveis]);

  const resumo = useMemo(() => {
    return calcularResumoProdutoFinal(registros);
  }, [registros]);

  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(registros.length / itensPorPagina));
  }, [registros.length]);

  const registrosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;

    return registros.slice(inicio, fim);
  }, [registros, paginaAtual]);

  const pesoTotalEdicao = useMemo(() => {
    const caixas = Number(formEdicao.quantidade_caixas || 0);
    const pesoPorCaixa = Number(formEdicao.peso_por_caixa_kg || 0);

    return caixas * pesoPorCaixa;
  }, [formEdicao.quantidade_caixas, formEdicao.peso_por_caixa_kg]);

  const saldoDetalhe = useMemo(() => {
    if (!detalheSelecionado) {
      return null;
    }

    const calibreId =
      detalheSelecionado.calibres?.id || detalheSelecionado.calibre_id;

    return saldoAtual.find((item) => item.calibre_id === calibreId) || null;
  }, [detalheSelecionado, saldoAtual]);

  async function carregarOpcoes() {
    const [calibresBanco, responsaveisBanco] = await Promise.all([
      listarCalibresAtivos(),
      listarResponsaveisAtivos(),
    ]);

    setCalibres(calibresBanco);
    setResponsaveis(responsaveisBanco);
  }

  function montarFiltrosParaBusca(filtrosAtuais) {
    return {
      dataInicial: filtrosAtuais.dataInicial || "",
      dataFinal: filtrosAtuais.dataFinal || "",
      calibreId: filtrosAtuais.calibreId || "",
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

      const [registrosBanco, saldoBanco] = await Promise.all([
        listarProdutoFinal(montarFiltrosParaBusca(filtrosAtuais)),
        listarSaldoProdutoFinalAtual(),
      ]);

      setRegistros(registrosBanco);
      setSaldoAtual(saldoBanco);
      setPaginaAtual(1);

      if (registrosBanco.length === 0) {
        setDetalheSelecionado(null);
      }
    } catch (error) {
      console.error("Erro ao consultar produto final:", error);

      setErro(
        error.message ||
          "Não foi possível consultar o produto final. Confira as permissões no Supabase."
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

      const [registrosBanco, saldoBanco] = await Promise.all([
        listarProdutoFinal(),
        listarSaldoProdutoFinalAtual(),
      ]);

      setRegistros(registrosBanco);
      setSaldoAtual(saldoBanco);
      setPaginaAtual(1);
    } catch (error) {
      console.error("Erro ao carregar consulta de produto final:", error);

      setErro(
        error.message || "Não foi possível carregar a consulta de produto final."
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
      data_registro: registro.data_registro || obterDataAtual(),
      hora: formatarHora(registro.hora),
      calibre_id: registro.calibres?.id || registro.calibre_id || "",
      quantidade_caixas: String(registro.quantidade_caixas || ""),
      peso_por_caixa_kg: String(registro.peso_por_caixa_kg || ""),
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
    if (!formEdicao.data_registro) {
      return "Informe a data do lançamento.";
    }

    if (!formEdicao.hora) {
      return "Informe a hora.";
    }

    if (!formEdicao.calibre_id) {
      return "Selecione o calibre.";
    }

    if (!formEdicao.quantidade_caixas) {
      return "Informe a quantidade de caixas.";
    }

    if (Number(formEdicao.quantidade_caixas) <= 0) {
      return "A quantidade de caixas precisa ser maior que zero.";
    }

    if (!formEdicao.peso_por_caixa_kg) {
      return "Informe o peso por caixa.";
    }

    if (Number(formEdicao.peso_por_caixa_kg) <= 0) {
      return "O peso por caixa precisa ser maior que zero.";
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

      await editarProdutoFinal(registroEditandoId, formEdicao);

      setSucesso("Produto final atualizado com sucesso.");
      setRegistroEditandoId(null);

      await carregarRegistros(filtros);
    } catch (error) {
      console.error("Erro ao editar produto final:", error);

      setErro(error.message || "Não foi possível editar o produto final.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  function solicitarExclusao(registro) {
    setRegistroParaExcluir(registro);
    setErro("");
    setSucesso("");
  }

  function cancelarExclusao() {
    if (excluindoId) {
      return;
    }

    setRegistroParaExcluir(null);
  }

  async function confirmarExclusao() {
    if (!registroParaExcluir) {
      return;
    }

    try {
      setErro("");
      setSucesso("");
      setExcluindoId(registroParaExcluir.id);

      await excluirProdutoFinal(registroParaExcluir.id);

      if (detalheSelecionado?.id === registroParaExcluir.id) {
        setDetalheSelecionado(null);
      }

      if (registroEditandoId === registroParaExcluir.id) {
        setRegistroEditandoId(null);
      }

      setRegistroParaExcluir(null);
      setSucesso("Produto final excluído com sucesso. O estoque foi recalculado.");

      await carregarRegistros(filtros);
    } catch (error) {
      console.error("Erro ao excluir produto final:", error);

      setErro(error.message || "Não foi possível excluir o produto final.");
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
      key: "data_registro",
      label: "Data",
      render: (value) => formatarData(value),
    },
    {
      key: "hora",
      label: "Hora",
      render: (value) => formatarHora(value),
    },
    {
      key: "calibres",
      label: "Calibre",
      render: (value) => (value ? `${value.codigo} — ${value.nome}` : "-"),
    },
    {
      key: "quantidade_caixas",
      label: "Quantidade de caixas",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "peso_por_caixa_kg",
      label: "Peso por caixa",
      render: (value) => formatarKg(value),
    },
    {
      key: "peso_total_kg",
      label: "Peso total",
      render: (value) => formatarKg(value),
    },
    {
      key: "responsaveis",
      label: "Responsável",
      render: (value) => value?.nome || "-",
    },
    {
      key: "conferido",
      label: "Status",
      render: (value) =>
        value ? (
          <Badge variant="success">Conferido</Badge>
        ) : (
          <Badge variant="warning">Pendente</Badge>
        ),
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
            onClick={() => solicitarExclusao(row)}
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
      <ConfirmModal
        open={Boolean(registroParaExcluir)}
        title="Excluir produto final?"
        description="Essa ação remove o lançamento selecionado e recalcula automaticamente o estoque disponível. Essa exclusão não pode ser desfeita."
        confirmLabel="Confirmar exclusão"
        cancelLabel="Cancelar"
        variant="danger"
        loading={Boolean(excluindoId)}
        onCancel={cancelarExclusao}
        onConfirm={confirmarExclusao}
        details={
          registroParaExcluir ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                  Data
                </p>
                <p className="mt-1 font-black text-[var(--color-text-primary)]">
                  {formatarData(registroParaExcluir.data_registro)}
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                  Calibre
                </p>
                <p className="mt-1 font-black text-[var(--color-text-primary)]">
                  {registroParaExcluir.calibres
                    ? `${registroParaExcluir.calibres.codigo} — ${registroParaExcluir.calibres.nome}`
                    : "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                  Quantidade
                </p>
                <p className="mt-1 font-black text-[var(--color-text-primary)]">
                  {formatarNumero(registroParaExcluir.quantidade_caixas)} caixas
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                  Peso total
                </p>
                <p className="mt-1 font-black text-[var(--color-text-primary)]">
                  {formatarKg(registroParaExcluir.peso_total_kg)}
                </p>
              </div>
            </div>
          ) : null
        }
      />

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Lançamentos"
          value={formatarNumero(resumo.totalRegistros)}
          description="Registros no período"
          icon={PackageCheck}
          variant="info"
        />

        <KpiCard
          title="Caixas produzidas"
          value={formatarNumero(resumo.totalCaixas)}
          description="Quantidade de caixas"
          icon={CheckCircle}
          variant="success"
        />

        <KpiCard
          title="Peso total produzido"
          value={formatarKg(resumo.pesoTotalKg)}
          description="Soma dos pesos totais"
          icon={Scale}
          variant="success"
        />

        <KpiCard
          title="Calibres com produto"
          value={formatarNumero(resumo.calibresComProdutoFinal)}
          description="Calibres no período"
          icon={ShieldCheck}
          variant="info"
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
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-green-light)] text-[var(--color-green-primary)]">
            <Search size={24} />
          </div>

          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Filtros da consulta
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Filtre o produto final por período, calibre, responsável e status.
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
                Detalhe rápido do produto final
              </h3>

              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Visualização rápida do lançamento selecionado.
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
                Caixas produzidas
              </p>

              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {formatarNumero(detalheSelecionado.quantidade_caixas)} caixas
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Peso produzido
              </p>

              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {formatarKg(detalheSelecionado.peso_total_kg)}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Peso por caixa
              </p>

              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {formatarKg(detalheSelecionado.peso_por_caixa_kg)}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Último lançamento
              </p>

              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {formatarData(detalheSelecionado.data_registro)} às{" "}
                {formatarHora(detalheSelecionado.hora)}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Saldo disponível atual
              </p>

              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {saldoDetalhe
                  ? `${formatarNumero(
                      saldoDetalhe.saldo_disponivel_caixas
                    )} caixas`
                  : "Sem saldo calculado"}
              </p>

              {saldoDetalhe && (
                <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                  {formatarKg(saldoDetalhe.peso_disponivel_kg)}
                </p>
              )}
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
                Editar produto final
              </h3>

              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Atualize quantidade, peso por caixa, calibre, responsável e status.
              </p>
            </div>

            <Badge variant="warning">Editando</Badge>
          </div>

          <form onSubmit={salvarEdicao}>
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Data do lançamento"
                name="data_registro"
                type="date"
                value={formEdicao.data_registro}
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
                label="Calibre"
                name="calibre_id"
                value={formEdicao.calibre_id}
                onChange={atualizarFormEdicao}
                options={calibreOptions}
                placeholder="Selecione o calibre"
              />

              <Input
                label="Quantidade de caixas"
                name="quantidade_caixas"
                type="number"
                value={formEdicao.quantidade_caixas}
                onChange={atualizarFormEdicao}
              />

              <Input
                label="Peso por caixa em kg"
                name="peso_por_caixa_kg"
                type="number"
                value={formEdicao.peso_por_caixa_kg}
                onChange={atualizarFormEdicao}
              />

              <Input
                label="Peso total calculado"
                name="peso_total_calculado"
                type="text"
                value={formatarKg(pesoTotalEdicao)}
                disabled
              />

              <Select
                label="Status"
                name="conferido"
                value={formEdicao.conferido}
                onChange={atualizarFormEdicao}
                options={[
                  { value: "sim", label: "Conferido" },
                  { value: "nao", label: "Pendente" },
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
              Produtos finais encontrados
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Consulta dos lançamentos de produto final salvos no banco.
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
            Carregando produto final do banco...
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={registrosPaginados}
              emptyMessage="Nenhum produto final encontrado para os filtros aplicados."
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

export default ConsultaProdutoFinal;