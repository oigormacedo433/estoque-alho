import { supabase } from "./supabaseClient";

import {
  campoObrigatorio,
  inteiroMaiorQueZero,
  mensagemErroSupabase,
  textoObrigatorio,
  validarData,
  validarHora,
} from "../utils/validacoes";

function obterHoraAtual() {
  return new Date().toTimeString().slice(0, 5);
}

function calcularPesoMedioPorCaixa(estoque) {
  const saldoCaixas = Number(estoque?.saldo_disponivel_caixas || 0);
  const pesoDisponivelKg = Number(estoque?.peso_disponivel_kg || 0);

  if (saldoCaixas <= 0 || pesoDisponivelKg <= 0) {
    return 0;
  }

  return pesoDisponivelKg / saldoCaixas;
}

async function validarAreaAtiva(areaId) {
  campoObrigatorio(areaId, "Área / Pivô");

  const { data, error } = await supabase
    .from("areas_fazenda")
    .select("id, ativo")
    .eq("id", areaId)
    .maybeSingle();

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  if (!data) {
    throw new Error("Área / Pivô não encontrada.");
  }

  if (!data.ativo) {
    throw new Error("Não é permitido usar Área / Pivô inativa.");
  }

  return true;
}

async function validarCalibreAtivo(calibreId) {
  campoObrigatorio(calibreId, "Calibre");

  const { data, error } = await supabase
    .from("calibres")
    .select("id, ativo")
    .eq("id", calibreId)
    .maybeSingle();

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  if (!data) {
    throw new Error("Calibre não encontrado.");
  }

  if (!data.ativo) {
    throw new Error("Não é permitido usar calibre inativo em novo lançamento.");
  }

  return true;
}

export async function listarEstoqueDisponivelSaida(filtros = {}) {
  let query = supabase
    .from("vw_estoque_area_atual")
    .select(`
      area_id,
      area_nome,
      area_ativa,
      calibre_id,
      calibre_codigo,
      calibre_nome,
      calibre_tipo,
      calibre_ordem,
      produto_final_caixas,
      produto_final_peso_kg,
      saidas_caixas,
      saidas_peso_kg,
      saldo_disponivel_caixas,
      peso_disponivel_kg,
      estoque_minimo_por_calibre,
      status_estoque_area
    `)
    .gt("saldo_disponivel_caixas", 0)
    .order("area_nome", { ascending: true })
    .order("calibre_ordem", { ascending: true });

  if (filtros.areaId) {
    query = query.eq("area_id", filtros.areaId);
  }

  if (filtros.calibreId) {
    query = query.eq("calibre_id", filtros.calibreId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  return (data || []).map((item) => ({
    ...item,
    peso_medio_por_caixa_kg: calcularPesoMedioPorCaixa(item),
  }));
}

export async function buscarSaldoDisponivelPorAreaCalibre(areaId, calibreId) {
  if (!areaId || !calibreId) {
    return null;
  }

  const { data, error } = await supabase
    .from("vw_estoque_area_atual")
    .select(`
      area_id,
      area_nome,
      calibre_id,
      calibre_codigo,
      calibre_nome,
      produto_final_caixas,
      produto_final_peso_kg,
      saidas_caixas,
      saidas_peso_kg,
      saldo_disponivel_caixas,
      peso_disponivel_kg,
      status_estoque_area
    `)
    .eq("area_id", areaId)
    .eq("calibre_id", calibreId)
    .maybeSingle();

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    peso_medio_por_caixa_kg: calcularPesoMedioPorCaixa(data),
  };
}

export async function buscarSaldoDisponivelPorCalibre(calibreId) {
  const { data, error } = await supabase
    .from("vw_estoque_atual")
    .select(`
      calibre_id,
      calibre_codigo,
      calibre_nome,
      produto_final_caixas,
      saidas_caixas,
      saldo_disponivel_caixas,
      peso_disponivel_kg,
      status_estoque
    `)
    .eq("calibre_id", calibreId)
    .maybeSingle();

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    peso_medio_por_caixa_kg: calcularPesoMedioPorCaixa(data),
  };
}

export async function listarSaidasVendas(filtros = {}) {
  let query = supabase
    .from("saidas_vendas")
    .select(`
      id,
      data_saida,
      hora,
      area_id,
      cliente,
      numero_pedido,
      calibre_id,
      quantidade_caixas,
      peso_por_caixa_kg,
      peso_total_kg,
      responsavel_id,
      observacao,
      criado_em,
      atualizado_em,
      areas_fazenda (
        id,
        nome,
        descricao,
        ativo
      ),
      calibres (
        id,
        codigo,
        nome,
        tipo,
        ordem,
        ativo
      ),
      responsaveis (
        id,
        nome
      )
    `)
    .order("data_saida", { ascending: false })
    .order("hora", { ascending: false });

  if (filtros.dataInicial) {
    query = query.gte("data_saida", filtros.dataInicial);
  }

  if (filtros.dataFinal) {
    query = query.lte("data_saida", filtros.dataFinal);
  }

  if (filtros.areaId) {
    query = query.eq("area_id", filtros.areaId);
  }

  if (filtros.calibreId) {
    query = query.eq("calibre_id", filtros.calibreId);
  }

  if (filtros.responsavelId) {
    query = query.eq("responsavel_id", filtros.responsavelId);
  }

  if (filtros.cliente) {
    query = query.ilike("cliente", `%${filtros.cliente}%`);
  }

  if (filtros.numeroPedido) {
    query = query.ilike("numero_pedido", `%${filtros.numeroPedido}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  return data || [];
}

export async function buscarSaidaVendaPorId(id) {
  const { data, error } = await supabase
    .from("saidas_vendas")
    .select(`
      id,
      data_saida,
      hora,
      area_id,
      cliente,
      numero_pedido,
      calibre_id,
      quantidade_caixas,
      peso_por_caixa_kg,
      peso_total_kg,
      responsavel_id,
      observacao,
      criado_em,
      atualizado_em
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  return data;
}

async function montarDadosSaida(dados) {
  await validarAreaAtiva(dados.area_id);
  await validarCalibreAtivo(dados.calibre_id);

  return {
    data_saida: validarData(dados.data_saida, "Data da saída"),
    hora: dados.hora ? validarHora(dados.hora, "Hora") : obterHoraAtual(),
    area_id: campoObrigatorio(dados.area_id, "Área / Pivô"),
    cliente: textoObrigatorio(dados.cliente, "Cliente"),
    numero_pedido: dados.numero_pedido ? String(dados.numero_pedido).trim() : null,
    calibre_id: campoObrigatorio(dados.calibre_id, "Calibre"),
    quantidade_caixas: inteiroMaiorQueZero(
      dados.quantidade_caixas,
      "Quantidade de caixas"
    ),
    responsavel_id: campoObrigatorio(dados.responsavel_id, "Responsável"),
    observacao: dados.observacao ? String(dados.observacao).trim() : null,
  };
}

export async function cadastrarSaidaVenda(dados) {
  try {
    const dadosValidados = await montarDadosSaida(dados);

    const saldo = await buscarSaldoDisponivelPorAreaCalibre(
      dadosValidados.area_id,
      dadosValidados.calibre_id
    );

    const quantidadeSaida = Number(dadosValidados.quantidade_caixas || 0);
    const saldoDisponivel = Number(saldo?.saldo_disponivel_caixas || 0);
    const pesoMedio = Number(saldo?.peso_medio_por_caixa_kg || 0);

    if (!saldo || saldoDisponivel <= 0) {
      throw new Error("Não existe estoque disponível para esta Área / Pivô e calibre.");
    }

    if (quantidadeSaida > saldoDisponivel) {
      throw new Error(
        `Estoque insuficiente. Saldo disponível nesta área: ${saldoDisponivel} caixas.`
      );
    }

    if (pesoMedio <= 0) {
      throw new Error(
        "Não foi possível calcular o peso médio disponível desta Área / Pivô."
      );
    }

    const payload = {
      ...dadosValidados,
      peso_por_caixa_kg: pesoMedio,
    };

    const { data, error } = await supabase
      .from("saidas_vendas")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw new Error(mensagemErroSupabase(error));
  }
}

export async function editarSaidaVenda(id, dados) {
  try {
    const dadosValidados = await montarDadosSaida(dados);

    const saidaAnterior = await buscarSaidaVendaPorId(id);

    if (!saidaAnterior) {
      throw new Error("Saída/Venda não encontrada.");
    }

    const saldoAtual = await buscarSaldoDisponivelPorAreaCalibre(
      dadosValidados.area_id,
      dadosValidados.calibre_id
    );

    let saldoDisponivel = Number(saldoAtual?.saldo_disponivel_caixas || 0);
    let pesoDisponivelKg = Number(saldoAtual?.peso_disponivel_kg || 0);

    const mesmaAreaCalibre =
      saidaAnterior.area_id === dadosValidados.area_id &&
      saidaAnterior.calibre_id === dadosValidados.calibre_id;

    if (mesmaAreaCalibre) {
      saldoDisponivel += Number(saidaAnterior.quantidade_caixas || 0);
      pesoDisponivelKg += Number(saidaAnterior.peso_total_kg || 0);
    }

    const quantidadeNova = Number(dadosValidados.quantidade_caixas || 0);

    const pesoMedio =
      saldoDisponivel > 0 && pesoDisponivelKg > 0
        ? pesoDisponivelKg / saldoDisponivel
        : 0;

    if (saldoDisponivel <= 0) {
      throw new Error("Não existe estoque disponível para esta Área / Pivô e calibre.");
    }

    if (quantidadeNova > saldoDisponivel) {
      throw new Error(
        `Estoque insuficiente. Saldo disponível nesta área: ${saldoDisponivel} caixas.`
      );
    }

    if (pesoMedio <= 0) {
      throw new Error(
        "Não foi possível calcular o peso médio disponível desta Área / Pivô."
      );
    }

    const payload = {
      ...dadosValidados,
      peso_por_caixa_kg: pesoMedio,
    };

    const { data, error } = await supabase
      .from("saidas_vendas")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw new Error(mensagemErroSupabase(error));
  }
}

export async function excluirSaidaVenda(id) {
  const { error } = await supabase
    .from("saidas_vendas")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  return true;
}

export function calcularResumoSaidasVendas(saidas = [], dataAtual = null) {
  const listaResumo = dataAtual
    ? saidas.filter((item) => item.data_saida === dataAtual)
    : saidas;

  const totalRegistros = listaResumo.length;

  const totalCaixas = listaResumo.reduce((total, item) => {
    return total + Number(item.quantidade_caixas || 0);
  }, 0);

  const pesoTotalKg = listaResumo.reduce((total, item) => {
    return total + Number(item.peso_total_kg || 0);
  }, 0);

  const areasComSaida = new Set(
    listaResumo.map((item) => item.areas_fazenda?.id || item.area_id).filter(Boolean)
  ).size;

  const ultimaAtualizacao = saidas.reduce((ultima, item) => {
    const dataItem = item.atualizado_em || item.criado_em;

    if (!dataItem) return ultima;
    if (!ultima) return dataItem;

    return new Date(dataItem) > new Date(ultima) ? dataItem : ultima;
  }, null);

  return {
    totalRegistros,
    totalCaixas,
    pesoTotalKg,
    areasComSaida,
    ultimaAtualizacao,
  };
}

export function calcularResumoConsultaSaidas(saidas = []) {
  const totalRegistros = saidas.length;

  const totalCaixas = saidas.reduce((total, item) => {
    return total + Number(item.quantidade_caixas || 0);
  }, 0);

  const pesoTotalKg = saidas.reduce((total, item) => {
    return total + Number(item.peso_total_kg || 0);
  }, 0);

  const mapaAreas = new Map();

  saidas.forEach((item) => {
    const areaId = item.areas_fazenda?.id || item.area_id;

    if (!areaId) return;

    const atual = mapaAreas.get(areaId) || {
      area_id: areaId,
      area_nome: item.areas_fazenda?.nome || "Sem área",
      caixas: 0,
      peso_kg: 0,
    };

    atual.caixas += Number(item.quantidade_caixas || 0);
    atual.peso_kg += Number(item.peso_total_kg || 0);

    mapaAreas.set(areaId, atual);
  });

  const areaMaisVendida =
    Array.from(mapaAreas.values()).sort((a, b) => b.caixas - a.caixas)[0] ||
    null;

  return {
    totalRegistros,
    totalCaixas,
    pesoTotalKg,
    areaMaisVendida,
  };
}