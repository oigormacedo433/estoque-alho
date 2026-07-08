// Serviço de Alertas.
//
// Regra 6.6:
// - Recebimento pendente de conferência
// - Estoque baixo por calibre
// - Tentativa de saída maior que estoque
// - Calibre com maior volume
// - Calibre com menor volume
// - Última atualização
//
// Observação:
// A tentativa de saída maior que estoque é tratada em tempo real
// na tela Saída/Venda, porque tentativa bloqueada não é salva no banco.
//
// Não usamos dados fictícios.
// Os alertas vêm da view vw_alertas_sistema no Supabase.

import { supabase } from "./supabaseClient";

// Lista os alertas gerais do sistema.
export async function listarAlertasSistema() {
  const { data, error } = await supabase
    .from("vw_alertas_sistema")
    .select(`
      id,
      tipo,
      nivel,
      titulo,
      descricao,
      valor_numero,
      valor_texto,
      calibre_codigo,
      calibre_nome,
      criado_em,
      ordem
    `)
    .order("ordem", { ascending: true })
    .order("valor_numero", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

// Calcula resumo dos alertas.
export function calcularResumoAlertas(alertas = []) {
  const recebimentoPendente = alertas.find((item) => {
    return item.tipo === "recebimento_pendente";
  });

  const alertasEstoque = alertas.filter((item) => {
    return item.tipo === "estoque_baixo";
  });

  const alertasCriticos = alertas.filter((item) => {
    return item.nivel === "danger";
  });

  const alertasAviso = alertas.filter((item) => {
    return item.nivel === "warning";
  });

  const calibreMaiorVolume = alertas.find((item) => {
    return item.tipo === "calibre_maior_volume";
  });

  const calibreMenorVolume = alertas.find((item) => {
    return item.tipo === "calibre_menor_volume";
  });

  const ultimaAtualizacao = alertas.find((item) => {
    return item.tipo === "ultima_atualizacao";
  });

  return {
    totalAlertas: alertas.length,
    recebimentosPendentes: Number(recebimentoPendente?.valor_numero || 0),
    totalAlertasEstoque: alertasEstoque.length,
    totalCriticos: alertasCriticos.length,
    totalAvisos: alertasAviso.length,
    calibreMaiorVolume: calibreMaiorVolume || null,
    calibreMenorVolume: calibreMenorVolume || null,
    ultimaAtualizacao: ultimaAtualizacao || null,
  };
}

// Retorna o nome visual do tipo de alerta.
export function obterNomeTipoAlerta(tipo) {
  const nomes = {
    recebimento_pendente: "Recebimento",
    estoque_baixo: "Estoque",
    calibre_maior_volume: "Maior volume",
    calibre_menor_volume: "Menor volume",
    ultima_atualizacao: "Atualização",
  };

  return nomes[tipo] || "Alerta";
}

// Retorna variante visual do alerta.
export function obterVariantAlerta(nivel) {
  const variantes = {
    danger: "danger",
    warning: "warning",
    info: "info",
    success: "success",
  };

  return variantes[nivel] || "neutral";
}