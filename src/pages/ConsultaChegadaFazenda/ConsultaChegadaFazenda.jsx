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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  Eye,
  Package,
  Pencil,
  Scale,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";

import { listarFazendasAtivas } from "../../services/fazendasService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";
import { listarAreasFazendaAtivas } from "../../services/areasFazendaService";

import {
  calcularResumoChegadaFazenda,
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

function numero(valor) {
  const convertido = Number(valor);

  if (!Number.isFinite(convertido)) {
    return 0;
  }

  return convertido;
}

function obterFazendaNome(registro) {
  return registro?.fazendas?.nome || registro?.fazenda_nome || "-";
}

function obterAreaNome(registro) {
  return (
    registro?.areas_fazenda?.nome ||
    registro?.area_nome ||
    registro?.area_fazenda_nome ||
    "-"
  );
}

function obterResponsavelNome(registro) {
  return registro?.responsaveis?.nome || registro?.responsavel_nome || "-";
}

function obterValorOrdenacao(registro, campo) {
  switch (campo) {
    case "data_recebimento":
      return registro.data_recebimento || "";

    case "hora":
      return registro.hora || "";

    case "fazenda":
      return obterFazendaNome(registro);

    case "area":
      return obterAreaNome(registro);

    case "lote":
      return registro.lote || "";

    case "quantidade_caixas":
      return numero(registro.quantidade_caixas);

    case "media_peso_caixa_kg":
      return numero(registro.media_peso_caixa_kg);

    case "peso_total_estimado_kg":
      return numero(registro.peso_total_estimado_kg);

    case "conferido":
      return registro.conferido ? "Conferido" : "Pendente";

    case "responsavel":
      return obterResponsavelNome(registro);

    case "observacao":
      return registro.observacao || "";

    default:
      return "";
  }
}

function compararValores(valorA, valorB) {
  if (typeof valorA === "number" && typeof valorB === "number") {
    return valorA - valorB;
  }

  return String(valorA || "").localeCompare(String(valorB || ""), "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
}

function CabecalhoOrdenavel({ label, campo, ordenacao, onOrdenar }) {
  const ativo = ordenacao.campo === campo;
  const direcao = ordenacao.direcao;

  return (
    <button
      type="button"
      onClick={() => onOrdenar(campo)}
      className="
        inline-flex
        items-center
        gap-1.5
        rounded-lg
        text-left
        font-black
        uppercase
        tracking-wide
        text-[var(--color-text-muted)]
        transition
        hover:text-[var(--color-green-primary)]
      "
      title={`Ordenar por ${label}`}
    >
      <span>{label}</span>

      {!ativo && <ArrowUpDown size={14} />}

      {ativo && direcao === "asc" && <ArrowUp size={14} />}

      {ativo && direcao === "desc" && <ArrowDown size={14} />}
    </button>
  );
}

const FILTROS_INICIAIS = {
  dataInicial: "",
  dataFinal: "",
  fazendaId: "",
  areaFazendaId: "",
  responsavelId: "",
  conferido: "todos",
};

const FORM_EDICAO_INICIAL = {
  data_recebimento: "",
  hora: "",
  fazenda_id: "",
  area_fazenda_id: "",
  lote: "",
  quantidade_caixas: "",
  media_peso_caixa_kg: "",
  conferido: "sim",
  responsavel_id: "",
  observacao: "",
};

function ConsultaChegadaFazenda() {
  const [fazendas, setFazendas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [registros, setRegistros] = useState([]);

  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [formEdicao, setFormEdicao] = useState(FORM_EDICAO_INICIAL);

  const [detalheSelecionado, setDetalheSelecionado] = useState(null);
  const [registroEditandoId, setRegistroEditandoId] = useState(null);
  const [registroParaExcluir, setRegistroParaExcluir] = useState(null);

  const [ordenacao, setOrdenacao] = useState({
    campo: "data_recebimento",
    direcao: "desc",
  });

  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  const [carregando, setCarregando] = useState(true);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const resumo = useMemo(() => {
    return calcularResumoChegadaFazenda(registros);
  }, [registros]);

  const pesoTotalEdicao = useMemo(() => {
    const caixas = Number(formEdicao.quantidade_caixas || 0);
    const pesoMedio = Number(formEdicao.media_peso_caixa_kg || 0);

    return caixas * pesoMedio;
  }, [formEdicao.quantidade_caixas, formEdicao.media_peso_caixa_kg]);

  const registrosOrdenados = useMemo(() => {
    const lista = [...registros];

    lista.sort((a, b) => {
      const valorA = obterValorOrdenacao(a, ordenacao.campo);
      const valorB = obterValorOrdenacao(b, ordenacao.campo);

      const resultado = compararValores(valorA, valorB);

      return ordenacao.direcao === "asc" ? resultado : resultado * -1;
    });

    return lista;
  }, [registros, ordenacao]);

  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(registrosOrdenados.length / itensPorPagina));
  }, [registrosOrdenados.length]);

  const registrosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;

    return registrosOrdenados.slice(inicio, fim);
  }, [registrosOrdenados, paginaAtual]);

  const fazendaOptions = useMemo(() => {
    return fazendas.map((fazenda) => ({
      value: fazenda.id,
      label: fazenda.nome,
    }));
  }, [fazendas]);

  const areaOptions = useMemo(() => {
    return areas.map((area) => ({
      value: area.id,
      label: area.nome,
    }));
  }, [areas]);

  const responsavelOptions = useMemo(() => {
    return responsaveis.map((responsavel) => ({
      value: responsavel.id,
      label: responsavel.nome,
    }));
  }, [responsaveis]);

  async function carregarOpcoes() {
    const [fazendasBanco, areasBanco, responsaveisBanco] = await Promise.all([
      listarFazendasAtivas(),
      listarAreasFazendaAtivas(),
      listarResponsaveisAtivos(),
    ]);

    setFazendas(fazendasBanco || []);
    setAreas(areasBanco || []);
    setResponsaveis(responsaveisBanco || []);
  }

  function montarFiltrosParaBusca(filtrosAtuais) {
    return {
      dataInicial: filtrosAtuais.dataInicial || "",
      dataFinal: filtrosAtuais.dataFinal || "",
      fazendaId: filtrosAtuais.fazendaId || "",
      areaFazendaId: filtrosAtuais.areaFazendaId || "",
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

      const registrosBanco = await listarChegadasFazenda(
        montarFiltrosParaBusca(filtrosAtuais)
      );

      setRegistros(registrosBanco || []);
      setPaginaAtual(1);

      if ((registrosBanco || []).length === 0) {
        setDetalheSelecionado(null);
      }
    } catch (error) {
      console.error("Erro ao consultar chegada da fazenda:", error);

      setErro(
        error.message ||
          "Não foi possível consultar as chegadas da fazenda. Confira as permissões no Supabase."
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

      const registrosBanco = await listarChegadasFazenda();

      setRegistros(registrosBanco || []);
      setPaginaAtual(1);
    } catch (error) {
      console.error("Erro ao carregar consulta de chegada da fazenda:", error);

      setErro(
        error.message || "Não foi possível carregar a consulta de chegada."
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
    setFiltros(FILTROS_INICIAIS);
    setDetalheSelecionado(null);
    setRegistroEditandoId(null);
    setErro("");
    setSucesso("");

    carregarRegistros(FILTROS_INICIAIS);
  }

  function alterarOrdenacao(campo) {
    setOrdenacao((estadoAtual) => {
      if (estadoAtual.campo === campo) {
        return {
          campo,
          direcao: estadoAtual.direcao === "asc" ? "desc" : "asc",
        };
      }

      return {
        campo,
        direcao: "asc",
      };
    });

    setPaginaAtual(1);
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
      fazenda_id: registro.fazenda_id || registro.fazendas?.id || "",
      area_fazenda_id:
        registro.area_fazenda_id || registro.areas_fazenda?.id || "",
      lote: registro.lote || "",
      quantidade_caixas: String(registro.quantidade_caixas || ""),
      media_peso_caixa_kg: String(registro.media_peso_caixa_kg || ""),
      conferido: registro.conferido ? "sim" : "nao",
      responsavel_id: registro.responsavel_id || registro.responsaveis?.id || "",
      observacao: registro.observacao || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelarEdicao() {
    setRegistroEditandoId(null);
    setFormEdicao(FORM_EDICAO_INICIAL);
  }

  function atualizarFormEdicao(event) {
    const { name, value } = event.target;

    setFormEdicao((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));

    setErro("");
    setSucesso("");
  }

  function validarEdicao() {
    if (!formEdicao.data_recebimento) {
      return "Informe a data de recebimento.";
    }

    if (!formEdicao.hora) {
      return "Informe a hora.";
    }

    if (!formEdicao.fazenda_id) {
      return "Selecione a fazenda.";
    }

    if (!formEdicao.area_fazenda_id) {
      return "Selecione a Área / Pivô.";
    }

    if (!formEdicao.quantidade_caixas) {
      return "Informe a quantidade de caixas.";
    }

    if (Number(formEdicao.quantidade_caixas) <= 0) {
      return "A quantidade de caixas precisa ser maior que zero.";
    }

    if (!formEdicao.media_peso_caixa_kg) {
      return "Informe o peso médio por caixa.";
    }

    if (Number(formEdicao.media_peso_caixa_kg) <= 0) {
      return "O peso médio por caixa precisa ser maior que zero.";
    }

    if (!formEdicao.responsavel_id) {
      return "Selecione o responsável.";
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

      await editarChegadaFazenda(registroEditandoId, {
        ...formEdicao,
        conferido: formEdicao.conferido === "sim",
      });

      setSucesso("Chegada da fazenda atualizada com sucesso.");
      setRegistroEditandoId(null);
      setFormEdicao(FORM_EDICAO_INICIAL);

      await carregarRegistros(filtros);
    } catch (error) {
      console.error("Erro ao editar chegada da fazenda:", error);

      setErro(error.message || "Não foi possível editar a chegada da fazenda.");
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

      await excluirChegadaFazenda(registroParaExcluir.id);

      if (detalheSelecionado?.id === registroParaExcluir.id) {
        setDetalheSelecionado(null);
      }

      if (registroEditandoId === registroParaExcluir.id) {
        setRegistroEditandoId(null);
      }

      setRegistroParaExcluir(null);
      setSucesso("Chegada da fazenda excluída com sucesso.");

      await carregarRegistros(filtros);
    } catch (error) {
      console.error("Erro ao excluir chegada da fazenda:", error);

      setErro(error.message || "Não foi possível excluir a chegada da fazenda.");
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
      label: (
        <CabecalhoOrdenavel
          label="Data"
          campo="data_recebimento"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => formatarData(value),
    },
    {
      key: "hora",
      label: (
        <CabecalhoOrdenavel
          label="Hora"
          campo="hora"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => formatarHora(value),
    },
    {
      key: "fazendas",
      label: (
        <CabecalhoOrdenavel
          label="Fazenda"
          campo="fazenda"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (_, row) => obterFazendaNome(row),
    },
    {
      key: "areas_fazenda",
      label: (
        <CabecalhoOrdenavel
          label="Área / Pivô"
          campo="area"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (_, row) => obterAreaNome(row),
    },
    {
      key: "lote",
      label: (
        <CabecalhoOrdenavel
          label="Lote / Carga"
          campo="lote"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => value || "-",
    },
    {
      key: "quantidade_caixas",
      label: (
        <CabecalhoOrdenavel
          label="Caixas"
          campo="quantidade_caixas"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "media_peso_caixa_kg",
      label: (
        <CabecalhoOrdenavel
          label="Peso médio"
          campo="media_peso_caixa_kg"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => formatarKg(value),
    },
    {
      key: "peso_total_estimado_kg",
      label: (
        <CabecalhoOrdenavel
          label="Peso estimado"
          campo="peso_total_estimado_kg"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => formatarKg(value),
    },
    {
      key: "conferido",
      label: (
        <CabecalhoOrdenavel
          label="Status"
          campo="conferido"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) =>
        value ? (
          <Badge variant="success">Conferido</Badge>
        ) : (
          <Badge variant="warning">Pendente</Badge>
        ),
    },
    {
      key: "responsaveis",
      label: (
        <CabecalhoOrdenavel
          label="Responsável"
          campo="responsavel"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (_, row) => obterResponsavelNome(row),
    },
    {
      key: "observacao",
      label: (
        <CabecalhoOrdenavel
          label="Observação"
          campo="observacao"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
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
        title="Excluir chegada da fazenda?"
        description="Essa ação remove o lançamento selecionado do histórico de chegada. Essa exclusão não pode ser desfeita."
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
                  {formatarData(registroParaExcluir.data_recebimento)}
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                  Fazenda
                </p>
                <p className="mt-1 font-black text-[var(--color-text-primary)]">
                  {obterFazendaNome(registroParaExcluir)}
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                  Área / Pivô
                </p>
                <p className="mt-1 font-black text-[var(--color-text-primary)]">
                  {obterAreaNome(registroParaExcluir)}
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                  Lote / Carga
                </p>
                <p className="mt-1 font-black text-[var(--color-text-primary)]">
                  {registroParaExcluir.lote || "-"}
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
                  Peso estimado
                </p>
                <p className="mt-1 font-black text-[var(--color-text-primary)]">
                  {formatarKg(registroParaExcluir.peso_total_estimado_kg)}
                </p>
              </div>
            </div>
          ) : null
        }
      />

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Recebimentos"
          value={formatarNumero(resumo.totalRegistros)}
          description="Registros encontrados"
          icon={Truck}
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
          title="Peso estimado"
          value={formatarKg(resumo.pesoTotalEstimadoKg)}
          description="Peso total filtrado"
          icon={Scale}
          variant="success"
        />

        <KpiCard
          title="Conferidos"
          value={formatarNumero(resumo.conferidos)}
          description={`${formatarNumero(resumo.pendentes)} pendentes`}
          icon={CheckCircle}
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
              Filtre as chegadas por período, fazenda, Área / Pivô, responsável
              e status.
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
            label="Fazenda"
            name="fazendaId"
            value={filtros.fazendaId}
            onChange={atualizarFiltro}
            options={fazendaOptions}
            placeholder="Todas as fazendas"
          />

          <Select
            label="Área / Pivô"
            name="areaFazendaId"
            value={filtros.areaFazendaId}
            onChange={atualizarFiltro}
            options={areaOptions}
            placeholder="Todas as áreas"
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
                Detalhe rápido da chegada
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
                Fazenda
              </p>

              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {obterFazendaNome(detalheSelecionado)}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Área / Pivô
              </p>

              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {obterAreaNome(detalheSelecionado)}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Lote / Carga
              </p>

              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {detalheSelecionado.lote || "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Caixas recebidas
              </p>

              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {formatarNumero(detalheSelecionado.quantidade_caixas)} caixas
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Peso médio
              </p>

              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {formatarKg(detalheSelecionado.media_peso_caixa_kg)}
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

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Data e hora
              </p>

              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {formatarData(detalheSelecionado.data_recebimento)} às{" "}
                {formatarHora(detalheSelecionado.hora)}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Responsável
              </p>

              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {obterResponsavelNome(detalheSelecionado)}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Status
              </p>

              <p className="mt-1 font-bold text-[var(--color-text-primary)]">
                {detalheSelecionado.conferido ? "Conferido" : "Pendente"}
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
                Editar chegada da fazenda
              </h3>

              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Atualize os dados do lançamento de chegada.
              </p>
            </div>

            <Badge variant="warning">Editando</Badge>
          </div>

          <form onSubmit={salvarEdicao}>
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Data de recebimento"
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
                label="Fazenda"
                name="fazenda_id"
                value={formEdicao.fazenda_id}
                onChange={atualizarFormEdicao}
                options={fazendaOptions}
                placeholder="Selecione a fazenda"
              />

              <Select
                label="Área / Pivô"
                name="area_fazenda_id"
                value={formEdicao.area_fazenda_id}
                onChange={atualizarFormEdicao}
                options={areaOptions}
                placeholder="Selecione a Área / Pivô"
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
                label="Peso médio por caixa em kg"
                name="media_peso_caixa_kg"
                type="number"
                value={formEdicao.media_peso_caixa_kg}
                onChange={atualizarFormEdicao}
              />

              <Input
                label="Peso total estimado"
                name="peso_total_estimado"
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
              Chegadas encontradas
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Clique no nome de uma coluna para ordenar os lançamentos.
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
            Carregando chegadas do banco...
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={registrosPaginados}
              emptyMessage="Nenhuma chegada encontrada para os filtros aplicados."
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