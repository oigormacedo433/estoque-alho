// Serviço do Dashboard.
//
// Etapa 8:
// - Cards principais
// - Gráficos
// - Tabela de estoque atual
// - Alertas
//
// Não usamos dados fictícios.
// Todas as informações vêm do Supabase.

import { supabase } from "./supabaseClient";

// Busca todos os dados necessários para o Dashboard.
export async function buscarDadosDashboard() {
  const [
    chegadaResponse,
    classificadoResponse,
    produtoFinalResponse,
    saidasResponse,
    estoqueResponse,
    alertasResponse,
  ] = await Promise.all([
    supabase
      .from("chegada_fazenda")
      .select(`
        id,
        data_recebimento,
        quantidade_caixas,
        conferido,
        atualizado_em
      `),

    supabase
      .from("alho_classificado")
      .select(`
        id,
        data_classificacao,
        quantidade_paletes,
        caixas_por_palete,
        total_caixas,
        conferido,
        atualizado_em,
        calibres (
          id,
          codigo,
          nome,
          ordem
        )
      `),

    supabase
      .from("produto_final")
      .select(`
        id,
        data_registro,
        quantidade_caixas,
        peso_total_kg,
        conferido,
        atualizado_em,
        calibres (
          id,
          codigo,
          nome,
          ordem
        )
      `),

    supabase
      .from("saidas_vendas")
      .select(`
        id,
        data_saida,
        quantidade_caixas,
        peso_total_kg,
        atualizado_em,
        calibres (
          id,
          codigo,
          nome,
          ordem
        )
      `),

    supabase
      .from("vw_estoque_atual")
      .select(`
        calibre_id,
        calibre_codigo,
        calibre_nome,
        calibre_tipo,
        calibre_ordem,
        estoque_classificado_caixas,
        produto_final_caixas,
        saidas_caixas,
        saldo_disponivel_caixas,
        peso_disponivel_kg,
        estoque_minimo_por_calibre,
        estoque_baixo,
        status_estoque
      `)
      .order("calibre_ordem", { ascending: true }),

    supabase
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
      .order("ordem", { ascending: true }),
  ]);

  const respostas = [
    chegadaResponse,
    classificadoResponse,
    produtoFinalResponse,
    saidasResponse,
    estoqueResponse,
    alertasResponse,
  ];

  const respostaComErro = respostas.find((resposta) => resposta.error);

  if (respostaComErro) {
    throw respostaComErro.error;
  }

  return {
    chegadas: chegadaResponse.data || [],
    classificados: classificadoResponse.data || [],
    produtosFinais: produtoFinalResponse.data || [],
    saidas: saidasResponse.data || [],
    estoqueAtual: estoqueResponse.data || [],
    alertas: alertasResponse.data || [],
  };
}

// Soma números de uma lista.
function somar(lista = [], campo) {
  return lista.reduce((total, item) => {
    return total + Number(item[campo] || 0);
  }, 0);
}

// Calcula os cards principais.
export function calcularCardsDashboard(dados) {
  const recebidoFazenda = somar(dados.chegadas, "quantidade_caixas");

  const alhoClassificado = somar(dados.classificados, "total_caixas");

  const produtoFinal = somar(dados.produtosFinais, "quantidade_caixas");

  const saidasVendas = somar(dados.saidas, "quantidade_caixas");

  const saldoDisponivel = somar(dados.estoqueAtual, "saldo_disponivel_caixas");

  return {
    recebidoFazenda,
    alhoClassificado,
    produtoFinal,
    saidasVendas,
    saldoDisponivel,
  };
}

// Formata data YYYY-MM-DD para DD/MM.
function formatarDataCurta(data) {
  if (!data) return "-";

  const partes = data.split("-");

  if (partes.length !== 3) return data;

  const [, mes, dia] = partes;

  return `${dia}/${mes}`;
}

// Agrupa registros por data.
export function agruparPorData(lista = [], campoData, campoValor) {
  const mapa = new Map();

  lista.forEach((item) => {
    const data = item[campoData];

    if (!data) {
      return;
    }

    const atual = mapa.get(data) || {
      data,
      label: formatarDataCurta(data),
      total: 0,
    };

    atual.total += Number(item[campoValor] || 0);

    mapa.set(data, atual);
  });

  return Array.from(mapa.values())
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(-10);
}

// Agrupa registros por calibre.
export function agruparPorCalibre(lista = [], campoValor) {
  const mapa = new Map();

  lista.forEach((item) => {
    const calibreId = item.calibres?.id || "sem-calibre";

    const atual = mapa.get(calibreId) || {
      id: calibreId,
      calibre: item.calibres?.codigo || "-",
      nome: item.calibres?.nome || "Sem calibre",
      ordem: item.calibres?.ordem || 999,
      total: 0,
    };

    atual.total += Number(item[campoValor] || 0);

    mapa.set(calibreId, atual);
  });

  return Array.from(mapa.values()).sort((a, b) => a.ordem - b.ordem);
}

// Gera dados para os gráficos do Dashboard.
export function montarGraficosDashboard(dados) {
  return {
    recebimentoPorDia: agruparPorData(
      dados.chegadas,
      "data_recebimento",
      "quantidade_caixas"
    ),

    classificacaoPorCalibre: agruparPorCalibre(
      dados.classificados,
      "total_caixas"
    ),

    produtoFinalPorDia: agruparPorData(
      dados.produtosFinais,
      "data_registro",
      "quantidade_caixas"
    ),

    estoqueAtualPorCalibre: dados.estoqueAtual.map((item) => ({
      calibre: item.calibre_codigo,
      nome: item.calibre_nome,
      total: Number(item.saldo_disponivel_caixas || 0),
    })),
  };
}

// Calcula alertas visuais do Dashboard.
export function montarAlertasDashboard(dados) {
  const recebimentosPendentes = dados.chegadas.filter((item) => {
    return item.conferido === false;
  });

  const estoquesBaixos = dados.estoqueAtual.filter((item) => {
    return item.status_estoque === "baixo" || item.status_estoque === "sem_estoque";
  });

  const estoqueOrdenadoPorSaldo = [...dados.estoqueAtual].sort((a, b) => {
    return Number(b.saldo_disponivel_caixas || 0) - Number(a.saldo_disponivel_caixas || 0);
  });

  const maiorVolume = estoqueOrdenadoPorSaldo[0] || null;

  const menorVolume =
    [...dados.estoqueAtual].sort((a, b) => {
      return Number(a.saldo_disponivel_caixas || 0) - Number(b.saldo_disponivel_caixas || 0);
    })[0] || null;

  const totalProdutoFinalDisponivel = somar(
    dados.estoqueAtual,
    "saldo_disponivel_caixas"
  );

  return {
    recebimentosPendentes,
    estoquesBaixos,
    maiorVolume,
    menorVolume,
    totalProdutoFinalDisponivel,
  };
}