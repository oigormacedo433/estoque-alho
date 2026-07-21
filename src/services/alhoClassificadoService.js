import { supabase } from "./supabaseClient";

function numero(valor) {
  const convertido = Number(valor);

  if (!Number.isFinite(convertido)) {
    return 0;
  }

  return convertido;
}

function texto(valor) {
  const tratado = String(valor || "").trim();
  return tratado || null;
}

function tratarErroSupabase(error) {
  return new Error(error?.message || "Erro ao acessar os dados do alho classificado.");
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

export function calcularTotalCaixas(registro) {
  if (
    registro?.permitir_edicao_total_caixas &&
    registro?.total_caixas_manual !== null &&
    registro?.total_caixas_manual !== undefined &&
    registro?.total_caixas_manual !== ""
  ) {
    return numero(registro.total_caixas_manual);
  }

  if (
    registro?.total_caixas !== null &&
    registro?.total_caixas !== undefined &&
    registro?.total_caixas !== ""
  ) {
    return numero(registro.total_caixas);
  }

  return numero(registro?.quantidade_paletes) * numero(registro?.caixas_por_palete);
}

function normalizarRegistro(registro, relacionamentos) {
  const fazenda =
    relacionamentos.fazendas.find((item) => item.id === registro.fazenda_id) || null;

  const area =
    relacionamentos.areas.find((item) => {
      return item.id === (registro.area_fazenda_id || registro.area_id);
    }) || null;

  const calibre =
    relacionamentos.calibres.find((item) => item.id === registro.calibre_id) || null;

  const responsavel =
    relacionamentos.responsaveis.find((item) => item.id === registro.responsavel_id) ||
    null;

  const totalCaixas = calcularTotalCaixas(registro);

  return {
    ...registro,

    area_fazenda_id: registro.area_fazenda_id || registro.area_id || "",
    area_id: registro.area_fazenda_id || registro.area_id || "",

    lote: registro.lote || "",

    total_caixas_calculado: totalCaixas,

    fazendas: fazenda,
    fazenda_nome: fazenda?.nome || "-",

    areas_fazenda: area,
    area_nome: area?.nome || "-",

    calibres: calibre,
    calibre_codigo: calibre?.codigo || "-",
    calibre_nome: calibre?.nome || "-",
    calibre_ordem: calibre?.ordem || 0,

    responsaveis: responsavel,
    responsavel_nome: responsavel?.nome || "-",

    status_texto: registro.conferido ? "Conferido" : "Pendente",
  };
}

export async function listarAlhoClassificado(filtros = {}) {
  const { data, error } = await supabase
    .from("alho_classificado")
    .select("*")
    .order("data_classificacao", { ascending: false })
    .order("hora", { ascending: false });

  if (error) {
    throw tratarErroSupabase(error);
  }

  const registros = data || [];

  const fazendaIds = registros.map((item) => item.fazenda_id).filter(Boolean);
  const areaIds = registros
    .map((item) => item.area_fazenda_id || item.area_id)
    .filter(Boolean);
  const calibreIds = registros.map((item) => item.calibre_id).filter(Boolean);
  const responsavelIds = registros.map((item) => item.responsavel_id).filter(Boolean);

  const [fazendas, areas, calibres, responsaveis] = await Promise.all([
    buscarPorIds("fazendas", fazendaIds, "id, nome, ativo"),
    buscarPorIds("areas_fazenda", areaIds, "id, nome, fazenda_id, ativo"),
    buscarPorIds("calibres", calibreIds, "id, codigo, nome, tipo, ordem, ativo"),
    buscarPorIds("responsaveis", responsavelIds, "id, nome, ativo"),
  ]);

  let lista = registros.map((registro) =>
    normalizarRegistro(registro, {
      fazendas,
      areas,
      calibres,
      responsaveis,
    })
  );

  if (filtros.dataInicial) {
    lista = lista.filter((item) => item.data_classificacao >= filtros.dataInicial);
  }

  if (filtros.dataFinal) {
    lista = lista.filter((item) => item.data_classificacao <= filtros.dataFinal);
  }

  if (filtros.fazendaId) {
    lista = lista.filter((item) => item.fazenda_id === filtros.fazendaId);
  }

  if (filtros.areaId) {
    lista = lista.filter((item) => item.area_fazenda_id === filtros.areaId);
  }

  if (filtros.calibreId) {
    lista = lista.filter((item) => item.calibre_id === filtros.calibreId);
  }

  if (filtros.responsavelId) {
    lista = lista.filter((item) => item.responsavel_id === filtros.responsavelId);
  }

  if (filtros.status === "conferido") {
    lista = lista.filter((item) => item.conferido === true);
  }

  if (filtros.status === "pendente") {
    lista = lista.filter((item) => item.conferido !== true);
  }

  return lista;
}

export async function listarEstoqueAlhoClassificadoAtual(filtros = {}) {
  let query = supabase
    .from("vw_estoque_alho_classificado_atual")
    .select("*")
    .order("area_nome", { ascending: true })
    .order("calibre_ordem", { ascending: true })
    .order("calibre_codigo", { ascending: true });

  if (filtros.fazendaId) {
    query = query.eq("fazenda_id", filtros.fazendaId);
  }

  if (filtros.areaId) {
    query = query.eq("area_id", filtros.areaId);
  }

  if (filtros.calibreId) {
    query = query.eq("calibre_id", filtros.calibreId);
  }

  const { data, error } = await query;

  if (error) {
    throw tratarErroSupabase(error);
  }

  return (data || []).map((item) => ({
    ...item,
    classificado_caixas: numero(item.classificado_caixas),
    produto_final_caixas: numero(item.produto_final_caixas),
    produto_final_peso_kg: numero(item.produto_final_peso_kg),
    saldo_classificado_caixas: numero(item.saldo_classificado_caixas),
  }));
}

export async function listarOpcoesAlhoClassificado() {
  const [fazendasResult, areasResult, calibresResult, responsaveisResult] =
    await Promise.all([
      supabase.from("fazendas").select("*").order("nome", { ascending: true }),
      supabase.from("areas_fazenda").select("*").order("nome", { ascending: true }),
      supabase
        .from("calibres")
        .select("*")
        .order("ordem", { ascending: true })
        .order("codigo", { ascending: true }),
      supabase.from("responsaveis").select("*").order("nome", { ascending: true }),
    ]);

  if (fazendasResult.error) throw tratarErroSupabase(fazendasResult.error);
  if (areasResult.error) throw tratarErroSupabase(areasResult.error);
  if (calibresResult.error) throw tratarErroSupabase(calibresResult.error);
  if (responsaveisResult.error) throw tratarErroSupabase(responsaveisResult.error);

  return {
    fazendas: fazendasResult.data || [],
    areas: areasResult.data || [],
    calibres: calibresResult.data || [],
    responsaveis: responsaveisResult.data || [],
  };
}

function montarPayload(dados) {
  const quantidadePaletes = numero(dados.quantidade_paletes);
  const caixasPorPalete = numero(dados.caixas_por_palete);
  const permitirManual = Boolean(dados.permitir_edicao_total_caixas);
  const totalManual = permitirManual ? numero(dados.total_caixas_manual) : null;

  return {
    data_classificacao: dados.data_classificacao,
    hora: dados.hora,
    fazenda_id: dados.fazenda_id || null,
    area_fazenda_id: dados.area_fazenda_id || dados.area_id || null,
    lote: texto(dados.lote),
    calibre_id: dados.calibre_id || null,
    quantidade_paletes: permitirManual ? 0 : quantidadePaletes,
    caixas_por_palete: permitirManual ? 0 : caixasPorPalete,
    permitir_edicao_total_caixas: permitirManual,
    total_caixas_manual: totalManual,
    conferido: Boolean(dados.conferido),
    responsavel_id: dados.responsavel_id || null,
    observacao: texto(dados.observacao),
  };
}

function validarPayload(payload) {
  if (!payload.data_classificacao) {
    throw new Error("Informe a data da classificação.");
  }

  if (!payload.hora) {
    throw new Error("Informe a hora da classificação.");
  }

  if (!payload.fazenda_id) {
    throw new Error("Selecione a fazenda.");
  }

  if (!payload.area_fazenda_id) {
    throw new Error("Selecione a Área / Pivô.");
  }

  if (!payload.calibre_id) {
    throw new Error("Selecione o calibre.");
  }

  if (!payload.responsavel_id) {
    throw new Error("Selecione o responsável.");
  }

  if (payload.permitir_edicao_total_caixas) {
    if (numero(payload.total_caixas_manual) <= 0) {
      throw new Error("Informe um total manual de caixas maior que zero.");
    }

    return;
  }

  if (numero(payload.quantidade_paletes) <= 0) {
    throw new Error("Informe a quantidade de paletes.");
  }

  if (numero(payload.caixas_por_palete) <= 0) {
    throw new Error("Informe a quantidade de caixas por palete.");
  }
}

function removerColunasGeradas(payload) {
  const payloadSeguro = { ...payload };

  delete payloadSeguro.total_caixas;
  delete payloadSeguro.total_caixas_calculado;

  return payloadSeguro;
}

export async function cadastrarAlhoClassificado(dados) {
  const payload = montarPayload(dados);
  validarPayload(payload);

  const payloadSeguro = removerColunasGeradas(payload);

  const { data, error } = await supabase
    .from("alho_classificado")
    .insert(payloadSeguro)
    .select("*")
    .single();

  if (error) {
    throw tratarErroSupabase(error);
  }

  return data;
}

export async function editarAlhoClassificado(id, dados) {
  const payload = montarPayload(dados);
  validarPayload(payload);

  const payloadSeguro = removerColunasGeradas(payload);

  const { data, error } = await supabase
    .from("alho_classificado")
    .update(payloadSeguro)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw tratarErroSupabase(error);
  }

  return data;
}

export async function excluirAlhoClassificado(id) {
  const { error } = await supabase.from("alho_classificado").delete().eq("id", id);

  if (error) {
    throw tratarErroSupabase(error);
  }

  return true;
}

export function calcularResumoAlhoClassificado(registros = []) {
  const totalClassificacoes = registros.length;

  const totalPaletes = registros.reduce((total, item) => {
    return total + numero(item.quantidade_paletes);
  }, 0);

  const totalCaixas = registros.reduce((total, item) => {
    return total + calcularTotalCaixas(item);
  }, 0);

  return {
    totalClassificacoes,
    totalPaletes,
    totalCaixas,
  };
}

export const listarClassificacoes = listarAlhoClassificado;
export const cadastrarClassificacao = cadastrarAlhoClassificado;
export const editarClassificacao = editarAlhoClassificado;
export const excluirClassificacao = excluirAlhoClassificado;