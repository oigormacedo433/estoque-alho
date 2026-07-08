import { supabase } from "./supabaseClient";

import {
  booleanPorSimNao,
  campoObrigatorio,
  inteiroMaiorQueZero,
  mensagemErroSupabase,
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

async function montarPayloadAlhoClassificado(dados) {
  await validarCalibreAtivo(dados.calibre_id);

  return {
    data_classificacao: validarData(
      dados.data_classificacao,
      "Data de classificação"
    ),
    hora: dados.hora ? validarHora(dados.hora, "Hora") : obterHoraAtual(),
    fazenda_id: campoObrigatorio(dados.fazenda_id, "Fazenda"),
    lote: dados.lote ? String(dados.lote).trim() : null,
    calibre_id: campoObrigatorio(dados.calibre_id, "Calibre"),
    quantidade_paletes: inteiroMaiorQueZero(
      dados.quantidade_paletes,
      "Quantidade de paletes"
    ),
    caixas_por_palete: inteiroMaiorQueZero(
      dados.caixas_por_palete,
      "Caixas por palete"
    ),
    conferido: booleanPorSimNao(dados.conferido),
    responsavel_id: campoObrigatorio(dados.responsavel_id, "Responsável"),
    observacao: dados.observacao ? String(dados.observacao).trim() : null,
  };
}

export async function listarAlhoClassificado(filtros = {}) {
  let query = supabase
    .from("alho_classificado")
    .select(`
      id,
      data_classificacao,
      hora,
      fazenda_id,
      lote,
      calibre_id,
      quantidade_paletes,
      caixas_por_palete,
      total_caixas,
      conferido,
      responsavel_id,
      observacao,
      criado_em,
      atualizado_em,
      fazendas (
        id,
        nome
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
    .order("data_classificacao", { ascending: false })
    .order("hora", { ascending: false });

  if (filtros.dataInicial) {
    query = query.gte("data_classificacao", filtros.dataInicial);
  }

  if (filtros.dataFinal) {
    query = query.lte("data_classificacao", filtros.dataFinal);
  }

  if (filtros.fazendaId) {
    query = query.eq("fazenda_id", filtros.fazendaId);
  }

  if (filtros.calibreId) {
    query = query.eq("calibre_id", filtros.calibreId);
  }

  if (filtros.responsavelId) {
    query = query.eq("responsavel_id", filtros.responsavelId);
  }

  if (filtros.lote) {
    query = query.ilike("lote", `%${filtros.lote}%`);
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

export async function buscarAlhoClassificadoPorId(id) {
  const { data, error } = await supabase
    .from("alho_classificado")
    .select(`
      id,
      data_classificacao,
      hora,
      fazenda_id,
      lote,
      calibre_id,
      quantidade_paletes,
      caixas_por_palete,
      total_caixas,
      conferido,
      responsavel_id,
      observacao,
      criado_em,
      atualizado_em,
      fazendas (
        id,
        nome
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

export async function cadastrarAlhoClassificado(dados) {
  try {
    const payload = await montarPayloadAlhoClassificado(dados);

    const { data, error } = await supabase
      .from("alho_classificado")
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

export async function editarAlhoClassificado(id, dados) {
  try {
    const payload = await montarPayloadAlhoClassificado(dados);

    const { data, error } = await supabase
      .from("alho_classificado")
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

export async function excluirAlhoClassificado(id) {
  const { error } = await supabase
    .from("alho_classificado")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  return true;
}

export function calcularResumoAlhoClassificado(registros = []) {
  const totalRegistros = registros.length;

  const totalPaletes = registros.reduce((total, item) => {
    return total + Number(item.quantidade_paletes || 0);
  }, 0);

  const totalCaixas = registros.reduce((total, item) => {
    return total + Number(item.total_caixas || 0);
  }, 0);

  const pendentes = registros.filter((item) => !item.conferido).length;

  const conferidos = registros.filter((item) => item.conferido).length;

  const calibres = new Set(
    registros.map((item) => item.calibres?.id || item.calibre_id).filter(Boolean)
  ).size;

  return {
    totalRegistros,
    totalPaletes,
    totalCaixas,
    pendentes,
    conferidos,
    calibres,
  };
}

export function calcularEstoqueClassificadoPorCalibre(registros = []) {
  const mapa = new Map();

  registros.forEach((item) => {
    const calibreId = item.calibres?.id || item.calibre_id;

    if (!calibreId) return;

    const atual = mapa.get(calibreId) || {
      calibre_id: calibreId,
      calibre_codigo: item.calibres?.codigo || "-",
      calibre_nome: item.calibres?.nome || "Sem calibre",
      calibre_ordem: item.calibres?.ordem || 999,
      total_paletes: 0,
      total_caixas: 0,
      registros: 0,
    };

    atual.total_paletes += Number(item.quantidade_paletes || 0);
    atual.total_caixas += Number(item.total_caixas || 0);
    atual.registros += 1;

    mapa.set(calibreId, atual);
  });

  return Array.from(mapa.values()).sort((a, b) => {
    return Number(a.calibre_ordem || 999) - Number(b.calibre_ordem || 999);
  });
}

export const listarClassificacoes = listarAlhoClassificado;