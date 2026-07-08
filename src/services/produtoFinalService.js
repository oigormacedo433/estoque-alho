import { supabase } from "./supabaseClient";

import {
  booleanPorSimNao,
  campoObrigatorio,
  inteiroMaiorQueZero,
  mensagemErroSupabase,
  numeroMaiorQueZero,
  validarData,
  validarHora,
} from "../utils/validacoes";

function obterHoraAtual() {
  return new Date().toTimeString().slice(0, 5);
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

async function montarPayloadProdutoFinal(dados) {
  await validarAreaAtiva(dados.area_id);
  await validarCalibreAtivo(dados.calibre_id);

  return {
    data_registro: validarData(dados.data_registro, "Data do lançamento"),
    hora: dados.hora ? validarHora(dados.hora, "Hora") : obterHoraAtual(),
    area_id: campoObrigatorio(dados.area_id, "Área / Pivô"),
    calibre_id: campoObrigatorio(dados.calibre_id, "Calibre"),
    quantidade_caixas: inteiroMaiorQueZero(
      dados.quantidade_caixas,
      "Quantidade de caixas"
    ),
    peso_por_caixa_kg: numeroMaiorQueZero(
      dados.peso_por_caixa_kg,
      "Peso por caixa"
    ),
    conferido: booleanPorSimNao(dados.conferido),
    responsavel_id: campoObrigatorio(dados.responsavel_id, "Responsável"),
    observacao: dados.observacao ? String(dados.observacao).trim() : null,
  };
}

export async function listarProdutoFinal(filtros = {}) {
  let query = supabase
    .from("produto_final")
    .select(`
      id,
      data_registro,
      hora,
      area_id,
      calibre_id,
      quantidade_caixas,
      peso_por_caixa_kg,
      peso_total_kg,
      conferido,
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
    .order("data_registro", { ascending: false })
    .order("hora", { ascending: false });

  if (filtros.dataInicial) {
    query = query.gte("data_registro", filtros.dataInicial);
  }

  if (filtros.dataFinal) {
    query = query.lte("data_registro", filtros.dataFinal);
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

  if (filtros.conferido === "sim") {
    query = query.eq("conferido", true);
  }

  if (filtros.conferido === "nao") {
    query = query.eq("conferido", false);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  return data || [];
}

export async function listarSaldoProdutoFinalAtual() {
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
    .order("calibre_codigo", { ascending: true });

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  return data || [];
}

export async function buscarProdutoFinalPorId(id) {
  const { data, error } = await supabase
    .from("produto_final")
    .select(`
      id,
      data_registro,
      hora,
      area_id,
      calibre_id,
      quantidade_caixas,
      peso_por_caixa_kg,
      peso_total_kg,
      conferido,
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
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  return data;
}

export async function cadastrarProdutoFinal(dados) {
  try {
    const payload = await montarPayloadProdutoFinal(dados);

    const { data, error } = await supabase
      .from("produto_final")
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

export async function editarProdutoFinal(id, dados) {
  try {
    const payload = await montarPayloadProdutoFinal(dados);

    const { data, error } = await supabase
      .from("produto_final")
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

export async function excluirProdutoFinal(id) {
  const { error } = await supabase
    .from("produto_final")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  return true;
}

export function calcularResumoProdutoFinal(registros = []) {
  const totalRegistros = registros.length;

  const totalCaixas = registros.reduce((total, item) => {
    return total + Number(item.quantidade_caixas || 0);
  }, 0);

  const pesoTotalKg = registros.reduce((total, item) => {
    return total + Number(item.peso_total_kg || 0);
  }, 0);

  const pendentes = registros.filter((item) => !item.conferido).length;

  const conferidos = registros.filter((item) => item.conferido).length;

  const calibresComProdutoFinal = new Set(
    registros.map((item) => item.calibres?.id || item.calibre_id).filter(Boolean)
  ).size;

  const areasComProdutoFinal = new Set(
    registros.map((item) => item.areas_fazenda?.id || item.area_id).filter(Boolean)
  ).size;

  return {
    totalRegistros,
    totalCaixas,
    pesoTotalKg,
    pendentes,
    conferidos,
    calibresComProdutoFinal,
    areasComProdutoFinal,
  };
}

export function calcularProdutoFinalPorCalibre(registros = []) {
  const mapa = new Map();

  registros.forEach((item) => {
    const calibreId = item.calibres?.id || item.calibre_id;

    if (!calibreId) return;

    const atual = mapa.get(calibreId) || {
      calibre_id: calibreId,
      calibre_codigo: item.calibres?.codigo || "-",
      calibre_nome: item.calibres?.nome || "Sem calibre",
      calibre_ordem: item.calibres?.ordem || 999,
      total_caixas: 0,
      peso_total_kg: 0,
      registros: 0,
    };

    atual.total_caixas += Number(item.quantidade_caixas || 0);
    atual.peso_total_kg += Number(item.peso_total_kg || 0);
    atual.registros += 1;

    mapa.set(calibreId, atual);
  });

  return Array.from(mapa.values()).sort((a, b) => {
    return Number(a.calibre_ordem || 999) - Number(b.calibre_ordem || 999);
  });
}

export function calcularProdutoFinalPorArea(registros = []) {
  const mapa = new Map();

  registros.forEach((item) => {
    const areaId = item.areas_fazenda?.id || item.area_id || "sem_area";

    const atual = mapa.get(areaId) || {
      area_id: areaId,
      area_nome: item.areas_fazenda?.nome || "Sem área",
      total_caixas: 0,
      peso_total_kg: 0,
      registros: 0,
    };

    atual.total_caixas += Number(item.quantidade_caixas || 0);
    atual.peso_total_kg += Number(item.peso_total_kg || 0);
    atual.registros += 1;

    mapa.set(areaId, atual);
  });

  return Array.from(mapa.values()).sort((a, b) => {
    return b.total_caixas - a.total_caixas;
  });
}