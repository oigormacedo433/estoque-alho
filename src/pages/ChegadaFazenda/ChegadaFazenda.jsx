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
  Package,
  Plus,
  Save,
  Scale,
  Trash2,
  Truck,
  X,
} from "lucide-react";

import { supabase } from "../../services/supabaseClient";

import { listarFazendasAtivas } from "../../services/fazendasService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";
import { listarAreasFazendaAtivas } from "../../services/areasFazendaService";

import {
  cadastrarChegadaFazenda,
  calcularResumoChegadaFazenda,
  editarChegadaFazenda,
  listarChegadasFazenda,
} from "../../services/chegadaFazendaService";

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

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obterAreaIdDireto(registro) {
  return (
    registro?.area_fazenda_id ||
    registro?.area_id ||
    registro?.area_pivo_id ||
    registro?.areas_fazenda?.id ||
    registro?.area?.id ||
    ""
  );
}

function obterFazendaNome(registro) {
  return (
    registro?.fazendas?.nome ||
    registro?.fazenda_nome ||
    registro?.fazenda?.nome ||
    "-"
  );
}

function obterFazendaId(registro) {
  return (
    registro?.fazenda_id ||
    registro?.fazendas?.id ||
    registro?.fazenda?.id ||
    ""
  );
}

function obterResponsavelNome(registro) {
  return (
    registro?.responsaveis?.nome ||
    registro?.responsavel_nome ||
    registro?.responsavel?.nome ||
    "-"
  );
}

function obterResponsavelId(registro) {
  return (
    registro?.responsavel_id ||
    registro?.responsaveis?.id ||
    registro?.responsavel?.id ||
    ""
  );
}

function obterAreaFazendaId(area) {
  return (
    area?.fazenda_id ||
    area?.fazendas?.id ||
    area?.fazenda?.id ||
    area?.fazendaId ||
    area?.id_fazenda ||
    ""
  );
}

function areaPertenceFazenda(area, fazendaId) {
  if (!fazendaId) {
    return true;
  }

  const areaFazendaId = obterAreaFazendaId(area);

  if (!areaFazendaId) {
    return true;
  }

  return String(areaFazendaId) === String(fazendaId);
}

function encontrarAreaPorId(areaId, listaAreas) {
  if (!areaId) {
    return null;
  }

  return listaAreas.find((area) => String(area.id) === String(areaId)) || null;
}

function encontrarAreaPorNome(nomeArea, listaAreas) {
  const nomeNormalizado = normalizarTexto(nomeArea);

  if (!nomeNormalizado) {
    return null;
  }

  return (
    listaAreas.find(
      (area) => normalizarTexto(area?.nome) === nomeNormalizado
    ) || null
  );
}

function resolverAreaDoRegistro(registro, listaAreas) {
  const areaIdDireto = obterAreaIdDireto(registro);

  const areaPorId = encontrarAreaPorId(areaIdDireto, listaAreas);

  if (areaPorId) {
    return areaPorId;
  }

  if (registro?.areas_fazenda?.id || registro?.areas_fazenda?.nome) {
    return registro.areas_fazenda;
  }

  if (registro?.area?.id || registro?.area?.nome) {
    return registro.area;
  }

  const nomeAreaDireto =
    registro?.area_nome ||
    registro?.area_fazenda_nome ||
    registro?.areas_fazenda?.nome ||
    registro?.area?.nome ||
    "";

  const areaPorNomeDireto = encontrarAreaPorNome(nomeAreaDireto, listaAreas);

  if (areaPorNomeDireto) {
    return areaPorNomeDireto;
  }

  const lote = registro?.lote || "";
  const areaPorLote = encontrarAreaPorNome(lote, listaAreas);

  if (areaPorLote) {
    return areaPorLote;
  }

  return null;
}

function resolverAreaIdDoRegistro(registro, listaAreas) {
  const areaResolvida = resolverAreaDoRegistro(registro, listaAreas);

  if (areaResolvida?.id) {
    return areaResolvida.id;
  }

  return obterAreaIdDireto(registro);
}

function resolverAreaNomeDoRegistro(registro, listaAreas) {
  const areaResolvida = resolverAreaDoRegistro(registro, listaAreas);

  if (areaResolvida?.nome) {
    return areaResolvida.nome;
  }

  return (
    registro?.area_nome ||
    registro?.area_fazenda_nome ||
    registro?.areas_fazenda?.nome ||
    registro?.area?.nome ||
    "-"
  );
}

function lotePareceNomeDeArea(registro, listaAreas) {
  const lote = registro?.lote || "";

  if (!lote) {
    return false;
  }

  const areaPorLote = encontrarAreaPorNome(lote, listaAreas);

  return Boolean(areaPorLote);
}

function resolverLoteVisivel(registro, listaAreas) {
  const lote = registro?.lote || "";

  if (!lote) {
    return "-";
  }

  if (lotePareceNomeDeArea(registro, listaAreas)) {
    return "-";
  }

  return lote;
}

function resolverLoteParaFormulario(registro, listaAreas) {
  const lote = registro?.lote || "";

  if (!lote) {
    return "";
  }

  if (lotePareceNomeDeArea(registro, listaAreas)) {
    return "";
  }

  return lote;
}

function obterValorOrdenacao(registro, campo, listaAreas) {
  switch (campo) {
    case "data_recebimento":
      return registro.data_recebimento || "";

    case "hora":
      return registro.hora || "";

    case "fazenda":
      return obterFazendaNome(registro);

    case "area":
      return resolverAreaNomeDoRegistro(registro, listaAreas);

    case "lote":
      return resolverLoteVisivel(registro, listaAreas);

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

const FORM_INICIAL = {
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

const FILTROS_INICIAIS = {
  dataInicial: "",
  dataFinal: "",
  fazendaId: "",
  areaId: "",
  status: "todos",
  responsavelId: "",
};

function ChegadaFazenda() {
  const [fazendas, setFazendas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [chegadas, setChegadas] = useState([]);

  const [form, setForm] = useState({
    ...FORM_INICIAL,
    data_recebimento: obterDataAtual(),
    hora: obterHoraAtual(),
  });

  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);

  const [modalFormularioAberta, setModalFormularioAberta] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const [registroParaExcluir, setRegistroParaExcluir] = useState(null);
  const [excluindoId, setExcluindoId] = useState(null);

  const [ordenacao, setOrdenacao] = useState({
    campo: "data_recebimento",
    direcao: "desc",
  });

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const pesoTotalEstimado = useMemo(() => {
    const caixas = Number(form.quantidade_caixas || 0);
    const pesoMedio = Number(form.media_peso_caixa_kg || 0);

    return caixas * pesoMedio;
  }, [form.quantidade_caixas, form.media_peso_caixa_kg]);

  const chegadasFiltradas = useMemo(() => {
    return chegadas.filter((registro) => {
      const data = registro.data_recebimento || "";
      const fazendaId = obterFazendaId(registro);
      const areaId = resolverAreaIdDoRegistro(registro, areas);
      const responsavelId = obterResponsavelId(registro);

      if (filtros.dataInicial && data < filtros.dataInicial) return false;
      if (filtros.dataFinal && data > filtros.dataFinal) return false;
      if (filtros.fazendaId && fazendaId !== filtros.fazendaId) return false;
      if (filtros.areaId && String(areaId) !== String(filtros.areaId)) return false;

      if (filtros.responsavelId && responsavelId !== filtros.responsavelId) {
        return false;
      }

      if (filtros.status === "conferido" && !registro.conferido) {
        return false;
      }

      if (filtros.status === "pendente" && registro.conferido) {
        return false;
      }

      return true;
    });
  }, [chegadas, filtros, areas]);

  const resumo = useMemo(() => {
    return calcularResumoChegadaFazenda(chegadasFiltradas);
  }, [chegadasFiltradas]);

  const chegadasOrdenadas = useMemo(() => {
    const lista = [...chegadasFiltradas];

    lista.sort((a, b) => {
      const valorA = obterValorOrdenacao(a, ordenacao.campo, areas);
      const valorB = obterValorOrdenacao(b, ordenacao.campo, areas);
      const resultado = compararValores(valorA, valorB);

      return ordenacao.direcao === "asc" ? resultado : resultado * -1;
    });

    return lista;
  }, [chegadasFiltradas, ordenacao, areas]);

  const fazendaOptions = useMemo(() => {
    return fazendas.map((fazenda) => ({
      value: fazenda.id,
      label: fazenda.nome,
    }));
  }, [fazendas]);

  const areasFormulario = useMemo(() => {
    if (!form.fazenda_id) {
      return areas;
    }

    const areasDaFazenda = areas.filter((area) =>
      areaPertenceFazenda(area, form.fazenda_id)
    );

    return areasDaFazenda.length > 0 ? areasDaFazenda : areas;
  }, [areas, form.fazenda_id]);

  const areasFiltro = useMemo(() => {
    if (!filtros.fazendaId) {
      return areas;
    }

    const areasDaFazenda = areas.filter((area) =>
      areaPertenceFazenda(area, filtros.fazendaId)
    );

    return areasDaFazenda.length > 0 ? areasDaFazenda : areas;
  }, [areas, filtros.fazendaId]);

  const areaOptionsFormulario = useMemo(() => {
    return areasFormulario.map((area) => ({
      value: area.id,
      label: area.nome,
    }));
  }, [areasFormulario]);

  const areaOptionsFiltro = useMemo(() => {
    return areasFiltro.map((area) => ({
      value: area.id,
      label: area.nome,
    }));
  }, [areasFiltro]);

  const responsavelOptions = useMemo(() => {
    return responsaveis.map((responsavel) => ({
      value: responsavel.id,
      label: responsavel.nome,
    }));
  }, [responsaveis]);

  async function carregarDados(limparMensagens = true) {
    try {
      setCarregando(true);

      if (limparMensagens) {
        setErro("");
        setSucesso("");
      }

      const [fazendasBanco, areasBanco, responsaveisBanco, chegadasBanco] =
        await Promise.all([
          listarFazendasAtivas(),
          listarAreasFazendaAtivas(),
          listarResponsaveisAtivos(),
          listarChegadasFazenda(),
        ]);

      setFazendas(fazendasBanco || []);
      setAreas(areasBanco || []);
      setResponsaveis(responsaveisBanco || []);
      setChegadas(chegadasBanco || []);
    } catch (error) {
      console.error("Erro ao carregar chegada da fazenda:", error);
      setErro(error.message || "Não foi possível carregar a chegada da fazenda.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function atualizarCampo(event) {
    const { name, value } = event.target;

    setForm((estadoAtual) => {
      if (name === "fazenda_id") {
        return {
          ...estadoAtual,
          fazenda_id: value,
          area_fazenda_id: "",
        };
      }

      return {
        ...estadoAtual,
        [name]: value,
      };
    });

    setErro("");
    setSucesso("");
  }

  function atualizarFiltro(event) {
    const { name, value } = event.target;

    setFiltros((estadoAtual) => {
      if (name === "fazendaId") {
        return {
          ...estadoAtual,
          fazendaId: value,
          areaId: "",
        };
      }

      return {
        ...estadoAtual,
        [name]: value,
      };
    });

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
    if (!form.data_recebimento) return "Informe a data de recebimento.";
    if (!form.hora) return "Informe a hora.";
    if (!form.fazenda_id) return "Selecione a fazenda.";
    if (!form.area_fazenda_id) return "Selecione a Área / Pivô.";
    if (!form.quantidade_caixas) return "Informe a quantidade de caixas.";
    if (!form.media_peso_caixa_kg) return "Informe o peso médio por caixa.";
    if (!form.responsavel_id) return "Selecione o responsável.";

    if (Number(form.quantidade_caixas) <= 0) {
      return "A quantidade de caixas precisa ser maior que zero.";
    }

    if (Number(form.media_peso_caixa_kg) <= 0) {
      return "O peso médio por caixa precisa ser maior que zero.";
    }

    return "";
  }

  function limparFormulario() {
    setEditandoId(null);

    setForm({
      ...FORM_INICIAL,
      data_recebimento: obterDataAtual(),
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
        ...form,
        conferido: form.conferido === "sim",
      };

      if (editandoId) {
        await editarChegadaFazenda(editandoId, payload);
        setSucesso("Chegada da fazenda atualizada com sucesso.");
      } else {
        await cadastrarChegadaFazenda(payload);
        setSucesso("Chegada da fazenda cadastrada com sucesso.");
      }

      setModalFormularioAberta(false);
      limparFormulario();

      await carregarDados(false);
    } catch (error) {
      console.error("Erro ao salvar chegada:", error);
      setErro(error.message || "Não foi possível salvar a chegada da fazenda.");
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(registro) {
    const areaIdResolvido = resolverAreaIdDoRegistro(registro, areas);
    const loteResolvido = resolverLoteParaFormulario(registro, areas);

    setEditandoId(registro.id);

    setForm({
      data_recebimento: registro.data_recebimento || obterDataAtual(),
      hora: registro.hora ? String(registro.hora).slice(0, 5) : obterHoraAtual(),
      fazenda_id: obterFazendaId(registro),
      area_fazenda_id: areaIdResolvido,
      lote: loteResolvido,
      quantidade_caixas: String(registro.quantidade_caixas || ""),
      media_peso_caixa_kg: String(registro.media_peso_caixa_kg || ""),
      conferido: registro.conferido ? "sim" : "nao",
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
      setErro("Não foi possível identificar o registro para exclusão.");
      return;
    }

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
    if (!registroParaExcluir?.id) {
      return;
    }

    try {
      setErro("");
      setSucesso("");
      setExcluindoId(registroParaExcluir.id);

      const { error } = await supabase
        .from("chegada_fazenda")
        .delete()
        .eq("id", registroParaExcluir.id);

      if (error) {
        throw error;
      }

      if (editandoId === registroParaExcluir.id) {
        cancelarEdicao();
      }

      setRegistroParaExcluir(null);
      setSucesso("Chegada da fazenda excluída com sucesso.");

      await carregarDados(false);
    } catch (error) {
      console.error("Erro ao excluir chegada:", error);
      setErro(error.message || "Não foi possível excluir a chegada da fazenda.");
    } finally {
      setExcluindoId(null);
    }
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
      render: (_, row) => resolverAreaNomeDoRegistro(row, areas),
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
      render: (_, row) => resolverLoteVisivel(row, areas),
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
                    Excluir chegada da fazenda?
                  </h3>

                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">
                    Essa ação remove o lançamento selecionado da chegada da
                    fazenda. Essa exclusão não pode ser desfeita.
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
                    {resolverAreaNomeDoRegistro(registroParaExcluir, areas)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Lote / Carga
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {resolverLoteVisivel(registroParaExcluir, areas)}
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
        title={editandoId ? "Editar chegada da fazenda" : "Nova chegada da fazenda"}
        description="Registre a entrada do alho bruto vindo da fazenda."
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
              label="Data de recebimento"
              name="data_recebimento"
              type="date"
              value={form.data_recebimento}
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
                form.fazenda_id
                  ? "Selecione a Área / Pivô"
                  : "Selecione a fazenda primeiro"
              }
            />

            <Input
              label="Lote / Carga"
              name="lote"
              value={form.lote}
              onChange={atualizarCampo}
              placeholder="Ex: Carga 01, Lote A..."
            />

            <Input
              label="Quantidade de caixas"
              name="quantidade_caixas"
              type="number"
              value={form.quantidade_caixas}
              onChange={atualizarCampo}
            />

            <Input
              label="Peso médio por caixa em kg"
              name="media_peso_caixa_kg"
              type="number"
              value={form.media_peso_caixa_kg}
              onChange={atualizarCampo}
            />

            <Input
              label="Peso total estimado"
              name="peso_total_estimado"
              type="text"
              value={formatarKg(pesoTotalEstimado)}
              disabled
            />

            <Select
              label="Status"
              name="conferido"
              value={form.conferido}
              onChange={atualizarCampo}
              options={[
                { value: "sim", label: "Conferido" },
                { value: "nao", label: "Pendente" },
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
                placeholder="Observações sobre a chegada..."
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
              {salvando ? "Salvando..." : "Salvar chegada"}
            </Button>
          </div>
        </form>
      </LancamentoModal>

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
              <h3 className="text-xl font-black text-[var(--color-text-primary)]">
                Filtros da chegada
              </h3>

              <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
                Filtre os lançamentos por período, fazenda, área, status e responsável.
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
            placeholder="Todas as áreas"
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
              Chegadas registradas
            </h3>

            <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
              Clique no nome de uma coluna para ordenar os lançamentos.
            </p>
          </div>

          <Badge variant="info">
            {carregando
              ? "Carregando"
              : `${formatarNumero(chegadasFiltradas.length)} registros`}
          </Badge>
        </div>

        {carregando ? (
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Carregando chegadas...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={chegadasOrdenadas}
            emptyMessage="Nenhuma chegada encontrada para os filtros aplicados."
          />
        )}
      </Card>
    </div>
  );
}

export default ChegadaFazenda;