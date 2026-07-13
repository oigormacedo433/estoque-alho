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
import { listarCalibresAtivos } from "../../services/calibresService";

import {
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

function obterAreaIdEstoque(item) {
  return item?.area_id || item?.area_fazenda_id || "";
}

function obterAreaNome(registro) {
  return registro?.areas_fazenda?.nome || registro?.area_nome || "-";
}

function obterResponsavelNome(registro) {
  return registro?.responsaveis?.nome || registro?.responsavel_nome || "-";
}

function obterValorOrdenacao(registro, campo) {
  if (campo.startsWith("calibre:")) {
    const calibreId = campo.replace("calibre:", "");
    return numero(registro.itens_por_calibre?.[calibreId]?.quantidade_caixas);
  }

  switch (campo) {
    case "data_saida":
      return registro.data_saida || "";

    case "hora":
      return registro.hora || "";

    case "area":
      return obterAreaNome(registro);

    case "cliente":
      return registro.cliente || "";

    case "numero_pedido":
      return registro.numero_pedido || "";

    case "quantidade_total_caixas":
      return numero(registro.quantidade_total_caixas || registro.quantidade_caixas);

    case "peso_total_kg":
      return numero(registro.peso_total_kg);

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
  data_saida: "",
  hora: "",
  area_id: "",
  cliente: "",
  numero_pedido: "",
  quantidade_total_caixas: "",
  responsavel_id: "",
  observacao: "",
  itens: [{ calibre_id: "", quantidade_caixas: "" }],
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
  const [calibres, setCalibres] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [estoqueDisponivel, setEstoqueDisponivel] = useState([]);
  const [saidas, setSaidas] = useState([]);

  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);

  const [form, setForm] = useState({
    ...FORM_INICIAL,
    data_saida: obterDataAtual(),
    hora: obterHoraAtual(),
  });

  const [modalFormularioAberta, setModalFormularioAberta] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [registroOriginal, setRegistroOriginal] = useState(null);
  const [saidaParaExcluir, setSaidaParaExcluir] = useState(null);

  const [ordenacao, setOrdenacao] = useState({
    campo: "data_saida",
    direcao: "desc",
  });

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const areaOptions = useMemo(() => {
    return areas.map((area) => ({
      value: area.id,
      label: area.nome,
    }));
  }, [areas]);

  const calibreOptionsTodos = useMemo(() => {
    return calibres.map((calibre) => ({
      value: calibre.id,
      label: `${calibre.codigo} — ${calibre.nome}`,
    }));
  }, [calibres]);

  const calibreOptionsFormulario = useMemo(() => {
    if (!form.area_id) {
      return [];
    }

    const idsComSaldo = new Set();

    estoqueDisponivel.forEach((item) => {
      const areaId = obterAreaIdEstoque(item);
      const saldo = numero(item.saldo_disponivel_caixas);

      if (areaId === form.area_id && saldo > 0 && item.calibre_id) {
        idsComSaldo.add(item.calibre_id);
      }
    });

    if (editandoId && registroOriginal?.area_id === form.area_id) {
      (registroOriginal.itens || []).forEach((item) => {
        if (item.calibre_id) {
          idsComSaldo.add(item.calibre_id);
        }
      });
    }

    (form.itens || []).forEach((item) => {
      if (item.calibre_id) {
        idsComSaldo.add(item.calibre_id);
      }
    });

    return calibres
      .filter((calibre) => idsComSaldo.has(calibre.id))
      .map((calibre) => ({
        value: calibre.id,
        label: `${calibre.codigo} — ${calibre.nome}`,
      }));
  }, [calibres, estoqueDisponivel, form.area_id, form.itens, editandoId, registroOriginal]);

  const responsavelOptions = useMemo(() => {
    return responsaveis.map((responsavel) => ({
      value: responsavel.id,
      label: responsavel.nome,
    }));
  }, [responsaveis]);

  const calibresTabela = useMemo(() => {
    const mapa = new Map();

    calibres.forEach((calibre) => {
      mapa.set(calibre.id, calibre);
    });

    saidas.forEach((saida) => {
      (saida.itens || []).forEach((item) => {
        if (!mapa.has(item.calibre_id)) {
          mapa.set(item.calibre_id, {
            id: item.calibre_id,
            codigo: item.calibre_codigo,
            nome: item.calibre_nome,
          });
        }
      });
    });

    return Array.from(mapa.values()).sort((a, b) =>
      String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt-BR", {
        numeric: true,
        sensitivity: "base",
      })
    );
  }, [calibres, saidas]);

  const saidasFiltradas = useMemo(() => {
    return saidas.filter((saida) => {
      const data = saida.data_saida || "";

      if (filtros.dataInicial && data < filtros.dataInicial) return false;
      if (filtros.dataFinal && data > filtros.dataFinal) return false;
      if (filtros.areaId && saida.area_id !== filtros.areaId) return false;

      if (
        filtros.cliente &&
        !String(saida.cliente || "")
          .toLowerCase()
          .includes(String(filtros.cliente).toLowerCase())
      ) {
        return false;
      }

      if (
        filtros.numeroPedido &&
        !String(saida.numero_pedido || "")
          .toLowerCase()
          .includes(String(filtros.numeroPedido).toLowerCase())
      ) {
        return false;
      }

      if (filtros.responsavelId && saida.responsavel_id !== filtros.responsavelId) {
        return false;
      }

      if (
        filtros.calibreId &&
        !(saida.itens || []).some((item) => item.calibre_id === filtros.calibreId)
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

  const totalSaida = useMemo(() => {
    return numero(form.quantidade_total_caixas);
  }, [form.quantidade_total_caixas]);

  const totalDistribuido = useMemo(() => {
    return (form.itens || []).reduce((total, item) => {
      return total + numero(item.quantidade_caixas);
    }, 0);
  }, [form.itens]);

  const restanteDistribuir = useMemo(() => {
    return totalSaida - totalDistribuido;
  }, [totalSaida, totalDistribuido]);

  const distribuicaoPassouDoTotal = totalDistribuido > totalSaida && totalSaida > 0;

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
        estoqueBanco,
        saidasBanco,
      ] = await Promise.all([
        listarAreasAtivas(),
        listarCalibresAtivos(),
        listarResponsaveisAtivos(),
        listarEstoqueDisponivelSaida(),
        listarSaidasVendas(),
      ]);

      setAreas(areasBanco || []);
      setCalibres(calibresBanco || []);
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

  function atualizarCampo(event) {
    const { name, value } = event.target;

    setForm((estadoAtual) => {
      if (name === "area_id") {
        return {
          ...estadoAtual,
          area_id: value,
          itens: [{ calibre_id: "", quantidade_caixas: "" }],
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

  function atualizarItem(index, campo, valor) {
    setForm((estadoAtual) => {
      const novosItens = [...estadoAtual.itens];

      novosItens[index] = {
        ...novosItens[index],
        [campo]: valor,
      };

      return {
        ...estadoAtual,
        itens: novosItens,
      };
    });

    setErro("");
    setSucesso("");
  }

  function adicionarItem() {
    setForm((estadoAtual) => ({
      ...estadoAtual,
      itens: [
        ...estadoAtual.itens,
        {
          calibre_id: "",
          quantidade_caixas: "",
        },
      ],
    }));

    setErro("");
    setSucesso("");
  }

  function removerItem(index) {
    setForm((estadoAtual) => {
      const novosItens = estadoAtual.itens.filter((_, itemIndex) => {
        return itemIndex !== index;
      });

      return {
        ...estadoAtual,
        itens:
          novosItens.length > 0
            ? novosItens
            : [{ calibre_id: "", quantidade_caixas: "" }],
      };
    });

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

  function obterSaldoItem(calibreId) {
    if (!form.area_id || !calibreId) {
      return null;
    }

    const saldoBanco =
      estoqueDisponivel.find((item) => {
        return obterAreaIdEstoque(item) === form.area_id && item.calibre_id === calibreId;
      }) || null;

    const itemOriginal =
      editandoId && registroOriginal?.area_id === form.area_id
        ? (registroOriginal.itens || []).find((item) => item.calibre_id === calibreId)
        : null;

    if (!saldoBanco && !itemOriginal) {
      return null;
    }

    const calibre =
      calibres.find((item) => item.id === calibreId) || itemOriginal?.calibres || null;

    const saldoCaixas =
      numero(saldoBanco?.saldo_disponivel_caixas) +
      numero(itemOriginal?.quantidade_caixas);

    const pesoDisponivel =
      numero(saldoBanco?.peso_disponivel_kg) + numero(itemOriginal?.peso_total_kg);

    const pesoMedio =
      saldoCaixas > 0 && pesoDisponivel > 0
        ? pesoDisponivel / saldoCaixas
        : numero(saldoBanco?.peso_medio_por_caixa_kg);

    return {
      ...(saldoBanco || {}),
      area_id: form.area_id,
      calibre_id: calibreId,
      calibre_codigo: saldoBanco?.calibre_codigo || calibre?.codigo || "-",
      calibre_nome: saldoBanco?.calibre_nome || calibre?.nome || "-",
      saldo_disponivel_caixas: saldoCaixas,
      peso_disponivel_kg: pesoDisponivel,
      peso_medio_por_caixa_kg: pesoMedio,
    };
  }

  function obterCalibreOptionsDoItem(index) {
    const selecionadosEmOutrosItens = new Set(
      form.itens
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item) => item.calibre_id)
        .filter(Boolean)
    );

    return calibreOptionsFormulario.filter((option) => {
      return !selecionadosEmOutrosItens.has(option.value);
    });
  }

  function validarFormulario() {
    if (!form.data_saida) return "Informe a data da saída.";
    if (!form.hora) return "Informe a hora.";
    if (!form.area_id) return "Selecione a Área / Pivô.";
    if (!form.cliente) return "Informe o cliente.";
    if (!form.quantidade_total_caixas) return "Informe o total da saída.";

    if (numero(form.quantidade_total_caixas) <= 0) {
      return "O total da saída precisa ser maior que zero.";
    }

    if (!form.responsavel_id) return "Selecione o responsável.";

    if (!form.itens || form.itens.length === 0) {
      return "Adicione pelo menos um calibre.";
    }

    const calibresSelecionados = new Set();

    for (const item of form.itens) {
      if (!item.calibre_id) {
        return "Selecione todos os calibres.";
      }

      if (calibresSelecionados.has(item.calibre_id)) {
        return "O mesmo calibre não pode ser repetido na mesma saída.";
      }

      calibresSelecionados.add(item.calibre_id);

      if (!item.quantidade_caixas) {
        return "Informe a quantidade de todos os calibres.";
      }

      if (numero(item.quantidade_caixas) <= 0) {
        return "A quantidade de cada calibre precisa ser maior que zero.";
      }

      const saldo = obterSaldoItem(item.calibre_id);

      if (!saldo || numero(saldo.saldo_disponivel_caixas) <= 0) {
        const calibre = calibres.find((calibreItem) => calibreItem.id === item.calibre_id);

        return `Não existe estoque disponível na área selecionada para ${
          calibre ? `${calibre.codigo} — ${calibre.nome}` : "um dos calibres selecionados"
        }.`;
      }

      if (numero(item.quantidade_caixas) > numero(saldo.saldo_disponivel_caixas)) {
        return `Estoque insuficiente para ${saldo.calibre_codigo} — ${
          saldo.calibre_nome
        }. Saldo disponível nesta área: ${formatarNumero(
          saldo.saldo_disponivel_caixas
        )} caixas.`;
      }
    }

    if (totalDistribuido > totalSaida) {
      return `A divisão por calibre ultrapassou o total da saída. Total: ${formatarNumero(
        totalSaida
      )} caixas. Distribuído: ${formatarNumero(totalDistribuido)} caixas.`;
    }

    if (Math.abs(totalDistribuido - totalSaida) > 0.001) {
      return `A divisão por calibre precisa fechar exatamente o total da saída. Total: ${formatarNumero(
        totalSaida
      )} caixas. Distribuído: ${formatarNumero(totalDistribuido)} caixas.`;
    }

    return "";
  }

  function limparFormulario() {
    setEditandoId(null);
    setRegistroOriginal(null);

    setForm({
      ...FORM_INICIAL,
      data_saida: obterDataAtual(),
      hora: obterHoraAtual(),
      itens: [{ calibre_id: "", quantidade_caixas: "" }],
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
        itens: form.itens.map((item) => ({
          calibre_id: item.calibre_id,
          quantidade_caixas: item.quantidade_caixas,
        })),
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

  function iniciarEdicao(registro) {
    setEditandoId(registro.id);
    setRegistroOriginal(registro);

    setForm({
      data_saida: registro.data_saida || obterDataAtual(),
      hora: registro.hora ? String(registro.hora).slice(0, 5) : obterHoraAtual(),
      area_id: registro.area_id || "",
      cliente: registro.cliente || "",
      numero_pedido: registro.numero_pedido || "",
      quantidade_total_caixas: String(
        registro.quantidade_total_caixas || registro.quantidade_caixas || ""
      ),
      responsavel_id: registro.responsavel_id || "",
      observacao: registro.observacao || "",
      itens:
        registro.itens && registro.itens.length > 0
          ? registro.itens.map((item) => ({
              calibre_id: item.calibre_id || "",
              quantidade_caixas: String(item.quantidade_caixas || ""),
            }))
          : [{ calibre_id: "", quantidade_caixas: "" }],
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
    setSaidaParaExcluir(registro);
    setErro("");
    setSucesso("");
  }

  function cancelarExclusao() {
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
      key: "quantidade_total_caixas",
      label: (
        <CabecalhoOrdenavel
          label="Total"
          campo="quantidade_total_caixas"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (_, row) =>
        `${formatarNumero(row.quantidade_total_caixas || row.quantidade_caixas)} caixas`,
    },
    ...calibresTabela.map((calibre) => ({
      key: `calibre_${calibre.id}`,
      label: (
        <CabecalhoOrdenavel
          label={calibre.codigo}
          campo={`calibre:${calibre.id}`}
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (_, row) => {
        const item = row.itens_por_calibre?.[calibre.id];

        if (!item) return "-";

        return (
          <div>
            <p className="font-black text-[var(--color-text-primary)]">
              {formatarNumero(item.quantidade_caixas)}
            </p>
            <p className="text-xs font-semibold text-[var(--color-text-muted)]">
              {formatarKg(item.peso_total_kg)}
            </p>
          </div>
        );
      },
    })),
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
      label: "Observação",
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
                    Excluir saída/venda?
                  </h3>

                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">
                    Essa ação remove a saída selecionada e devolve os itens ao
                    cálculo do estoque disponível.
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
                    Total
                  </p>
                  <p className="mt-1 font-black text-[var(--color-text-primary)]">
                    {formatarNumero(
                      saidaParaExcluir.quantidade_total_caixas ||
                        saidaParaExcluir.quantidade_caixas
                    )}{" "}
                    caixas
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                    Calibres
                  </p>

                  <div className="mt-2 space-y-2">
                    {(saidaParaExcluir.itens || []).map((item) => (
                      <div
                        key={item.id || item.calibre_id}
                        className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-bold"
                      >
                        <span>
                          {item.calibre_codigo} — {item.calibre_nome}
                        </span>
                        <span>{formatarNumero(item.quantidade_caixas)} caixas</span>
                      </div>
                    ))}
                  </div>
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
        title={editandoId ? "Editar saída / venda" : "Nova saída / venda"}
        description="Informe o total da saída e distribua a quantidade por calibre."
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

            <Input
              label="Total da saída em caixas"
              name="quantidade_total_caixas"
              type="number"
              value={form.quantidade_total_caixas}
              onChange={atualizarCampo}
              placeholder="Ex: 500"
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

            <Select
              label="Responsável"
              name="responsavel_id"
              value={form.responsavel_id}
              onChange={atualizarCampo}
              options={responsavelOptions}
              placeholder="Selecione o responsável"
            />

            <div className="md:col-span-2">
              <div className="rounded-3xl border border-[var(--color-border-soft)] bg-slate-50 p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h4 className="text-lg font-black text-[var(--color-text-primary)]">
                      Divisão por calibre
                    </h4>

                    <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
                      A soma dos calibres precisa fechar o total da saída.
                    </p>
                  </div>

                  <Button type="button" variant="secondary" onClick={adicionarItem}>
                    <Plus size={16} />
                    Adicionar calibre
                  </Button>
                </div>

                {form.area_id && calibreOptionsFormulario.length === 0 && (
                  <div className="mt-5">
                    <AlertBox
                      variant="warning"
                      title="Sem saldo nesta área"
                      description="A Área / Pivô selecionada não possui calibres com saldo disponível para saída."
                    />
                  </div>
                )}

                <div className="mt-5 space-y-4">
                  {form.itens.map((item, index) => {
                    const saldo = obterSaldoItem(item.calibre_id);
                    const optionsDoItem = obterCalibreOptionsDoItem(index);

                    return (
                      <div
                        key={`${index}-${item.calibre_id}`}
                        className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px_auto]"
                      >
                        <Select
                          label={`Calibre ${index + 1}`}
                          name={`calibre_${index}`}
                          value={item.calibre_id}
                          onChange={(event) =>
                            atualizarItem(index, "calibre_id", event.target.value)
                          }
                          options={optionsDoItem}
                          placeholder={
                            form.area_id
                              ? "Selecione um calibre com saldo nesta área"
                              : "Selecione a Área / Pivô primeiro"
                          }
                        />

                        <Input
                          label="Quantidade"
                          name={`quantidade_${index}`}
                          type="number"
                          value={item.quantidade_caixas}
                          onChange={(event) =>
                            atualizarItem(
                              index,
                              "quantidade_caixas",
                              event.target.value
                            )
                          }
                          placeholder="Ex: 200"
                        />

                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="danger"
                            disabled={form.itens.length === 1}
                            onClick={() => removerItem(index)}
                          >
                            <Trash2 size={16} />
                            Remover
                          </Button>
                        </div>

                        {item.calibre_id && saldo && (
                          <div className="md:col-span-3">
                            <p className="text-xs font-bold text-[var(--color-text-secondary)]">
                              Saldo disponível nesta área:{" "}
                              {formatarNumero(saldo.saldo_disponivel_caixas)} caixas •{" "}
                              {formatarKg(saldo.peso_disponivel_kg)}
                            </p>
                          </div>
                        )}

                        {item.calibre_id && !saldo && (
                          <div className="md:col-span-3">
                            <p className="text-xs font-bold text-red-600">
                              Este calibre não possui saldo disponível na área selecionada.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                      Total informado
                    </p>
                    <p className="mt-1 text-xl font-black text-[var(--color-text-primary)]">
                      {formatarNumero(totalSaida)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                      Distribuído
                    </p>
                    <p className="mt-1 text-xl font-black text-[var(--color-text-primary)]">
                      {formatarNumero(totalDistribuido)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                      Restante
                    </p>
                    <p
                      className={`mt-1 text-xl font-black ${
                        restanteDistribuir < 0
                          ? "text-red-600"
                          : restanteDistribuir === 0
                            ? "text-green-700"
                            : "text-orange-600"
                      }`}
                    >
                      {formatarNumero(restanteDistribuir)}
                    </p>
                  </div>
                </div>

                {distribuicaoPassouDoTotal && (
                  <div className="mt-5">
                    <AlertBox
                      variant="danger"
                      title="Total ultrapassado"
                      description="A soma dos calibres passou do total informado para a saída."
                    />
                  </div>
                )}
              </div>
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
              disabled={salvando || distribuicaoPassouDoTotal}
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
                Filtros da saída
              </h3>

              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Filtre por período, área, cliente, pedido/carga, calibre e responsável.
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
            options={calibreOptionsTodos}
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
              Cada linha mostra a saída completa e a quantidade separada por calibre.
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