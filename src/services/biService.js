import { supabase } from "./supabaseClient";

function numero(valor) {
  const convertido = Number(valor);

  if (!Number.isFinite(convertido)) {
    return 0;
  }

  return convertido;
}

function arredondar(valor, casas = 2) {
  const fator = 10 ** casas;
  return Math.round(numero(valor) * fator) / fator;
}

function obterDataAtualLocal() {
  const data = new Date();
  const dataLocal = new Date(data.getTime() - data.getTimezoneOffset() * 60000);

  return dataLocal.toISOString().slice(0, 10);
}

function obterInicioMesAtual() {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const dataLocal = new Date(
    primeiroDia.getTime() - primeiroDia.getTimezoneOffset() * 60000
  );

  return dataLocal.toISOString().slice(0, 10);
}

function montarFiltroChegadaMensal(filtros = {}) {
  return {
    ...filtros,
    dataInicial: filtros.dataInicial || obterInicioMesAtual(),
    dataFinal: filtros.dataFinal || obterDataAtualLocal(),
  };
}

function aplicarFiltroData(query, campoData, filtros = {}) {
  let consulta = query;

  if (filtros.dataInicial) {
    consulta = consulta.gte(campoData, filtros.dataInicial);
  }

  if (filtros.dataFinal) {
    consulta = consulta.lte(campoData, filtros.dataFinal);
  }

  return consulta;
}

function criarMapa(lista = []) {
  const mapa = new Map();

  lista.forEach((item) => {
    if (item?.id) {
      mapa.set(item.id, item);
    }
  });

  return mapa;
}

function obterAreaIdBruto(item) {
  return (
    item?.area_fazenda_id ||
    item?.area_id ||
    item?.area_pivo_id ||
    item?.areaId ||
    ""
  );
}

function pertenceArea(item, areaId) {
  if (!areaId) return true;

  return String(obterAreaIdBruto(item) || "") === String(areaId);
}

async function buscarConfiguracoesBI() {
  const { data } = await supabase
    .from("configuracoes")
    .select("estoque_minimo_por_calibre")
    .limit(1)
    .maybeSingle();

  return data || {
    estoque_minimo_por_calibre: 0,
  };
}

async function buscarAreasBI() {
  const { data } = await supabase
    .from("areas_fazenda")
    .select("id, nome, ativo")
    .order("nome", { ascending: true });

  return data || [];
}

async function buscarCalibresBI() {
  const { data } = await supabase
    .from("calibres")
    .select("id, codigo, nome, ativo")
    .order("ordem", { ascending: true });

  return data || [];
}

async function buscarResponsaveisBI() {
  const { data } = await supabase
    .from("responsaveis")
    .select("id, nome, ativo")
    .order("nome", { ascending: true });

  return data || [];
}

async function buscarFazendasBI() {
  const { data } = await supabase
    .from("fazendas")
    .select("id, nome, ativo")
    .order("nome", { ascending: true });

  return data || [];
}

async function buscarProdutoFinalBI(filtros = {}) {
  let query = supabase
    .from("produto_final")
    .select("*")
    .order("data_registro", { ascending: true })
    .order("hora", { ascending: true });

  query = aplicarFiltroData(query, "data_registro", filtros);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "Não foi possível carregar Produto Final.");
  }

  return data || [];
}

async function buscarSaidasBI(filtros = {}) {
  let query = supabase
    .from("saidas_vendas")
    .select("*")
    .order("data_saida", { ascending: true })
    .order("hora", { ascending: true });

  query = aplicarFiltroData(query, "data_saida", filtros);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "Não foi possível carregar Saídas.");
  }

  return data || [];
}

async function buscarClassificacoesBI(filtros = {}) {
  let query = supabase
    .from("alho_classificado")
    .select("*")
    .order("data_classificacao", { ascending: true })
    .order("hora", { ascending: true });

  query = aplicarFiltroData(query, "data_classificacao", filtros);

  const { data } = await query;

  return data || [];
}

async function buscarChegadasBI(filtros = {}) {
  let query = supabase
    .from("chegada_fazenda")
    .select("*")
    .order("data_recebimento", { ascending: true })
    .order("hora", { ascending: true });

  query = aplicarFiltroData(query, "data_recebimento", filtros);

  const { data } = await query;

  return data || [];
}

function hidratarRegistros(lista = [], mapas = {}) {
  const { areasMap, calibresMap, responsaveisMap, fazendasMap } = mapas;

  return lista.map((item) => {
    const areaId = obterAreaIdBruto(item);

    return {
      ...item,

      area_fazenda_id: areaId || item.area_fazenda_id || null,

      areas_fazenda: areaId ? areasMap?.get(areaId) || null : null,

      calibres: item.calibre_id
        ? calibresMap?.get(item.calibre_id) || null
        : null,

      responsaveis: item.responsavel_id
        ? responsaveisMap?.get(item.responsavel_id) || null
        : null,

      fazendas: item.fazenda_id ? fazendasMap?.get(item.fazenda_id) || null : null,
    };
  });
}

function obterAreaId(item) {
  return item?.area_fazenda_id || item?.areas_fazenda?.id || "sem-area";
}

function obterAreaNome(item) {
  return (
    item?.areas_fazenda?.nome ||
    item?.area_nome ||
    item?.area_fazenda_nome ||
    "Sem Área / Pivô"
  );
}

function obterCalibreId(item) {
  return item?.calibre_id || item?.calibres?.id || "sem-calibre";
}

function obterCalibreCodigo(item) {
  return item?.calibres?.codigo || item?.calibre_codigo || "-";
}

function obterCalibreNome(item) {
  return item?.calibres?.nome || item?.calibre_nome || "Sem calibre";
}

function obterCalibreTexto(item) {
  return `${obterCalibreCodigo(item)} — ${obterCalibreNome(item)}`;
}

function obterPesoProdutoFinal(item) {
  const pesoGerado = numero(item.peso_total_kg);

  if (pesoGerado > 0) {
    return pesoGerado;
  }

  return numero(item.quantidade_caixas) * numero(item.peso_por_caixa_kg);
}

function obterPesoSaida(item) {
  const pesoGerado = numero(item.peso_total_kg);

  if (pesoGerado > 0) {
    return pesoGerado;
  }

  return numero(item.quantidade_caixas) * numero(item.peso_por_caixa_kg);
}

function obterTotalCaixasClassificadas(item) {
  const totalGerado = numero(item.total_caixas);

  if (totalGerado > 0) {
    return totalGerado;
  }

  return numero(item.quantidade_paletes) * numero(item.caixas_por_palete);
}

function obterPesoChegada(item) {
  const pesoGerado = numero(item.peso_total_estimado_kg);

  if (pesoGerado > 0) {
    return pesoGerado;
  }

  return numero(item.quantidade_caixas) * numero(item.media_peso_caixa_kg);
}

function criarLinhaEstoque(item) {
  const areaId = obterAreaId(item);
  const calibreId = obterCalibreId(item);

  return {
    chave: `${areaId}__${calibreId}`,

    area_fazenda_id: areaId,
    area: obterAreaNome(item),

    calibre_id: calibreId,
    calibre: obterCalibreTexto(item),
    calibre_codigo: obterCalibreCodigo(item),
    calibre_nome: obterCalibreNome(item),

    produto_final_caixas: 0,
    produto_final_peso_kg: 0,

    saidas_caixas: 0,
    saidas_peso_kg: 0,

    saldo_disponivel_caixas: 0,
    peso_disponivel_kg: 0,
    peso_medio_por_caixa_kg: 0,

    status: "normal",
  };
}

function montarEstoqueAreaCalibre(produtoFinal = [], saidas = [], estoqueMinimo = 0) {
  const mapa = new Map();

  produtoFinal.forEach((item) => {
    const chave = `${obterAreaId(item)}__${obterCalibreId(item)}`;

    if (!mapa.has(chave)) {
      mapa.set(chave, criarLinhaEstoque(item));
    }

    const linha = mapa.get(chave);

    linha.produto_final_caixas += numero(item.quantidade_caixas);
    linha.produto_final_peso_kg += obterPesoProdutoFinal(item);
  });

  saidas.forEach((item) => {
    const chave = `${obterAreaId(item)}__${obterCalibreId(item)}`;

    if (!mapa.has(chave)) {
      mapa.set(chave, criarLinhaEstoque(item));
    }

    const linha = mapa.get(chave);

    linha.saidas_caixas += numero(item.quantidade_caixas);
    linha.saidas_peso_kg += obterPesoSaida(item);
  });

  return Array.from(mapa.values())
    .map((linha) => {
      const saldoCaixas =
        numero(linha.produto_final_caixas) - numero(linha.saidas_caixas);

      const pesoDisponivel =
        numero(linha.produto_final_peso_kg) - numero(linha.saidas_peso_kg);

      let status = "normal";

      if (saldoCaixas <= 0) {
        status = "sem_estoque";
      } else if (
        numero(estoqueMinimo) > 0 &&
        saldoCaixas <= numero(estoqueMinimo)
      ) {
        status = "baixo";
      }

      return {
        ...linha,

        produto_final_caixas: arredondar(linha.produto_final_caixas, 3),
        produto_final_peso_kg: arredondar(linha.produto_final_peso_kg, 3),

        saidas_caixas: arredondar(linha.saidas_caixas, 3),
        saidas_peso_kg: arredondar(linha.saidas_peso_kg, 3),

        saldo_disponivel_caixas: arredondar(saldoCaixas, 3),
        peso_disponivel_kg: arredondar(pesoDisponivel, 3),

        peso_medio_por_caixa_kg:
          saldoCaixas > 0 ? arredondar(pesoDisponivel / saldoCaixas, 3) : 0,

        status,
      };
    })
    .sort((a, b) => {
      if (a.area !== b.area) {
        return String(a.area).localeCompare(String(b.area), "pt-BR", {
          numeric: true,
          sensitivity: "base",
        });
      }

      return String(a.calibre).localeCompare(String(b.calibre), "pt-BR", {
        numeric: true,
        sensitivity: "base",
      });
    });
}

function montarEstoquePorArea(estoqueAreaCalibre = []) {
  const mapa = new Map();

  estoqueAreaCalibre.forEach((item) => {
    const areaId = item.area_fazenda_id || "sem-area";

    if (!mapa.has(areaId)) {
      mapa.set(areaId, {
        area_fazenda_id: areaId,
        area: item.area || "Sem Área / Pivô",

        produto_final_caixas: 0,
        produto_final_peso_kg: 0,

        saidas_caixas: 0,
        saidas_peso_kg: 0,

        saldo_disponivel_caixas: 0,
        peso_disponivel_kg: 0,

        calibres_com_saldo: 0,
        giro_area: 0,
        status_area: "normal",
      });
    }

    const area = mapa.get(areaId);

    area.produto_final_caixas += numero(item.produto_final_caixas);
    area.produto_final_peso_kg += numero(item.produto_final_peso_kg);

    area.saidas_caixas += numero(item.saidas_caixas);
    area.saidas_peso_kg += numero(item.saidas_peso_kg);

    area.saldo_disponivel_caixas += numero(item.saldo_disponivel_caixas);
    area.peso_disponivel_kg += numero(item.peso_disponivel_kg);

    if (numero(item.saldo_disponivel_caixas) > 0) {
      area.calibres_com_saldo += 1;
    }

    if (item.status === "baixo") {
      area.status_area = "baixo";
    }

    if (item.status === "sem_estoque" && area.status_area !== "baixo") {
      area.status_area = "sem_estoque";
    }
  });

  return Array.from(mapa.values()).map((area) => ({
    ...area,

    produto_final_caixas: arredondar(area.produto_final_caixas, 3),
    produto_final_peso_kg: arredondar(area.produto_final_peso_kg, 3),

    saidas_caixas: arredondar(area.saidas_caixas, 3),
    saidas_peso_kg: arredondar(area.saidas_peso_kg, 3),

    saldo_disponivel_caixas: arredondar(area.saldo_disponivel_caixas, 3),
    peso_disponivel_kg: arredondar(area.peso_disponivel_kg, 3),

    giro_area:
      area.produto_final_caixas > 0
        ? arredondar((area.saidas_caixas / area.produto_final_caixas) * 100, 2)
        : 0,
  }));
}

function montarChegadasPorDia(chegadas = []) {
  const mapa = new Map();

  chegadas.forEach((item) => {
    const data = item.data_recebimento || "Sem data";

    if (!mapa.has(data)) {
      mapa.set(data, {
        data,
        caixas: 0,
        peso_kg: 0,
        registros: 0,
      });
    }

    const linha = mapa.get(data);

    linha.caixas += numero(item.quantidade_caixas);
    linha.peso_kg += obterPesoChegada(item);
    linha.registros += 1;
  });

  return Array.from(mapa.values()).sort((a, b) =>
    String(a.data).localeCompare(String(b.data), "pt-BR", {
      numeric: true,
      sensitivity: "base",
    })
  );
}

function montarIndicadores({
  produtoFinalFiltrado,
  saidasFiltradas,
  classificacoes,
  estoqueAreaCalibreFiltrado,
  estoqueAreaCalibreGeral,
}) {
  const saldoDisponivel = estoqueAreaCalibreFiltrado.reduce(
    (total, item) => total + numero(item.saldo_disponivel_caixas),
    0
  );

  const pesoDisponivelKg = estoqueAreaCalibreFiltrado.reduce(
    (total, item) => total + numero(item.peso_disponivel_kg),
    0
  );

  const caixasFinaisProduzidas = produtoFinalFiltrado.reduce(
    (total, item) => total + numero(item.quantidade_caixas),
    0
  );

  const pesoFinalProduzido = produtoFinalFiltrado.reduce(
    (total, item) => total + obterPesoProdutoFinal(item),
    0
  );

  const saidasCaixas = saidasFiltradas.reduce(
    (total, item) => total + numero(item.quantidade_caixas),
    0
  );

  const saidasPesoKg = saidasFiltradas.reduce(
    (total, item) => total + obterPesoSaida(item),
    0
  );

  const caixasEquivalentesClassificadas = classificacoes.reduce(
    (total, item) => total + obterTotalCaixasClassificadas(item),
    0
  );

  const areasComSaldo = new Set(
    estoqueAreaCalibreGeral
      .filter((item) => numero(item.saldo_disponivel_caixas) > 0)
      .map((item) => item.area_fazenda_id)
  );

  const calibresComSaldo = new Set(
    estoqueAreaCalibreGeral
      .filter((item) => numero(item.saldo_disponivel_caixas) > 0)
      .map((item) => item.calibre_id)
  );

  return {
    saldoDisponivel: arredondar(saldoDisponivel, 3),
    pesoDisponivelKg: arredondar(pesoDisponivelKg, 3),

    areasComSaldo: areasComSaldo.size,
    calibresComSaldo: calibresComSaldo.size,

    caixasFinaisProduzidas: arredondar(caixasFinaisProduzidas, 3),
    pesoFinalProduzido: arredondar(pesoFinalProduzido, 3),

    saidasCaixas: arredondar(saidasCaixas, 3),
    saidasPesoKg: arredondar(saidasPesoKg, 3),

    giroSaida:
      caixasFinaisProduzidas > 0
        ? arredondar((saidasCaixas / caixasFinaisProduzidas) * 100, 2)
        : 0,

    eficienciaProducao:
      caixasEquivalentesClassificadas > 0
        ? arredondar(
            (caixasFinaisProduzidas / caixasEquivalentesClassificadas) * 100,
            2
          )
        : 0,
  };
}

function montarGraficos({
  estoqueAreaCalibre,
  estoquePorArea,
  chegadasFiltradas,
}) {
  const saldoPorAreaCalibre = estoqueAreaCalibre
    .map((item) => ({
      area_fazenda_id: item.area_fazenda_id,
      area: item.area,
      calibre_id: item.calibre_id,
      calibre: item.calibre,
      nome: `${item.area} + ${item.calibre}`,
      valor: item.saldo_disponivel_caixas,
      peso: item.peso_disponivel_kg,
    }))
    .filter((item) => numero(item.valor) > 0)
    .sort((a, b) => numero(b.valor) - numero(a.valor));

  const estoquePorAreaGrafico = estoquePorArea
    .map((item) => ({
      area_fazenda_id: item.area_fazenda_id,
      area: item.area,
      nome: item.area,
      valor: item.saldo_disponivel_caixas,
      peso: item.peso_disponivel_kg,
    }))
    .filter((item) => numero(item.valor) > 0)
    .sort((a, b) => numero(b.valor) - numero(a.valor));

  const chegadasPorDia = montarChegadasPorDia(chegadasFiltradas);

  return {
    saldoPorAreaCalibre,
    estoquePorArea: estoquePorAreaGrafico,
    chegadasPorDia,
  };
}

function normalizarProdutoFinalParaPlanilha(lista = []) {
  return lista.map((item) => ({
    Data: item.data_registro || "",
    Hora: item.hora || "",
    "Área / Pivô": obterAreaNome(item),
    Calibre: obterCalibreTexto(item),
    Caixas: numero(item.quantidade_caixas),
    "Peso por caixa": numero(item.peso_por_caixa_kg),
    "Peso total": obterPesoProdutoFinal(item),
    Responsável: item.responsaveis?.nome || "",
    Status: item.conferido ? "Conferido" : "Pendente",
    Observação: item.observacao || "",
  }));
}

function normalizarSaidasParaPlanilha(lista = []) {
  return lista.map((item) => ({
    Data: item.data_saida || "",
    Hora: item.hora || "",
    "Área / Pivô": obterAreaNome(item),
    Cliente: item.cliente || "",
    "Pedido / Carga": item.numero_pedido || "",
    Calibre: obterCalibreTexto(item),
    Caixas: numero(item.quantidade_caixas),
    "Peso total": obterPesoSaida(item),
    Responsável: item.responsaveis?.nome || "",
    Observação: item.observacao || "",
  }));
}

export async function buscarDadosBI(filtros = {}) {
  const filtrosNormalizados = {
    dataInicial: filtros.dataInicial || "",
    dataFinal: filtros.dataFinal || "",
    areaFazendaId: filtros.areaFazendaId || "",
  };

  const filtrosChegadaGrafico = montarFiltroChegadaMensal(filtrosNormalizados);

  const [
    configuracoes,
    areas,
    calibres,
    responsaveis,
    fazendas,
    produtoFinalBruto,
    saidasBruto,
    classificacoesBruto,
    chegadasBruto,
  ] = await Promise.all([
    buscarConfiguracoesBI(),
    buscarAreasBI(),
    buscarCalibresBI(),
    buscarResponsaveisBI(),
    buscarFazendasBI(),
    buscarProdutoFinalBI(filtrosNormalizados),
    buscarSaidasBI(filtrosNormalizados),
    buscarClassificacoesBI(filtrosNormalizados),
    buscarChegadasBI(filtrosChegadaGrafico),
  ]);

  const mapas = {
    areasMap: criarMapa(areas),
    calibresMap: criarMapa(calibres),
    responsaveisMap: criarMapa(responsaveis),
    fazendasMap: criarMapa(fazendas),
  };

  const produtoFinalGeral = hidratarRegistros(produtoFinalBruto, mapas);
  const saidasGeral = hidratarRegistros(saidasBruto, mapas);
  const classificacoes = hidratarRegistros(classificacoesBruto, mapas);
  const chegadasGeral = hidratarRegistros(chegadasBruto, mapas);

  const produtoFinalFiltrado = produtoFinalGeral.filter((item) =>
    pertenceArea(item, filtrosNormalizados.areaFazendaId)
  );

  const saidasFiltradas = saidasGeral.filter((item) =>
    pertenceArea(item, filtrosNormalizados.areaFazendaId)
  );

  const chegadasFiltradas = chegadasGeral.filter((item) =>
    pertenceArea(item, filtrosNormalizados.areaFazendaId)
  );

  const estoqueMinimo = numero(configuracoes.estoque_minimo_por_calibre);

  const estoqueAreaCalibreGeral = montarEstoqueAreaCalibre(
    produtoFinalGeral,
    saidasGeral,
    estoqueMinimo
  );

  const estoqueAreaCalibreFiltrado = montarEstoqueAreaCalibre(
    produtoFinalFiltrado,
    saidasFiltradas,
    estoqueMinimo
  );

  const estoquePorAreaFiltrado = montarEstoquePorArea(estoqueAreaCalibreFiltrado);

  const indicadores = montarIndicadores({
    produtoFinalFiltrado,
    saidasFiltradas,
    classificacoes,
    estoqueAreaCalibreFiltrado,
    estoqueAreaCalibreGeral,
  });

  const graficos = montarGraficos({
    estoqueAreaCalibre: estoqueAreaCalibreFiltrado,
    estoquePorArea: estoquePorAreaFiltrado,
    chegadasFiltradas,
  });

  return {
    filtros: filtrosNormalizados,
    indicadores,
    graficos,

    tabelas: {
      estoqueAreaCalibre: estoqueAreaCalibreFiltrado,
      estoquePorArea: estoquePorAreaFiltrado,
    },

    resumoAreaCalibre: estoqueAreaCalibreFiltrado,
    resumoPorCalibre: estoqueAreaCalibreFiltrado,

    dadosDetalhados: {
      produtoFinal: produtoFinalFiltrado,
      saidas: saidasFiltradas,
      classificacoes,
      chegadas: chegadasFiltradas,
      estoqueAtual: estoqueAreaCalibreFiltrado,
    },
  };
}

export function prepararPlanilhasBI(bi) {
  const indicadores = bi?.indicadores || {};
  const tabelas = bi?.tabelas || {};
  const detalhes = bi?.dadosDetalhados || {};
  const graficos = bi?.graficos || {};

  return {
    Indicadores: [
      {
        "Produto final caixas": indicadores.caixasFinaisProduzidas || 0,
        "Produto final kg": indicadores.pesoFinalProduzido || 0,
        "Saídas caixas": indicadores.saidasCaixas || 0,
        "Saídas kg": indicadores.saidasPesoKg || 0,
        "Saldo disponível": indicadores.saldoDisponivel || 0,
        "Peso disponível kg": indicadores.pesoDisponivelKg || 0,
        "Áreas com saldo": indicadores.areasComSaldo || 0,
        "Calibres com saldo": indicadores.calibresComSaldo || 0,
      },
    ],

    "Chegadas por Dia": graficos.chegadasPorDia || [],
    "Estoque Area Calibre": tabelas.estoqueAreaCalibre || [],
    "Estoque Por Area": tabelas.estoquePorArea || [],

    "Produto Final": normalizarProdutoFinalParaPlanilha(
      detalhes.produtoFinal || []
    ),

    Saidas: normalizarSaidasParaPlanilha(detalhes.saidas || []),
  };
}