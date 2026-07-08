import { supabase } from "./supabaseClient";

function numero(valor) {
  return Number(valor || 0);
}

function formatarDataBR(data) {
  if (!data) return "-";

  const [ano, mes, dia] = String(data).split("-");
  return `${dia}/${mes}/${ano}`;
}

function aplicarPeriodo(query, campoData, filtros) {
  let queryAtual = query;

  if (filtros.dataInicial) {
    queryAtual = queryAtual.gte(campoData, filtros.dataInicial);
  }

  if (filtros.dataFinal) {
    queryAtual = queryAtual.lte(campoData, filtros.dataFinal);
  }

  return queryAtual;
}

function somar(lista, campo) {
  return lista.reduce((total, item) => total + numero(item[campo]), 0);
}

function calcularPercentual(parte, total) {
  if (numero(total) <= 0) return 0;

  return (numero(parte) / numero(total)) * 100;
}

function obterCalibreLabel(item) {
  if (item.calibres) {
    return `${item.calibres.codigo} — ${item.calibres.nome}`;
  }

  if (item.calibre_codigo || item.calibre_nome) {
    return `${item.calibre_codigo || "-"} — ${item.calibre_nome || "-"}`;
  }

  return "-";
}

function obterAreaLabel(item) {
  if (item.areas_fazenda) {
    return item.areas_fazenda.nome || "Sem área";
  }

  return item.area_nome || "Sem área";
}

function statusTexto(status) {
  if (status === "sem_estoque") return "Sem estoque";
  if (status === "baixo") return "Estoque baixo";
  return "Normal";
}

function montarRecebimentoResumo(recebimentos = []) {
  const totalCaixas = somar(recebimentos, "quantidade_caixas");
  const totalPesoKg = somar(recebimentos, "peso_total_estimado_kg");
  const pendentes = recebimentos.filter((item) => !item.conferido).length;
  const conferidos = recebimentos.filter((item) => item.conferido).length;

  return {
    totalRegistros: recebimentos.length,
    totalCaixas,
    totalPesoKg,
    pendentes,
    conferidos,
  };
}

function montarClassificacaoResumo(classificacoes = []) {
  const totalPaletes = somar(classificacoes, "quantidade_paletes");
  const totalCaixas = somar(classificacoes, "total_caixas");
  const pendentes = classificacoes.filter((item) => !item.conferido).length;
  const conferidos = classificacoes.filter((item) => item.conferido).length;

  const calibres = new Set(
    classificacoes.map((item) => item.calibre_id).filter(Boolean)
  ).size;

  return {
    totalRegistros: classificacoes.length,
    totalPaletes,
    totalCaixas,
    pendentes,
    conferidos,
    calibres,
  };
}

function montarProdutoFinalPorArea(produtos = []) {
  const mapa = new Map();

  produtos.forEach((item) => {
    const areaId = item.area_id || item.areas_fazenda?.id || "sem_area";

    const atual = mapa.get(areaId) || {
      area_id: areaId,
      area: obterAreaLabel(item),
      caixas: 0,
      peso_kg: 0,
      registros: 0,
    };

    atual.caixas += numero(item.quantidade_caixas);
    atual.peso_kg += numero(item.peso_total_kg);
    atual.registros += 1;

    mapa.set(areaId, atual);
  });

  return Array.from(mapa.values()).sort((a, b) => b.caixas - a.caixas);
}

function montarSaidaPorArea(saidas = []) {
  const mapa = new Map();

  saidas.forEach((item) => {
    const areaId = item.area_id || item.areas_fazenda?.id || "sem_area";

    const atual = mapa.get(areaId) || {
      area_id: areaId,
      area: obterAreaLabel(item),
      caixas: 0,
      peso_kg: 0,
      registros: 0,
    };

    atual.caixas += numero(item.quantidade_caixas);
    atual.peso_kg += numero(item.peso_total_kg);
    atual.registros += 1;

    mapa.set(areaId, atual);
  });

  return Array.from(mapa.values()).sort((a, b) => b.caixas - a.caixas);
}

function montarEstoqueAreaCalibre(estoqueAreaAtual = []) {
  return estoqueAreaAtual
    .map((item) => ({
      area_id: item.area_id,
      area: item.area_nome || "Sem área",
      calibre_id: item.calibre_id,
      calibre_codigo: item.calibre_codigo,
      calibre_nome: item.calibre_nome,
      calibre_ordem: item.calibre_ordem || 999,
      calibre: `${item.calibre_codigo || "-"} — ${item.calibre_nome || "-"}`,
      area_calibre: `${item.area_nome || "Sem área"} / C${item.calibre_codigo || "-"}`,
      produto_final_caixas: numero(item.produto_final_caixas),
      produto_final_peso_kg: numero(item.produto_final_peso_kg),
      saidas_caixas: numero(item.saidas_caixas),
      saidas_peso_kg: numero(item.saidas_peso_kg),
      saldo_disponivel_caixas: numero(item.saldo_disponivel_caixas),
      peso_disponivel_kg: numero(item.peso_disponivel_kg),
      estoque_minimo_por_calibre: numero(item.estoque_minimo_por_calibre),
      status: item.status_estoque_area || "normal",
      status_texto: statusTexto(item.status_estoque_area),
    }))
    .sort((a, b) => {
      const areaCompare = String(a.area).localeCompare(String(b.area));

      if (areaCompare !== 0) return areaCompare;

      return numero(a.calibre_ordem) - numero(b.calibre_ordem);
    });
}

function montarSaldoPorAreaCalibre(estoqueAreaCalibre = []) {
  return [...estoqueAreaCalibre]
    .filter((item) => item.saldo_disponivel_caixas > 0)
    .sort((a, b) => b.saldo_disponivel_caixas - a.saldo_disponivel_caixas)
    .slice(0, 20);
}

function montarEstoquePorArea(estoqueAreaAtual = []) {
  const mapa = new Map();

  estoqueAreaAtual.forEach((item) => {
    const areaId = item.area_id || "sem_area";

    const atual = mapa.get(areaId) || {
      area_id: areaId,
      area: item.area_nome || "Sem área",
      produto_final_caixas: 0,
      produto_final_peso_kg: 0,
      saidas_caixas: 0,
      saidas_peso_kg: 0,
      saldo_disponivel_caixas: 0,
      peso_disponivel_kg: 0,
      calibres_total: new Set(),
      calibres_com_saldo: new Set(),
      alertas: 0,
      sem_estoque: 0,
      estoque_baixo: 0,
      normal: 0,
    };

    atual.produto_final_caixas += numero(item.produto_final_caixas);
    atual.produto_final_peso_kg += numero(item.produto_final_peso_kg);
    atual.saidas_caixas += numero(item.saidas_caixas);
    atual.saidas_peso_kg += numero(item.saidas_peso_kg);
    atual.saldo_disponivel_caixas += numero(item.saldo_disponivel_caixas);
    atual.peso_disponivel_kg += numero(item.peso_disponivel_kg);

    if (item.calibre_id) {
      atual.calibres_total.add(item.calibre_id);
    }

    if (numero(item.saldo_disponivel_caixas) > 0 && item.calibre_id) {
      atual.calibres_com_saldo.add(item.calibre_id);
    }

    if (item.status_estoque_area === "sem_estoque") {
      atual.sem_estoque += 1;
      atual.alertas += 1;
    } else if (item.status_estoque_area === "baixo") {
      atual.estoque_baixo += 1;
      atual.alertas += 1;
    } else {
      atual.normal += 1;
    }

    mapa.set(areaId, atual);
  });

  return Array.from(mapa.values())
    .map((item) => ({
      ...item,
      calibres_total: item.calibres_total.size,
      calibres_com_saldo: item.calibres_com_saldo.size,
      giro_area: calcularPercentual(item.saidas_caixas, item.produto_final_caixas),
      status_area:
        item.saldo_disponivel_caixas <= 0
          ? "sem_estoque"
          : item.alertas > 0
            ? "baixo"
            : "normal",
      status_texto:
        item.saldo_disponivel_caixas <= 0
          ? "Sem estoque"
          : item.alertas > 0
            ? "Estoque baixo"
            : "Normal",
    }))
    .sort((a, b) => b.saldo_disponivel_caixas - a.saldo_disponivel_caixas);
}

function montarSaldoPorCalibre(estoqueAreaAtual = []) {
  const mapa = new Map();

  estoqueAreaAtual.forEach((item) => {
    const calibreId = item.calibre_id || "sem_calibre";

    const atual = mapa.get(calibreId) || {
      calibre_id: calibreId,
      calibre_codigo: item.calibre_codigo || "-",
      calibre_nome: item.calibre_nome || "Sem calibre",
      calibre_ordem: item.calibre_ordem || 999,
      calibre: `${item.calibre_codigo || "-"} — ${item.calibre_nome || "-"}`,
      produto_final_caixas: 0,
      produto_final_peso_kg: 0,
      saidas_caixas: 0,
      saidas_peso_kg: 0,
      saldo_disponivel_caixas: 0,
      peso_disponivel_kg: 0,
      areas_total: new Set(),
      areas_com_saldo: new Set(),
      alertas: 0,
    };

    atual.produto_final_caixas += numero(item.produto_final_caixas);
    atual.produto_final_peso_kg += numero(item.produto_final_peso_kg);
    atual.saidas_caixas += numero(item.saidas_caixas);
    atual.saidas_peso_kg += numero(item.saidas_peso_kg);
    atual.saldo_disponivel_caixas += numero(item.saldo_disponivel_caixas);
    atual.peso_disponivel_kg += numero(item.peso_disponivel_kg);

    if (item.area_id) {
      atual.areas_total.add(item.area_id);
    }

    if (numero(item.saldo_disponivel_caixas) > 0 && item.area_id) {
      atual.areas_com_saldo.add(item.area_id);
    }

    if (
      item.status_estoque_area === "baixo" ||
      item.status_estoque_area === "sem_estoque"
    ) {
      atual.alertas += 1;
    }

    mapa.set(calibreId, atual);
  });

  return Array.from(mapa.values())
    .map((item) => ({
      ...item,
      areas_total: item.areas_total.size,
      areas_com_saldo: item.areas_com_saldo.size,
      giro_calibre: calcularPercentual(item.saidas_caixas, item.produto_final_caixas),
      status_calibre:
        item.saldo_disponivel_caixas <= 0
          ? "sem_estoque"
          : item.alertas > 0
            ? "baixo"
            : "normal",
      status_texto:
        item.saldo_disponivel_caixas <= 0
          ? "Sem estoque"
          : item.alertas > 0
            ? "Estoque baixo"
            : "Normal",
    }))
    .sort((a, b) => numero(a.calibre_ordem) - numero(b.calibre_ordem));
}

function montarComparativoArea(produtoFinalPorArea = [], saidaPorArea = []) {
  const mapa = new Map();

  produtoFinalPorArea.forEach((item) => {
    mapa.set(item.area_id, {
      area_id: item.area_id,
      area: item.area,
      produzido_caixas: numero(item.caixas),
      vendido_caixas: 0,
      saldo_periodo_caixas: numero(item.caixas),
    });
  });

  saidaPorArea.forEach((item) => {
    const atual = mapa.get(item.area_id) || {
      area_id: item.area_id,
      area: item.area,
      produzido_caixas: 0,
      vendido_caixas: 0,
      saldo_periodo_caixas: 0,
    };

    atual.vendido_caixas = numero(item.caixas);
    atual.saldo_periodo_caixas = atual.produzido_caixas - numero(item.caixas);

    mapa.set(item.area_id, atual);
  });

  return Array.from(mapa.values()).sort((a, b) => {
    return b.produzido_caixas - a.produzido_caixas;
  });
}

function montarAlertas({
  estoqueAreaCalibre,
  estoquePorArea,
  saldoPorCalibre,
  produtoFinalPorArea,
  saidaPorArea,
  recebimentos,
  classificacoes,
  produtos,
}) {
  const combinacoesCriticas = estoqueAreaCalibre.filter((item) => {
    return item.status === "baixo" || item.status === "sem_estoque";
  });

  const combinacoesSemEstoque = estoqueAreaCalibre.filter((item) => {
    return item.status === "sem_estoque";
  });

  const maiorAreaProduto =
    [...produtoFinalPorArea].sort((a, b) => numero(b.caixas) - numero(a.caixas))[0] ||
    null;

  const maiorAreaSaida =
    [...saidaPorArea].sort((a, b) => numero(b.caixas) - numero(a.caixas))[0] ||
    null;

  const menorAreaSaldo =
    [...estoquePorArea].sort((a, b) => {
      return numero(a.saldo_disponivel_caixas) - numero(b.saldo_disponivel_caixas);
    })[0] || null;

  const maiorCalibreSaldo =
    [...saldoPorCalibre].sort((a, b) => {
      return numero(b.saldo_disponivel_caixas) - numero(a.saldo_disponivel_caixas);
    })[0] || null;

  const menorCalibreSaldo =
    [...saldoPorCalibre].sort((a, b) => {
      return numero(a.saldo_disponivel_caixas) - numero(b.saldo_disponivel_caixas);
    })[0] || null;

  const recebimentosPendentes = recebimentos.filter((item) => !item.conferido).length;
  const classificacoesPendentes = classificacoes.filter((item) => !item.conferido).length;
  const produtosPendentes = produtos.filter((item) => !item.conferido).length;

  const totalPendencias =
    recebimentosPendentes + classificacoesPendentes + produtosPendentes;

  const saldoNegativo = estoqueAreaCalibre.filter((item) => {
    return numero(item.saldo_disponivel_caixas) < 0;
  });

  return {
    combinacoesCriticas,
    combinacoesSemEstoque,
    maiorAreaProduto,
    maiorAreaSaida,
    menorAreaSaldo,
    maiorCalibreSaldo,
    menorCalibreSaldo,
    recebimentosPendentes,
    classificacoesPendentes,
    produtosPendentes,
    totalPendencias,
    saldoNegativo,
  };
}

function montarIndicadores({
  recebimentos,
  classificacoes,
  produtos,
  saidas,
  estoqueAreaCalibre,
  estoquePorArea,
  saldoPorCalibre,
  alertas,
}) {
  const caixasRecebidas = somar(recebimentos, "quantidade_caixas");
  const pesoRecebidoKg = somar(recebimentos, "peso_total_estimado_kg");

  const paletesClassificados = somar(classificacoes, "quantidade_paletes");
  const caixasEquivalentes = somar(classificacoes, "total_caixas");

  const caixasFinaisProduzidas = somar(produtos, "quantidade_caixas");
  const pesoFinalProduzido = somar(produtos, "peso_total_kg");

  const saidasCaixas = somar(saidas, "quantidade_caixas");
  const saidasPesoKg = somar(saidas, "peso_total_kg");

  const saldoDisponivel = estoqueAreaCalibre.reduce((total, item) => {
    return total + numero(item.saldo_disponivel_caixas);
  }, 0);

  const pesoDisponivelKg = estoqueAreaCalibre.reduce((total, item) => {
    return total + numero(item.peso_disponivel_kg);
  }, 0);

  const areasComSaldo = estoquePorArea.filter((item) => {
    return numero(item.saldo_disponivel_caixas) > 0;
  }).length;

  const calibresComSaldo = saldoPorCalibre.filter((item) => {
    return numero(item.saldo_disponivel_caixas) > 0;
  }).length;

  const combinacoesComSaldo = estoqueAreaCalibre.filter((item) => {
    return numero(item.saldo_disponivel_caixas) > 0;
  }).length;

  return {
    caixasRecebidas,
    pesoRecebidoKg,
    paletesClassificados,
    caixasEquivalentes,
    caixasFinaisProduzidas,
    pesoFinalProduzido,
    saidasCaixas,
    saidasPesoKg,
    saldoDisponivel,
    pesoDisponivelKg,
    areasComSaldo,
    calibresComSaldo,
    combinacoesComSaldo,
    estoqueCritico: alertas.combinacoesCriticas.length,
    semEstoque: alertas.combinacoesSemEstoque.length,
    eficienciaProducao: calcularPercentual(caixasFinaisProduzidas, caixasEquivalentes),
    giroSaida: calcularPercentual(saidasCaixas, caixasFinaisProduzidas),
  };
}

function montarTestesFluxo({
  recebimentos,
  classificacoes,
  produtos,
  saidas,
  estoqueAreaCalibre,
  recebimentoResumo,
  classificacaoResumo,
  indicadores,
  alertas,
}) {
  const temChegada = recebimentos.length > 0;
  const chegadaConferida =
    recebimentos.length > 0 && recebimentos.every((item) => item.conferido);

  const temClassificacao = classificacoes.length > 0;
  const temCalculoClassificacaoCorreto = classificacoes.every((item) => {
    return numero(item.total_caixas) ===
      numero(item.quantidade_paletes) * numero(item.caixas_por_palete);
  });

  const temProdutoFinal = produtos.length > 0;
  const temPesoProdutoCorreto = produtos.every((item) => {
    const calculado = numero(item.quantidade_caixas) * numero(item.peso_por_caixa_kg);
    const banco = numero(item.peso_total_kg);

    return Math.abs(calculado - banco) < 0.01;
  });

  const temSaida = saidas.length > 0;
  const estoqueNaoNegativo = alertas.saldoNegativo.length === 0;

  const temRelatorio = Boolean(indicadores);
  const temDadosParaExportar =
    estoqueAreaCalibre.length > 0 || produtos.length > 0 || saidas.length > 0;

  return [
    {
      fluxo: "Fluxo 1",
      nome: "Chegada",
      status: temChegada && chegadaConferida ? "ok" : temChegada ? "alerta" : "pendente",
      detalhe: temChegada
        ? `${recebimentoResumo.totalRegistros} chegada(s), ${recebimentoResumo.conferidos} conferida(s), ${recebimentoResumo.pendentes} pendente(s).`
        : "Nenhuma chegada encontrada no período.",
    },
    {
      fluxo: "Fluxo 2",
      nome: "Classificação",
      status:
        temClassificacao && temCalculoClassificacaoCorreto
          ? "ok"
          : temClassificacao
            ? "erro"
            : "pendente",
      detalhe: temClassificacao
        ? `${classificacaoResumo.totalPaletes} paletes, ${classificacaoResumo.totalCaixas} caixas equivalentes, ${classificacaoResumo.calibres} calibre(s).`
        : "Nenhuma classificação encontrada no período.",
    },
    {
      fluxo: "Fluxo 3",
      nome: "Produto final por Área + Calibre",
      status: temProdutoFinal && temPesoProdutoCorreto ? "ok" : temProdutoFinal ? "erro" : "pendente",
      detalhe: temProdutoFinal
        ? `${indicadores.caixasFinaisProduzidas} caixas finais, ${indicadores.areasComSaldo} área(s) com saldo, ${indicadores.calibresComSaldo} calibre(s) com saldo.`
        : "Nenhum produto final encontrado no período.",
    },
    {
      fluxo: "Fluxo 4",
      nome: "Saída com baixa de estoque",
      status: temSaida && estoqueNaoNegativo ? "ok" : temSaida ? "erro" : "pendente",
      detalhe: temSaida
        ? `${indicadores.saidasCaixas} caixas expedidas. Saldos negativos encontrados: ${alertas.saldoNegativo.length}.`
        : "Nenhuma saída encontrada no período.",
    },
    {
      fluxo: "Fluxo 5",
      nome: "Relatório / Exportação",
      status: temRelatorio && temDadosParaExportar ? "ok" : "pendente",
      detalhe: temDadosParaExportar
        ? "BI carregado com dados para exportação."
        : "BI carregado, mas sem dados suficientes para exportar.",
    },
  ];
}

export async function buscarDadosBI(filtros = {}) {
  let recebimentosQuery = supabase
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
      fazendas (
        id,
        nome
      ),
      responsaveis (
        id,
        nome
      )
    `)
    .order("data_recebimento", { ascending: true });

  recebimentosQuery = aplicarPeriodo(recebimentosQuery, "data_recebimento", filtros);

  let classificacoesQuery = supabase
    .from("alho_classificado")
    .select(`
      id,
      data_classificacao,
      hora,
      fazenda_id,
      lote,
      calibre_id,
      quantidade_paletes,
      caixas_por_palete,
      total_caixas,
      conferido,
      responsavel_id,
      observacao,
      fazendas (
        id,
        nome
      ),
      calibres (
        id,
        codigo,
        nome,
        tipo,
        ordem
      ),
      responsaveis (
        id,
        nome
      )
    `)
    .order("data_classificacao", { ascending: true });

  classificacoesQuery = aplicarPeriodo(
    classificacoesQuery,
    "data_classificacao",
    filtros
  );

  let produtosQuery = supabase
    .from("produto_final")
    .select(`
      id,
      data_registro,
      hora,
      area_id,
      calibre_id,
      quantidade_caixas,
      peso_por_caixa_kg,
      peso_total_kg,
      conferido,
      responsavel_id,
      observacao,
      areas_fazenda (
        id,
        nome,
        descricao,
        ativo
      ),
      calibres (
        id,
        codigo,
        nome,
        tipo,
        ordem
      ),
      responsaveis (
        id,
        nome
      )
    `)
    .order("data_registro", { ascending: true });

  produtosQuery = aplicarPeriodo(produtosQuery, "data_registro", filtros);

  let saidasQuery = supabase
    .from("saidas_vendas")
    .select(`
      id,
      data_saida,
      hora,
      area_id,
      cliente,
      numero_pedido,
      calibre_id,
      quantidade_caixas,
      peso_por_caixa_kg,
      peso_total_kg,
      responsavel_id,
      observacao,
      areas_fazenda (
        id,
        nome,
        descricao,
        ativo
      ),
      calibres (
        id,
        codigo,
        nome,
        tipo,
        ordem
      ),
      responsaveis (
        id,
        nome
      )
    `)
    .order("data_saida", { ascending: true });

  saidasQuery = aplicarPeriodo(saidasQuery, "data_saida", filtros);

  const estoqueAreaQuery = supabase
    .from("vw_estoque_area_atual")
    .select(`
      area_id,
      area_nome,
      area_ativa,
      calibre_id,
      calibre_codigo,
      calibre_nome,
      calibre_tipo,
      calibre_ordem,
      produto_final_caixas,
      produto_final_peso_kg,
      saidas_caixas,
      saidas_peso_kg,
      saldo_disponivel_caixas,
      peso_disponivel_kg,
      estoque_minimo_por_calibre,
      status_estoque_area
    `)
    .order("area_nome", { ascending: true })
    .order("calibre_ordem", { ascending: true });

  const [
    recebimentosResp,
    classificacoesResp,
    produtosResp,
    saidasResp,
    estoqueAreaResp,
  ] = await Promise.all([
    recebimentosQuery,
    classificacoesQuery,
    produtosQuery,
    saidasQuery,
    estoqueAreaQuery,
  ]);

  if (recebimentosResp.error) throw recebimentosResp.error;
  if (classificacoesResp.error) throw classificacoesResp.error;
  if (produtosResp.error) throw produtosResp.error;
  if (saidasResp.error) throw saidasResp.error;
  if (estoqueAreaResp.error) throw estoqueAreaResp.error;

  const recebimentos = recebimentosResp.data || [];
  const classificacoes = classificacoesResp.data || [];
  const produtos = produtosResp.data || [];
  const saidas = saidasResp.data || [];
  const estoqueAreaAtual = estoqueAreaResp.data || [];

  const recebimentoResumo = montarRecebimentoResumo(recebimentos);
  const classificacaoResumo = montarClassificacaoResumo(classificacoes);

  const produtoFinalPorArea = montarProdutoFinalPorArea(produtos);
  const saidaPorArea = montarSaidaPorArea(saidas);

  const estoqueAreaCalibre = montarEstoqueAreaCalibre(estoqueAreaAtual);
  const saldoPorAreaCalibre = montarSaldoPorAreaCalibre(estoqueAreaCalibre);
  const estoquePorArea = montarEstoquePorArea(estoqueAreaAtual);
  const saldoPorCalibre = montarSaldoPorCalibre(estoqueAreaAtual);
  const comparativoArea = montarComparativoArea(produtoFinalPorArea, saidaPorArea);

  const alertas = montarAlertas({
    estoqueAreaCalibre,
    estoquePorArea,
    saldoPorCalibre,
    produtoFinalPorArea,
    saidaPorArea,
    recebimentos,
    classificacoes,
    produtos,
  });

  const indicadores = montarIndicadores({
    recebimentos,
    classificacoes,
    produtos,
    saidas,
    estoqueAreaCalibre,
    estoquePorArea,
    saldoPorCalibre,
    alertas,
  });

  const testesFluxo = montarTestesFluxo({
    recebimentos,
    classificacoes,
    produtos,
    saidas,
    estoqueAreaCalibre,
    recebimentoResumo,
    classificacaoResumo,
    indicadores,
    alertas,
  });

  return {
    filtros,
    recebimentoResumo,
    classificacaoResumo,
    indicadores,
    alertas,
    testesFluxo,
    graficos: {
      saldoPorAreaCalibre,
      estoquePorArea,
      saldoPorCalibre,
      produtoFinalPorArea,
      saidaPorArea,
      comparativoArea,
    },
    tabelas: {
      estoqueAreaCalibre,
      estoquePorArea,
      saldoPorCalibre,
    },
    dadosDetalhados: {
      recebimentos,
      classificacoes,
      produtos,
      saidas,
      estoqueAreaAtual,
    },
  };
}

export function prepararPlanilhasBI(bi) {
  if (!bi) return {};

  const indicadores = [
    { Indicador: "Caixas recebidas", Valor: bi.indicadores.caixasRecebidas },
    { Indicador: "Peso recebido kg", Valor: bi.indicadores.pesoRecebidoKg },
    { Indicador: "Paletes classificados", Valor: bi.indicadores.paletesClassificados },
    { Indicador: "Caixas equivalentes", Valor: bi.indicadores.caixasEquivalentes },
    { Indicador: "Caixas finais produzidas", Valor: bi.indicadores.caixasFinaisProduzidas },
    { Indicador: "Peso final produzido kg", Valor: bi.indicadores.pesoFinalProduzido },
    { Indicador: "Saídas caixas", Valor: bi.indicadores.saidasCaixas },
    { Indicador: "Saídas peso kg", Valor: bi.indicadores.saidasPesoKg },
    { Indicador: "Saldo disponível caixas", Valor: bi.indicadores.saldoDisponivel },
    { Indicador: "Peso disponível kg", Valor: bi.indicadores.pesoDisponivelKg },
    { Indicador: "Áreas com saldo", Valor: bi.indicadores.areasComSaldo },
    { Indicador: "Calibres com saldo", Valor: bi.indicadores.calibresComSaldo },
    { Indicador: "Combinações Área + Calibre com saldo", Valor: bi.indicadores.combinacoesComSaldo },
    { Indicador: "Estoque crítico", Valor: bi.indicadores.estoqueCritico },
    { Indicador: "Sem estoque", Valor: bi.indicadores.semEstoque },
    { Indicador: "Eficiência produção %", Valor: bi.indicadores.eficienciaProducao },
    { Indicador: "Giro saída %", Valor: bi.indicadores.giroSaida },
  ];

  const alertas = [
    {
      Alerta: "Área com maior produto final",
      Valor: bi.alertas.maiorAreaProduto?.area || "-",
    },
    {
      Alerta: "Área com maior saída",
      Valor: bi.alertas.maiorAreaSaida?.area || "-",
    },
    {
      Alerta: "Área com menor saldo",
      Valor: bi.alertas.menorAreaSaldo?.area || "-",
    },
    {
      Alerta: "Calibre com maior saldo",
      Valor: bi.alertas.maiorCalibreSaldo?.calibre || "-",
    },
    {
      Alerta: "Calibre com menor saldo",
      Valor: bi.alertas.menorCalibreSaldo?.calibre || "-",
    },
    {
      Alerta: "Combinações críticas Área + Calibre",
      Valor: bi.alertas.combinacoesCriticas.length,
    },
    {
      Alerta: "Saldos negativos",
      Valor: bi.alertas.saldoNegativo.length,
    },
  ];

  const estoqueAreaCalibre = bi.tabelas.estoqueAreaCalibre.map((item) => ({
    "Área / Pivô": item.area,
    Calibre: item.calibre,
    "Produto final caixas": item.produto_final_caixas,
    "Produto final kg": item.produto_final_peso_kg,
    "Saídas caixas": item.saidas_caixas,
    "Saídas kg": item.saidas_peso_kg,
    "Saldo caixas": item.saldo_disponivel_caixas,
    "Saldo kg": item.peso_disponivel_kg,
    Status: item.status_texto,
  }));

  const resumoArea = bi.tabelas.estoquePorArea.map((item) => ({
    "Área / Pivô": item.area,
    "Produto final caixas": item.produto_final_caixas,
    "Produto final kg": item.produto_final_peso_kg,
    "Saídas caixas": item.saidas_caixas,
    "Saídas kg": item.saidas_peso_kg,
    "Saldo caixas": item.saldo_disponivel_caixas,
    "Saldo kg": item.peso_disponivel_kg,
    "Calibres total": item.calibres_total,
    "Calibres com saldo": item.calibres_com_saldo,
    "Giro %": item.giro_area,
    Status: item.status_texto,
  }));

  const resumoCalibre = bi.tabelas.saldoPorCalibre.map((item) => ({
    Calibre: item.calibre,
    "Produto final caixas": item.produto_final_caixas,
    "Produto final kg": item.produto_final_peso_kg,
    "Saídas caixas": item.saidas_caixas,
    "Saídas kg": item.saidas_peso_kg,
    "Saldo caixas": item.saldo_disponivel_caixas,
    "Saldo kg": item.peso_disponivel_kg,
    "Áreas total": item.areas_total,
    "Áreas com saldo": item.areas_com_saldo,
    "Giro %": item.giro_calibre,
    Status: item.status_texto,
  }));

  const produtosDetalhados = bi.dadosDetalhados.produtos.map((item) => ({
    Data: item.data_registro,
    Hora: item.hora,
    "Área / Pivô": obterAreaLabel(item),
    Calibre: obterCalibreLabel(item),
    Caixas: item.quantidade_caixas,
    "Peso por caixa kg": item.peso_por_caixa_kg,
    "Peso total kg": item.peso_total_kg,
    Conferido: item.conferido ? "Sim" : "Não",
    Responsável: item.responsaveis?.nome || "-",
    Observação: item.observacao || "-",
  }));

  const saidasDetalhadas = bi.dadosDetalhados.saidas.map((item) => ({
    Data: item.data_saida,
    Hora: item.hora,
    "Área / Pivô": obterAreaLabel(item),
    Cliente: item.cliente || "-",
    "Pedido / Carga": item.numero_pedido || "-",
    Calibre: obterCalibreLabel(item),
    Caixas: item.quantidade_caixas,
    "Peso por caixa kg": item.peso_por_caixa_kg,
    "Peso total kg": item.peso_total_kg,
    Responsável: item.responsaveis?.nome || "-",
    Observação: item.observacao || "-",
  }));

  return {
    Indicadores: indicadores,
    Alertas: alertas,
    "Teste Fluxo": bi.testesFluxo,
    "Estoque Area Calibre": estoqueAreaCalibre,
    "Resumo Area": resumoArea,
    "Resumo Calibre": resumoCalibre,
    "Produto Area": bi.graficos.produtoFinalPorArea,
    "Saida Area": bi.graficos.saidaPorArea,
    "Saldo Area Calibre": bi.graficos.saldoPorAreaCalibre,
    "Saldo Calibre": bi.graficos.saldoPorCalibre,
    "Comparativo Area": bi.graficos.comparativoArea,
    "Produto Final": produtosDetalhados,
    Saidas: saidasDetalhadas,
    "Estoque Detalhado": bi.dadosDetalhados.estoqueAreaAtual,
  };
}