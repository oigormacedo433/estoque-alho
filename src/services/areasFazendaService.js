import { supabase } from "./supabaseClient";

function tratarErroArea(error) {
  const mensagem = error?.message || "";

  if (error?.code === "23505" || mensagem.includes("duplicate key")) {
    return "Já existe uma Área / Pivô com esse nome.";
  }

  if (error?.code === "23503" || mensagem.includes("foreign key")) {
    return "Esta Área / Pivô já foi usada em lançamentos. Inative em vez de excluir.";
  }

  return mensagem || "Não foi possível processar a Área / Pivô.";
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

function montarPayloadArea(dados) {
  const nome = String(dados.nome || "").trim();

  if (!nome) {
    throw new Error("Informe o nome da Área / Pivô.");
  }

  return {
    nome,
    ativo: booleano(dados.ativo),
    observacao: dados.observacao ? String(dados.observacao).trim() : null,
  };
}

export async function listarAreasFazenda(filtros = {}) {
  let query = supabase
    .from("areas_fazenda")
    .select("*")
    .order("nome", { ascending: true });

  if (filtros.apenasAtivas || filtros.ativo === true) {
    query = query.eq("ativo", true);
  }

  if (filtros.ativo === false) {
    query = query.eq("ativo", false);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(tratarErroArea(error));
  }

  return data || [];
}

export async function listarAreasFazendaAtivas() {
  return listarAreasFazenda({ apenasAtivas: true });
}

export async function buscarAreaFazendaPorId(id) {
  const { data, error } = await supabase
    .from("areas_fazenda")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(tratarErroArea(error));
  }

  return data;
}

export async function cadastrarAreaFazenda(dados) {
  try {
    const payload = montarPayloadArea(dados);

    const { data, error } = await supabase
      .from("areas_fazenda")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw new Error(tratarErroArea(error));
  }
}

export async function editarAreaFazenda(id, dados) {
  try {
    const payload = montarPayloadArea(dados);

    const { data, error } = await supabase
      .from("areas_fazenda")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw new Error(tratarErroArea(error));
  }
}

export async function excluirAreaFazenda(id) {
  const { error } = await supabase.from("areas_fazenda").delete().eq("id", id);

  if (error) {
    throw new Error(tratarErroArea(error));
  }

  return true;
}

export async function inativarAreaFazenda(id) {
  const { data, error } = await supabase
    .from("areas_fazenda")
    .update({ ativo: false })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(tratarErroArea(error));
  }

  return data;
}

export function calcularResumoAreasFazenda(areas = []) {
  return {
    total: areas.length,
    ativas: areas.filter((item) => item.ativo).length,
    inativas: areas.filter((item) => !item.ativo).length,
  };
}

export const listarAreasAtivas = listarAreasFazendaAtivas;
export const listarAreas = listarAreasFazenda;
export const cadastrarArea = cadastrarAreaFazenda;
export const editarArea = editarAreaFazenda;
export const excluirArea = excluirAreaFazenda;