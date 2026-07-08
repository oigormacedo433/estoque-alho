// Serviço dos Relatórios.
//
// Etapa 20:
// - Recebimento da fazenda
// - Alho classificado
// - Produto final
// - Saídas / vendas
// - Estoque atual
// - Consolidado por calibre
//
// Tudo vem do Supabase.
// Não usamos dados fictícios.

import { supabase } from "./supabaseClient";

export const TIPOS_RELATORIO = [
  {
    value: "recebimento_fazenda",
    label: "Recebimento da fazenda",
  },
  {
    value: "alho_classificado",
    label: "Alho classificado",
  },
  {
    value: "produto_final",
    label: "Produto final",
  },
  {
    value: "saidas_vendas",
    label: "Saídas / vendas",
  },
  {
    value: "estoque_atual",
    label: "Estoque atual",
  },
  {
    value: "consolidado_calibre",
    label: "Consolidado por calibre",
  },
];

function formatarData(data) {
  if (!data) return "-";

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarHora(hora) {
  if (!hora) return "-";

  return hora.slice(0, 5);
}

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function formatarKg(valor) {
  return `${Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
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

export async function listarOpcoesRelatorios() {
  const [calibresResp, fazendasResp, responsaveisResp] = await Promise.all([
    supabase
      .from("calibres")
      .select("id, codigo, nome, tipo, ordem, ativo")
      .eq("ativo", true)
      .order("ordem", { ascending: true }),

    supabase
      .from("fazendas")
      .select("id, nome, ativo")
      .eq("ativo", true)
      .order("nome", { ascending: true }),

    supabase
      .from("responsaveis")
      .select("id, nome, ativo")
      .eq("ativo", true)
      .order("nome", { ascending: true }),
  ]);

  if (calibresResp.error) throw calibresResp.error;
  if (fazendasResp.error) throw fazendasResp.error;
  if (responsaveisResp.error) throw responsaveisResp.error;

  return {
    calibres: calibresResp.data || [],
    fazendas: fazendasResp.data || [],
    responsaveis: responsaveisResp.data || [],
  };
}

async function gerarRelatorioRecebimentoFazenda(filtros) {
  let query = supabase
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
      criado_em,
      atualizado_em,
      fazendas (
        id,
        nome
      ),
      responsaveis (
        id,
        nome
      )
    `)
    .order("data_recebimento", { ascending: false })
    .order("hora", { ascending: false });

  query = aplicarPeriodo(query, "data_recebimento", filtros);

  if (filtros.fazendaId) {
    query = query.eq("fazenda_id", filtros.fazendaId);
  }

  if (filtros.responsavelId) {
    query = query.eq("responsavel_id", filtros.responsavelId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function gerarRelatorioAlhoClassificado(filtros) {
  let query = supabase
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
      criado_em,
      atualizado_em,
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
    .order("data_classificacao", { ascending: false })
    .order("hora", { ascending: false });

  query = aplicarPeriodo(query, "data_classificacao", filtros);

  if (filtros.calibreId) {
    query = query.eq("calibre_id", filtros.calibreId);
  }

  if (filtros.fazendaId) {
    query = query.eq("fazenda_id", filtros.fazendaId);
  }

  if (filtros.responsavelId) {
    query = query.eq("responsavel_id", filtros.responsavelId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function gerarRelatorioProdutoFinal(filtros) {
  let query = supabase
    .from("produto_final")
    .select(`
      id,
      data_registro,
      hora,
      calibre_id,
      quantidade_caixas,
      peso_por_caixa_kg,
      peso_total_kg,
      conferido,
      responsavel_id,
      observacao,
      criado_em,
      atualizado_em,
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
    .order("data_registro", { ascending: false })
    .order("hora", { ascending: false });

  query = aplicarPeriodo(query, "data_registro", filtros);

  if (filtros.calibreId) {
    query = query.eq("calibre_id", filtros.calibreId);
  }

  if (filtros.responsavelId) {
    query = query.eq("responsavel_id", filtros.responsavelId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function gerarRelatorioSaidasVendas(filtros) {
  let query = supabase
    .from("saidas_vendas")
    .select(`
      id,
      data_saida,
      hora,
      cliente,
      numero_pedido,
      calibre_id,
      quantidade_caixas,
      peso_por_caixa_kg,
      peso_total_kg,
      responsavel_id,
      observacao,
      criado_em,
      atualizado_em,
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
    .order("data_saida", { ascending: false })
    .order("hora", { ascending: false });

  query = aplicarPeriodo(query, "data_saida", filtros);

  if (filtros.calibreId) {
    query = query.eq("calibre_id", filtros.calibreId);
  }

  if (filtros.responsavelId) {
    query = query.eq("responsavel_id", filtros.responsavelId);
  }

  if (filtros.cliente) {
    query = query.ilike("cliente", `%${filtros.cliente}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function gerarRelatorioEstoqueAtual(filtros) {
  let query = supabase
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
      status_estoque
    `)
    .order("calibre_ordem", { ascending: true });

  if (filtros.calibreId) {
    query = query.eq("calibre_id", filtros.calibreId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function gerarRelatorioConsolidadoCalibre(filtros) {
  let calibresQuery = supabase
    .from("calibres")
    .select("id, codigo, nome, tipo, ordem, ativo")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (filtros.calibreId) {
    calibresQuery = calibresQuery.eq("id", filtros.calibreId);
  }

  let classificadoQuery = supabase
    .from("alho_classificado")
    .select(`
      calibre_id,
      quantidade_paletes,
      total_caixas,
      data_classificacao,
      fazenda_id,
      responsavel_id
    `);

  classificadoQuery = aplicarPeriodo(
    classificadoQuery,
    "data_classificacao",
    filtros
  );

  if (filtros.calibreId) {
    classificadoQuery = classificadoQuery.eq("calibre_id", filtros.calibreId);
  }

  if (filtros.fazendaId) {
    classificadoQuery = classificadoQuery.eq("fazenda_id", filtros.fazendaId);
  }

  if (filtros.responsavelId) {
    classificadoQuery = classificadoQuery.eq(
      "responsavel_id",
      filtros.responsavelId
    );
  }

  let produtoQuery = supabase
    .from("produto_final")
    .select(`
      calibre_id,
      quantidade_caixas,
      peso_total_kg,
      data_registro,
      responsavel_id
    `);

  produtoQuery = aplicarPeriodo(produtoQuery, "data_registro", filtros);

  if (filtros.calibreId) {
    produtoQuery = produtoQuery.eq("calibre_id", filtros.calibreId);
  }

  if (filtros.responsavelId) {
    produtoQuery = produtoQuery.eq("responsavel_id", filtros.responsavelId);
  }

  let saidasQuery = supabase
    .from("saidas_vendas")
    .select(`
      calibre_id,
      quantidade_caixas,
      peso_total_kg,
      data_saida,
      cliente,
      responsavel_id
    `);

  saidasQuery = aplicarPeriodo(saidasQuery, "data_saida", filtros);

  if (filtros.calibreId) {
    saidasQuery = saidasQuery.eq("calibre_id", filtros.calibreId);
  }

  if (filtros.responsavelId) {
    saidasQuery = saidasQuery.eq("responsavel_id", filtros.responsavelId);
  }

  if (filtros.cliente) {
    saidasQuery = saidasQuery.ilike("cliente", `%${filtros.cliente}%`);
  }

  const [calibresResp, classificadoResp, produtoResp, saidasResp] =
    await Promise.all([calibresQuery, classificadoQuery, produtoQuery, saidasQuery]);

  if (calibresResp.error) throw calibresResp.error;
  if (classificadoResp.error) throw classificadoResp.error;
  if (produtoResp.error) throw produtoResp.error;
  if (saidasResp.error) throw saidasResp.error;

  const mapa = new Map();

  (calibresResp.data || []).forEach((calibre) => {
    mapa.set(calibre.id, {
      calibre_id: calibre.id,
      calibre_codigo: calibre.codigo,
      calibre_nome: calibre.nome,
      calibre_ordem: calibre.ordem,
      classificado_caixas: 0,
      classificado_paletes: 0,
      produto_final_caixas: 0,
      produto_final_kg: 0,
      saidas_caixas: 0,
      saidas_kg: 0,
      saldo_periodo_caixas: 0,
      saldo_periodo_kg: 0,
    });
  });

  (classificadoResp.data || []).forEach((item) => {
    const atual = mapa.get(item.calibre_id);

    if (!atual) return;

    atual.classificado_caixas += Number(item.total_caixas || 0);
    atual.classificado_paletes += Number(item.quantidade_paletes || 0);
  });

  (produtoResp.data || []).forEach((item) => {
    const atual = mapa.get(item.calibre_id);

    if (!atual) return;

    atual.produto_final_caixas += Number(item.quantidade_caixas || 0);
    atual.produto_final_kg += Number(item.peso_total_kg || 0);
  });

  (saidasResp.data || []).forEach((item) => {
    const atual = mapa.get(item.calibre_id);

    if (!atual) return;

    atual.saidas_caixas += Number(item.quantidade_caixas || 0);
    atual.saidas_kg += Number(item.peso_total_kg || 0);
  });

  return Array.from(mapa.values())
    .map((item) => ({
      ...item,
      saldo_periodo_caixas:
        Number(item.produto_final_caixas || 0) -
        Number(item.saidas_caixas || 0),
      saldo_periodo_kg:
        Number(item.produto_final_kg || 0) - Number(item.saidas_kg || 0),
    }))
    .sort((a, b) => a.calibre_ordem - b.calibre_ordem);
}

export async function gerarRelatorio(tipoRelatorio, filtros = {}) {
  if (tipoRelatorio === "recebimento_fazenda") {
    return gerarRelatorioRecebimentoFazenda(filtros);
  }

  if (tipoRelatorio === "alho_classificado") {
    return gerarRelatorioAlhoClassificado(filtros);
  }

  if (tipoRelatorio === "produto_final") {
    return gerarRelatorioProdutoFinal(filtros);
  }

  if (tipoRelatorio === "saidas_vendas") {
    return gerarRelatorioSaidasVendas(filtros);
  }

  if (tipoRelatorio === "estoque_atual") {
    return gerarRelatorioEstoqueAtual(filtros);
  }

  if (tipoRelatorio === "consolidado_calibre") {
    return gerarRelatorioConsolidadoCalibre(filtros);
  }

  return [];
}

export function obterColunasRelatorio(tipoRelatorio) {
  if (tipoRelatorio === "recebimento_fazenda") {
    return [
      { key: "data", label: "Data" },
      { key: "hora", label: "Hora" },
      { key: "fazenda", label: "Fazenda" },
      { key: "lote", label: "Lote" },
      { key: "caixas", label: "Caixas" },
      { key: "peso_medio", label: "Peso médio" },
      { key: "peso_total", label: "Peso total estimado" },
      { key: "conferido", label: "Conferido" },
      { key: "responsavel", label: "Responsável" },
      { key: "observacao", label: "Observação" },
    ];
  }

  if (tipoRelatorio === "alho_classificado") {
    return [
      { key: "data", label: "Data" },
      { key: "hora", label: "Hora" },
      { key: "fazenda", label: "Fazenda" },
      { key: "lote", label: "Lote" },
      { key: "calibre", label: "Calibre" },
      { key: "paletes", label: "Paletes" },
      { key: "caixas_por_palete", label: "Caixas/Palete" },
      { key: "total_caixas", label: "Total caixas" },
      { key: "conferido", label: "Conferido" },
      { key: "responsavel", label: "Responsável" },
      { key: "observacao", label: "Observação" },
    ];
  }

  if (tipoRelatorio === "produto_final") {
    return [
      { key: "data", label: "Data" },
      { key: "hora", label: "Hora" },
      { key: "calibre", label: "Calibre" },
      { key: "caixas", label: "Caixas" },
      { key: "peso_por_caixa", label: "Peso por caixa" },
      { key: "peso_total", label: "Peso total" },
      { key: "status", label: "Status" },
      { key: "responsavel", label: "Responsável" },
      { key: "observacao", label: "Observação" },
    ];
  }

  if (tipoRelatorio === "saidas_vendas") {
    return [
      { key: "data", label: "Data" },
      { key: "hora", label: "Hora" },
      { key: "cliente", label: "Cliente" },
      { key: "pedido", label: "Pedido/Carga" },
      { key: "calibre", label: "Calibre" },
      { key: "caixas", label: "Caixas" },
      { key: "peso_por_caixa", label: "Peso por caixa" },
      { key: "peso_total", label: "Peso total" },
      { key: "responsavel", label: "Responsável" },
      { key: "observacao", label: "Observação" },
    ];
  }

  if (tipoRelatorio === "estoque_atual") {
    return [
      { key: "calibre", label: "Calibre" },
      { key: "classificado", label: "Classificado" },
      { key: "produto_final", label: "Produto final" },
      { key: "saidas", label: "Saídas" },
      { key: "saldo", label: "Saldo disponível" },
      { key: "peso_disponivel", label: "Peso disponível" },
      { key: "estoque_minimo", label: "Estoque mínimo" },
      { key: "status", label: "Status" },
    ];
  }

  return [
    { key: "calibre", label: "Calibre" },
    { key: "classificado", label: "Classificado" },
    { key: "paletes", label: "Paletes" },
    { key: "produto_final", label: "Produto final" },
    { key: "peso_produzido", label: "Peso produzido" },
    { key: "saidas", label: "Saídas" },
    { key: "peso_saida", label: "Peso saída" },
    { key: "saldo_periodo", label: "Saldo período" },
    { key: "peso_saldo", label: "Peso saldo" },
  ];
}

export function prepararLinhasRelatorio(tipoRelatorio, dados = []) {
  if (tipoRelatorio === "recebimento_fazenda") {
    return dados.map((item) => ({
      data: formatarData(item.data_recebimento),
      hora: formatarHora(item.hora),
      fazenda: item.fazendas?.nome || "-",
      lote: item.lote || "-",
      caixas: formatarNumero(item.quantidade_caixas),
      peso_medio: formatarKg(item.media_peso_caixa_kg),
      peso_total: formatarKg(item.peso_total_estimado_kg),
      conferido: item.conferido ? "Sim" : "Não",
      responsavel: item.responsaveis?.nome || "-",
      observacao: item.observacao || "-",
    }));
  }

  if (tipoRelatorio === "alho_classificado") {
    return dados.map((item) => ({
      data: formatarData(item.data_classificacao),
      hora: formatarHora(item.hora),
      fazenda: item.fazendas?.nome || "-",
      lote: item.lote || "-",
      calibre: item.calibres
        ? `${item.calibres.codigo} — ${item.calibres.nome}`
        : "-",
      paletes: formatarNumero(item.quantidade_paletes),
      caixas_por_palete: formatarNumero(item.caixas_por_palete),
      total_caixas: formatarNumero(item.total_caixas),
      conferido: item.conferido ? "Sim" : "Não",
      responsavel: item.responsaveis?.nome || "-",
      observacao: item.observacao || "-",
    }));
  }

  if (tipoRelatorio === "produto_final") {
    return dados.map((item) => ({
      data: formatarData(item.data_registro),
      hora: formatarHora(item.hora),
      calibre: item.calibres
        ? `${item.calibres.codigo} — ${item.calibres.nome}`
        : "-",
      caixas: formatarNumero(item.quantidade_caixas),
      peso_por_caixa: formatarKg(item.peso_por_caixa_kg),
      peso_total: formatarKg(item.peso_total_kg),
      status: item.conferido ? "Conferido" : "Pendente",
      responsavel: item.responsaveis?.nome || "-",
      observacao: item.observacao || "-",
    }));
  }

  if (tipoRelatorio === "saidas_vendas") {
    return dados.map((item) => ({
      data: formatarData(item.data_saida),
      hora: formatarHora(item.hora),
      cliente: item.cliente || "-",
      pedido: item.numero_pedido || "-",
      calibre: item.calibres
        ? `${item.calibres.codigo} — ${item.calibres.nome}`
        : "-",
      caixas: formatarNumero(item.quantidade_caixas),
      peso_por_caixa: formatarKg(item.peso_por_caixa_kg),
      peso_total: formatarKg(item.peso_total_kg),
      responsavel: item.responsaveis?.nome || "-",
      observacao: item.observacao || "-",
    }));
  }

  if (tipoRelatorio === "estoque_atual") {
    return dados.map((item) => ({
      calibre: `${item.calibre_codigo} — ${item.calibre_nome}`,
      classificado: formatarNumero(item.estoque_classificado_caixas),
      produto_final: formatarNumero(item.produto_final_caixas),
      saidas: formatarNumero(item.saidas_caixas),
      saldo: formatarNumero(item.saldo_disponivel_caixas),
      peso_disponivel: formatarKg(item.peso_disponivel_kg),
      estoque_minimo: formatarNumero(item.estoque_minimo_por_calibre),
      status:
        item.status_estoque === "sem_estoque"
          ? "Sem estoque"
          : item.status_estoque === "baixo"
            ? "Estoque baixo"
            : "Normal",
    }));
  }

  return dados.map((item) => ({
    calibre: `${item.calibre_codigo} — ${item.calibre_nome}`,
    classificado: formatarNumero(item.classificado_caixas),
    paletes: formatarNumero(item.classificado_paletes),
    produto_final: formatarNumero(item.produto_final_caixas),
    peso_produzido: formatarKg(item.produto_final_kg),
    saidas: formatarNumero(item.saidas_caixas),
    peso_saida: formatarKg(item.saidas_kg),
    saldo_periodo: formatarNumero(item.saldo_periodo_caixas),
    peso_saldo: formatarKg(item.saldo_periodo_kg),
  }));
}

export function calcularResumoRelatorio(tipoRelatorio, dados = []) {
  if (tipoRelatorio === "recebimento_fazenda") {
    const totalCaixas = dados.reduce((total, item) => {
      return total + Number(item.quantidade_caixas || 0);
    }, 0);

    const totalPesoKg = dados.reduce((total, item) => {
      return total + Number(item.peso_total_estimado_kg || 0);
    }, 0);

    const pendentes = dados.filter((item) => !item.conferido).length;

    return {
      totalRegistros: dados.length,
      totalCaixas,
      totalPesoKg,
      extraValor: pendentes,
      extraLabel: "Pendentes",
    };
  }

  if (tipoRelatorio === "alho_classificado") {
    const totalPaletes = dados.reduce((total, item) => {
      return total + Number(item.quantidade_paletes || 0);
    }, 0);

    const totalCaixas = dados.reduce((total, item) => {
      return total + Number(item.total_caixas || 0);
    }, 0);

    const calibres = new Set(
      dados.map((item) => item.calibres?.id || item.calibre_id).filter(Boolean)
    ).size;

    return {
      totalRegistros: dados.length,
      totalCaixas,
      totalPaletes,
      extraValor: calibres,
      extraLabel: "Calibres",
    };
  }

  if (tipoRelatorio === "produto_final") {
    const totalCaixas = dados.reduce((total, item) => {
      return total + Number(item.quantidade_caixas || 0);
    }, 0);

    const totalPesoKg = dados.reduce((total, item) => {
      return total + Number(item.peso_total_kg || 0);
    }, 0);

    const calibres = new Set(
      dados.map((item) => item.calibres?.id || item.calibre_id).filter(Boolean)
    ).size;

    return {
      totalRegistros: dados.length,
      totalCaixas,
      totalPesoKg,
      extraValor: calibres,
      extraLabel: "Calibres",
    };
  }

  if (tipoRelatorio === "saidas_vendas") {
    const totalCaixas = dados.reduce((total, item) => {
      return total + Number(item.quantidade_caixas || 0);
    }, 0);

    const totalPesoKg = dados.reduce((total, item) => {
      return total + Number(item.peso_total_kg || 0);
    }, 0);

    const mapa = new Map();

    dados.forEach((item) => {
      const calibreId = item.calibres?.id || item.calibre_id;

      if (!calibreId) return;

      const atual = mapa.get(calibreId) || {
        codigo: item.calibres?.codigo || "-",
        nome: item.calibres?.nome || "-",
        caixas: 0,
      };

      atual.caixas += Number(item.quantidade_caixas || 0);

      mapa.set(calibreId, atual);
    });

    const maisVendido =
      Array.from(mapa.values()).sort((a, b) => b.caixas - a.caixas)[0] || null;

    return {
      totalRegistros: dados.length,
      totalCaixas,
      totalPesoKg,
      extraValor: maisVendido?.codigo || "-",
      extraLabel: maisVendido
        ? `${maisVendido.nome} • ${formatarNumero(maisVendido.caixas)} caixas`
        : "Calibre mais vendido",
    };
  }

  if (tipoRelatorio === "estoque_atual") {
    const totalClassificado = dados.reduce((total, item) => {
      return total + Number(item.estoque_classificado_caixas || 0);
    }, 0);

    const totalProdutoFinal = dados.reduce((total, item) => {
      return total + Number(item.produto_final_caixas || 0);
    }, 0);

    const totalSaidas = dados.reduce((total, item) => {
      return total + Number(item.saidas_caixas || 0);
    }, 0);

    const totalSaldo = dados.reduce((total, item) => {
      return total + Number(item.saldo_disponivel_caixas || 0);
    }, 0);

    return {
      totalRegistros: dados.length,
      totalCaixas: totalSaldo,
      totalClassificado,
      totalProdutoFinal,
      totalSaidas,
      extraValor: totalSaldo,
      extraLabel: "Saldo disponível",
    };
  }

  const totalClassificado = dados.reduce((total, item) => {
    return total + Number(item.classificado_caixas || 0);
  }, 0);

  const totalProdutoFinal = dados.reduce((total, item) => {
    return total + Number(item.produto_final_caixas || 0);
  }, 0);

  const totalSaidas = dados.reduce((total, item) => {
    return total + Number(item.saidas_caixas || 0);
  }, 0);

  const totalPesoKg = dados.reduce((total, item) => {
    return total + Number(item.saldo_periodo_kg || 0);
  }, 0);

  return {
    totalRegistros: dados.length,
    totalCaixas: totalProdutoFinal - totalSaidas,
    totalPesoKg,
    totalClassificado,
    totalProdutoFinal,
    totalSaidas,
    extraValor: totalProdutoFinal - totalSaidas,
    extraLabel: "Saldo do período",
  };
}