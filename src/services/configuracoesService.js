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
// FUNÇÕES AUXILIARES
// =========================================================

function numeroSeguro(valor, fallback = 0) {
  if (valor === undefined || valor === null || valor === "") {
    return fallback;
  }

  const convertido = Number(valor);

  if (!Number.isFinite(convertido)) {
    return fallback;
  }

  return convertido;
}

function numeroPositivoSeguro(valor, fallback = 10) {
  if (valor === undefined || valor === null || valor === "") {
    return fallback;
  }

  const convertido = Number(valor);

  if (!Number.isFinite(convertido) || convertido <= 0) {
    return fallback;
  }

  return convertido;
}

function textoSeguro(valor, fallback = "") {
  if (valor === undefined || valor === null) {
    return fallback;
  }

  const texto = String(valor).trim();

  if (!texto) {
    return fallback;
  }

  return texto;
}

function booleanoSeguro(valor, fallback = false) {
  if (valor === undefined || valor === null || valor === "") {
    return fallback;
  }

  return (
    valor === true ||
    valor === "true" ||
    valor === "sim" ||
    valor === 1 ||
    valor === "1"
  );
}

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

  if (!data) {
    return {
      estoque_minimo_por_calibre: 0,
      peso_caixa_final_kg: 10,
      peso_padrao_caixa_final_kg: 10,
      alerta_estoque_baixo: true,
      unidade_principal: "caixas",
      embalagem_padrao: "caixa",
      permitir_lancamento_palete: true,
      exigir_conferencia_recebimento: false,
      prazo_alerta_conferencia_horas: 24,
      atualizacao_automatica_painel: true,
    };
  }

  return {
    ...data,

    estoque_minimo_por_calibre: numeroSeguro(
      data.estoque_minimo_por_calibre,
      0
    ),

    peso_caixa_final_kg: numeroPositivoSeguro(
      data.peso_caixa_final_kg ?? data.peso_padrao_caixa_final_kg,
      10
    ),

    peso_padrao_caixa_final_kg: numeroPositivoSeguro(
      data.peso_padrao_caixa_final_kg ?? data.peso_caixa_final_kg,
      10
    ),

    alerta_estoque_baixo: data.alerta_estoque_baixo !== false,
  };
}

export async function salvarConfiguracoes(dados) {
  const configuracaoAtual = await buscarConfiguracoes();

  const idConfiguracao = dados.id || configuracaoAtual?.id;

  const payload = {
    // ÚNICO CAMPO DO ESTOQUE MÍNIMO
    estoque_minimo_por_calibre: numeroSeguro(
      dados.estoque_minimo_por_calibre,
      configuracaoAtual?.estoque_minimo_por_calibre ?? 0
    ),

    // ÚNICO CAMPO DO PESO PADRÃO
    peso_caixa_final_kg: numeroPositivoSeguro(
      dados.peso_caixa_final_kg ?? dados.peso_padrao_caixa_final_kg,
      configuracaoAtual?.peso_caixa_final_kg ??
        configuracaoAtual?.peso_padrao_caixa_final_kg ??
        10
    ),

    // ÚNICO CAMPO DO ALERTA
    alerta_estoque_baixo: booleanoSeguro(
      dados.alerta_estoque_baixo,
      configuracaoAtual?.alerta_estoque_baixo ?? true
    ),
  };

  // Só adiciona os campos antigos se for criar a primeira configuração.
  // Em atualização, não mexe neles.
  if (!idConfiguracao) {
    payload.unidade_principal = textoSeguro(
      dados.unidade_principal,
      "caixas"
    );

    payload.embalagem_padrao = textoSeguro(
      dados.embalagem_padrao,
      "caixa"
    );

    payload.permitir_lancamento_palete = booleanoSeguro(
      dados.permitir_lancamento_palete,
      true
    );

    payload.exigir_conferencia_recebimento = booleanoSeguro(
      dados.exigir_conferencia_recebimento,
      false
    );

    payload.prazo_alerta_conferencia_horas = numeroPositivoSeguro(
      dados.prazo_alerta_conferencia_horas,
      24
    );

    payload.atualizacao_automatica_painel = booleanoSeguro(
      dados.atualizacao_automatica_painel,
      true
    );
  }

  if (idConfiguracao) {
    const { data, error } = await supabase
      .from("configuracoes")
      .update(payload)
      .eq("id", idConfiguracao)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      ...data,
      peso_padrao_caixa_final_kg:
        data.peso_padrao_caixa_final_kg ?? data.peso_caixa_final_kg ?? 10,
    };
  }

  const { data, error } = await supabase
    .from("configuracoes")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,
    peso_padrao_caixa_final_kg:
      data.peso_padrao_caixa_final_kg ?? data.peso_caixa_final_kg ?? 10,
  };
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

    pesoCaixaFinalKg:
      configuracoes?.peso_caixa_final_kg ||
      configuracoes?.peso_padrao_caixa_final_kg ||
      0,

    unidadesAtivas,
    fazendasAtivas,
    responsaveisAtivos,
    ultimaAtualizacao: configuracoes?.atualizado_em || configuracoes?.criado_em,
  };
}

// =========================================================
// ALIASES DE COMPATIBILIDADE
// =========================================================

export const buscarConfiguracoesGerais = buscarConfiguracoes;
export const salvarConfiguracoesGerais = salvarConfiguracoes;
export const atualizarConfiguracoesGerais = salvarConfiguracoes;
export const obterConfiguracoesGerais = buscarConfiguracoes;
export const obterConfiguracoes = buscarConfiguracoes;
export const atualizarConfiguracoes = salvarConfiguracoes;