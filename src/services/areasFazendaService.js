import { supabase } from "./supabaseClient";

function tratarErro(error) {
  const mensagem = error?.message || "";

  if (mensagem.includes("Área / Pivô inativa")) {
    return "Não é permitido usar Área / Pivô inativa.";
  }

  if (mensagem.includes("duplicate key")) {
    return "Já existe uma Área / Pivô com esse nome.";
  }

  return mensagem || "Não foi possível concluir a operação.";
}

function validarPayload(dados) {
  if (!dados.nome || String(dados.nome).trim() === "") {
    throw new Error("Informe o nome da Área / Pivô.");
  }

  return {
    nome: String(dados.nome).trim(),
    descricao: dados.descricao ? String(dados.descricao).trim() : null,
    ativo: dados.ativo === undefined ? true : Boolean(dados.ativo),
  };
}

export async function listarAreasFazenda(filtros = {}) {
  let query = supabase
    .from("areas_fazenda")
    .select(`
      id,
      nome,
      descricao,
      ativo,
      criado_em,
      atualizado_em
    `)
    .order("nome", { ascending: true });

  if (filtros.ativo === true || filtros.ativo === "sim") {
    query = query.eq("ativo", true);
  }

  if (filtros.ativo === false || filtros.ativo === "nao") {
    query = query.eq("ativo", false);
  }

  if (filtros.busca) {
    query = query.ilike("nome", `%${filtros.busca}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(tratarErro(error));
  }

  return data || [];
}

export async function listarAreasAtivas() {
  return listarAreasFazenda({ ativo: true });
}

export async function listarAreasAtivasPorFazenda() {
  return listarAreasAtivas();
}

export async function cadastrarAreaFazenda(dados) {
  try {
    const payload = validarPayload(dados);

    const { data, error } = await supabase
      .from("areas_fazenda")
      .insert(payload)
      .select(`
        id,
        nome,
        descricao,
        ativo,
        criado_em,
        atualizado_em
      `)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw new Error(tratarErro(error));
  }
}

export async function editarAreaFazenda(id, dados) {
  try {
    const payload = validarPayload(dados);

    const { data, error } = await supabase
      .from("areas_fazenda")
      .update(payload)
      .eq("id", id)
      .select(`
        id,
        nome,
        descricao,
        ativo,
        criado_em,
        atualizado_em
      `)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw new Error(tratarErro(error));
  }
}

export async function alternarStatusAreaFazenda(id, ativo) {
  const { data, error } = await supabase
    .from("areas_fazenda")
    .update({ ativo: Boolean(ativo) })
    .eq("id", id)
    .select(`
      id,
      nome,
      descricao,
      ativo,
      criado_em,
      atualizado_em
    `)
    .single();

  if (error) {
    throw new Error(tratarErro(error));
  }

  return data;
}

export async function excluirAreaFazenda(id) {
  const { error } = await supabase
    .from("areas_fazenda")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      "Não foi possível excluir esta área. Se ela já foi usada em lançamentos, apenas inative."
    );
  }

  return true;
}

export function calcularResumoAreas(areas = []) {
  return {
    total: areas.length,
    ativas: areas.filter((area) => area.ativo).length,
    inativas: areas.filter((area) => !area.ativo).length,
  };
}