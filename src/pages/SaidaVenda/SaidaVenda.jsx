import { useEffect, useMemo, useState } from "react";
import {
  cadastrarSaidaVenda,
  calcularResumoSaidasVendas,
  editarSaidaVenda,
  excluirSaidaVenda,
  listarEstoqueDisponivelSaida,
  listarSaidasVendas,
} from "../../services/saidaVendaService";
import { supabase } from "../../services/supabaseClient";

const filtrosIniciais = {
  dataInicial: "",
  dataFinal: "",
  areaId: "",
  calibreId: "",
  cliente: "",
  numeroPedido: "",
  responsavelId: "",
};

function dataHoje() {
  return new Date().toISOString().slice(0, 10);
}

function horaAgora() {
  return new Date().toTimeString().slice(0, 5);
}

function itemInicial() {
  return {
    calibre_id: "",
    quantidade_caixas: "",
  };
}

function formularioInicial() {
  return {
    data_saida: dataHoje(),
    hora: horaAgora(),
    area_id: "",
    quantidade_total_caixas: "",
    cliente: "",
    numero_pedido: "",
    responsavel_id: "",
    observacao: "",
    itens: [itemInicial()],
  };
}

function numero(valor) {
  const convertido = Number(valor);

  if (!Number.isFinite(convertido)) {
    return 0;
  }

  return convertido;
}

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function formatarPeso(valor) {
  return `${Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
}

function formatarData(data) {
  if (!data) return "-";

  const [ano, mes, dia] = String(data).split("-");
  return `${dia}/${mes}/${ano}`;
}

function obterAreaId(item) {
  return item?.area_id || item?.area_fazenda_id || "";
}

function obterSaldoItemEstoque(item) {
  return numero(item?.saldo_disponivel_caixas || item?.saldo_caixas);
}

function obterPesoItemEstoque(item) {
  return numero(item?.peso_disponivel_kg || item?.saldo_disponivel_peso_kg);
}

function montarNomeCalibre(item) {
  return `${item.calibre_codigo || "-"} — ${item.calibre_nome || "-"}`;
}

function classeAlertaEstoque(tipo) {
  if (tipo === "erro") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (tipo === "ok") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function SaidaVenda() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [saidas, setSaidas] = useState([]);
  const [estoqueDisponivel, setEstoqueDisponivel] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);

  const [filtros, setFiltros] = useState(filtrosIniciais);

  const [modalAberto, setModalAberto] = useState(false);
  const [registroEditando, setRegistroEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial());

  const resumo = useMemo(() => calcularResumoSaidasVendas(saidas), [saidas]);

  const totalDistribuido = useMemo(() => {
    return formulario.itens.reduce((total, item) => {
      return total + numero(item.quantidade_caixas);
    }, 0);
  }, [formulario.itens]);

  const totalInformado = useMemo(() => {
    return numero(formulario.quantidade_total_caixas);
  }, [formulario.quantidade_total_caixas]);

  const diferencaDistribuicao = useMemo(() => {
    return totalInformado - totalDistribuido;
  }, [totalInformado, totalDistribuido]);

  const opcoesAreaFormulario = useMemo(() => {
    const mapa = new Map();

    estoqueDisponivel.forEach((item) => {
      const areaId = obterAreaId(item);
      const saldo = obterSaldoItemEstoque(item);

      if (!areaId || saldo <= 0) return;

      if (!mapa.has(areaId)) {
        mapa.set(areaId, {
          id: areaId,
          nome: item.area_nome || "Área sem nome",
          fazenda_nome: item.fazenda_nome || "",
          saldo_caixas: 0,
          saldo_peso_kg: 0,
        });
      }

      const atual = mapa.get(areaId);
      atual.saldo_caixas += saldo;
      atual.saldo_peso_kg += obterPesoItemEstoque(item);

      mapa.set(areaId, atual);
    });

    return Array.from(mapa.values()).sort((a, b) =>
      String(a.nome).localeCompare(String(b.nome), "pt-BR")
    );
  }, [estoqueDisponivel]);

  const opcoesAreaFiltros = useMemo(() => {
    const mapa = new Map();

    estoqueDisponivel.forEach((item) => {
      const areaId = obterAreaId(item);

      if (!areaId) return;

      mapa.set(areaId, {
        id: areaId,
        nome: item.area_nome || "Área sem nome",
        fazenda_nome: item.fazenda_nome || "",
      });
    });

    saidas.forEach((item) => {
      const areaId = obterAreaId(item);

      if (!areaId || mapa.has(areaId)) return;

      mapa.set(areaId, {
        id: areaId,
        nome: item.area_nome || "Área sem nome",
        fazenda_nome: "",
      });
    });

    return Array.from(mapa.values()).sort((a, b) =>
      String(a.nome).localeCompare(String(b.nome), "pt-BR")
    );
  }, [estoqueDisponivel, saidas]);

  const opcoesCalibreFiltros = useMemo(() => {
    const mapa = new Map();

    estoqueDisponivel.forEach((item) => {
      if (!item.calibre_id) return;

      mapa.set(item.calibre_id, {
        id: item.calibre_id,
        codigo: item.calibre_codigo || "-",
        nome: item.calibre_nome || "Calibre sem nome",
        ordem: numero(item.calibre_ordem),
      });
    });

    saidas.forEach((saida) => {
      (saida.itens || []).forEach((item) => {
        if (!item.calibre_id || mapa.has(item.calibre_id)) return;

        mapa.set(item.calibre_id, {
          id: item.calibre_id,
          codigo: item.calibre_codigo || "-",
          nome: item.calibre_nome || "Calibre sem nome",
          ordem: numero(item.calibre_ordem),
        });
      });
    });

    return Array.from(mapa.values()).sort((a, b) => {
      if (a.ordem !== b.ordem) {
        return a.ordem - b.ordem;
      }

      return String(a.codigo).localeCompare(String(b.codigo), "pt-BR");
    });
  }, [estoqueDisponivel, saidas]);

  const estoqueDaAreaSelecionada = useMemo(() => {
    if (!formulario.area_id) {
      return [];
    }

    return estoqueDisponivel
      .filter((item) => {
        return obterAreaId(item) === formulario.area_id && obterSaldoItemEstoque(item) > 0;
      })
      .sort((a, b) => {
        const ordemA = numero(a.calibre_ordem);
        const ordemB = numero(b.calibre_ordem);

        if (ordemA !== ordemB) {
          return ordemA - ordemB;
        }

        return String(a.calibre_codigo || "").localeCompare(
          String(b.calibre_codigo || ""),
          "pt-BR"
        );
      });
  }, [estoqueDisponivel, formulario.area_id]);

  const mapaEstoqueAreaCalibre = useMemo(() => {
    const mapa = new Map();

    estoqueDisponivel.forEach((item) => {
      const areaId = obterAreaId(item);
      const chave = `${areaId}-${item.calibre_id}`;

      mapa.set(chave, item);
    });

    return mapa;
  }, [estoqueDisponivel]);

  const areaSelecionada = useMemo(() => {
    if (!formulario.area_id) return null;

    return opcoesAreaFormulario.find((area) => area.id === formulario.area_id) || null;
  }, [opcoesAreaFormulario, formulario.area_id]);

  const mensagemSaldoGeral = useMemo(() => {
    if (!formulario.area_id) {
      return {
        tipo: "neutro",
        texto: "Selecione uma Área/Pivô para carregar somente os calibres com estoque disponível.",
      };
    }

    if (estoqueDaAreaSelecionada.length === 0) {
      return {
        tipo: "erro",
        texto: "Esta Área/Pivô não possui estoque de Produto Final disponível para saída.",
      };
    }

    return {
      tipo: "ok",
      texto: `Área com ${formatarNumero(
        areaSelecionada?.saldo_caixas || 0
      )} caixas disponíveis no Produto Final.`,
    };
  }, [formulario.area_id, estoqueDaAreaSelecionada, areaSelecionada]);

  function obterEstoqueDoItem(item) {
    if (!formulario.area_id || !item.calibre_id) {
      return null;
    }

    return mapaEstoqueAreaCalibre.get(`${formulario.area_id}-${item.calibre_id}`) || null;
  }

  function obterQuantidadeUsadaNoMesmoCalibre(calibreId, ignorarIndex = null) {
    return formulario.itens.reduce((total, item, index) => {
      if (index === ignorarIndex) return total;
      if (item.calibre_id !== calibreId) return total;

      return total + numero(item.quantidade_caixas);
    }, 0);
  }

  function obterSaldoDisponivelParaLinha(item, index) {
    const estoque = obterEstoqueDoItem(item);

    if (!estoque) {
      return 0;
    }

    const saldoBase = obterSaldoItemEstoque(estoque);
    const usadoEmOutrasLinhas = obterQuantidadeUsadaNoMesmoCalibre(
      item.calibre_id,
      index
    );

    return Math.max(saldoBase - usadoEmOutrasLinhas, 0);
  }

  function obterOpcoesCalibreParaLinha(itemAtual, indexAtual) {
    if (!formulario.area_id) {
      return [];
    }

    const calibresUsados = new Set();

    formulario.itens.forEach((item, index) => {
      if (index === indexAtual) return;
      if (!item.calibre_id) return;

      calibresUsados.add(item.calibre_id);
    });

    return estoqueDaAreaSelecionada.filter((itemEstoque) => {
      if (itemEstoque.calibre_id === itemAtual.calibre_id) {
        return true;
      }

      return !calibresUsados.has(itemEstoque.calibre_id);
    });
  }

  function linhaComErroEstoque(item, index) {
    if (!item.calibre_id) {
      return false;
    }

    const quantidade = numero(item.quantidade_caixas);

    if (quantidade <= 0) {
      return false;
    }

    return quantidade > obterSaldoDisponivelParaLinha(item, index);
  }

  const formularioTemErroEstoque = useMemo(() => {
    return formulario.itens.some((item, index) => linhaComErroEstoque(item, index));
  }, [formulario.itens, formulario.area_id, mapaEstoqueAreaCalibre]);

  const formularioPodeSalvar = useMemo(() => {
    if (salvando) return false;
    if (!formulario.data_saida) return false;
    if (!formulario.hora) return false;
    if (!formulario.area_id) return false;
    if (!formulario.cliente?.trim()) return false;
    if (!formulario.responsavel_id) return false;
    if (totalInformado <= 0) return false;
    if (formulario.itens.length === 0) return false;
    if (formularioTemErroEstoque) return false;
    if (diferencaDistribuicao !== 0) return false;

    return formulario.itens.every((item) => {
      return item.calibre_id && numero(item.quantidade_caixas) > 0;
    });
  }, [
    salvando,
    formulario,
    totalInformado,
    formularioTemErroEstoque,
    diferencaDistribuicao,
  ]);

  async function carregarResponsaveis() {
    const { data, error } = await supabase
      .from("responsaveis")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(error.message || "Não foi possível carregar responsáveis.");
    }

    return data || [];
  }

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");

      const [listaSaidas, listaEstoque, listaResponsaveis] = await Promise.all([
        listarSaidasVendas(filtros),
        listarEstoqueDisponivelSaida(),
        carregarResponsaveis(),
      ]);

      setSaidas(listaSaidas || []);
      setEstoqueDisponivel(listaEstoque || []);
      setResponsaveis(listaResponsaveis || []);
    } catch (error) {
      setErro(error.message || "Não foi possível carregar saída/venda.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function aplicarFiltros() {
    await carregarDados();
  }

  async function limparFiltros() {
    setFiltros(filtrosIniciais);

    setTimeout(() => {
      carregarDados();
    }, 0);
  }

  function abrirNovoLancamento() {
    setRegistroEditando(null);
    setFormulario(formularioInicial());
    setErro("");
    setSucesso("");
    setModalAberto(true);
  }

  function abrirEdicao(registro) {
    const itensNormalizados =
      Array.isArray(registro.itens) && registro.itens.length > 0
        ? registro.itens.map((item) => ({
            calibre_id: item.calibre_id || "",
            quantidade_caixas: item.quantidade_caixas || "",
          }))
        : [
            {
              calibre_id: registro.calibre_id || "",
              quantidade_caixas:
                registro.quantidade_total_caixas || registro.quantidade_caixas || "",
            },
          ];

    setRegistroEditando(registro);

    setFormulario({
      data_saida: registro.data_saida || dataHoje(),
      hora: registro.hora || horaAgora(),
      area_id: registro.area_id || registro.area_fazenda_id || "",
      quantidade_total_caixas:
        registro.quantidade_total_caixas || registro.quantidade_caixas || "",
      cliente: registro.cliente || "",
      numero_pedido: registro.numero_pedido || "",
      responsavel_id: registro.responsavel_id || "",
      observacao: registro.observacao || "",
      itens: itensNormalizados,
    });

    setErro("");
    setSucesso("");
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) return;

    setModalAberto(false);
    setRegistroEditando(null);
    setFormulario(formularioInicial());
  }

  function atualizarFormulario(campo, valor) {
    setFormulario((estadoAtual) => {
      const proximo = {
        ...estadoAtual,
        [campo]: valor,
      };

      if (campo === "area_id") {
        proximo.itens = [itemInicial()];
      }

      return proximo;
    });
  }

  function atualizarItem(index, campo, valor) {
    setFormulario((estadoAtual) => {
      const itens = estadoAtual.itens.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          [campo]: valor,
        };
      });

      return {
        ...estadoAtual,
        itens,
      };
    });
  }

  function adicionarCalibre() {
    setFormulario((estadoAtual) => ({
      ...estadoAtual,
      itens: [...estadoAtual.itens, itemInicial()],
    }));
  }

  function removerCalibre(index) {
    setFormulario((estadoAtual) => {
      const itens = estadoAtual.itens.filter((_, itemIndex) => itemIndex !== index);

      return {
        ...estadoAtual,
        itens: itens.length > 0 ? itens : [itemInicial()],
      };
    });
  }

  async function salvarFormulario(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      if (!formularioPodeSalvar) {
        throw new Error(
          "Verifique os campos obrigatórios, a soma dos calibres e o saldo disponível."
        );
      }

      if (registroEditando) {
        await editarSaidaVenda(registroEditando.id, formulario);
        setSucesso("Saída/venda atualizada com sucesso.");
      } else {
        await cadastrarSaidaVenda(formulario);
        setSucesso("Saída/venda registrada com sucesso.");
      }

      setModalAberto(false);
      setRegistroEditando(null);
      setFormulario(formularioInicial());

      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível salvar a saída/venda.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao(registro) {
    const confirmar = window.confirm(
      `Excluir a saída/venda de ${registro.cliente || "cliente não informado"}?`
    );

    if (!confirmar) return;

    try {
      setErro("");
      setSucesso("");

      await excluirSaidaVenda(registro.id);

      setSucesso("Saída/venda excluída com sucesso.");
      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível excluir a saída/venda.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-[var(--color-text-primary)]">
          Saída / Venda
        </h1>
        <p className="text-sm text-slate-500">
          Lançamento das saídas de produto final por Área/Pivô e calibre.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Saídas</p>
          <strong className="mt-3 block text-3xl font-black text-slate-900">
            {formatarNumero(resumo.totalRegistros)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Registros encontrados</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Caixas vendidas</p>
          <strong className="mt-3 block text-3xl font-black text-slate-900">
            {formatarNumero(resumo.totalCaixas)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Total filtrado</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Peso vendido</p>
          <strong className="mt-3 block text-3xl font-black text-slate-900">
            {formatarPeso(resumo.pesoTotalKg)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Peso total filtrado</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Áreas com saída</p>
          <strong className="mt-3 block text-3xl font-black text-slate-900">
            {formatarNumero(resumo.areasComSaida)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Áreas movimentadas</p>
        </div>
      </div>

      {erro ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <strong>Atenção</strong>
          <p className="mt-1">{erro}</p>
        </div>
      ) : null}

      {sucesso ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          <strong>Sucesso</strong>
          <p className="mt-1">{sucesso}</p>
        </div>
      ) : null}

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Filtros da saída</h2>
            <p className="mt-1 text-sm text-slate-500">
              Filtre as saídas por período, área, calibre, cliente, pedido e responsável.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNovoLancamento}
            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
          >
            + Novo lançamento
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Data inicial</span>
            <input
              type="date"
              value={filtros.dataInicial}
              onChange={(event) =>
                setFiltros((estado) => ({
                  ...estado,
                  dataInicial: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Data final</span>
            <input
              type="date"
              value={filtros.dataFinal}
              onChange={(event) =>
                setFiltros((estado) => ({
                  ...estado,
                  dataFinal: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Área / Pivô</span>
            <select
              value={filtros.areaId}
              onChange={(event) =>
                setFiltros((estado) => ({
                  ...estado,
                  areaId: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">Todas as áreas</option>
              {opcoesAreaFiltros.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.fazenda_nome ? `${area.fazenda_nome} — ` : ""}
                  {area.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Calibre</span>
            <select
              value={filtros.calibreId}
              onChange={(event) =>
                setFiltros((estado) => ({
                  ...estado,
                  calibreId: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">Todos os calibres</option>
              {opcoesCalibreFiltros.map((calibre) => (
                <option key={calibre.id} value={calibre.id}>
                  {calibre.codigo} — {calibre.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Cliente</span>
            <input
              type="text"
              value={filtros.cliente}
              onChange={(event) =>
                setFiltros((estado) => ({
                  ...estado,
                  cliente: event.target.value,
                }))
              }
              placeholder="Buscar cliente"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Pedido / Carga</span>
            <input
              type="text"
              value={filtros.numeroPedido}
              onChange={(event) =>
                setFiltros((estado) => ({
                  ...estado,
                  numeroPedido: event.target.value,
                }))
              }
              placeholder="Número do pedido"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Responsável</span>
            <select
              value={filtros.responsavelId}
              onChange={(event) =>
                setFiltros((estado) => ({
                  ...estado,
                  responsavelId: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">Todos os responsáveis</option>
              {responsaveis.map((responsavel) => (
                <option key={responsavel.id} value={responsavel.id}>
                  {responsavel.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={limparFiltros}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Limpar filtros
          </button>

          <button
            type="button"
            onClick={aplicarFiltros}
            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            Atualizar
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Saídas registradas</h2>
            <p className="mt-1 text-sm text-slate-500">
              Histórico de saídas/vendas feitas a partir do Produto Final.
            </p>
          </div>

          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            {formatarNumero(saidas.length)} registros
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Área / Pivô</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Pedido / Carga</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Calibres</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {carregando ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-400">
                    Carregando saídas...
                  </td>
                </tr>
              ) : saidas.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-400">
                    Nenhuma saída encontrada.
                  </td>
                </tr>
              ) : (
                saidas.map((saida) => (
                  <tr key={saida.id}>
                    <td className="px-4 py-3 text-slate-600">
                      {formatarData(saida.data_saida)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {saida.area_nome}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{saida.cliente || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {saida.numero_pedido || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatarNumero(
                        saida.quantidade_total_caixas || saida.quantidade_caixas
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {(saida.itens || []).length > 0
                        ? saida.itens
                            .map(
                              (item) =>
                                `${item.calibre_codigo} ${formatarNumero(
                                  item.quantidade_caixas
                                )}`
                            )
                            .join(" | ")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {saida.responsavel_nome}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(saida)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => confirmarExclusao(saida)}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalAberto ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {registroEditando ? "Editar saída / venda" : "Nova saída / venda"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Informe o total da saída e distribua a quantidade por calibre.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={salvarFormulario} className="space-y-6">
              <div
                className={`rounded-2xl border px-5 py-4 text-sm ${classeAlertaEstoque(
                  mensagemSaldoGeral.tipo
                )}`}
              >
                <strong>Saldo do Produto Final</strong>
                <p className="mt-1">{mensagemSaldoGeral.texto}</p>

                {areaSelecionada ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-white/70 px-4 py-3">
                      <p className="text-xs font-bold uppercase opacity-70">
                        Total disponível na área
                      </p>
                      <strong className="mt-1 block text-lg">
                        {formatarNumero(areaSelecionada.saldo_caixas)} caixas
                      </strong>
                    </div>

                    <div className="rounded-xl bg-white/70 px-4 py-3">
                      <p className="text-xs font-bold uppercase opacity-70">
                        Peso disponível
                      </p>
                      <strong className="mt-1 block text-lg">
                        {formatarPeso(areaSelecionada.saldo_peso_kg)}
                      </strong>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Data da saída</span>
                  <input
                    type="date"
                    value={formulario.data_saida}
                    onChange={(event) =>
                      atualizarFormulario("data_saida", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Hora</span>
                  <input
                    type="time"
                    value={formulario.hora}
                    onChange={(event) => atualizarFormulario("hora", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Área / Pivô</span>
                  <select
                    value={formulario.area_id}
                    onChange={(event) => atualizarFormulario("area_id", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {opcoesAreaFormulario.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.fazenda_nome ? `${area.fazenda_nome} — ` : ""}
                        {area.nome} — {formatarNumero(area.saldo_caixas)} caixas
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">
                    Total da saída em caixas
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formulario.quantidade_total_caixas}
                    onChange={(event) =>
                      atualizarFormulario(
                        "quantidade_total_caixas",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Cliente</span>
                  <input
                    type="text"
                    value={formulario.cliente}
                    onChange={(event) =>
                      atualizarFormulario("cliente", event.target.value)
                    }
                    placeholder="Nome do cliente"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Pedido / Carga</span>
                  <input
                    type="text"
                    value={formulario.numero_pedido}
                    onChange={(event) =>
                      atualizarFormulario("numero_pedido", event.target.value)
                    }
                    placeholder="Número do pedido/carga"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Responsável</span>
                  <select
                    value={formulario.responsavel_id}
                    onChange={(event) =>
                      atualizarFormulario("responsavel_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {responsaveis.map((responsavel) => (
                      <option key={responsavel.id} value={responsavel.id}>
                        {responsavel.nome}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <section className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Divisão por calibre
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Só aparecem calibres com estoque disponível na área selecionada.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={adicionarCalibre}
                    disabled={!formulario.area_id || estoqueDaAreaSelecionada.length === 0}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    + Adicionar calibre
                  </button>
                </div>

                <div className="space-y-4">
                  {formulario.itens.map((item, index) => {
                    const opcoesLinha = obterOpcoesCalibreParaLinha(item, index);
                    const estoqueItem = obterEstoqueDoItem(item);
                    const saldoLinha = obterSaldoDisponivelParaLinha(item, index);
                    const erroLinha = linhaComErroEstoque(item, index);

                    return (
                      <div
                        key={`${index}-${item.calibre_id}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="grid gap-4 md:grid-cols-[1fr_180px_130px] md:items-end">
                          <label className="space-y-2">
                            <span className="text-sm font-bold text-slate-700">
                              Calibre {index + 1}
                            </span>
                            <select
                              value={item.calibre_id}
                              onChange={(event) =>
                                atualizarItem(index, "calibre_id", event.target.value)
                              }
                              disabled={!formulario.area_id}
                              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
                            >
                              <option value="">Selecione</option>
                              {opcoesLinha.map((itemEstoque) => (
                                <option
                                  key={itemEstoque.calibre_id}
                                  value={itemEstoque.calibre_id}
                                >
                                  {montarNomeCalibre(itemEstoque)} —{" "}
                                  {formatarNumero(
                                    obterSaldoItemEstoque(itemEstoque)
                                  )}{" "}
                                  caixas
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-2">
                            <span className="text-sm font-bold text-slate-700">
                              Quantidade
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.quantidade_caixas}
                              onChange={(event) =>
                                atualizarItem(
                                  index,
                                  "quantidade_caixas",
                                  event.target.value
                                )
                              }
                              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-emerald-600 ${
                                erroLinha ? "border-red-300 bg-red-50" : "border-slate-200"
                              }`}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => removerCalibre(index)}
                            className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                          >
                            Remover
                          </button>
                        </div>

                        {item.calibre_id ? (
                          <div
                            className={`mt-3 rounded-xl px-4 py-3 text-xs font-bold ${
                              erroLinha
                                ? "bg-red-50 text-red-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {estoqueItem ? (
                              <>
                                Saldo disponível para este calibre:{" "}
                                {formatarNumero(saldoLinha)} caixas
                                {erroLinha
                                  ? ` — quantidade digitada ultrapassa o estoque.`
                                  : ""}
                              </>
                            ) : (
                              "Este calibre não possui estoque disponível nesta área."
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-white px-4 py-3">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Total informado
                    </p>
                    <strong className="mt-1 block text-lg text-slate-900">
                      {formatarNumero(totalInformado)} caixas
                    </strong>
                  </div>

                  <div className="rounded-xl bg-white px-4 py-3">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Total distribuído
                    </p>
                    <strong className="mt-1 block text-lg text-slate-900">
                      {formatarNumero(totalDistribuido)} caixas
                    </strong>
                  </div>

                  <div className="rounded-xl bg-white px-4 py-3">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Diferença
                    </p>
                    <strong
                      className={`mt-1 block text-lg ${
                        diferencaDistribuicao === 0
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {formatarNumero(diferencaDistribuicao)} caixas
                    </strong>
                  </div>
                </div>
              </section>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Observação</span>
                <textarea
                  value={formulario.observacao}
                  onChange={(event) =>
                    atualizarFormulario("observacao", event.target.value)
                  }
                  rows="4"
                  placeholder="Observações sobre a saída/venda..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={!formularioPodeSalvar}
                  className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar saída/venda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}