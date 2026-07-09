import { supabase } from "./supabaseClient";

import {
  campoObrigatorio,
  inteiroMaiorQueZero,
  mensagemErroSupabase,
  validarData,
  validarHora,
} from "../utils/validacoes";

function numero(valor) {
  const convertido = Number(valor);

  if (!Number.isFinite(convertido)) {
    return 0;
  }

  return convertido;
}

function booleano(valor) {
  return (
    valor === true ||
    valor === "true" ||
    valor === "sim" ||
    valor === 1 ||
    valor === "1"
  );
}

function calcularTotalAutomatico(dados) {
  return numero(dados.quantidade_paletes) * numero(dados.caixas_por_palete);
}

function obterTotalCaixasFinal(item) {
  const usaManual = booleano(item?.permitir_edicao_total_caixas);
  const totalManual = numero(item?.total_caixas_manual);
  const totalAutomatico = numero(item?.total_caixas);

  if (usaManual && totalManual > 0) {
    return totalManual;
  }

  return totalAutomatico;
}

function normalizarClassificacao(item) {
  if (!item) return item;

  const totalAutomatico = numero(item.total_caixas);
  const totalFinal = obterTotalCaixasFinal(item);

  return {
    ...item,

    total_caixas_calculado: totalAutomatico,
    total_caixas_original: totalAutomatico,

    // Mantém compatibilidade com páginas antigas.
    // Quem usa total_caixas agora recebe o total final correto.
    total_caixas: totalFinal,
    total_caixas_final: totalFinal,

    total_manual_ativo: booleano(item.permitir_edicao_total_caixas),
  };
}

async function validarCalibreAtivo(calibreId) {
  if (!calibreId) return;

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
    throw new Error("Não é possível lançar com calibre inativo.");
  }
}

function montarPayloadAlhoClassificado(dados) {
  const quantidadePaletes = inteiroMaiorQueZero(
    dados.quantidade_paletes,
    "Quantidade de paletes"
  );

  const caixasPorPalete = inteiroMaiorQueZero(
    dados.caixas_por_palete,
    "Caixas por palete"
  );

  const permitirEdicaoManual = booleano(dados.permitir_edicao_total_caixas);

  let totalManual = null;

  if (permitirEdicaoManual) {
    totalManual = inteiroMaiorQueZero(
      dados.total_caixas_manual,
      "Total de caixas manual"
    );
  }

  return {
    data_classificacao: validarData(
      dados.data_classificacao,
      "Data de classificação"
    ),

    hora: validarHora(dados.hora, "Hora"),

    fazenda_id: campoObrigatorio(dados.fazenda_id, "Fazenda"),

    lote: dados.lote ? String(dados.lote).trim() : null,

    calibre_id: campoObrigatorio(dados.calibre_id, "Calibre"),

    quantidade_paletes: quantidadePaletes,

    caixas_por_palete: caixasPorPalete,

    permitir_edicao_total_caixas: permitirEdicaoManual,

    total_caixas_manual: permitirEdicaoManual ? totalManual : null,

    responsavel_id: campoObrigatorio(dados.responsavel_id, "Responsável"),

    conferido: booleano(dados.conferido),

    observacao: dados.observacao ? String(dados.observacao).trim() : null,
  };
}

export async function listarAlhoClassificado(filtros = {}) {
  let query = supabase
    .from("alho_classificado")
    .select(`
      *,
      fazendas:fazenda_id (
        id,
        nome
      ),
      calibres:calibre_id (
        id,
        codigo,
        nome,
        tipo
      ),
      responsaveis:responsavel_id (
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

  const { data, error } = await query;

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  return (data || []).map(normalizarClassificacao);
}

export async function buscarAlhoClassificadoPorId(id) {
  const { data, error } = await supabase
    .from("alho_classificado")
    .select(`
      *,
      fazendas:fazenda_id (
        id,
        nome
      ),
      calibres:calibre_id (
        id,
        codigo,
        nome,
        tipo
      ),
      responsaveis:responsavel_id (
        id,
        nome
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  return normalizarClassificacao(data);
}

export async function cadastrarAlhoClassificado(dados) {
  try {
    await validarCalibreAtivo(dados.calibre_id);

    const payload = montarPayloadAlhoClassificado(dados);

    const { data, error } = await supabase
      .from("alho_classificado")
      .insert(payload)
      .select(`
        *,
        fazendas:fazenda_id (
          id,
          nome
        ),
        calibres:calibre_id (
          id,
          codigo,
          nome,
          tipo
        ),
        responsaveis:responsavel_id (
          id,
          nome
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    return normalizarClassificacao(data);
  } catch (error) {
    throw new Error(mensagemErroSupabase(error));
  }
}

export async function editarAlhoClassificado(id, dados) {
  try {
    await validarCalibreAtivo(dados.calibre_id);

    const payload = montarPayloadAlhoClassificado(dados);

    const { data, error } = await supabase
      .from("alho_classificado")
      .update(payload)
      .eq("id", id)
      .select(`
        *,
        fazendas:fazenda_id (
          id,
          nome
        ),
        calibres:calibre_id (
          id,
          codigo,
          nome,
          tipo
        ),
        responsaveis:responsavel_id (
          id,
          nome
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    return normalizarClassificacao(data);
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

export function calcularResumoAlhoClassificado(classificacoes = []) {
  const totalPaletes = classificacoes.reduce(
    (total, item) => total + numero(item.quantidade_paletes),
    0
  );

  const totalCaixas = classificacoes.reduce(
    (total, item) => total + obterTotalCaixasFinal(item),
    0
  );

  const totalRegistros = classificacoes.length;

  const calibres = new Set(
    classificacoes
      .map((item) => item.calibre_id)
      .filter(Boolean)
  );

  return {
    totalRegistros,
    totalPaletes,
    totalCaixas,
    calibresClassificados: calibres.size,
  };
}

export function calcularEstoqueClassificadoPorCalibre(classificacoes = []) {
  const mapa = new Map();

  classificacoes.forEach((item) => {
    const calibreId = item.calibre_id || item.calibres?.id || "sem-calibre";

    const calibreCodigo = item.calibres?.codigo || "-";
    const calibreNome = item.calibres?.nome || "Sem calibre";

    if (!mapa.has(calibreId)) {
      mapa.set(calibreId, {
        calibre_id: calibreId,
        calibre_codigo: calibreCodigo,
        calibre_nome: calibreNome,
        calibre: `${calibreCodigo} — ${calibreNome}`,
        quantidade_paletes: 0,
        total_caixas: 0,
        total_caixas_final: 0,
        registros: 0,
      });
    }

    const atual = mapa.get(calibreId);

    atual.quantidade_paletes += numero(item.quantidade_paletes);
    atual.total_caixas += obterTotalCaixasFinal(item);
    atual.total_caixas_final += obterTotalCaixasFinal(item);
    atual.registros += 1;
  });

  return Array.from(mapa.values()).sort((a, b) =>
    String(a.calibre_codigo).localeCompare(String(b.calibre_codigo))
  );
}

export const listarClassificacoes = listarAlhoClassificado;
export const listarEstoqueClassificado = listarAlhoClassificado;
export const cadastrarClassificacao = cadastrarAlhoClassificado;
export const editarClassificacao = editarAlhoClassificado;
export const excluirClassificacao = excluirAlhoClassificado;
export const calcularResumoClassificacoes = calcularResumoAlhoClassificado;
export const calcularClassificacaoPorCalibre =
  calcularEstoqueClassificadoPorCalibre;