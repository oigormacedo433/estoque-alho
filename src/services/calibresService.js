// Serviço de Calibres.
//
// Etapa 9:
// - Listar calibres
// - Listar calibres ativos
// - Cadastrar calibre
// - Editar calibre
// - Excluir calibre
// - Validar código duplicado
//
// Não usamos dados fictícios.
// Tudo vem do Supabase.

import { supabase } from "./supabaseClient";

// Lista todos os calibres cadastrados.
export async function listarCalibres() {
  const { data, error } = await supabase
    .from("calibres")
    .select(`
      id,
      codigo,
      nome,
      tipo,
      ordem,
      observacao,
      ativo,
      criado_em,
      atualizado_em
    `)
    .order("ordem", { ascending: true })
    .order("codigo", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

// Lista somente calibres ativos.
// Usado nos selects das outras telas.
export async function listarCalibresAtivos() {
  const { data, error } = await supabase
    .from("calibres")
    .select(`
      id,
      codigo,
      nome,
      tipo,
      ordem,
      observacao,
      ativo,
      criado_em,
      atualizado_em
    `)
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("codigo", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

// Normaliza o código antes de salvar.
// Exemplo:
// c4 vira C4
// ind vira IND
function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

// Verifica se já existe calibre com o mesmo código.
// Se estiver editando, ignora o próprio ID.
export async function verificarCodigoCalibreDuplicado(codigo, idIgnorado = null) {
  const codigoNormalizado = normalizarCodigo(codigo);

  let query = supabase
    .from("calibres")
    .select("id, codigo")
    .ilike("codigo", codigoNormalizado)
    .limit(1);

  if (idIgnorado) {
    query = query.neq("id", idIgnorado);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data && data.length > 0;
}

// Cadastra novo calibre.
export async function cadastrarCalibre(dados) {
  const codigoNormalizado = normalizarCodigo(dados.codigo);

  const duplicado = await verificarCodigoCalibreDuplicado(codigoNormalizado);

  if (duplicado) {
    throw new Error("Já existe um calibre cadastrado com esse código.");
  }

  const payload = {
    codigo: codigoNormalizado,
    nome: String(dados.nome || "").trim(),
    tipo: dados.tipo,
    ordem: Number(dados.ordem || 0),
    observacao: dados.observacao || null,
    ativo: dados.ativo === true || dados.ativo === "true",
  };

  const { data, error } = await supabase
    .from("calibres")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe um calibre cadastrado com esse código.");
    }

    throw error;
  }

  return data;
}

// Edita calibre existente.
export async function editarCalibre(id, dados) {
  const codigoNormalizado = normalizarCodigo(dados.codigo);

  const duplicado = await verificarCodigoCalibreDuplicado(
    codigoNormalizado,
    id
  );

  if (duplicado) {
    throw new Error("Já existe outro calibre cadastrado com esse código.");
  }

  const payload = {
    codigo: codigoNormalizado,
    nome: String(dados.nome || "").trim(),
    tipo: dados.tipo,
    ordem: Number(dados.ordem || 0),
    observacao: dados.observacao || null,
    ativo: dados.ativo === true || dados.ativo === "true",
  };

  const { data, error } = await supabase
    .from("calibres")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe outro calibre cadastrado com esse código.");
    }

    throw error;
  }

  return data;
}

// Exclui calibre.
// Se o calibre já foi usado em lançamentos, o banco pode bloquear.
// Nesse caso, o correto é inativar.
export async function excluirCalibre(id) {
  const { error } = await supabase
    .from("calibres")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Este calibre já foi usado em lançamentos. Para manter o histórico, inative o calibre em vez de excluir."
      );
    }

    throw error;
  }

  return true;
}

// Calcula resumo dos calibres cadastrados.
export function calcularResumoCalibres(calibres = []) {
  const totalCadastrados = calibres.length;

  const ativos = calibres.filter((item) => item.ativo).length;

  const inativos = calibres.filter((item) => !item.ativo).length;

  const ultimaAtualizacao = calibres.reduce((ultima, item) => {
    const dataItem = item.atualizado_em || item.criado_em;

    if (!dataItem) {
      return ultima;
    }

    if (!ultima) {
      return dataItem;
    }

    return new Date(dataItem) > new Date(ultima) ? dataItem : ultima;
  }, null);

  return {
    totalCadastrados,
    ativos,
    inativos,
    ultimaAtualizacao,
  };
}