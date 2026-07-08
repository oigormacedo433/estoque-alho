// Serviço de Configurações.
//
// Etapa 10:
// - Configurações operacionais
// - Embalagens e unidades
// - Alertas e limites
// - Origens/Fazendas
// - Responsáveis
//
// Tudo vem do Supabase.
// Não usamos dados fictícios na tela.

import { supabase } from "./supabaseClient";

// =========================================================
// CONFIGURAÇÕES PRINCIPAIS
// =========================================================

export async function buscarConfiguracoes() {
  const { data, error } = await supabase
    .from("configuracoes")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function salvarConfiguracoes(dados) {
  const payload = {
    caixas_por_palete: Number(dados.caixas_por_palete),
    peso_caixa_final_kg: Number(dados.peso_caixa_final_kg),
    unidade_principal: String(dados.unidade_principal || "").trim(),
    embalagem_padrao: String(dados.embalagem_padrao || "").trim(),
    permitir_lancamento_palete:
      dados.permitir_lancamento_palete === true ||
      dados.permitir_lancamento_palete === "true",
    exigir_conferencia_recebimento:
      dados.exigir_conferencia_recebimento === true ||
      dados.exigir_conferencia_recebimento === "true",
    estoque_minimo_por_calibre: Number(dados.estoque_minimo_por_calibre),
    prazo_alerta_conferencia_horas: Number(
      dados.prazo_alerta_conferencia_horas
    ),
    atualizacao_automatica_painel:
      dados.atualizacao_automatica_painel === true ||
      dados.atualizacao_automatica_painel === "true",
    alerta_estoque_baixo:
      dados.alerta_estoque_baixo === true ||
      dados.alerta_estoque_baixo === "true",
  };

  if (dados.id) {
    const { data, error } = await supabase
      .from("configuracoes")
      .update(payload)
      .eq("id", dados.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from("configuracoes")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// =========================================================
// UNIDADES E EMBALAGENS
// =========================================================

export async function listarUnidadesEmbalagens() {
  const { data, error } = await supabase
    .from("unidades_embalagens")
    .select("*")
    .order("tipo", { ascending: true })
    .order("nome", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function cadastrarUnidadeEmbalagem(dados) {
  const payload = {
    nome: String(dados.nome || "").trim(),
    tipo: dados.tipo,
    peso_kg: dados.peso_kg ? Number(dados.peso_kg) : null,
    caixas_por_palete: dados.caixas_por_palete
      ? Number(dados.caixas_por_palete)
      : null,
    ativo: dados.ativo === true || dados.ativo === "true",
    observacao: dados.observacao || null,
  };

  const { data, error } = await supabase
    .from("unidades_embalagens")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe uma unidade/embalagem com esse nome e tipo.");
    }

    throw error;
  }

  return data;
}

export async function editarUnidadeEmbalagem(id, dados) {
  const payload = {
    nome: String(dados.nome || "").trim(),
    tipo: dados.tipo,
    peso_kg: dados.peso_kg ? Number(dados.peso_kg) : null,
    caixas_por_palete: dados.caixas_por_palete
      ? Number(dados.caixas_por_palete)
      : null,
    ativo: dados.ativo === true || dados.ativo === "true",
    observacao: dados.observacao || null,
  };

  const { data, error } = await supabase
    .from("unidades_embalagens")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe uma unidade/embalagem com esse nome e tipo.");
    }

    throw error;
  }

  return data;
}

export async function excluirUnidadeEmbalagem(id) {
  const { error } = await supabase
    .from("unidades_embalagens")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  return true;
}

// =========================================================
// FAZENDAS / ORIGENS
// =========================================================

export async function listarFazendas() {
  const { data, error } = await supabase
    .from("fazendas")
    .select("id, nome, ativo, observacao")
    .order("nome", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function cadastrarFazenda(dados) {
  const payload = {
    nome: String(dados.nome || "").trim(),
    ativo: dados.ativo === true || dados.ativo === "true",
    observacao: dados.observacao || null,
  };

  const { data, error } = await supabase
    .from("fazendas")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe uma fazenda/origem com esse nome.");
    }

    throw error;
  }

  return data;
}

export async function editarFazenda(id, dados) {
  const payload = {
    nome: String(dados.nome || "").trim(),
    ativo: dados.ativo === true || dados.ativo === "true",
    observacao: dados.observacao || null,
  };

  const { data, error } = await supabase
    .from("fazendas")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe uma fazenda/origem com esse nome.");
    }

    throw error;
  }

  return data;
}

export async function excluirFazenda(id) {
  const { error } = await supabase.from("fazendas").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Esta fazenda/origem já foi usada em lançamentos. Inative em vez de excluir."
      );
    }

    throw error;
  }

  return true;
}

// =========================================================
// RESPONSÁVEIS
// =========================================================

export async function listarResponsaveis() {
  const { data, error } = await supabase
    .from("responsaveis")
    .select("id, nome, ativo, observacao")
    .order("nome", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function cadastrarResponsavel(dados) {
  const payload = {
    nome: String(dados.nome || "").trim(),
    ativo: dados.ativo === true || dados.ativo === "true",
    observacao: dados.observacao || null,
  };

  const { data, error } = await supabase
    .from("responsaveis")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe um responsável com esse nome.");
    }

    throw error;
  }

  return data;
}

export async function editarResponsavel(id, dados) {
  const payload = {
    nome: String(dados.nome || "").trim(),
    ativo: dados.ativo === true || dados.ativo === "true",
    observacao: dados.observacao || null,
  };

  const { data, error } = await supabase
    .from("responsaveis")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe um responsável com esse nome.");
    }

    throw error;
  }

  return data;
}

export async function excluirResponsavel(id) {
  const { error } = await supabase.from("responsaveis").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Este responsável já foi usado em lançamentos. Inative em vez de excluir."
      );
    }

    throw error;
  }

  return true;
}

// =========================================================
// RESUMO
// =========================================================

export function calcularResumoConfiguracoes({
  configuracoes,
  unidades,
  fazendas,
  responsaveis,
}) {
  const unidadesAtivas = unidades.filter((item) => item.ativo).length;
  const fazendasAtivas = fazendas.filter((item) => item.ativo).length;
  const responsaveisAtivos = responsaveis.filter((item) => item.ativo).length;

  return {
    caixasPorPalete: configuracoes?.caixas_por_palete || 0,
    pesoCaixaFinalKg: configuracoes?.peso_caixa_final_kg || 0,
    unidadesAtivas,
    fazendasAtivas,
    responsaveisAtivos,
    ultimaAtualizacao: configuracoes?.atualizado_em || configuracoes?.criado_em,
  };
}