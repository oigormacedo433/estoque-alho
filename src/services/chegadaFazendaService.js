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

function numero(valor) {
  const convertido = Number(valor);

  if (!Number.isFinite(convertido)) {
    return 0;
  }

  return convertido;
}

function formatarErroChegada(error) {
  const mensagem = error?.message || "";

  if (mensagem.includes("Área / Pivô")) {
    return mensagem;
  }

  if (mensagem.includes("area_fazenda_id")) {
    return "Selecione a Área / Pivô.";
  }

  return mensagemErroSupabase(error);
}

async function validarAreaAtiva(areaId) {
  if (!areaId) return;

  const { data, error } = await supabase
    .from("areas_fazenda")
    .select("id, ativo")
    .eq("id", areaId)
    .maybeSingle();

  if (error) {
    throw new Error(formatarErroChegada(error));
  }

  if (!data) {
    throw new Error("Área / Pivô não encontrada.");
  }

  if (!data.ativo) {
    throw new Error("Não é possível lançar em uma Área / Pivô inativa.");
  }
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
    data_recebimento: validarData(
      dados.data_recebimento,
      "Data de recebimento"
    ),

    hora: validarHora(dados.hora, "Hora"),

    fazenda_id: campoObrigatorio(dados.fazenda_id, "Fazenda"),

    area_fazenda_id: campoObrigatorio(
      dados.area_fazenda_id,
      "Área / Pivô"
    ),

    lote: dados.lote ? String(dados.lote).trim() : null,

    quantidade_caixas: quantidadeCaixas,

    media_peso_caixa_kg: mediaPesoCaixaKg,

    conferido: booleanPorSimNao(dados.conferido),

    responsavel_id: campoObrigatorio(dados.responsavel_id, "Responsável"),

    observacao: dados.observacao ? String(dados.observacao).trim() : null,
  };
}

function normalizarChegada(item) {
  if (!item) return item;

  const pesoTotalEstimado =
    item.peso_total_estimado_kg ??
    numero(item.quantidade_caixas) * numero(item.media_peso_caixa_kg);

  return {
    ...item,

    peso_total_estimado_kg: pesoTotalEstimado,

    fazenda_nome: item.fazendas?.nome || item.fazenda_nome || "-",

    area_nome:
      item.areas_fazenda?.nome ||
      item.area_nome ||
      item.area_fazenda_nome ||
      "-",

    area_fazenda_nome:
      item.areas_fazenda?.nome ||
      item.area_nome ||
      item.area_fazenda_nome ||
      "-",

    responsavel_nome:
      item.responsaveis?.nome || item.responsavel_nome || "-",
  };
}

export async function listarChegadasFazenda(filtros = {}) {
  let query = supabase
    .from("chegada_fazenda")
    .select(`
      *,
      fazendas:fazenda_id (
        id,
        nome
      ),
      areas_fazenda:area_fazenda_id (
        id,
        nome,
        ativo
      ),
      responsaveis:responsavel_id (
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

  if (filtros.areaFazendaId) {
    query = query.eq("area_fazenda_id", filtros.areaFazendaId);
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
    throw new Error(formatarErroChegada(error));
  }

  return (data || []).map(normalizarChegada);
}

export async function buscarChegadaFazendaPorId(id) {
  const { data, error } = await supabase
    .from("chegada_fazenda")
    .select(`
      *,
      fazendas:fazenda_id (
        id,
        nome
      ),
      areas_fazenda:area_fazenda_id (
        id,
        nome,
        ativo
      ),
      responsaveis:responsavel_id (
        id,
        nome
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(formatarErroChegada(error));
  }

  return normalizarChegada(data);
}

export async function cadastrarChegadaFazenda(dados) {
  try {
    await validarAreaAtiva(dados.area_fazenda_id);

    const payload = montarPayloadChegada(dados);

    const { data, error } = await supabase
      .from("chegada_fazenda")
      .insert(payload)
      .select(`
        *,
        fazendas:fazenda_id (
          id,
          nome
        ),
        areas_fazenda:area_fazenda_id (
          id,
          nome,
          ativo
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

    return normalizarChegada(data);
  } catch (error) {
    throw new Error(formatarErroChegada(error));
  }
}

export async function editarChegadaFazenda(id, dados) {
  try {
    await validarAreaAtiva(dados.area_fazenda_id);

    const payload = montarPayloadChegada(dados);

    const { data, error } = await supabase
      .from("chegada_fazenda")
      .update(payload)
      .eq("id", id)
      .select(`
        *,
        fazendas:fazenda_id (
          id,
          nome
        ),
        areas_fazenda:area_fazenda_id (
          id,
          nome,
          ativo
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

    return normalizarChegada(data);
  } catch (error) {
    throw new Error(formatarErroChegada(error));
  }
}

export async function excluirChegadaFazenda(id) {
  const { error } = await supabase
    .from("chegada_fazenda")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(formatarErroChegada(error));
  }

  return true;
}

export function calcularResumoChegadaFazenda(chegadas = []) {
  const totalRegistros = chegadas.length;

  const totalCaixas = chegadas.reduce(
    (total, item) => total + numero(item.quantidade_caixas),
    0
  );

  const pesoTotalEstimadoKg = chegadas.reduce(
    (total, item) => total + numero(item.peso_total_estimado_kg),
    0
  );

  const conferidos = chegadas.filter((item) => item.conferido).length;
  const pendentes = chegadas.filter((item) => !item.conferido).length;

  return {
    totalRegistros,
    totalCaixas,
    pesoTotalEstimadoKg,
    conferidos,
    pendentes,
  };
}

export function calcularChegadaPorFazenda(chegadas = []) {
  const mapa = new Map();

  chegadas.forEach((item) => {
    const fazendaId = item.fazenda_id || item.fazendas?.id || "sem-fazenda";
    const fazendaNome =
      item.fazendas?.nome || item.fazenda_nome || "Sem fazenda";

    if (!mapa.has(fazendaId)) {
      mapa.set(fazendaId, {
        fazenda_id: fazendaId,
        fazenda_nome: fazendaNome,
        quantidade_caixas: 0,
        peso_total_estimado_kg: 0,
        registros: 0,
      });
    }

    const atual = mapa.get(fazendaId);

    atual.quantidade_caixas += numero(item.quantidade_caixas);
    atual.peso_total_estimado_kg += numero(item.peso_total_estimado_kg);
    atual.registros += 1;
  });

  return Array.from(mapa.values()).sort((a, b) =>
    String(a.fazenda_nome).localeCompare(String(b.fazenda_nome))
  );
}

export function calcularChegadaPorArea(chegadas = []) {
  const mapa = new Map();

  chegadas.forEach((item) => {
    const areaId = item.area_fazenda_id || item.areas_fazenda?.id || "sem-area";
    const areaNome =
      item.areas_fazenda?.nome || item.area_nome || "Sem Área / Pivô";

    if (!mapa.has(areaId)) {
      mapa.set(areaId, {
        area_fazenda_id: areaId,
        area_nome: areaNome,
        quantidade_caixas: 0,
        peso_total_estimado_kg: 0,
        registros: 0,
      });
    }

    const atual = mapa.get(areaId);

    atual.quantidade_caixas += numero(item.quantidade_caixas);
    atual.peso_total_estimado_kg += numero(item.peso_total_estimado_kg);
    atual.registros += 1;
  });

  return Array.from(mapa.values()).sort((a, b) =>
    String(a.area_nome).localeCompare(String(b.area_nome))
  );
}

export const listarChegadaFazenda = listarChegadasFazenda;
export const listarChegadas = listarChegadasFazenda;
export const cadastrarChegada = cadastrarChegadaFazenda;
export const editarChegada = editarChegadaFazenda;
export const excluirChegada = excluirChegadaFazenda;
export const calcularResumoChegadas = calcularResumoChegadaFazenda;
export const calcularChegadaPorOrigem = calcularChegadaPorFazenda;