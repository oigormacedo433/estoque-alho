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

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function horaAtual() {
  return new Date().toTimeString().slice(0, 5);
}

function tratarErroSupabase(error) {
  return new Error(error?.message || "Erro ao acessar produto final.");
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

function obterAreaId(item) {
  return item?.area_id || item?.area_fazenda_id || "";
}

function obterDataProdutoFinal(dados) {
  return (
    dados.data_producao ||
    dados.data_produto_final ||
    dados.data_finalizacao ||
    dados.data ||
    hojeISO()
  );
}

function normalizarProdutoFinal(item, relacionamentos) {
  const areaId = obterAreaId(item);

  const area =
    relacionamentos.areas.find((areaItem) => areaItem.id === areaId) || null;

  const calibre =
    relacionamentos.calibres.find((calibreItem) => {
      return calibreItem.id === item.calibre_id;
    }) || null;

  const responsavel =
    relacionamentos.responsaveis.find((responsavelItem) => {
      return responsavelItem.id === item.responsavel_id;
    }) || null;

  const quantidadeCaixas = numero(item.quantidade_caixas);
  const pesoPorCaixa = numero(item.peso_por_caixa_kg);
  const pesoTotal = numero(item.peso_total_kg) || quantidadeCaixas * pesoPorCaixa;

  return {
    ...item,

    data_producao: item.data_producao || item.data_produto_final || item.data || "",
    hora: item.hora || "",

    area_id: areaId,
    area_fazenda_id: areaId,
    area_nome: area?.nome || "-",
    areas_fazenda: area,

    calibre_codigo: calibre?.codigo || "-",
    calibre_nome: calibre?.nome || "-",
    calibre_ordem: numero(calibre?.ordem),

    calibres: calibre,

    responsavel_nome: responsavel?.nome || "-",
    responsaveis: responsavel,

    quantidade_caixas: quantidadeCaixas,
    peso_por_caixa_kg: pesoPorCaixa,
    peso_total_kg: pesoTotal,
  };
}

export async function listarProdutoFinal(filtros = {}) {
  const { data, error } = await supabase
    .from("produto_final")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw tratarErroSupabase(error);
  }

  const registros = data || [];

  const areaIds = registros.map((item) => obterAreaId(item)).filter(Boolean);
  const calibreIds = registros.map((item) => item.calibre_id).filter(Boolean);
  const responsavelIds = registros
    .map((item) => item.responsavel_id)
    .filter(Boolean);

  const [areas, calibres, responsaveis] = await Promise.all([
    buscarPorIds("areas_fazenda", areaIds, "id, nome, fazenda_id, ativo"),
    buscarPorIds("calibres", calibreIds, "id, codigo, nome, tipo, ordem, ativo"),
    buscarPorIds("responsaveis", responsavelIds, "id, nome, ativo"),
  ]);

  let lista = registros.map((item) =>
    normalizarProdutoFinal(item, {
      areas,
      calibres,
      responsaveis,
    })
  );

  if (filtros.dataInicial) {
    lista = lista.filter((item) => item.data_producao >= filtros.dataInicial);
  }

  if (filtros.dataFinal) {
    lista = lista.filter((item) => item.data_producao <= filtros.dataFinal);
  }

  if (filtros.areaId || filtros.area_id) {
    const areaId = filtros.areaId || filtros.area_id;
    lista = lista.filter((item) => item.area_id === areaId);
  }

  if (filtros.calibreId || filtros.calibre_id) {
    const calibreId = filtros.calibreId || filtros.calibre_id;
    lista = lista.filter((item) => item.calibre_id === calibreId);
  }

  if (filtros.responsavelId || filtros.responsavel_id) {
    const responsavelId = filtros.responsavelId || filtros.responsavel_id;
    lista = lista.filter((item) => item.responsavel_id === responsavelId);
  }

  return lista;
}

export async function listarEstoqueClassificadoDisponivelProdutoFinal(filtros = {}) {
  let query = supabase
    .from("vw_estoque_alho_classificado_atual")
    .select("*")
    .gt("saldo_classificado_caixas", 0)
    .order("area_nome", { ascending: true })
    .order("calibre_ordem", { ascending: true })
    .order("calibre_codigo", { ascending: true });

  if (filtros.areaId || filtros.area_id) {
    query = query.eq("area_id", filtros.areaId || filtros.area_id);
  }

  if (filtros.calibreId || filtros.calibre_id) {
    query = query.eq("calibre_id", filtros.calibreId || filtros.calibre_id);
  }

  const { data, error } = await query;

  if (error) {
    throw tratarErroSupabase(error);
  }

  return (data || []).map((item) => ({
    ...item,
    area_id: item.area_id || item.area_fazenda_id || "",
    area_fazenda_id: item.area_fazenda_id || item.area_id || "",
    classificado_caixas: numero(item.classificado_caixas),
    produto_final_caixas: numero(item.produto_final_caixas),
    produto_final_peso_kg: numero(item.produto_final_peso_kg),
    saldo_classificado_caixas: numero(item.saldo_classificado_caixas),
  }));
}

async function buscarProdutoFinalPorId(id) {
  if (!id) {
    return null;
  }

  const { data, error } = await supabase
    .from("produto_final")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw tratarErroSupabase(error);
  }

  return data || null;
}

async function buscarSaldoClassificado(areaId, calibreId) {
  const { data, error } = await supabase
    .from("vw_estoque_alho_classificado_atual")
    .select("*")
    .eq("area_id", areaId)
    .eq("calibre_id", calibreId)
    .maybeSingle();

  if (error) {
    throw tratarErroSupabase(error);
  }

  if (!data) {
    return {
      saldo_classificado_caixas: 0,
      classificado_caixas: 0,
      produto_final_caixas: 0,
      area_nome: "-",
      calibre_codigo: "-",
      calibre_nome: "-",
    };
  }

  return {
    ...data,
    saldo_classificado_caixas: numero(data.saldo_classificado_caixas),
    classificado_caixas: numero(data.classificado_caixas),
    produto_final_caixas: numero(data.produto_final_caixas),
  };
}

function montarPayload(dados) {
  const areaId = dados.area_id || dados.area_fazenda_id || "";
  const quantidadeCaixas = numero(
    dados.quantidade_caixas || dados.total_caixas || dados.caixas
  );
  const pesoPorCaixa = numero(dados.peso_por_caixa_kg || dados.peso_caixa_kg || 10);

  return {
    data_producao: obterDataProdutoFinal(dados),
    hora: dados.hora || horaAtual(),
    area_id: areaId || null,
    calibre_id: dados.calibre_id || null,
    quantidade_caixas: quantidadeCaixas,
    peso_por_caixa_kg: pesoPorCaixa,
    responsavel_id: dados.responsavel_id || null,
    observacao: texto(dados.observacao),
  };
}

function removerColunasGeradas(payload) {
  const payloadSeguro = { ...payload };

  delete payloadSeguro.peso_total_kg;
  delete payloadSeguro.created_at;
  delete payloadSeguro.updated_at;

  return payloadSeguro;
}

function validarPayloadBasico(payload) {
  if (!payload.data_producao) {
    throw new Error("Informe a data do produto final.");
  }

  if (!payload.hora) {
    throw new Error("Informe a hora do produto final.");
  }

  if (!payload.area_id) {
    throw new Error("Selecione a Área / Pivô.");
  }

  if (!payload.calibre_id) {
    throw new Error("Selecione o calibre.");
  }

  if (numero(payload.quantidade_caixas) <= 0) {
    throw new Error("Informe uma quantidade de caixas maior que zero.");
  }

  if (numero(payload.peso_por_caixa_kg) <= 0) {
    throw new Error("Informe um peso por caixa maior que zero.");
  }
}

async function validarEstoqueClassificadoAntesDeSalvar(payload, idEdicao = null) {
  validarPayloadBasico(payload);

  const saldo = await buscarSaldoClassificado(payload.area_id, payload.calibre_id);

  let devolucaoEdicao = 0;

  if (idEdicao) {
    const registroAntigo = await buscarProdutoFinalPorId(idEdicao);

    const mesmaArea = obterAreaId(registroAntigo) === payload.area_id;
    const mesmoCalibre = registroAntigo?.calibre_id === payload.calibre_id;

    if (registroAntigo && mesmaArea && mesmoCalibre) {
      devolucaoEdicao = numero(registroAntigo.quantidade_caixas);
    }
  }

  const saldoDisponivelReal =
    numero(saldo.saldo_classificado_caixas) + devolucaoEdicao;

  if (saldoDisponivelReal <= 0) {
    throw new Error(
      "Não existe saldo de alho classificado para este calibre nesta área. Classifique o alho antes de lançar no produto final."
    );
  }

  if (numero(payload.quantidade_caixas) > saldoDisponivelReal) {
    throw new Error(
      `Estoque classificado insuficiente. Disponível: ${saldoDisponivelReal.toLocaleString(
        "pt-BR"
      )} caixas.`
    );
  }

  return true;
}

export async function cadastrarProdutoFinal(dados) {
  const payload = removerColunasGeradas(montarPayload(dados));

  await validarEstoqueClassificadoAntesDeSalvar(payload);

  const { data, error } = await supabase
    .from("produto_final")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw tratarErroSupabase(error);
  }

  return data;
}

export async function editarProdutoFinal(id, dados) {
  const payload = removerColunasGeradas(montarPayload(dados));

  await validarEstoqueClassificadoAntesDeSalvar(payload, id);

  const { data, error } = await supabase
    .from("produto_final")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw tratarErroSupabase(error);
  }

  return data;
}

export async function excluirProdutoFinal(id) {
  const { error } = await supabase.from("produto_final").delete().eq("id", id);

  if (error) {
    throw tratarErroSupabase(error);
  }

  return true;
}

export function calcularResumoProdutoFinal(registros = []) {
  const totalRegistros = registros.length;

  const totalCaixas = registros.reduce((total, item) => {
    return total + numero(item.quantidade_caixas);
  }, 0);

  const pesoTotalKg = registros.reduce((total, item) => {
    const pesoTotal =
      numero(item.peso_total_kg) ||
      numero(item.quantidade_caixas) * numero(item.peso_por_caixa_kg);

    return total + pesoTotal;
  }, 0);

  const areas = new Set();
  const calibres = new Set();

  registros.forEach((item) => {
    if (item.area_id) areas.add(item.area_id);
    if (item.calibre_id) calibres.add(item.calibre_id);
  });

  return {
    totalRegistros,
    totalCaixas,
    pesoTotalKg,
    areasComProduto: areas.size,
    calibresComProduto: calibres.size,
  };
}

export function calcularProdutoFinalPorArea(registros = []) {
  const mapa = new Map();

  registros.forEach((item) => {
    const areaId = item.area_id || item.area_fazenda_id || "sem-area";
    const areaNome = item.area_nome || item.areas_fazenda?.nome || "Sem área";

    const pesoTotal =
      numero(item.peso_total_kg) ||
      numero(item.quantidade_caixas) * numero(item.peso_por_caixa_kg);

    const atual = mapa.get(areaId) || {
      area_id: areaId,
      area_fazenda_id: areaId,
      area_nome: areaNome,
      quantidade_caixas: 0,
      total_caixas: 0,
      peso_total_kg: 0,
      registros: 0,
    };

    atual.quantidade_caixas += numero(item.quantidade_caixas);
    atual.total_caixas += numero(item.quantidade_caixas);
    atual.peso_total_kg += pesoTotal;
    atual.registros += 1;

    mapa.set(areaId, atual);
  });

  return Array.from(mapa.values()).sort((a, b) =>
    String(a.area_nome).localeCompare(String(b.area_nome), "pt-BR")
  );
}

export function calcularProdutoFinalPorCalibre(registros = []) {
  const mapa = new Map();

  registros.forEach((item) => {
    const calibreId = item.calibre_id || "sem-calibre";
    const calibreCodigo = item.calibre_codigo || item.calibres?.codigo || "-";
    const calibreNome = item.calibre_nome || item.calibres?.nome || "Sem calibre";
    const calibreOrdem = numero(item.calibre_ordem || item.calibres?.ordem);

    const pesoTotal =
      numero(item.peso_total_kg) ||
      numero(item.quantidade_caixas) * numero(item.peso_por_caixa_kg);

    const atual = mapa.get(calibreId) || {
      calibre_id: calibreId,
      calibre_codigo: calibreCodigo,
      calibre_nome: calibreNome,
      calibre_ordem: calibreOrdem,
      quantidade_caixas: 0,
      total_caixas: 0,
      peso_total_kg: 0,
      registros: 0,
    };

    atual.quantidade_caixas += numero(item.quantidade_caixas);
    atual.total_caixas += numero(item.quantidade_caixas);
    atual.peso_total_kg += pesoTotal;
    atual.registros += 1;

    mapa.set(calibreId, atual);
  });

  return Array.from(mapa.values()).sort((a, b) => {
    if (a.calibre_ordem !== b.calibre_ordem) {
      return a.calibre_ordem - b.calibre_ordem;
    }

    return String(a.calibre_codigo).localeCompare(String(b.calibre_codigo), "pt-BR");
  });
}

export function calcularResumoConsultaProdutoFinal(registros = []) {
  return calcularResumoProdutoFinal(registros);
}

export const listarProdutosFinais = listarProdutoFinal;
export const listarProdutoFinais = listarProdutoFinal;
export const listarProdutoFinalPorArea = calcularProdutoFinalPorArea;

export const cadastrarProdutosFinais = cadastrarProdutoFinal;
export const cadastrarProdutoFinais = cadastrarProdutoFinal;

export const editarProdutosFinais = editarProdutoFinal;
export const editarProdutoFinais = editarProdutoFinal;

export const excluirProdutosFinais = excluirProdutoFinal;
export const excluirProdutoFinais = excluirProdutoFinal;