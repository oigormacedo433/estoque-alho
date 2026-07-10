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
  PackageCheck,
  Plus,
  Save,
  Scale,
  Trash2,
  X,
} from "lucide-react";

import { listarCalibresAtivos } from "../../services/calibresService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";
import { buscarConfiguracoes } from "../../services/configuracoesService";
import { listarAreasAtivas } from "../../services/areasFazendaService";

import {
  cadastrarProdutoFinal,
  calcularProdutoFinalPorArea,
  calcularProdutoFinalPorCalibre,
  calcularResumoProdutoFinal,
  editarProdutoFinal,
  excluirProdutoFinal,
  listarProdutoFinal,
} from "../../services/produtoFinalService";

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

function obterAreaId(registro) {
  return (
    registro?.area_id ||
    registro?.area_fazenda_id ||
    registro?.areas_fazenda?.id ||
    ""
  );
}

function obterAreaNome(registro) {
  return (
    registro?.areas_fazenda?.nome ||
    registro?.area_nome ||
    registro?.area_fazenda_nome ||
    "-"
  );
}

function obterFazendaNomeDaArea(registro) {
  return (
    registro?.areas_fazenda?.fazendas?.nome ||
    registro?.fazenda_nome ||
    registro?.areas_fazenda?.fazenda_nome ||
    "Fazenda"
  );
}

function obterAreaTexto(registro) {
  const areaNome = obterAreaNome(registro);

  if (areaNome === "-") {
    return "-";
  }

  const fazendaNome = obterFazendaNomeDaArea(registro);

  return `${fazendaNome} — ${areaNome}`;
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

function obterValorOrdenacao(registro, campo) {
  switch (campo) {
    case "data_registro":
      return registro.data_registro || "";

    case "hora":
      return registro.hora || "";

    case "area":
      return obterAreaTexto(registro);

    case "calibre":
      return obterCalibreNome(registro);

    case "quantidade_caixas":
      return numero(registro.quantidade_caixas);

    case "peso_por_caixa_kg":
      return numero(registro.peso_por_caixa_kg);

    case "peso_total_kg":
      return numero(registro.peso_total_kg);

    case "responsavel":
      return obterResponsavelNome(registro);

    case "conferido":
      return registro.conferido ? "Conferido" : "Pendente";

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
  data_registro: "",
  hora: "",
  area_id: "",
  calibre_id: "",
  quantidade_caixas: "",
  peso_por_caixa_kg: "",
  conferido: "sim",
  responsavel_id: "",
  observacao: "",
};

const FILTROS_INICIAIS = {
  dataInicial: "",
  dataFinal: "",
  areaId: "",
  calibreId: "",
  status: "todos",
  responsavelId: "",
};

function ProdutoFinal() {
  const [areas, setAreas] = useState([]);
  const [calibres, setCalibres] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [registros, setRegistros] = useState([]);

  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [modalFormularioAberta, setModalFormularioAberta] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [registroParaExcluir, setRegistroParaExcluir] = useState(null);

  const [ordenacao, setOrdenacao] = useState({
    campo: "data_registro",
    direcao: "desc",
  });

  const [form, setForm] = useState({
    ...FORM_INICIAL,
    data_registro: obterDataAtual(),
    hora: obterHoraAtual(),
  });

  const areaOptions = useMemo(() => {
    return areas.map((area) => ({
      value: area.id,
      label: `${area.fazendas?.nome || "Fazenda"} — ${area.nome}`,
    }));
  }, [areas]);

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

  const registrosFiltrados = useMemo(() => {
    return registros.filter((registro) => {
      const data = registro.data_registro || "";
      const areaId = obterAreaId(registro);
      const calibreId = obterCalibreId(registro);
      const responsavelId = obterResponsavelId(registro);

      if (filtros.dataInicial && data < filtros.dataInicial) return false;
      if (filtros.dataFinal && data > filtros.dataFinal) return false;
      if (filtros.areaId && areaId !== filtros.areaId) return false;
      if (filtros.calibreId && calibreId !== filtros.calibreId) return false;

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
  }, [registros, filtros]);

  const registrosOrdenados = useMemo(() => {
    const lista = [...registrosFiltrados];

    lista.sort((a, b) => {
      const valorA = obterValorOrdenacao(a, ordenacao.campo);
      const valorB = obterValorOrdenacao(b, ordenacao.campo);
      const resultado = compararValores(valorA, valorB);

      return ordenacao.direcao === "asc" ? resultado : resultado * -1;
    });

    return lista;
  }, [registrosFiltrados, ordenacao]);

  const resumo = useMemo(() => {
    return calcularResumoProdutoFinal(registrosFiltrados);
  }, [registrosFiltrados]);

  const produtoPorCalibre = useMemo(() => {
    return calcularProdutoFinalPorCalibre(registrosFiltrados);
  }, [registrosFiltrados]);

  const produtoPorArea = useMemo(() => {
    return calcularProdutoFinalPorArea(registrosFiltrados);
  }, [registrosFiltrados]);

  const pesoTotalCalculado = useMemo(() => {
    return (
      Number(form.quantidade_caixas || 0) *
      Number(form.peso_por_caixa_kg || 0)
    );
  }, [form.quantidade_caixas, form.peso_por_caixa_kg]);

  async function carregarDados(limparMensagens = true) {
    try {
      setCarregando(true);

      if (limparMensagens) {
        setErro("");
        setSucesso("");
      }

      const [
        areasBanco,
        calibresBanco,
        responsaveisBanco,
        configuracoesBanco,
        registrosBanco,
      ] = await Promise.all([
        listarAreasAtivas(),
        listarCalibresAtivos(),
        listarResponsaveisAtivos(),
        buscarConfiguracoes(),
        listarProdutoFinal(),
      ]);

      const pesoPadrao = configuracoesBanco?.peso_caixa_final_kg || "";

      setAreas(areasBanco || []);
      setCalibres(calibresBanco || []);
      setResponsaveis(responsaveisBanco || []);
      setRegistros(registrosBanco || []);

      setForm((estadoAtual) => ({
        ...estadoAtual,
        peso_por_caixa_kg:
          estadoAtual.peso_por_caixa_kg || String(pesoPadrao || ""),
      }));
    } catch (error) {
      console.error("Erro ao carregar produto final:", error);
      setErro(error.message || "Não foi possível carregar produto final.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function atualizarCampo(event) {
    const { name, value } = event.target;

    setForm((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));

    setErro("");
    setSucesso("");
  }

  function atualizarFiltro(event) {
    const { name, value } = event.target;

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
    if (!form.data_registro) return "Informe a data do lançamento.";
    if (!form.hora) return "Informe a hora.";
    if (!form.area_id) return "Selecione a Área / Pivô de origem.";
    if (!form.calibre_id) return "Selecione o calibre.";
    if (!form.quantidade_caixas) return "Informe a quantidade de caixas.";

    if (Number(form.quantidade_caixas) <= 0) {
      return "Quantidade de caixas precisa ser maior que zero.";
    }

    if (!form.peso_por_caixa_kg) return "Informe o peso por caixa.";

    if (Number(form.peso_por_caixa_kg) <= 0) {
      return "Peso por caixa precisa ser maior que zero.";
    }

    if (!form.responsavel_id) return "Selecione o responsável.";

    return "";
  }

  function limparFormulario() {
    setEditandoId(null);

    setForm((estadoAtual) => ({
      ...FORM_INICIAL,
      data_registro: obterDataAtual(),
      hora: obterHoraAtual(),
      peso_por_caixa_kg: estadoAtual.peso_por_caixa_kg,
    }));
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
        data_registro: form.data_registro,
        hora: form.hora,
        area_id: form.area_id,
        calibre_id: form.calibre_id,
        quantidade_caixas: form.quantidade_caixas,
        peso_por_caixa_kg: form.peso_por_caixa_kg,
        conferido: form.conferido === "sim",
        responsavel_id: form.responsavel_id,
        observacao: form.observacao,
      };

      if (editandoId) {
        await editarProdutoFinal(editandoId, payload);
        setSucesso("Produto final atualizado com sucesso.");
      } else {
        await cadastrarProdutoFinal(payload);
        setSucesso("Produto final cadastrado com sucesso.");
      }

      setModalFormularioAberta(false);
      limparFormulario();

      await carregarDados(false);
    } catch (error) {
      console.error("Erro ao salvar produto final:", error);
      setErro(error.message || "Não foi possível salvar produto final.");
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(registro) {
    setEditandoId(registro.id);

    setForm({
      data_registro: registro.data_registro || obterDataAtual(),
      hora: registro.hora ? String(registro.hora).slice(0, 5) : obterHoraAtual(),
      area_id: obterAreaId(registro),
      calibre_id: obterCalibreId(registro),
      quantidade_caixas: String(registro.quantidade_caixas || ""),
      peso_por_caixa_kg: String(registro.peso_por_caixa_kg || ""),
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
      setErro("Não foi possível identificar o produto final para exclusão.");
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
      setErro("");
      setSucesso("");
      setExcluindoId(registroParaExcluir.id);

      await excluirProdutoFinal(registroParaExcluir.id);

      if (editandoId === registroParaExcluir.id) {
        cancelarEdicao();
      }

      setRegistroParaExcluir(null);
      setSucesso("Produto final excluído com sucesso.");

      await carregarDados(false);
    } catch (error) {
      console.error("Erro ao excluir produto final:", error);
      setErro(error.message || "Não foi possível excluir produto final.");
    } finally {
      setExcluindoId(null);
    }
  }

  const columnsProduto = [
    {
      key: "data_registro",
      label: (
        <CabecalhoOrdenavel
          label="Data"
          campo="data_registro"
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
      key: "areas_fazenda",
      label: (
        <CabecalhoOrdenavel
          label="Área / Pivô"
          campo="area"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (_, row) => obterAreaTexto(row),
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
      key: "peso_por_caixa_kg",
      label: (
        <CabecalhoOrdenavel
          label="Peso por caixa"
          campo="peso_por_caixa_kg"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => formatarKg(value),
    },
    {
      key: "peso_total_kg",
      label: (
        <CabecalhoOrdenavel
          label="Peso total"
          campo="peso_total_kg"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => formatarKg(value),
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
      key: "acoes",
      label: "Ações",
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={salvando || Boolean(excluindoId)}
            onClick={() => iniciarEdicao(row)}
          >
            <Edit size={16} />
            Editar
          </Button>

          <Button
            type="button"
            variant="danger"
            size="sm"
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

  const columnsCalibre = [
    {
      key: "calibre_codigo",
      label: "Calibre",
      render: (value, row) => `${value} — ${row.calibre_nome}`,
    },
    {
      key: "total_caixas",
      label: "Caixas",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "peso_total_kg",
      label: "Peso",
      render: (value) => formatarKg(value),
    },
    {
      key: "registros",
      label: "Registros",
      render: (value) => formatarNumero(value),
    },
  ];

  const columnsArea = [
    {
      key: "area_nome",
      label: "Área / Pivô",
      render: (value, row) => (
        <div>
          <p className="font-bold text-[var(--color-text-primary)]">
            {value || "-"}
          </p>
          <p className="text-xs font-semibold text-[var(--color-text-muted)]">
            {row.fazenda_nome || "Fazenda"}
          </p>
        </div>
      ),
    },
    {
      key: "total_caixas",
      label: "Caixas",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "peso_total_kg",
      label: "Peso",
      render: (value) => formatarKg(value),
    },
    {
      key: "registros",
      label: "Registros",
      render: (value) => formatarNumero(value),
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
                    Excluir produto final?
                  </h3>

                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">
                    Essa ação remove o lançamento selecionado e recalcula
                    automaticamente os saldos do estoque. Essa exclusão não pode
                    ser desfeita.
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
                    {formatarData(registroParaExcluir.data_registro)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Área / Pivô
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {obterAreaTexto(registroParaExcluir)}
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
                    Quantidade
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {formatarNumero(registroParaExcluir.quantidade_caixas)} caixas
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Peso por caixa
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {formatarKg(registroParaExcluir.peso_por_caixa_kg)}
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
        title={editandoId ? "Editar produto final" : "Novo produto final"}
        description="Registre as caixas finais prontas para venda, informando a Área / Pivô de origem."
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
              label="Data do lançamento"
              name="data_registro"
              type="date"
              value={form.data_registro}
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
              label="Área / Pivô de origem"
              name="area_id"
              value={form.area_id}
              onChange={atualizarCampo}
              options={areaOptions}
              placeholder="Selecione a Área / Pivô"
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
              label="Quantidade de caixas"
              name="quantidade_caixas"
              type="number"
              value={form.quantidade_caixas}
              onChange={atualizarCampo}
            />

            <Input
              label="Peso por caixa em kg"
              name="peso_por_caixa_kg"
              type="number"
              value={form.peso_por_caixa_kg}
              onChange={atualizarCampo}
            />

            <Input
              label="Peso total calculado"
              name="peso_total_calculado"
              value={formatarKg(pesoTotalCalculado)}
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
                placeholder="Observações sobre o produto final..."
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {editandoId && (
              <Button
                type="button"
                variant="secondary"
                onClick={cancelarEdicao}
                disabled={salvando}
              >
                <X size={16} />
                Cancelar edição
              </Button>
            )}

            {!editandoId && (
              <Button
                type="button"
                variant="secondary"
                onClick={fecharModalFormulario}
                disabled={salvando}
              >
                <X size={16} />
                Cancelar
              </Button>
            )}

            <Button type="submit" variant="primary" disabled={salvando}>
              <Save size={16} />
              {salvando ? "Salvando..." : "Salvar produto final"}
            </Button>
          </div>
        </form>
      </LancamentoModal>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Lançamentos"
          value={formatarNumero(resumo.totalRegistros)}
          description="Registros encontrados"
          icon={PackageCheck}
          variant="info"
        />

        <KpiCard
          title="Caixas finais"
          value={formatarNumero(resumo.totalCaixas)}
          description="Produto final filtrado"
          icon={CheckCircle}
          variant="success"
        />

        <KpiCard
          title="Peso final"
          value={formatarKg(resumo.pesoTotalKg)}
          description="Peso total filtrado"
          icon={Scale}
          variant="success"
        />

        <KpiCard
          title="Áreas / Pivôs"
          value={formatarNumero(resumo.areasComProdutoFinal)}
          description="Áreas com produto final"
          icon={PackageCheck}
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
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                Filtros do produto final
              </h3>

              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Filtre os lançamentos por período, área, calibre, status e responsável.
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

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <div className="mb-5">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Produto final por calibre
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Soma das caixas finais por calibre, respeitando os filtros aplicados.
            </p>
          </div>

          <DataTable
            columns={columnsCalibre}
            data={produtoPorCalibre}
            emptyMessage="Nenhum produto final por calibre."
          />
        </Card>

        <Card>
          <div className="mb-5">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Produto final por Área / Pivô
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Soma das caixas finais por área de origem, respeitando os filtros aplicados.
            </p>
          </div>

          <DataTable
            columns={columnsArea}
            data={produtoPorArea}
            emptyMessage="Nenhum produto final por área."
          />
        </Card>
      </section>

      <Card>
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Produtos finais lançados
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Clique no nome de uma coluna para ordenar os lançamentos.
            </p>
          </div>

          <Badge variant="info">
            {carregando
              ? "Carregando"
              : `${formatarNumero(registrosFiltrados.length)} registros`}
          </Badge>
        </div>

        {carregando ? (
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Carregando produto final do banco...
          </div>
        ) : (
          <DataTable
            columns={columnsProduto}
            data={registrosOrdenados}
            emptyMessage="Nenhum produto final encontrado para os filtros aplicados."
          />
        )}
      </Card>
    </div>
  );
}

export default ProdutoFinal;