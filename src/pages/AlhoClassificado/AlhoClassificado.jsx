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

import LancamentoModal from "../../components/ui/LancamentoModal";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  Edit,
  Filter,
  Layers,
  PackageCheck,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { listarFazendasAtivas } from "../../services/fazendasService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";
import { listarCalibresAtivos } from "../../services/calibresService";
import { listarAreasFazendaAtivas } from "../../services/areasFazendaService";

import {
  cadastrarAlhoClassificado,
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

function obterHoraAtual() {
  return new Date().toTimeString().slice(0, 5);
}

function formatarData(data) {
  if (!data) return "-";
  const [ano, mes, dia] = String(data).split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

function formatarHora(hora) {
  if (!hora) return "-";
  return String(hora).slice(0, 5);
}

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function numero(valor) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function obterFazendaIdDaArea(area) {
  return area?.fazenda_id || area?.fazendaId || area?.fazendas?.id || "";
}

function obterFazendaIdRegistro(registro) {
  return registro?.fazenda_id || registro?.fazendas?.id || "";
}

function obterFazendaNome(registro) {
  return registro?.fazendas?.nome || registro?.fazenda_nome || "-";
}

function encontrarAreaPorId(areaId, areas = []) {
  if (!areaId) return null;

  return (
    areas.find(
      (area) =>
        area.id === areaId ||
        area.area_id === areaId ||
        area.area_fazenda_id === areaId
    ) || null
  );
}

function encontrarAreaPorNome(nome, fazendaId, areas = []) {
  const nomeNormalizado = normalizarTexto(nome);

  if (!nomeNormalizado) return null;

  return (
    areas.find((area) => {
      const mesmoNome = normalizarTexto(area.nome) === nomeNormalizado;
      const areaFazendaId = obterFazendaIdDaArea(area);
      const mesmaFazenda = !fazendaId || !areaFazendaId || areaFazendaId === fazendaId;

      return mesmoNome && mesmaFazenda;
    }) || null
  );
}

function obterAreaResolvida(registro, areas = []) {
  const areaId =
    registro?.area_fazenda_id ||
    registro?.area_id ||
    registro?.areas_fazenda?.id ||
    "";

  const areaPorId = encontrarAreaPorId(areaId, areas);

  if (areaPorId) return areaPorId;

  if (registro?.areas_fazenda?.nome) return registro.areas_fazenda;

  const fazendaId = obterFazendaIdRegistro(registro);
  const areaPeloLote = encontrarAreaPorNome(registro?.lote, fazendaId, areas);

  if (areaPeloLote) return areaPeloLote;

  return null;
}

function obterAreaId(registro, areas = []) {
  const area = obterAreaResolvida(registro, areas);

  return (
    area?.id ||
    registro?.area_fazenda_id ||
    registro?.area_id ||
    registro?.areas_fazenda?.id ||
    ""
  );
}

function obterAreaNome(registro, areas = []) {
  const area = obterAreaResolvida(registro, areas);

  return (
    area?.nome ||
    registro?.area_nome ||
    registro?.area_fazenda_nome ||
    "-"
  );
}

function loteEhNomeDeArea(registro, areas = []) {
  if (!registro?.lote) return false;

  const fazendaId = obterFazendaIdRegistro(registro);
  const area = encontrarAreaPorNome(registro.lote, fazendaId, areas);

  return Boolean(area);
}

function obterLoteTabela(registro, areas = []) {
  if (!registro?.lote) return "-";

  if (loteEhNomeDeArea(registro, areas)) {
    return "-";
  }

  return registro.lote;
}

function obterLoteEdicao(registro, areas = []) {
  if (!registro?.lote) return "";

  if (loteEhNomeDeArea(registro, areas)) {
    return "";
  }

  return registro.lote;
}

function obterCalibreId(registro) {
  return registro?.calibre_id || registro?.calibres?.id || "";
}

function obterCalibreNome(registro) {
  if (registro?.calibres) {
    return `${registro.calibres.codigo} — ${registro.calibres.nome}`;
  }

  if (registro?.calibre_codigo || registro?.calibre_nome) {
    return `${registro.calibre_codigo || ""} — ${registro.calibre_nome || ""}`;
  }

  return "-";
}

function obterResponsavelId(registro) {
  return registro?.responsavel_id || registro?.responsaveis?.id || "";
}

function obterResponsavelNome(registro) {
  return registro?.responsaveis?.nome || registro?.responsavel_nome || "-";
}

function obterValorOrdenacao(registro, campo, areas = []) {
  switch (campo) {
    case "data_classificacao":
      return registro.data_classificacao || "";
    case "hora":
      return registro.hora || "";
    case "fazenda":
      return obterFazendaNome(registro);
    case "area":
      return obterAreaNome(registro, areas);
    case "lote":
      return obterLoteTabela(registro, areas);
    case "calibre":
      return obterCalibreNome(registro);
    case "quantidade_paletes":
      return numero(registro.quantidade_paletes);
    case "caixas_por_palete":
      return numero(registro.caixas_por_palete);
    case "total_caixas":
      return numero(registro.total_caixas);
    case "conferido":
      return registro.conferido ? "Conferido" : "Pendente";
    case "responsavel":
      return obterResponsavelNome(registro);
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
      className="inline-flex items-center gap-1.5 rounded-lg text-left font-black uppercase tracking-wide text-[var(--color-text-muted)] transition hover:text-[var(--color-green-primary)]"
      title={`Ordenar por ${label}`}
    >
      <span>{label}</span>
      {!ativo && <ArrowUpDown size={14} />}
      {ativo && direcao === "asc" && <ArrowUp size={14} />}
      {ativo && direcao === "desc" && <ArrowDown size={14} />}
    </button>
  );
}

const FORM_INICIAL = {
  data_classificacao: "",
  hora: "",
  fazenda_id: "",
  area_fazenda_id: "",
  lote: "",
  calibre_id: "",
  quantidade_paletes: "",
  caixas_por_palete: "",
  permitir_edicao_total_caixas: false,
  total_caixas_manual: "",
  conferido: "true",
  responsavel_id: "",
  observacao: "",
};

const FILTROS_INICIAIS = {
  dataInicial: "",
  dataFinal: "",
  fazendaId: "",
  areaId: "",
  calibreId: "",
  status: "todos",
  responsavelId: "",
};

function AlhoClassificado() {
  const [fazendas, setFazendas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [calibres, setCalibres] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [classificacoes, setClassificacoes] = useState([]);

  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);

  const [form, setForm] = useState({
    ...FORM_INICIAL,
    data_classificacao: obterDataAtual(),
    hora: obterHoraAtual(),
  });

  const [editandoId, setEditandoId] = useState(null);
  const [registroParaExcluir, setRegistroParaExcluir] = useState(null);
  const [modalFormularioAberta, setModalFormularioAberta] = useState(false);

  const [ordenacao, setOrdenacao] = useState({
    campo: "data_classificacao",
    direcao: "desc",
  });

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const totalAutomatico = useMemo(() => {
    return (
      Number(form.quantidade_paletes || 0) *
      Number(form.caixas_por_palete || 0)
    );
  }, [form.quantidade_paletes, form.caixas_por_palete]);

  const totalFinalExibido = useMemo(() => {
    if (form.permitir_edicao_total_caixas) {
      return Number(form.total_caixas_manual || 0);
    }

    return totalAutomatico;
  }, [
    form.permitir_edicao_total_caixas,
    form.total_caixas_manual,
    totalAutomatico,
  ]);

  const fazendaOptions = useMemo(() => {
    return fazendas.map((fazenda) => ({
      value: fazenda.id,
      label: fazenda.nome,
    }));
  }, [fazendas]);

  const areasAtivas = useMemo(() => {
    return areas.filter((area) => area.ativo !== false);
  }, [areas]);

  const areaOptionsFormulario = useMemo(() => {
    const fazendaSelecionada = form.fazenda_id;

    const filtradas = fazendaSelecionada
      ? areasAtivas.filter((area) => {
          const areaFazendaId = obterFazendaIdDaArea(area);
          return !areaFazendaId || areaFazendaId === fazendaSelecionada;
        })
      : areasAtivas;

    const listaFinal = filtradas.length > 0 ? filtradas : areasAtivas;

    return listaFinal.map((area) => ({
      value: area.id,
      label: area.nome,
    }));
  }, [areasAtivas, form.fazenda_id]);

  const areaOptionsFiltro = useMemo(() => {
    const fazendaSelecionada = filtros.fazendaId;

    const filtradas = fazendaSelecionada
      ? areasAtivas.filter((area) => {
          const areaFazendaId = obterFazendaIdDaArea(area);
          return !areaFazendaId || areaFazendaId === fazendaSelecionada;
        })
      : areasAtivas;

    const listaFinal = filtradas.length > 0 ? filtradas : areasAtivas;

    return listaFinal.map((area) => ({
      value: area.id,
      label: area.nome,
    }));
  }, [areasAtivas, filtros.fazendaId]);

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

  const classificacoesFiltradas = useMemo(() => {
    return classificacoes.filter((registro) => {
      const data = registro.data_classificacao || "";
      const fazendaId = obterFazendaIdRegistro(registro);
      const areaId = obterAreaId(registro, areas);
      const calibreId = obterCalibreId(registro);
      const responsavelId = obterResponsavelId(registro);

      if (filtros.dataInicial && data < filtros.dataInicial) return false;
      if (filtros.dataFinal && data > filtros.dataFinal) return false;
      if (filtros.fazendaId && fazendaId !== filtros.fazendaId) return false;
      if (filtros.areaId && areaId !== filtros.areaId) return false;
      if (filtros.calibreId && calibreId !== filtros.calibreId) return false;

      if (filtros.responsavelId && responsavelId !== filtros.responsavelId) {
        return false;
      }

      if (filtros.status === "conferido" && !registro.conferido) return false;
      if (filtros.status === "pendente" && registro.conferido) return false;

      return true;
    });
  }, [classificacoes, filtros, areas]);

  const classificacoesOrdenadas = useMemo(() => {
    const lista = [...classificacoesFiltradas];

    lista.sort((a, b) => {
      const valorA = obterValorOrdenacao(a, ordenacao.campo, areas);
      const valorB = obterValorOrdenacao(b, ordenacao.campo, areas);
      const resultado = compararValores(valorA, valorB);

      return ordenacao.direcao === "asc" ? resultado : resultado * -1;
    });

    return lista;
  }, [classificacoesFiltradas, ordenacao, areas]);

  const resumo = useMemo(() => {
    return calcularResumoAlhoClassificado(classificacoesFiltradas);
  }, [classificacoesFiltradas]);

  async function carregarDados(limparMensagens = true) {
    try {
      setCarregando(true);

      if (limparMensagens) {
        setErro("");
        setSucesso("");
      }

      const [
        fazendasBanco,
        areasBanco,
        calibresBanco,
        responsaveisBanco,
        classificacoesBanco,
      ] = await Promise.all([
        listarFazendasAtivas(),
        listarAreasFazendaAtivas(),
        listarCalibresAtivos(),
        listarResponsaveisAtivos(),
        listarAlhoClassificado(),
      ]);

      setFazendas(fazendasBanco || []);
      setAreas(areasBanco || []);
      setCalibres(calibresBanco || []);
      setResponsaveis(responsaveisBanco || []);
      setClassificacoes(classificacoesBanco || []);
    } catch (error) {
      console.error("Erro ao carregar alho classificado:", error);
      setErro(error.message || "Não foi possível carregar a classificação.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function atualizarCampo(event) {
    const { name, value, type, checked } = event.target;

    setErro("");
    setSucesso("");

    if (name === "fazenda_id") {
      setForm((estadoAtual) => {
        const areaAtual = encontrarAreaPorId(estadoAtual.area_fazenda_id, areas);
        const areaPertenceFazenda =
          areaAtual && obterFazendaIdDaArea(areaAtual) === value;

        return {
          ...estadoAtual,
          fazenda_id: value,
          area_fazenda_id: areaPertenceFazenda
            ? estadoAtual.area_fazenda_id
            : "",
        };
      });

      return;
    }

    if (name === "permitir_edicao_total_caixas") {
      setForm((estadoAtual) => {
        const vaiPermitir = checked;

        const totalCalculadoAgora =
          Number(estadoAtual.quantidade_paletes || 0) *
          Number(estadoAtual.caixas_por_palete || 0);

        return {
          ...estadoAtual,
          permitir_edicao_total_caixas: vaiPermitir,
          total_caixas_manual: vaiPermitir
            ? String(estadoAtual.total_caixas_manual || totalCalculadoAgora || "")
            : "",
        };
      });

      return;
    }

    setForm((estadoAtual) => {
      const novoEstado = {
        ...estadoAtual,
        [name]: type === "checkbox" ? checked : value,
      };

      if (
        !novoEstado.permitir_edicao_total_caixas &&
        (name === "quantidade_paletes" || name === "caixas_por_palete")
      ) {
        novoEstado.total_caixas_manual = "";
      }

      return novoEstado;
    });
  }

  function atualizarFiltro(event) {
    const { name, value } = event.target;

    if (name === "fazendaId") {
      setFiltros((estadoAtual) => ({
        ...estadoAtual,
        fazendaId: value,
        areaId: "",
      }));

      return;
    }

    setFiltros((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));

    setErro("");
    setSucesso("");
  }

  function limparFiltros() {
    setFiltros(FILTROS_INICIAIS);
    setErro("");
    setSucesso("");
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
  }

  function validarFormulario() {
    if (!form.data_classificacao) return "Informe a data de classificação.";
    if (!form.hora) return "Informe a hora.";
    if (!form.fazenda_id) return "Selecione a fazenda.";
    if (!form.area_fazenda_id) return "Selecione a Área / Pivô.";
    if (!form.calibre_id) return "Selecione o calibre.";
    if (!form.quantidade_paletes) return "Informe a quantidade de paletes.";
    if (!form.caixas_por_palete) return "Informe as caixas por palete.";
    if (!form.responsavel_id) return "Selecione o responsável.";

    if (Number(form.quantidade_paletes) <= 0) {
      return "A quantidade de paletes precisa ser maior que zero.";
    }

    if (Number(form.caixas_por_palete) <= 0) {
      return "As caixas por palete precisam ser maior que zero.";
    }

    if (form.permitir_edicao_total_caixas) {
      if (!form.total_caixas_manual) {
        return "Informe o total de caixas manual.";
      }

      if (Number(form.total_caixas_manual) <= 0) {
        return "O total de caixas manual precisa ser maior que zero.";
      }
    }

    return "";
  }

  function limparFormulario() {
    setEditandoId(null);

    setForm({
      ...FORM_INICIAL,
      data_classificacao: obterDataAtual(),
      hora: obterHoraAtual(),
    });
  }

  function abrirNovoLancamento() {
    limparFormulario();
    setErro("");
    setSucesso("");
    setModalFormularioAberta(true);
  }

  function fecharModalFormulario() {
    if (salvando) return;

    setModalFormularioAberta(false);
    limparFormulario();
  }

  async function salvarRegistro(event) {
    event.preventDefault();

    try {
      setErro("");
      setSucesso("");

      const mensagemErro = validarFormulario();

      if (mensagemErro) {
        setErro(mensagemErro);
        return;
      }

      setSalvando(true);

      const payload = {
        data_classificacao: form.data_classificacao,
        hora: form.hora,
        fazenda_id: form.fazenda_id,
        area_fazenda_id: form.area_fazenda_id,
        area_id: form.area_fazenda_id,
        lote: form.lote,
        calibre_id: form.calibre_id,
        quantidade_paletes: form.quantidade_paletes,
        caixas_por_palete: form.caixas_por_palete,
        permitir_edicao_total_caixas: Boolean(
          form.permitir_edicao_total_caixas
        ),
        total_caixas_manual: form.permitir_edicao_total_caixas
          ? form.total_caixas_manual
          : null,
        conferido: form.conferido === "true",
        responsavel_id: form.responsavel_id,
        observacao: form.observacao,
      };

      if (editandoId) {
        await editarAlhoClassificado(editandoId, payload);
        setSucesso("Classificação atualizada com sucesso.");
      } else {
        await cadastrarAlhoClassificado(payload);
        setSucesso("Classificação cadastrada com sucesso.");
      }

      setModalFormularioAberta(false);
      limparFormulario();

      await carregarDados(false);
    } catch (error) {
      console.error("Erro ao salvar classificação:", error);
      setErro(error.message || "Não foi possível salvar a classificação.");
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(registro) {
    const areaId = obterAreaId(registro, areas);
    const area = encontrarAreaPorId(areaId, areas);
    const fazendaId =
      obterFazendaIdRegistro(registro) || obterFazendaIdDaArea(area) || "";

    setEditandoId(registro.id);

    setForm({
      data_classificacao: registro.data_classificacao || obterDataAtual(),
      hora: registro.hora ? String(registro.hora).slice(0, 5) : obterHoraAtual(),
      fazenda_id: fazendaId,
      area_fazenda_id: areaId,
      lote: obterLoteEdicao(registro, areas),
      calibre_id: obterCalibreId(registro),
      quantidade_paletes: String(registro.quantidade_paletes || ""),
      caixas_por_palete: String(registro.caixas_por_palete || ""),
      permitir_edicao_total_caixas: Boolean(
        registro.permitir_edicao_total_caixas
      ),
      total_caixas_manual: registro.permitir_edicao_total_caixas
        ? String(registro.total_caixas_manual || registro.total_caixas || "")
        : "",
      conferido: registro.conferido ? "true" : "false",
      responsavel_id: obterResponsavelId(registro),
      observacao: registro.observacao || "",
    });

    setErro("");
    setSucesso("");
    setModalFormularioAberta(true);
  }

  function cancelarEdicao() {
    limparFormulario();
    setErro("");
    setSucesso("");
    setModalFormularioAberta(false);
  }

  function solicitarExclusao(registro) {
    if (!registro?.id) {
      setErro("Não foi possível identificar a classificação para exclusão.");
      return;
    }

    setRegistroParaExcluir(registro);
    setErro("");
    setSucesso("");
  }

  function cancelarExclusao() {
    if (excluindoId) return;

    setRegistroParaExcluir(null);
  }

  async function confirmarExclusao() {
    if (!registroParaExcluir?.id) return;

    try {
      setExcluindoId(registroParaExcluir.id);
      setErro("");
      setSucesso("");

      await excluirAlhoClassificado(registroParaExcluir.id);

      if (editandoId === registroParaExcluir.id) {
        cancelarEdicao();
      }

      setRegistroParaExcluir(null);
      setSucesso("Classificação excluída com sucesso.");

      await carregarDados(false);
    } catch (error) {
      console.error("Erro ao excluir classificação:", error);
      setErro(error.message || "Não foi possível excluir a classificação.");
    } finally {
      setExcluindoId(null);
    }
  }

  const columns = [
    {
      key: "data_classificacao",
      label: (
        <CabecalhoOrdenavel
          label="Data"
          campo="data_classificacao"
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
      render: (_, row) => obterAreaNome(row, areas),
    },
    {
      key: "lote",
      label: (
        <CabecalhoOrdenavel
          label="Lote"
          campo="lote"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (_, row) => obterLoteTabela(row, areas),
    },
    {
      key: "calibres",
      label: (
        <CabecalhoOrdenavel
          label="Calibre"
          campo="calibre"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (_, row) => obterCalibreNome(row),
    },
    {
      key: "quantidade_paletes",
      label: (
        <CabecalhoOrdenavel
          label="Paletes"
          campo="quantidade_paletes"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => formatarNumero(value),
    },
    {
      key: "caixas_por_palete",
      label: (
        <CabecalhoOrdenavel
          label="Caixas por palete"
          campo="caixas_por_palete"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => formatarNumero(value),
    },
    {
      key: "total_caixas",
      label: (
        <CabecalhoOrdenavel
          label="Total de caixas"
          campo="total_caixas"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value, row) => (
        <div>
          <p className="font-black text-[var(--color-text-primary)]">
            {formatarNumero(value)} caixas
          </p>

          {row.permitir_edicao_total_caixas && (
            <p className="mt-1 text-xs font-bold text-orange-700">
              Ajustado manualmente
            </p>
          )}
        </div>
      ),
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
      key: "acoes",
      label: "Ações",
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={salvando || Boolean(excluindoId)}
            onClick={() => iniciarEdicao(row)}
          >
            <Edit size={16} />
            Editar
          </Button>

          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={salvando || excluindoId === row.id}
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
      {registroParaExcluir && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                  <Trash2 size={24} />
                </div>

                <div>
                  <h3 className="text-xl font-black text-[var(--color-text-primary)]">
                    Excluir classificação?
                  </h3>

                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">
                    Essa ação remove o lançamento selecionado de alho classificado.
                    Essa exclusão não pode ser desfeita.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={Boolean(excluindoId)}
                onClick={cancelarExclusao}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Data
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {formatarData(registroParaExcluir.data_classificacao)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Área / Pivô
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {obterAreaNome(registroParaExcluir, areas)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Lote
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {obterLoteTabela(registroParaExcluir, areas)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Calibre
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {obterCalibreNome(registroParaExcluir)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Paletes
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {formatarNumero(registroParaExcluir.quantidade_paletes)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Total de caixas
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {formatarNumero(registroParaExcluir.total_caixas)} caixas
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={Boolean(excluindoId)}
                  onClick={cancelarExclusao}
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  variant="danger"
                  disabled={Boolean(excluindoId)}
                  onClick={confirmarExclusao}
                >
                  <Trash2 size={16} />
                  {excluindoId ? "Excluindo..." : "Confirmar exclusão"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <LancamentoModal
        open={modalFormularioAberta}
        title={editandoId ? "Editar alho classificado" : "Novo alho classificado"}
        description="Lance a classificação por fazenda, área, calibre e quantidade."
        badge={editandoId ? <Badge variant="warning">Editando</Badge> : null}
        disabled={salvando}
        onClose={fecharModalFormulario}
      >
        {erro && (
          <div className="mb-5">
            <AlertBox variant="danger" title="Atenção" description={erro} />
          </div>
        )}

        <form onSubmit={salvarRegistro}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="Data de classificação"
              name="data_classificacao"
              type="date"
              value={form.data_classificacao}
              onChange={atualizarCampo}
            />

            <Input
              label="Hora"
              name="hora"
              type="time"
              value={form.hora}
              onChange={atualizarCampo}
            />

            <Select
              label="Fazenda"
              name="fazenda_id"
              value={form.fazenda_id}
              onChange={atualizarCampo}
              options={fazendaOptions}
              placeholder="Selecione a fazenda"
            />

            <Select
              label="Área / Pivô"
              name="area_fazenda_id"
              value={form.area_fazenda_id}
              onChange={atualizarCampo}
              options={areaOptionsFormulario}
              placeholder={
                areaOptionsFormulario.length > 0
                  ? "Selecione a Área / Pivô"
                  : "Nenhuma área cadastrada"
              }
            />

            <Input
              label="Lote"
              name="lote"
              value={form.lote}
              onChange={atualizarCampo}
              placeholder="Ex: Lote A, Carga 02..."
            />

            <Select
              label="Calibre"
              name="calibre_id"
              value={form.calibre_id}
              onChange={atualizarCampo}
              options={calibreOptions}
              placeholder="Selecione o calibre"
            />

            <Input
              label="Quantidade de paletes"
              name="quantidade_paletes"
              type="number"
              value={form.quantidade_paletes}
              onChange={atualizarCampo}
            />

            <Input
              label="Caixas por palete"
              name="caixas_por_palete"
              type="number"
              value={form.caixas_por_palete}
              onChange={atualizarCampo}
            />

            <div>
              <Input
                label={
                  form.permitir_edicao_total_caixas
                    ? "Total de caixas manual"
                    : "Total de caixas calculado"
                }
                name="total_caixas_manual"
                type="number"
                value={
                  form.permitir_edicao_total_caixas
                    ? form.total_caixas_manual
                    : totalAutomatico
                }
                onChange={atualizarCampo}
                disabled={!form.permitir_edicao_total_caixas}
              />

              <label className="mt-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  name="permitir_edicao_total_caixas"
                  checked={Boolean(form.permitir_edicao_total_caixas)}
                  onChange={atualizarCampo}
                  className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-green-primary)]"
                />

                <span className="text-sm font-bold text-[var(--color-text-primary)]">
                  Permitir edição manual do total de caixas
                </span>
              </label>

              <p className="mt-2 text-xs font-semibold text-[var(--color-text-muted)]">
                Cálculo automático: {formatarNumero(totalAutomatico)} caixas.
                Total usado no lançamento: {formatarNumero(totalFinalExibido)} caixas.
              </p>
            </div>

            <Select
              label="Status"
              name="conferido"
              value={form.conferido}
              onChange={atualizarCampo}
              options={[
                { value: "true", label: "Conferido" },
                { value: "false", label: "Pendente" },
              ]}
              placeholder="Selecione o status"
            />

            <Select
              label="Responsável"
              name="responsavel_id"
              value={form.responsavel_id}
              onChange={atualizarCampo}
              options={responsavelOptions}
              placeholder="Selecione o responsável"
            />

            <div className="md:col-span-2">
              <Textarea
                label="Observação"
                name="observacao"
                value={form.observacao}
                onChange={atualizarCampo}
                placeholder="Observações sobre a classificação..."
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {editandoId && (
              <Button
                type="button"
                variant="secondary"
                disabled={salvando}
                onClick={cancelarEdicao}
              >
                <X size={16} />
                Cancelar edição
              </Button>
            )}

            {!editandoId && (
              <Button
                type="button"
                variant="secondary"
                disabled={salvando}
                onClick={fecharModalFormulario}
              >
                <X size={16} />
                Cancelar
              </Button>
            )}

            <Button type="submit" variant="primary" disabled={salvando}>
              <Save size={16} />
              {salvando ? "Salvando..." : "Salvar classificação"}
            </Button>
          </div>
        </form>
      </LancamentoModal>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <KpiCard
          title="Classificações"
          value={formatarNumero(resumo.totalRegistros)}
          description="Registros encontrados"
          icon={Layers}
          variant="info"
        />

        <KpiCard
          title="Paletes"
          value={formatarNumero(resumo.totalPaletes)}
          description="Total filtrado"
          icon={PackageCheck}
          variant="success"
        />

        <KpiCard
          title="Caixas"
          value={formatarNumero(resumo.totalCaixas)}
          description="Total final classificado"
          icon={CheckCircle}
          variant="success"
        />
      </section>

      {erro && !modalFormularioAberta && (
        <AlertBox variant="danger" title="Atenção" description={erro} />
      )}

      {sucesso && (
        <AlertBox
          variant="success"
          title="Operação concluída"
          description={sucesso}
        />
      )}

      <Card>
        <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-green-light)] text-[var(--color-green-primary)]">
              <Filter size={22} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                Filtros da classificação
              </h3>

              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Filtre as classificações por período, fazenda, área, calibre,
                status e responsável.
              </p>
            </div>
          </div>

          <Button type="button" variant="primary" onClick={abrirNovoLancamento}>
            <Plus size={16} />
            Novo lançamento
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
            name="areaId"
            value={filtros.areaId}
            onChange={atualizarFiltro}
            options={areaOptionsFiltro}
            placeholder={
              areaOptionsFiltro.length > 0 ? "Todas as áreas" : "Nenhuma área"
            }
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
              { value: "todos", label: "Todos" },
              { value: "conferido", label: "Conferidos" },
              { value: "pendente", label: "Pendentes" },
            ]}
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

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="secondary" onClick={limparFiltros}>
            <X size={16} />
            Limpar filtros
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-xl font-black text-[var(--color-text-primary)]">
              Classificações registradas
            </h3>

            <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
              Clique no nome de uma coluna para ordenar os lançamentos.
            </p>
          </div>

          <Badge variant="info">
            {carregando
              ? "Carregando"
              : `${formatarNumero(classificacoesFiltradas.length)} registros`}
          </Badge>
        </div>

        {carregando ? (
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Carregando classificações...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={classificacoesOrdenadas}
            emptyMessage="Nenhuma classificação encontrada para os filtros aplicados."
          />
        )}
      </Card>
    </div>
  );
}

export default AlhoClassificado;