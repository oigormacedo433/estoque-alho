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

function montarPayloadChegada(dados) {
  const quantidadeCaixas = inteiroMaiorQueZero(
    dados.quantidade_caixas,
    "Quantidade de caixas"
  );

  const mediaPesoCaixaKg = numeroMaiorQueZero(
    dados.media_peso_caixa_kg,
    "Peso médio por caixa"
  );

  return {
    data_recebimento: validarData(dados.data_recebimento, "Data de recebimento"),
    hora: dados.hora ? validarHora(dados.hora, "Hora") : obterHoraAtual(),
    fazenda_id: campoObrigatorio(dados.fazenda_id, "Fazenda"),
    lote: dados.lote ? String(dados.lote).trim() : null,
    quantidade_caixas: quantidadeCaixas,
    media_peso_caixa_kg: mediaPesoCaixaKg,
    conferido: booleanPorSimNao(dados.conferido),
    responsavel_id: campoObrigatorio(dados.responsavel_id, "Responsável"),
    observacao: dados.observacao ? String(dados.observacao).trim() : null,
  };
}

export async function listarChegadasFazenda(filtros = {}) {
  let query = supabase
    .from("chegada_fazenda")
    .select(`
      id,
      data_recebimento,
      hora,
      fazenda_id,
      lote,
      quantidade_caixas,
      media_peso_caixa_kg,
      peso_total_estimado_kg,
      conferido,
      responsavel_id,
      observacao,
      criado_em,
      atualizado_em,
      fazendas (
        id,
        nome
      ),
      responsaveis (
        id,
        nome
      )
    `)
    .order("data_recebimento", { ascending: false })
    .order("hora", { ascending: false });

  if (filtros.dataInicial) {
    query = query.gte("data_recebimento", filtros.dataInicial);
  }

  if (filtros.dataFinal) {
    query = query.lte("data_recebimento", filtros.dataFinal);
  }

  if (filtros.fazendaId) {
    query = query.eq("fazenda_id", filtros.fazendaId);
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

export async function buscarChegadaFazendaPorId(id) {
  const { data, error } = await supabase
    .from("chegada_fazenda")
    .select(`
      id,
      data_recebimento,
      hora,
      fazenda_id,
      lote,
      quantidade_caixas,
      media_peso_caixa_kg,
      peso_total_estimado_kg,
      conferido,
      responsavel_id,
      observacao,
      criado_em,
      atualizado_em,
      fazendas (
        id,
        nome
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

export async function cadastrarChegadaFazenda(dados) {
  try {
    const payload = montarPayloadChegada(dados);

    const { data, error } = await supabase
      .from("chegada_fazenda")
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

export async function editarChegadaFazenda(id, dados) {
  try {
    const payload = montarPayloadChegada(dados);

    const { data, error } = await supabase
      .from("chegada_fazenda")
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

export async function excluirChegadaFazenda(id) {
  const { error } = await supabase
    .from("chegada_fazenda")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  return true;
}

export function calcularResumoChegadaFazenda(registros = []) {
  const totalRegistros = registros.length;

  const totalCaixas = registros.reduce((total, item) => {
    return total + Number(item.quantidade_caixas || 0);
  }, 0);

  const pesoEstimadoKg = registros.reduce((total, item) => {
    return total + Number(item.peso_total_estimado_kg || 0);
  }, 0);

  const pendentes = registros.filter((item) => !item.conferido).length;

  const conferidos = registros.filter((item) => item.conferido).length;

  return {
    totalRegistros,
    totalCaixas,
    pesoEstimadoKg,
    pendentes,
    conferidos,
  };
}

export function calcularChegadaPorFazenda(registros = []) {
  const mapa = new Map();

  registros.forEach((item) => {
    const fazendaId = item.fazendas?.id || item.fazenda_id || "sem_fazenda";

    const atual = mapa.get(fazendaId) || {
      fazenda_id: fazendaId,
      fazenda_nome: item.fazendas?.nome || "Sem fazenda",
      total_caixas: 0,
      peso_estimado_kg: 0,
      registros: 0,
    };

    atual.total_caixas += Number(item.quantidade_caixas || 0);
    atual.peso_estimado_kg += Number(item.peso_total_estimado_kg || 0);
    atual.registros += 1;

    mapa.set(fazendaId, atual);
  });

  return Array.from(mapa.values()).sort((a, b) => {
    return b.total_caixas - a.total_caixas;
  });
}

export const listarChegadaFazenda = listarChegadasFazenda;
export const listarChegadas = listarChegadasFazenda;
export const calcularResumoChegadas = calcularResumoChegadaFazenda;