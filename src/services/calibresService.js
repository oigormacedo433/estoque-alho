import { supabase } from "./supabaseClient";

function normalizarTipoCalibre(valor) {
  const texto = String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (texto.includes("ind")) {
    return "industria";
  }

  return "comercial";
}

function labelTipoCalibre(valor) {
  const tipo = normalizarTipoCalibre(valor);

  if (tipo === "industria") {
    return "Indústria";
  }

  return "Comercial";
}

function tratarErroCalibre(error) {
  const mensagem = error?.message || "";

  if (mensagem.includes("tipo_calibre")) {
    return "O tipo do calibre precisa ser Comercial ou Indústria. O sistema corrigiu o envio para o formato aceito pelo banco.";
  }

  if (
    mensagem.includes("violates foreign key constraint") ||
    mensagem.includes("still referenced") ||
    mensagem.includes("foreign key")
  ) {
    return "Não foi possível excluir este calibre porque ele já foi usado em lançamentos. Nesse caso, inative o calibre em vez de excluir.";
  }

  if (
    mensagem.includes("duplicate key") ||
    mensagem.includes("unique constraint") ||
    error?.code === "23505"
  ) {
    return "Já existe um calibre cadastrado com esse código ou nome.";
  }

  return mensagem || "Não foi possível processar o calibre.";
}

function montarPayloadCalibre(dados) {
  const codigo = String(dados.codigo || "").trim();
  const nome = String(dados.nome || "").trim();
  const tipo = normalizarTipoCalibre(dados.tipo);
  const ordem = Number(dados.ordem);

  if (!codigo) {
    throw new Error("Informe o código do calibre.");
  }

  if (!nome) {
    throw new Error("Informe o nome do calibre.");
  }

  if (!Number.isFinite(ordem) || ordem <= 0) {
    throw new Error("Informe uma ordem válida maior que zero.");
  }

  return {
    codigo,
    nome,
    tipo,
    ordem,
    ativo: dados.ativo === true || dados.ativo === "true" || dados.ativo === "sim",
    observacao: dados.observacao ? String(dados.observacao).trim() : null,
  };
}

function normalizarCalibre(item) {
  if (!item) return item;

  return {
    ...item,
    tipo: normalizarTipoCalibre(item.tipo),
    tipo_label: labelTipoCalibre(item.tipo),
  };
}

export async function listarCalibres(filtros = {}) {
  let query = supabase
    .from("calibres")
    .select("*")
    .order("ordem", { ascending: true })
    .order("codigo", { ascending: true });

  if (filtros.ativo === true || filtros.ativo === "sim") {
    query = query.eq("ativo", true);
  }

  if (filtros.ativo === false || filtros.ativo === "nao") {
    query = query.eq("ativo", false);
  }

  if (filtros.busca) {
    query = query.or(
      `codigo.ilike.%${filtros.busca}%,nome.ilike.%${filtros.busca}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(tratarErroCalibre(error));
  }

  return (data || []).map(normalizarCalibre);
}

export async function listarCalibresAtivos() {
  return listarCalibres({ ativo: true });
}

export async function buscarCalibrePorId(id) {
  const { data, error } = await supabase
    .from("calibres")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(tratarErroCalibre(error));
  }

  return normalizarCalibre(data);
}

export async function cadastrarCalibre(dados) {
  try {
    const payload = montarPayloadCalibre(dados);

    const { data, error } = await supabase
      .from("calibres")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return normalizarCalibre(data);
  } catch (error) {
    throw new Error(tratarErroCalibre(error));
  }
}

export async function editarCalibre(id, dados) {
  try {
    const payload = montarPayloadCalibre(dados);

    const { data, error } = await supabase
      .from("calibres")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return normalizarCalibre(data);
  } catch (error) {
    throw new Error(tratarErroCalibre(error));
  }
}

export async function excluirCalibre(id) {
  const { error } = await supabase.from("calibres").delete().eq("id", id);

  if (error) {
    throw new Error(tratarErroCalibre(error));
  }

  return true;
}

export async function alternarStatusCalibre(id, ativo) {
  const { data, error } = await supabase
    .from("calibres")
    .update({ ativo: Boolean(ativo) })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(tratarErroCalibre(error));
  }

  return normalizarCalibre(data);
}

export function calcularResumoCalibres(calibres = []) {
  return {
    total: calibres.length,
    ativos: calibres.filter((item) => item.ativo).length,
    inativos: calibres.filter((item) => !item.ativo).length,
  };
}

export { labelTipoCalibre, normalizarTipoCalibre };