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
  PackageCheck,
  Pencil,
  Scale,
  Search,
  ShoppingCart,
  Star,
  Trash2,
  Truck,
  X,
} from "lucide-react";

import { listarCalibresAtivos } from "../../services/calibresService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";

import {
  calcularResumoConsultaSaidas,
  editarSaidaVenda,
  excluirSaidaVenda,
  listarEstoqueDisponivelSaida,
  listarSaidasVendas,
} from "../../services/saidaVendaService";

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

function ConsultaSaidas() {
  const [calibres, setCalibres] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [estoqueDisponivel, setEstoqueDisponivel] = useState([]);
  const [saidas, setSaidas] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [registroEditandoId, setRegistroEditandoId] = useState(null);
  const [registroOriginal, setRegistroOriginal] = useState(null);
  const [registroParaExcluir, setRegistroParaExcluir] = useState(null);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  const [filtros, setFiltros] = useState({
    dataInicial: "",
    dataFinal: "",
    cliente: "",
    numeroPedido: "",
    calibreId: "",
    responsavelId: "",
  });

  const [formEdicao, setFormEdicao] = useState({
    data_saida: "",
    hora: "",
    cliente: "",
    numero_pedido: "",
    calibre_id: "",
    quantidade_caixas: "",
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
    return calcularResumoConsultaSaidas(saidas);
  }, [saidas]);

  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(saidas.length / itensPorPagina));
  }, [saidas.length]);

  const saidasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;

    return saidas.slice(inicio, fim);
  }, [saidas, paginaAtual]);

  const estoqueSelecionado = useMemo(() => {
    return (
      estoqueDisponivel.find(
        (item) => item.calibre_id === formEdicao.calibre_id
      ) || null
    );
  }, [estoqueDisponivel, formEdicao.calibre_id]);

  const saldoConsiderado = useMemo(() => {
    let saldoCaixas = Number(estoqueSelecionado?.saldo_disponivel_caixas || 0);
    let pesoDisponivelKg = Number(estoqueSelecionado?.peso_disponivel_kg || 0);

    const mesmoCalibre =
      registroOriginal &&
      registroOriginal.calibre_id === formEdicao.calibre_id;

    if (mesmoCalibre) {
      saldoCaixas += Number(registroOriginal.quantidade_caixas || 0);
      pesoDisponivelKg += Number(registroOriginal.peso_total_kg || 0);
    }

    const pesoMedio =
      saldoCaixas > 0 && pesoDisponivelKg > 0
        ? pesoDisponivelKg / saldoCaixas
        : 0;

    return {
      saldoCaixas,
      pesoDisponivelKg,
      pesoMedio,
    };
  }, [estoqueSelecionado, registroOriginal, formEdicao.calibre_id]);

  const pesoTotalEdicao = useMemo(() => {
    return (
      Number(formEdicao.quantidade_caixas || 0) *
      Number(saldoConsiderado.pesoMedio || 0)
    );
  }, [formEdicao.quantidade_caixas, saldoConsiderado.pesoMedio]);

  const quantidadeMaiorQueSaldo = useMemo(() => {
    const quantidade = Number(formEdicao.quantidade_caixas || 0);

    if (!formEdicao.calibre_id || quantidade <= 0) {
      return false;
    }

    return quantidade > Number(saldoConsiderado.saldoCaixas || 0);
  }, [
    formEdicao.calibre_id,
    formEdicao.quantidade_caixas,
    saldoConsiderado.saldoCaixas,
  ]);

  async function carregarOpcoes() {
    const [calibresBanco, responsaveisBanco, estoqueBanco] = await Promise.all([
      listarCalibresAtivos(),
      listarResponsaveisAtivos(),
      listarEstoqueDisponivelSaida(),
    ]);

    setCalibres(calibresBanco);
    setResponsaveis(responsaveisBanco);
    setEstoqueDisponivel(estoqueBanco);
  }

  function montarFiltrosParaBusca(filtrosAtuais) {
    return {
      dataInicial: filtrosAtuais.dataInicial || "",
      dataFinal: filtrosAtuais.dataFinal || "",
      cliente: filtrosAtuais.cliente || "",
      numeroPedido: filtrosAtuais.numeroPedido || "",
      calibreId: filtrosAtuais.calibreId || "",
      responsavelId: filtrosAtuais.responsavelId || "",
    };
  }

  async function carregarSaidas(filtrosAtuais = filtros) {
    try {
      setCarregando(true);
      setErro("");
      setSucesso("");

      const [saidasBanco, estoqueBanco] = await Promise.all([
        listarSaidasVendas(montarFiltrosParaBusca(filtrosAtuais)),
        listarEstoqueDisponivelSaida(),
      ]);

      setSaidas(saidasBanco);
      setEstoqueDisponivel(estoqueBanco);
      setPaginaAtual(1);
    } catch (error) {
      console.error("Erro ao consultar saídas:", error);

      setErro(
        error.message ||
          "Não foi possível consultar as saídas. Confira as permissões no Supabase."
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

      const saidasBanco = await listarSaidasVendas();

      setSaidas(saidasBanco);
      setPaginaAtual(1);
    } catch (error) {
      console.error("Erro ao carregar consulta de saídas:", error);

      setErro(error.message || "Não foi possível carregar a consulta de saídas.");
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

    carregarSaidas(filtros);
  }

  function limparFiltros() {
    const filtrosLimpos = {
      dataInicial: "",
      dataFinal: "",
      cliente: "",
      numeroPedido: "",
      calibreId: "",
      responsavelId: "",
    };

    setFiltros(filtrosLimpos);
    setRegistroEditandoId(null);
    setRegistroOriginal(null);
    setErro("");
    setSucesso("");

    carregarSaidas(filtrosLimpos);
  }

  function iniciarEdicao(registro) {
    setErro("");
    setSucesso("");

    setRegistroEditandoId(registro.id);
    setRegistroOriginal(registro);

    setFormEdicao({
      data_saida: registro.data_saida || obterDataAtual(),
      hora: formatarHora(registro.hora),
      cliente: registro.cliente || "",
      numero_pedido: registro.numero_pedido || "",
      calibre_id: registro.calibres?.id || registro.calibre_id || "",
      quantidade_caixas: String(registro.quantidade_caixas || ""),
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
    setRegistroOriginal(null);
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
    if (!formEdicao.data_saida) {
      return "Informe a data da saída.";
    }

    if (!formEdicao.hora) {
      return "Informe a hora da saída.";
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

    if (Number(saldoConsiderado.saldoCaixas || 0) <= 0) {
      return "Não existe estoque disponível para o calibre selecionado.";
    }

    if (quantidadeMaiorQueSaldo) {
      return `Estoque insuficiente. Saldo disponível: ${formatarNumero(
        saldoConsiderado.saldoCaixas
      )} caixas.`;
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

      await editarSaidaVenda(registroEditandoId, formEdicao);

      setSucesso("Saída atualizada com sucesso. O estoque foi recalculado.");

      setRegistroEditandoId(null);
      setRegistroOriginal(null);

      await carregarSaidas(filtros);
    } catch (error) {
      console.error("Erro ao editar saída:", error);

      setErro(error.message || "Não foi possível editar a saída.");
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

      await excluirSaidaVenda(registroParaExcluir.id);

      if (registroEditandoId === registroParaExcluir.id) {
        cancelarEdicao();
      }

      setRegistroParaExcluir(null);
      setSucesso("Saída excluída com sucesso. O estoque foi recalculado.");

      await carregarSaidas(filtros);
    } catch (error) {
      console.error("Erro ao excluir saída:", error);

      setErro(error.message || "Não foi possível excluir a saída.");
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
      key: "data_saida",
      label: "Data",
      render: (value) => formatarData(value),
    },
    {
      key: "hora",
      label: "Hora",
      render: (value) => formatarHora(value),
    },
    {
      key: "cliente",
      label: "Cliente",
      render: (value) => value || "-",
    },
    {
      key: "numero_pedido",
      label: "Pedido / Carga",
      render: (value) => value || "-",
    },
    {
      key: "calibres",
      label: "Calibre",
      render: (value) => (value ? `${value.codigo} — ${value.nome}` : "-"),
    },
    {
      key: "quantidade_caixas",
      label: "Caixas",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "peso_total_kg",
      label: "Peso",
      render: (value) => formatarKg(value),
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
        title="Excluir saída?"
        description="Essa ação remove a saída selecionada. Ao confirmar, o saldo disponível volta automaticamente no cálculo do estoque."
        confirmLabel="Confirmar exclusão"
        cancelLabel="Cancelar"
        variant="danger"
        loading={Boolean(excluindoId)}
        onCancel={cancelarExclusao}
        onConfirm={confirmarExclusao}
        details={[
          {
            label: "Data",
            value: formatarData(registroParaExcluir?.data_saida),
          },
          {
            label: "Cliente",
            value: registroParaExcluir?.cliente || "-",
          },
          {
            label: "Pedido / Carga",
            value: registroParaExcluir?.numero_pedido || "-",
          },
          {
            label: "Calibre",
            value: registroParaExcluir?.calibres
              ? `${registroParaExcluir.calibres.codigo} — ${registroParaExcluir.calibres.nome}`
              : "-",
          },
          {
            label: "Quantidade",
            value: `${formatarNumero(
              registroParaExcluir?.quantidade_caixas
            )} caixas`,
          },
          {
            label: "Peso",
            value: formatarKg(registroParaExcluir?.peso_total_kg),
          },
        ]}
      />

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total de saídas"
          value={formatarNumero(resumo.totalRegistros)}
          description="Registros encontrados"
          icon={ShoppingCart}
          variant="info"
        />

        <KpiCard
          title="Caixas expedidas"
          value={formatarNumero(resumo.totalCaixas)}
          description="Total filtrado"
          icon={Truck}
          variant="warning"
        />

        <KpiCard
          title="Peso expedido"
          value={formatarKg(resumo.pesoTotalKg)}
          description="Peso total filtrado"
          icon={Scale}
          variant="warning"
        />

        <KpiCard
          title="Calibre mais vendido"
          value={resumo.calibreMaisVendido?.calibre_codigo || "-"}
          description={
            resumo.calibreMaisVendido
              ? `${resumo.calibreMaisVendido.calibre_nome} • ${formatarNumero(
                  resumo.calibreMaisVendido.caixas
                )} caixas`
              : "Sem vendas no filtro"
          }
          icon={Star}
          variant="success"
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
              Filtre as saídas por período, cliente, pedido/carga, calibre e responsável.
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

          <Input
            label="Cliente"
            name="cliente"
            value={filtros.cliente}
            onChange={atualizarFiltro}
            placeholder="Buscar por cliente"
          />

          <Input
            label="Pedido / Carga"
            name="numeroPedido"
            value={filtros.numeroPedido}
            onChange={atualizarFiltro}
            placeholder="Buscar por pedido ou carga"
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

      {registroEditandoId && (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                Editar saída
              </h3>

              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Atualize os dados da saída. O sistema continua bloqueando quantidade maior que o saldo.
              </p>
            </div>

            <Badge variant="warning">Editando</Badge>
          </div>

          <form onSubmit={salvarEdicao}>
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Data da saída"
                name="data_saida"
                type="date"
                value={formEdicao.data_saida}
                onChange={atualizarFormEdicao}
              />

              <Input
                label="Hora"
                name="hora"
                type="time"
                value={formEdicao.hora}
                onChange={atualizarFormEdicao}
              />

              <Input
                label="Cliente"
                name="cliente"
                value={formEdicao.cliente}
                onChange={atualizarFormEdicao}
              />

              <Input
                label="Pedido / Carga"
                name="numero_pedido"
                value={formEdicao.numero_pedido}
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
                label="Saldo disponível considerado"
                name="saldo_disponivel"
                type="text"
                value={`${formatarNumero(
                  saldoConsiderado.saldoCaixas
                )} caixas`}
                disabled
              />

              <Input
                label="Peso total calculado"
                name="peso_total"
                type="text"
                value={formatarKg(pesoTotalEdicao)}
                disabled
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

            {quantidadeMaiorQueSaldo && (
              <div className="mt-5">
                <AlertBox
                  variant="danger"
                  title="Estoque insuficiente"
                  description={`Saldo disponível considerado: ${formatarNumero(
                    saldoConsiderado.saldoCaixas
                  )} caixas.`}
                />
              </div>
            )}

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
                disabled={salvandoEdicao || quantidadeMaiorQueSaldo}
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
              Saídas encontradas
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Consulta dos registros de saída/venda salvos no banco.
            </p>
          </div>

          <Badge variant="info">
            {carregando
              ? "Carregando"
              : `${formatarNumero(saidas.length)} registros`}
          </Badge>
        </div>

        {carregando ? (
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Carregando saídas do banco...
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={saidasPaginadas}
              emptyMessage="Nenhuma saída encontrada para os filtros aplicados."
            />

            <div className="mt-5 flex flex-col items-center justify-between gap-3 md:flex-row">
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                Página {formatarNumero(paginaAtual)} de{" "}
                {formatarNumero(totalPaginas)} — exibindo{" "}
                {formatarNumero(saidasPaginadas.length)} de{" "}
                {formatarNumero(saidas.length)} registros
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

export default ConsultaSaidas;