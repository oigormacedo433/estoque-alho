import { supabase } from "./supabaseClient";

function texto(valor) {
  const tratado = String(valor || "").trim();
  return tratado || null;
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

function obterAreaId(valor) {
  return valor?.area_id || valor?.area_fazenda_id || "";
}

function tratarErroSupabase(error) {
  const mensagem = String(error?.message || "");

  if (mensagem.includes("Could not find the function")) {
    return new Error(
      "A função de salvar saída ainda não foi carregada pelo Supabase. Rode o SQL da função e atualize a página com Ctrl + F5."
    );
  }

  if (mensagem.includes("salvar_saida_venda_com_itens")) {
    return new Error(
      "A função de salvar saída não está disponível no Supabase. Rode o SQL completo da Saída/Venda."
    );
  }

  if (mensagem.includes("permission denied")) {
    return new Error(
      "Sem permissão no Supabase para salvar ou consultar saídas. Rode o SQL completo da Saída/Venda."
    );
  }

  return new Error(mensagem || "Não foi possível salvar a saída/venda.");
}

async function buscarPorIds(tabela, ids, colunas = "*") {
  const idsLimpos = Array.from(new Set((ids || []).filter(Boolean)));

  if (idsLimpos.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from(tabela)
    .select(colunas)
    .in("id", idsLimpos);

  if (error) {
    throw tratarErroSupabase(error);
  }

  return data || [];
}

function normalizarEstoque(item) {
  return {
    ...item,
    area_id: item.area_id || item.area_fazenda_id || "",
    area_fazenda_id: item.area_fazenda_id || item.area_id || "",
    area_nome: item.area_nome || "-",
    calibre_id: item.calibre_id || "",
    calibre_codigo: item.calibre_codigo || "-",
    calibre_nome: item.calibre_nome || "-",
    produto_final_caixas: numero(item.produto_final_caixas),
    produto_final_kg: numero(item.produto_final_kg),
    saidas_caixas: numero(item.saidas_caixas),
    saidas_kg: numero(item.saidas_kg),
    saldo_disponivel_caixas: numero(item.saldo_disponivel_caixas),
    peso_disponivel_kg: numero(item.peso_disponivel_kg),
    peso_medio_por_caixa_kg: numero(item.peso_medio_por_caixa_kg),
  };
}

export async function listarEstoqueDisponivelSaida(opcoes = {}) {
  const areaId = opcoes.areaId || opcoes.area_id || "";

  let query = supabase
    .from("vw_estoque_area_atual")
    .select("*")
    .gt("saldo_disponivel_caixas", 0)
    .order("area_nome", { ascending: true })
    .order("calibre_codigo", { ascending: true });

  if (areaId) {
    query = query.eq("area_id", areaId);
  }

  const { data, error } = await query;

  if (error) {
    throw tratarErroSupabase(error);
  }

  return (data || []).map(normalizarEstoque);
}

export async function buscarSaldoDisponivelPorAreaCalibre(areaId, calibreId) {
  if (!areaId || !calibreId) {
    return null;
  }

  const { data, error } = await supabase
    .from("vw_estoque_area_atual")
    .select("*")
    .eq("area_id", areaId)
    .eq("calibre_id", calibreId)
    .maybeSingle();

  if (error) {
    throw tratarErroSupabase(error);
  }

  if (!data) {
    return null;
  }

  return normalizarEstoque(data);
}

async function carregarItensSaidas(saidaIds) {
  const idsLimpos = Array.from(new Set((saidaIds || []).filter(Boolean)));

  if (idsLimpos.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("saida_venda_itens")
    .select("*")
    .in("saida_venda_id", idsLimpos);

  if (error) {
    throw tratarErroSupabase(error);
  }

  const itens = data || [];
  const calibreIds = itens.map((item) => item.calibre_id).filter(Boolean);

  const calibres = await buscarPorIds(
    "calibres",
    calibreIds,
    "id, codigo, nome, tipo, ativo"
  );

  return itens.map((item) => {
    const calibre = calibres.find((calibreItem) => {
      return calibreItem.id === item.calibre_id;
    });

    return {
      ...item,
      quantidade_caixas: numero(item.quantidade_caixas),
      peso_por_caixa_kg: numero(item.peso_por_caixa_kg),
      peso_total_kg: numero(item.peso_total_kg),
      calibres: calibre || null,
      calibre_codigo: calibre?.codigo || "-",
      calibre_nome: calibre?.nome || "-",
      calibre_tipo: calibre?.tipo || "",
    };
  });
}

function montarItensPorCalibre(itens) {
  const mapa = {};

  (itens || []).forEach((item) => {
    if (!item.calibre_id) return;

    mapa[item.calibre_id] = {
      ...item,
      quantidade_caixas: numero(item.quantidade_caixas),
      peso_total_kg: numero(item.peso_total_kg),
    };
  });

  return mapa;
}

function normalizarSaida(saida, itens, areas, responsaveis, calibresLegacy) {
  const areaId = obterAreaId(saida);
  const area = areas.find((item) => item.id === areaId) || null;
  const responsavel =
    responsaveis.find((item) => item.id === saida.responsavel_id) || null;

  let itensDaSaida = itens.filter((item) => item.saida_venda_id === saida.id);

  if (itensDaSaida.length === 0 && saida.calibre_id) {
    const calibre =
      calibresLegacy.find((item) => item.id === saida.calibre_id) || null;

    itensDaSaida = [
      {
        id: `${saida.id}-${saida.calibre_id}`,
        saida_venda_id: saida.id,
        calibre_id: saida.calibre_id,
        quantidade_caixas: numero(saida.quantidade_caixas),
        peso_por_caixa_kg: numero(saida.peso_por_caixa_kg),
        peso_total_kg: numero(saida.peso_total_kg),
        calibres: calibre,
        calibre_codigo: calibre?.codigo || "-",
        calibre_nome: calibre?.nome || "-",
        calibre_tipo: calibre?.tipo || "",
      },
    ];
  }

  const quantidadeTotalItens = itensDaSaida.reduce((total, item) => {
    return total + numero(item.quantidade_caixas);
  }, 0);

  const pesoTotalItens = itensDaSaida.reduce((total, item) => {
    return total + numero(item.peso_total_kg);
  }, 0);

  const quantidadeTotal =
    numero(saida.quantidade_total_caixas) ||
    quantidadeTotalItens ||
    numero(saida.quantidade_caixas);

  const pesoTotal = numero(saida.peso_total_kg) || pesoTotalItens;

  return {
    ...saida,
    area_id: areaId,
    area_fazenda_id: areaId,
    quantidade_total_caixas: quantidadeTotal,
    quantidade_caixas: quantidadeTotal,
    peso_total_kg: pesoTotal,
    areas_fazenda: area,
    area_nome: area?.nome || "-",
    responsaveis: responsavel,
    responsavel_nome: responsavel?.nome || "-",
    itens: itensDaSaida,
    itens_por_calibre: montarItensPorCalibre(itensDaSaida),
  };
}

export async function listarSaidasVendas(filtros = {}) {
  const { data, error } = await supabase
    .from("saidas_vendas")
    .select("*")
    .order("data_saida", { ascending: false })
    .order("hora", { ascending: false });

  if (error) {
    throw tratarErroSupabase(error);
  }

  const saidas = data || [];
  const saidaIds = saidas.map((saida) => saida.id);

  const itens = await carregarItensSaidas(saidaIds);

  const areaIds = saidas.map((saida) => obterAreaId(saida)).filter(Boolean);
  const responsavelIds = saidas
    .map((saida) => saida.responsavel_id)
    .filter(Boolean);

  const calibresLegacyIds = saidas
    .map((saida) => saida.calibre_id)
    .filter(Boolean);

  const [areas, responsaveis, calibresLegacy] = await Promise.all([
    buscarPorIds("areas_fazenda", areaIds, "id, nome, fazenda_id, ativo"),
    buscarPorIds("responsaveis", responsavelIds, "id, nome, ativo"),
    buscarPorIds("calibres", calibresLegacyIds, "id, codigo, nome, tipo, ativo"),
  ]);

  let lista = saidas.map((saida) =>
    normalizarSaida(saida, itens, areas, responsaveis, calibresLegacy)
  );

  if (filtros.dataInicial) {
    lista = lista.filter((saida) => saida.data_saida >= filtros.dataInicial);
  }

  if (filtros.dataFinal) {
    lista = lista.filter((saida) => saida.data_saida <= filtros.dataFinal);
  }

  if (filtros.areaId || filtros.area_id) {
    const areaId = filtros.areaId || filtros.area_id;
    lista = lista.filter((saida) => saida.area_id === areaId);
  }

  if (filtros.cliente) {
    const busca = String(filtros.cliente).toLowerCase();

    lista = lista.filter((saida) =>
      String(saida.cliente || "").toLowerCase().includes(busca)
    );
  }

  if (filtros.numeroPedido) {
    const busca = String(filtros.numeroPedido).toLowerCase();

    lista = lista.filter((saida) =>
      String(saida.numero_pedido || "").toLowerCase().includes(busca)
    );
  }

  if (filtros.responsavelId) {
    lista = lista.filter(
      (saida) => saida.responsavel_id === filtros.responsavelId
    );
  }

  if (filtros.calibreId) {
    lista = lista.filter((saida) =>
      (saida.itens || []).some((item) => item.calibre_id === filtros.calibreId)
    );
  }

  return lista;
}

export async function buscarSaidaVendaPorId(id) {
  const lista = await listarSaidasVendas();
  return lista.find((saida) => saida.id === id) || null;
}

function normalizarItensEntrada(dados) {
  const origem = Array.isArray(dados.itens)
    ? dados.itens
    : Array.isArray(dados.divisao_calibres)
      ? dados.divisao_calibres
      : Array.isArray(dados.calibres)
        ? dados.calibres
        : [];

  return origem
    .map((item) => ({
      calibre_id: item.calibre_id || item.calibreId || "",
      quantidade_caixas:
        item.quantidade_caixas || item.quantidade || item.caixas || "",
    }))
    .filter((item) => item.calibre_id || item.quantidade_caixas);
}

function montarPayloadRpc(dados) {
  const areaId = dados.area_id || dados.area_fazenda_id || "";
  const total =
    dados.quantidade_total_caixas ||
    dados.total_saida_caixas ||
    dados.total_caixas ||
    dados.quantidade_caixas ||
    "";

  return {
    data_saida: dados.data_saida || "",
    hora: dados.hora || "",
    area_id: areaId,
    cliente: texto(dados.cliente),
    numero_pedido: texto(dados.numero_pedido),
    quantidade_total_caixas: total,
    responsavel_id: dados.responsavel_id || "",
    observacao: texto(dados.observacao),
    itens: normalizarItensEntrada(dados),
  };
}

async function salvarPorRpc(id, dados) {
  const payload = montarPayloadRpc(dados);

  const { data, error } = await supabase.rpc("salvar_saida_venda_com_itens", {
    p_saida_id: id || null,
    p_payload: payload,
  });

  if (error) {
    throw tratarErroSupabase(error);
  }

  return data;
}

export async function cadastrarSaidaVenda(dados) {
  const id = await salvarPorRpc(null, dados);
  return buscarSaidaVendaPorId(id);
}

export async function editarSaidaVenda(id, dados) {
  const idAtualizado = await salvarPorRpc(id, dados);
  return buscarSaidaVendaPorId(idAtualizado);
}

export async function excluirSaidaVenda(id) {
  const { error } = await supabase.from("saidas_vendas").delete().eq("id", id);

  if (error) {
    throw tratarErroSupabase(error);
  }

  return true;
}

export function calcularResumoSaidasVendas(saidas = []) {
  const totalRegistros = saidas.length;

  const totalCaixas = saidas.reduce((total, saida) => {
    return (
      total + numero(saida.quantidade_total_caixas || saida.quantidade_caixas)
    );
  }, 0);

  const pesoTotalKg = saidas.reduce((total, saida) => {
    return total + numero(saida.peso_total_kg);
  }, 0);

  const areas = new Set();

  saidas.forEach((saida) => {
    if (saida.area_id) {
      areas.add(saida.area_id);
    }
  });

  const mapaCalibres = new Map();

  saidas.forEach((saida) => {
    (saida.itens || []).forEach((item) => {
      const atual = mapaCalibres.get(item.calibre_id) || {
        calibre_id: item.calibre_id,
        calibre_codigo: item.calibre_codigo,
        calibre_nome: item.calibre_nome,
        caixas: 0,
      };

      atual.caixas += numero(item.quantidade_caixas);
      mapaCalibres.set(item.calibre_id, atual);
    });
  });

  const calibreMaisVendido =
    Array.from(mapaCalibres.values()).sort((a, b) => b.caixas - a.caixas)[0] ||
    null;

  return {
    totalRegistros,
    totalCaixas,
    pesoTotalKg,
    areasComSaida: areas.size,
    calibreMaisVendido,
  };
}

export function calcularResumoConsultaSaidas(saidas = []) {
  return calcularResumoSaidasVendas(saidas);
}

export const listarSaidaVenda = listarSaidasVendas;
export const listarSaidasVenda = listarSaidasVendas;
export const cadastrarSaidasVendas = cadastrarSaidaVenda;
export const editarSaidasVendas = editarSaidaVenda;
export const excluirSaidasVendas = excluirSaidaVenda;