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
  Edit,
  Filter,
  MapPinned,
  PackageCheck,
  Plus,
  Save,
  Scale,
  Trash2,
  Truck,
  X,
} from "lucide-react";

import { listarAreasAtivas } from "../../services/areasFazendaService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";

import {
  buscarSaldoDisponivelPorAreaCalibre,
  cadastrarSaidaVenda,
  calcularResumoSaidasVendas,
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

function obterCliente(registro) {
  return registro?.cliente || "-";
}

function obterPedido(registro) {
  return registro?.numero_pedido || "-";
}

function obterEstoqueAreaId(item) {
  return item?.area_id || item?.area_fazenda_id || "";
}

function obterEstoqueCalibreId(item) {
  return item?.calibre_id || "";
}

function obterEstoqueCalibreNome(item) {
  if (item?.calibre_codigo || item?.calibre_nome) {
    return `${item.calibre_codigo || ""} — ${item.calibre_nome || ""}`;
  }

  return "-";
}

function obterValorOrdenacao(registro, campo) {
  switch (campo) {
    case "data_saida":
      return registro.data_saida || "";

    case "hora":
      return registro.hora || "";

    case "area":
      return obterAreaNome(registro);

    case "cliente":
      return obterCliente(registro);

    case "numero_pedido":
      return obterPedido(registro);

    case "calibre":
      return obterCalibreNome(registro);

    case "quantidade_caixas":
      return numero(registro.quantidade_caixas);

    case "peso_total_kg":
      return numero(registro.peso_total_kg);

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

const FORM_INICIAL = {
  data_saida: "",
  hora: "",
  area_id: "",
  cliente: "",
  numero_pedido: "",
  calibre_id: "",
  quantidade_caixas: "",
  responsavel_id: "",
  observacao: "",
};

const FILTROS_INICIAIS = {
  dataInicial: "",
  dataFinal: "",
  areaId: "",
  cliente: "",
  numeroPedido: "",
  calibreId: "",
  responsavelId: "",
};

function SaidaVenda() {
  const [areas, setAreas] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [estoqueDisponivel, setEstoqueDisponivel] = useState([]);
  const [saidas, setSaidas] = useState([]);

  const [saldoSelecionado, setSaldoSelecionado] = useState(null);

  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);

  const [editandoId, setEditandoId] = useState(null);
  const [registroOriginal, setRegistroOriginal] = useState(null);
  const [saidaParaExcluir, setSaidaParaExcluir] = useState(null);

  const [modalFormularioAberta, setModalFormularioAberta] = useState(false);

  const [ordenacao, setOrdenacao] = useState({
    campo: "data_saida",
    direcao: "desc",
  });

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [form, setForm] = useState({
    ...FORM_INICIAL,
    data_saida: obterDataAtual(),
    hora: obterHoraAtual(),
  });

  const areaOptions = useMemo(() => {
    return areas.map((area) => ({
      value: area.id,
      label: area.nome,
    }));
  }, [areas]);

  const calibreOptionsFormulario = useMemo(() => {
    const mapa = new Map();

    estoqueDisponivel
      .filter((item) => {
        if (!form.area_id) return true;
        return obterEstoqueAreaId(item) === form.area_id;
      })
      .forEach((item) => {
        const calibreId = obterEstoqueCalibreId(item);

        if (!calibreId) return;

        mapa.set(calibreId, {
          value: calibreId,
          label: obterEstoqueCalibreNome(item),
        });
      });

    if (registroOriginal?.calibres) {
      const calibreId = obterCalibreId(registroOriginal);

      if (calibreId && !mapa.has(calibreId)) {
        mapa.set(calibreId, {
          value: calibreId,
          label: obterCalibreNome(registroOriginal),
        });
      }
    }

    return Array.from(mapa.values());
  }, [estoqueDisponivel, form.area_id, registroOriginal]);

  const calibreOptionsFiltro = useMemo(() => {
    const mapa = new Map();

    estoqueDisponivel.forEach((item) => {
      const calibreId = obterEstoqueCalibreId(item);

      if (!calibreId) return;

      mapa.set(calibreId, {
        value: calibreId,
        label: obterEstoqueCalibreNome(item),
      });
    });

    saidas.forEach((saida) => {
      const calibreId = obterCalibreId(saida);

      if (!calibreId) return;

      mapa.set(calibreId, {
        value: calibreId,
        label: obterCalibreNome(saida),
      });
    });

    return Array.from(mapa.values());
  }, [estoqueDisponivel, saidas]);

  const responsavelOptions = useMemo(() => {
    return responsaveis.map((responsavel) => ({
      value: responsavel.id,
      label: responsavel.nome,
    }));
  }, [responsaveis]);

  const saldoConsiderado = useMemo(() => {
    let saldoCaixas = Number(saldoSelecionado?.saldo_disponivel_caixas || 0);
    let pesoDisponivelKg = Number(saldoSelecionado?.peso_disponivel_kg || 0);

    const mesmoRegistro =
      registroOriginal &&
      obterAreaId(registroOriginal) === form.area_id &&
      obterCalibreId(registroOriginal) === form.calibre_id;

    if (mesmoRegistro) {
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
  }, [saldoSelecionado, registroOriginal, form.area_id, form.calibre_id]);

  const pesoTotalCalculado = useMemo(() => {
    const quantidade = Number(form.quantidade_caixas || 0);
    const pesoMedio = Number(saldoConsiderado.pesoMedio || 0);

    return quantidade * pesoMedio;
  }, [form.quantidade_caixas, saldoConsiderado.pesoMedio]);

  const quantidadeMaiorQueSaldo = useMemo(() => {
    const quantidade = Number(form.quantidade_caixas || 0);

    if (!form.area_id || !form.calibre_id || quantidade <= 0) {
      return false;
    }

    return quantidade > Number(saldoConsiderado.saldoCaixas || 0);
  }, [
    form.area_id,
    form.calibre_id,
    form.quantidade_caixas,
    saldoConsiderado.saldoCaixas,
  ]);

  const saidasFiltradas = useMemo(() => {
    return saidas.filter((registro) => {
      const data = registro.data_saida || "";
      const areaId = obterAreaId(registro);
      const calibreId = obterCalibreId(registro);
      const responsavelId = obterResponsavelId(registro);
      const cliente = String(registro.cliente || "").toLowerCase();
      const pedido = String(registro.numero_pedido || "").toLowerCase();

      if (filtros.dataInicial && data < filtros.dataInicial) return false;
      if (filtros.dataFinal && data > filtros.dataFinal) return false;
      if (filtros.areaId && areaId !== filtros.areaId) return false;
      if (filtros.calibreId && calibreId !== filtros.calibreId) return false;

      if (filtros.responsavelId && responsavelId !== filtros.responsavelId) {
        return false;
      }

      if (
        filtros.cliente &&
        !cliente.includes(String(filtros.cliente).toLowerCase())
      ) {
        return false;
      }

      if (
        filtros.numeroPedido &&
        !pedido.includes(String(filtros.numeroPedido).toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [saidas, filtros]);

  const saidasOrdenadas = useMemo(() => {
    const lista = [...saidasFiltradas];

    lista.sort((a, b) => {
      const valorA = obterValorOrdenacao(a, ordenacao.campo);
      const valorB = obterValorOrdenacao(b, ordenacao.campo);
      const resultado = compararValores(valorA, valorB);

      return ordenacao.direcao === "asc" ? resultado : resultado * -1;
    });

    return lista;
  }, [saidasFiltradas, ordenacao]);

  const resumo = useMemo(() => {
    return calcularResumoSaidasVendas(saidasFiltradas);
  }, [saidasFiltradas]);

  async function carregarDados(limparMensagens = true) {
    try {
      setCarregando(true);

      if (limparMensagens) {
        setErro("");
        setSucesso("");
      }

      const [areasBanco, responsaveisBanco, estoqueBanco, saidasBanco] =
        await Promise.all([
          listarAreasAtivas(),
          listarResponsaveisAtivos(),
          listarEstoqueDisponivelSaida(),
          listarSaidasVendas(),
        ]);

      setAreas(areasBanco || []);
      setResponsaveis(responsaveisBanco || []);
      setEstoqueDisponivel(estoqueBanco || []);
      setSaidas(saidasBanco || []);
    } catch (error) {
      console.error("Erro ao carregar saída/venda:", error);
      setErro(error.message || "Não foi possível carregar saída/venda.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function atualizarSaldo(areaId, calibreId) {
    if (!areaId || !calibreId) {
      setSaldoSelecionado(null);
      return;
    }

    try {
      const saldo = await buscarSaldoDisponivelPorAreaCalibre(areaId, calibreId);
      setSaldoSelecionado(saldo);
    } catch (error) {
      console.error("Erro ao buscar saldo:", error);
      setSaldoSelecionado(null);
      setErro(error.message || "Não foi possível buscar o saldo da área.");
    }
  }

  async function atualizarCampo(event) {
    const { name, value } = event.target;

    setErro("");
    setSucesso("");

    if (name === "area_id") {
      setForm((estadoAtual) => ({
        ...estadoAtual,
        area_id: value,
        calibre_id: "",
      }));

      setSaldoSelecionado(null);

      try {
        const estoque = await listarEstoqueDisponivelSaida({
          areaId: value,
        });

        setEstoqueDisponivel((estadoAtual) => {
          const outros = estadoAtual.filter(
            (item) => obterEstoqueAreaId(item) !== value
          );

          return [...outros, ...(estoque || [])];
        });
      } catch (error) {
        setErro(error.message || "Não foi possível carregar estoque da área.");
      }

      return;
    }

    if (name === "calibre_id") {
      const novoForm = {
        ...form,
        calibre_id: value,
      };

      setForm(novoForm);

      await atualizarSaldo(novoForm.area_id, value);

      return;
    }

    setForm((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));
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
    if (!form.data_saida) return "Informe a data da saída.";
    if (!form.hora) return "Informe a hora.";
    if (!form.area_id) return "Selecione a Área / Pivô.";
    if (!form.cliente) return "Informe o cliente.";
    if (!form.calibre_id) return "Selecione o calibre.";
    if (!form.quantidade_caixas) return "Informe a quantidade de caixas.";

    if (Number(form.quantidade_caixas) <= 0) {
      return "Quantidade de caixas precisa ser maior que zero.";
    }

    if (!form.responsavel_id) return "Selecione o responsável.";

    const saldo = Number(saldoConsiderado.saldoCaixas || 0);

    if (saldo <= 0) {
      return "Não existe saldo disponível para esta Área / Pivô e calibre.";
    }

    if (Number(form.quantidade_caixas) > saldo) {
      return `Estoque insuficiente nesta área. Saldo disponível: ${formatarNumero(
        saldo
      )} caixas.`;
    }

    return "";
  }

  function limparFormulario() {
    setEditandoId(null);
    setRegistroOriginal(null);
    setSaldoSelecionado(null);

    setForm({
      ...FORM_INICIAL,
      data_saida: obterDataAtual(),
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
        data_saida: form.data_saida,
        hora: form.hora,
        area_id: form.area_id,
        cliente: form.cliente,
        numero_pedido: form.numero_pedido,
        calibre_id: form.calibre_id,
        quantidade_caixas: form.quantidade_caixas,
        responsavel_id: form.responsavel_id,
        observacao: form.observacao,
      };

      if (editandoId) {
        await editarSaidaVenda(editandoId, payload);
        setSucesso("Saída/Venda atualizada com sucesso.");
      } else {
        await cadastrarSaidaVenda(payload);
        setSucesso("Saída/Venda cadastrada com sucesso.");
      }

      setModalFormularioAberta(false);
      limparFormulario();

      await carregarDados(false);
    } catch (error) {
      console.error("Erro ao salvar saída/venda:", error);
      setErro(error.message || "Não foi possível salvar a saída/venda.");
    } finally {
      setSalvando(false);
    }
  }

  async function iniciarEdicao(registro) {
    setEditandoId(registro.id);
    setRegistroOriginal(registro);

    const novoForm = {
      data_saida: registro.data_saida || obterDataAtual(),
      hora: registro.hora ? String(registro.hora).slice(0, 5) : obterHoraAtual(),
      area_id: obterAreaId(registro),
      cliente: registro.cliente || "",
      numero_pedido: registro.numero_pedido || "",
      calibre_id: obterCalibreId(registro),
      quantidade_caixas: String(registro.quantidade_caixas || ""),
      responsavel_id: obterResponsavelId(registro),
      observacao: registro.observacao || "",
    };

    setForm(novoForm);
    setErro("");
    setSucesso("");
    setModalFormularioAberta(true);

    await atualizarSaldo(novoForm.area_id, novoForm.calibre_id);
  }

  function cancelarEdicao() {
    limparFormulario();
    setErro("");
    setSucesso("");
    setModalFormularioAberta(false);
  }

  function abrirModalExcluir(registro) {
    if (!registro?.id) {
      setErro("Não foi possível identificar a saída para exclusão.");
      return;
    }

    setSaidaParaExcluir(registro);
    setErro("");
    setSucesso("");
  }

  function fecharModalExcluir() {
    if (excluindoId) return;

    setSaidaParaExcluir(null);
  }

  async function confirmarExclusao() {
    if (!saidaParaExcluir?.id) return;

    try {
      setExcluindoId(saidaParaExcluir.id);
      setErro("");
      setSucesso("");

      await excluirSaidaVenda(saidaParaExcluir.id);

      if (editandoId === saidaParaExcluir.id) {
        cancelarEdicao();
      }

      setSaidaParaExcluir(null);
      setSucesso("Saída/Venda excluída com sucesso.");

      await carregarDados(false);
    } catch (error) {
      console.error("Erro ao excluir saída/venda:", error);
      setErro(error.message || "Não foi possível excluir a saída/venda.");
    } finally {
      setExcluindoId(null);
    }
  }

  const columns = [
    {
      key: "data_saida",
      label: (
        <CabecalhoOrdenavel
          label="Data"
          campo="data_saida"
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
      render: (_, row) => obterAreaNome(row),
    },
    {
      key: "cliente",
      label: (
        <CabecalhoOrdenavel
          label="Cliente"
          campo="cliente"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => value || "-",
    },
    {
      key: "numero_pedido",
      label: (
        <CabecalhoOrdenavel
          label="Pedido / Carga"
          campo="numero_pedido"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => value || "-",
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
      key: "peso_total_kg",
      label: (
        <CabecalhoOrdenavel
          label="Peso"
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
            onClick={() => abrirModalExcluir(row)}
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
      {saidaParaExcluir && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                  <Trash2 size={24} />
                </div>

                <div>
                  <h3 className="text-xl font-black text-[var(--color-text-primary)]">
                    Excluir saída?
                  </h3>

                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">
                    Essa ação remove a saída selecionada. Ao confirmar, o saldo
                    disponível volta automaticamente no cálculo do estoque.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={Boolean(excluindoId)}
                onClick={fecharModalExcluir}
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
                    {formatarData(saidaParaExcluir.data_saida)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Área / Pivô
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {obterAreaNome(saidaParaExcluir)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Cliente
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {saidaParaExcluir.cliente || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Pedido / Carga
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {saidaParaExcluir.numero_pedido || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Calibre
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {obterCalibreNome(saidaParaExcluir)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Quantidade
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {formatarNumero(saidaParaExcluir.quantidade_caixas)} caixas
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Peso
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {formatarKg(saidaParaExcluir.peso_total_kg)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={Boolean(excluindoId)}
                  onClick={fecharModalExcluir}
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
        title={editandoId ? "Editar saída / venda" : "Nova saída / venda"}
        description="A saída baixa o estoque da Área / Pivô e calibre selecionados."
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
              label="Data da saída"
              name="data_saida"
              type="date"
              value={form.data_saida}
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
              label="Área / Pivô"
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
              options={calibreOptionsFormulario}
              placeholder={
                form.area_id
                  ? "Selecione o calibre disponível nesta área"
                  : "Selecione a área primeiro"
              }
            />

            <Input
              label="Cliente"
              name="cliente"
              value={form.cliente}
              onChange={atualizarCampo}
              placeholder="Nome do cliente"
            />

            <Input
              label="Pedido / Carga"
              name="numero_pedido"
              value={form.numero_pedido}
              onChange={atualizarCampo}
              placeholder="Ex: Pedido 120, Carga 03..."
            />

            <Input
              label="Quantidade de caixas"
              name="quantidade_caixas"
              type="number"
              value={form.quantidade_caixas}
              onChange={atualizarCampo}
            />

            <Input
              label="Peso total calculado"
              name="peso_total_calculado"
              value={formatarKg(pesoTotalCalculado)}
              disabled
            />

            <Input
              label="Saldo disponível considerado"
              name="saldo_disponivel"
              value={`${formatarNumero(saldoConsiderado.saldoCaixas)} caixas`}
              disabled
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
              {saldoSelecionado ? (
                <AlertBox
                  variant={quantidadeMaiorQueSaldo ? "danger" : "info"}
                  title={
                    quantidadeMaiorQueSaldo
                      ? "Estoque insuficiente"
                      : "Saldo disponível nesta área"
                  }
                  description={`${obterAreaNome({
                    areas_fazenda: { nome: saldoSelecionado.area_nome },
                  })} / ${saldoSelecionado.calibre_codigo} — ${
                    saldoSelecionado.calibre_nome
                  }: ${formatarNumero(
                    saldoConsiderado.saldoCaixas
                  )} caixas disponíveis (${formatarKg(
                    saldoConsiderado.pesoDisponivelKg
                  )}).`}
                />
              ) : (
                <AlertBox
                  variant="warning"
                  title="Selecione Área / Pivô e calibre"
                  description="O sistema vai mostrar o saldo disponível antes de salvar a saída."
                />
              )}
            </div>

            <div className="md:col-span-2">
              <Textarea
                label="Observação"
                name="observacao"
                value={form.observacao}
                onChange={atualizarCampo}
                placeholder="Observações sobre a saída..."
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

            <Button
              type="submit"
              variant="primary"
              disabled={salvando || quantidadeMaiorQueSaldo}
            >
              <Save size={16} />
              {salvando ? "Salvando..." : "Salvar saída"}
            </Button>
          </div>
        </form>
      </LancamentoModal>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Saídas"
          value={formatarNumero(resumo.totalRegistros)}
          description="Registros encontrados"
          icon={Truck}
          variant="info"
        />

        <KpiCard
          title="Caixas expedidas"
          value={formatarNumero(resumo.totalCaixas)}
          description="Total filtrado"
          icon={PackageCheck}
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
          title="Áreas com saída"
          value={formatarNumero(resumo.areasComSaida)}
          description="Áreas movimentadas"
          icon={MapPinned}
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
                Filtros de saída
              </h3>

              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Filtre as saídas por período, área, cliente, pedido/carga,
                calibre e responsável.
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
            options={calibreOptionsFiltro}
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
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Saídas registradas
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Clique no nome de uma coluna para ordenar os lançamentos.
            </p>
          </div>

          <Badge variant="info">
            {carregando
              ? "Carregando"
              : `${formatarNumero(saidasFiltradas.length)} registros`}
          </Badge>
        </div>

        {carregando ? (
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Carregando saídas...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={saidasOrdenadas}
            emptyMessage="Nenhuma saída encontrada para os filtros aplicados."
          />
        )}
      </Card>
    </div>
  );
}

export default SaidaVenda;