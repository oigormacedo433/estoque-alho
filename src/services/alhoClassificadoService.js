import { supabase } from "./supabaseClient";

function texto(valor) {
  const tratado = String(valor || "").trim();
  return tratado || null;
}

function numero(valor) {
  const convertido = Number(valor);

  if (!Number.isFinite(convertido)) {
    return 0;
  }

  return convertido;
}

function booleano(valor) {
  return (
    valor === true ||
    valor === "true" ||
    valor === "sim" ||
    valor === 1 ||
    valor === "1"
  );
}

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function extrairNumero(valor) {
  const match = normalizarTexto(valor).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function textosParecidosComoArea(textoA, textoB) {
  const a = normalizarTexto(textoA);
  const b = normalizarTexto(textoB);

  if (!a || !b) return false;

  if (a === b) return true;

  const numeroA = extrairNumero(a);
  const numeroB = extrairNumero(b);

  if (numeroA && numeroB && numeroA === numeroB) {
    const aTemArea = a.includes("area") || a.includes("pivo");
    const bTemArea = b.includes("area") || b.includes("pivo");

    return aTemArea && bTemArea;
  }

  return false;
}

function tratarErro(error) {
  const mensagem = String(error?.message || "");

  if (mensagem.includes("invalid input syntax for type uuid")) {
    return new Error("Selecione a Área / Pivô corretamente.");
  }

  if (mensagem.includes("Área / Pivô")) {
    return new Error(mensagem);
  }

  if (mensagem.includes("area_fazenda_id")) {
    return new Error(
      "Erro ao salvar a Área / Pivô no Alho Classificado. Verifique a coluna area_fazenda_id."
    );
  }

  if (mensagem.includes("calibre")) {
    return new Error("Verifique o calibre selecionado.");
  }

  if (error?.code === "23503") {
    return new Error(
      "Não foi possível salvar porque algum cadastro vinculado não foi encontrado."
    );
  }

  if (error?.code === "23514") {
    return new Error("Verifique os campos obrigatórios e os valores informados.");
  }

  return error;
}

const SELECT_ALHO_CLASSIFICADO = `
  id,
  data_classificacao,
  hora,
  fazenda_id,
  area_fazenda_id,
  lote,
  calibre_id,
  quantidade_paletes,
  caixas_por_palete,
  permitir_edicao_total_caixas,
  total_caixas_manual,
  total_caixas,
  conferido,
  responsavel_id,
  observacao
`;

function valoresUnicos(lista) {
  return Array.from(new Set(lista.filter(Boolean)));
}

async function buscarPorIds(tabela, ids, select) {
  const idsLimpos = valoresUnicos(ids);

  if (idsLimpos.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from(tabela)
    .select(select)
    .in("id", idsLimpos);

  if (error) {
    throw tratarErro(error);
  }

  return data || [];
}

function criarMapa(lista) {
  const mapa = new Map();

  lista.forEach((item) => {
    if (item?.id) {
      mapa.set(item.id, item);
    }
  });

  return mapa;
}

async function buscarAreasDasFazendas(fazendaIds) {
  const idsLimpos = valoresUnicos(fazendaIds);

  if (idsLimpos.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("areas_fazenda")
    .select("id, nome, fazenda_id, ativo")
    .in("fazenda_id", idsLimpos)
    .order("nome", { ascending: true });

  if (error) {
    throw tratarErro(error);
  }

  return data || [];
}

function encontrarAreaDoRegistro(registro, areas = []) {
  const areaId = registro?.area_fazenda_id || "";

  if (areaId) {
    const areaPorId = areas.find((area) => area.id === areaId);

    if (areaPorId) return areaPorId;
  }

  const lote = registro?.lote || "";
  const fazendaId = registro?.fazenda_id || "";

  if (!lote) return null;

  const areaPeloLote =
    areas.find((area) => {
      const mesmaFazenda = !fazendaId || area.fazenda_id === fazendaId;
      const mesmoNome = textosParecidosComoArea(lote, area.nome);

      return mesmaFazenda && mesmoNome;
    }) || null;

  return areaPeloLote;
}

function loteFoiUsadoComoArea(registro, area) {
  if (!registro?.lote || !area?.nome) return false;

  return textosParecidosComoArea(registro.lote, area.nome);
}

async function hidratarRegistros(registros) {
  const lista = registros || [];

  const fazendaIds = lista.map((item) => item.fazenda_id);
  const areaIds = lista.map((item) => item.area_fazenda_id);
  const calibreIds = lista.map((item) => item.calibre_id);
  const responsavelIds = lista.map((item) => item.responsavel_id);

  const [fazendas, areasPorId, areasDasFazendas, calibres, responsaveis] =
    await Promise.all([
      buscarPorIds("fazendas", fazendaIds, "id, nome, ativo, observacao"),
      buscarPorIds("areas_fazenda", areaIds, "id, nome, fazenda_id, ativo"),
      buscarAreasDasFazendas(fazendaIds),
      buscarPorIds("calibres", calibreIds, "id, codigo, nome, tipo, ativo"),
      buscarPorIds("responsaveis", responsavelIds, "id, nome, ativo, observacao"),
    ]);

  const todasAreasMap = new Map();

  [...areasPorId, ...areasDasFazendas].forEach((area) => {
    if (area?.id) {
      todasAreasMap.set(area.id, area);
    }
  });

  const todasAreas = Array.from(todasAreasMap.values());

  const mapaFazendas = criarMapa(fazendas);
  const mapaCalibres = criarMapa(calibres);
  const mapaResponsaveis = criarMapa(responsaveis);

  return lista.map((item) => {
    const area = encontrarAreaDoRegistro(item, todasAreas);
    const areaIdFinal = area?.id || item.area_fazenda_id || "";

    const fazenda =
      mapaFazendas.get(item.fazenda_id) ||
      mapaFazendas.get(area?.fazenda_id) ||
      null;

    const calibre = mapaCalibres.get(item.calibre_id) || null;
    const responsavel = mapaResponsaveis.get(item.responsavel_id) || null;

    const loteCorrigido = loteFoiUsadoComoArea(item, area) ? "" : item.lote || "";

    return {
      ...item,

      lote: loteCorrigido,
      lote_original: item.lote || "",

      area_id: areaIdFinal,
      area_fazenda_id: areaIdFinal,

      fazendas: fazenda,
      areas_fazenda: area
        ? {
            ...area,
            fazendas: fazenda,
          }
        : null,
      calibres: calibre,
      responsaveis: responsavel,

      fazenda_nome: fazenda?.nome || "-",
      area_nome: area?.nome || "-",
      area_fazenda_nome: area?.nome || "-",
      calibre_codigo: calibre?.codigo || "-",
      calibre_nome: calibre?.nome || "-",
      responsavel_nome: responsavel?.nome || "-",
    };
  });
}

function validarPayload(dados) {
  if (!dados.data_classificacao) {
    throw new Error("Informe a data de classificação.");
  }

  if (!dados.hora) {
    throw new Error("Informe a hora.");
  }

  if (!dados.fazenda_id) {
    throw new Error("Selecione a fazenda.");
  }

  if (!dados.area_fazenda_id && !dados.area_id) {
    throw new Error("Selecione a Área / Pivô.");
  }

  if (!dados.calibre_id) {
    throw new Error("Selecione o calibre.");
  }

  if (numero(dados.quantidade_paletes) <= 0) {
    throw new Error("A quantidade de paletes precisa ser maior que zero.");
  }

  if (numero(dados.caixas_por_palete) <= 0) {
    throw new Error("As caixas por palete precisam ser maior que zero.");
  }

  if (!dados.responsavel_id) {
    throw new Error("Selecione o responsável.");
  }

  if (booleano(dados.permitir_edicao_total_caixas)) {
    if (numero(dados.total_caixas_manual) <= 0) {
      throw new Error("O total de caixas manual precisa ser maior que zero.");
    }
  }
}

function montarPayload(dados) {
  validarPayload(dados);

  const permitirEdicaoTotal = booleano(dados.permitir_edicao_total_caixas);
  const areaSelecionada = dados.area_fazenda_id || dados.area_id;

  return {
    data_classificacao: dados.data_classificacao,
    hora: dados.hora,
    fazenda_id: dados.fazenda_id,
    area_fazenda_id: areaSelecionada,
    lote: texto(dados.lote),
    calibre_id: dados.calibre_id,
    quantidade_paletes: numero(dados.quantidade_paletes),
    caixas_por_palete: numero(dados.caixas_por_palete),
    permitir_edicao_total_caixas: permitirEdicaoTotal,
    total_caixas_manual: permitirEdicaoTotal
      ? numero(dados.total_caixas_manual)
      : null,
    conferido: booleano(dados.conferido),
    responsavel_id: dados.responsavel_id,
    observacao: texto(dados.observacao),
  };
}

export async function listarAlhoClassificado(filtros = {}) {
  let query = supabase
    .from("alho_classificado")
    .select(SELECT_ALHO_CLASSIFICADO)
    .order("data_classificacao", { ascending: false })
    .order("hora", { ascending: false });

  if (filtros.dataInicial) {
    query = query.gte("data_classificacao", filtros.dataInicial);
  }

  if (filtros.dataFinal) {
    query = query.lte("data_classificacao", filtros.dataFinal);
  }

  if (filtros.fazendaId) {
    query = query.eq("fazenda_id", filtros.fazendaId);
  }

  if (filtros.areaId) {
    query = query.eq("area_fazenda_id", filtros.areaId);
  }

  if (filtros.calibreId) {
    query = query.eq("calibre_id", filtros.calibreId);
  }

  if (filtros.responsavelId) {
    query = query.eq("responsavel_id", filtros.responsavelId);
  }

  if (filtros.conferido === "sim" || filtros.status === "conferido") {
    query = query.eq("conferido", true);
  }

  if (filtros.conferido === "nao" || filtros.status === "pendente") {
    query = query.eq("conferido", false);
  }

  const { data, error } = await query;

  if (error) {
    throw tratarErro(error);
  }

  return hidratarRegistros(data || []);
}

export async function buscarAlhoClassificadoPorId(id) {
  const { data, error } = await supabase
    .from("alho_classificado")
    .select(SELECT_ALHO_CLASSIFICADO)
    .eq("id", id)
    .single();

  if (error) {
    throw tratarErro(error);
  }

  const registros = await hidratarRegistros([data]);

  return registros[0] || null;
}

export async function cadastrarAlhoClassificado(dados) {
  const payload = montarPayload(dados);

  const { data, error } = await supabase
    .from("alho_classificado")
    .insert(payload)
    .select(SELECT_ALHO_CLASSIFICADO)
    .single();

  if (error) {
    throw tratarErro(error);
  }

  const registros = await hidratarRegistros([data]);

  return registros[0] || null;
}

export async function editarAlhoClassificado(id, dados) {
  const payload = montarPayload(dados);

  const { data, error } = await supabase
    .from("alho_classificado")
    .update(payload)
    .eq("id", id)
    .select(SELECT_ALHO_CLASSIFICADO)
    .single();

  if (error) {
    throw tratarErro(error);
  }

  const registros = await hidratarRegistros([data]);

  return registros[0] || null;
}

export async function excluirAlhoClassificado(id) {
  const { error } = await supabase
    .from("alho_classificado")
    .delete()
    .eq("id", id);

  if (error) {
    throw tratarErro(error);
  }

  return true;
}

export function calcularResumoAlhoClassificado(classificacoes = []) {
  const totalRegistros = classificacoes.length;

  const totalPaletes = classificacoes.reduce((total, item) => {
    return total + numero(item.quantidade_paletes);
  }, 0);

  const totalCaixas = classificacoes.reduce((total, item) => {
    return total + numero(item.total_caixas);
  }, 0);

  const calibres = new Set();
  const areas = new Set();

  classificacoes.forEach((item) => {
    const calibreId = item.calibre_id || item.calibres?.id;
    const areaId = item.area_fazenda_id || item.area_id || item.areas_fazenda?.id;

    if (calibreId) calibres.add(calibreId);
    if (areaId) areas.add(areaId);
  });

  return {
    totalRegistros,
    totalPaletes,
    totalCaixas,
    calibresClassificados: calibres.size,
    areasClassificadas: areas.size,
  };
}

export function calcularEstoqueClassificadoPorCalibre(classificacoes = []) {
  const mapa = new Map();

  classificacoes.forEach((item) => {
    const calibreId = item.calibre_id || item.calibres?.id || "sem-calibre";
    const calibreCodigo = item.calibres?.codigo || item.calibre_codigo || "-";
    const calibreNome = item.calibres?.nome || item.calibre_nome || "-";

    if (!mapa.has(calibreId)) {
      mapa.set(calibreId, {
        calibre_id: calibreId,
        calibre_codigo: calibreCodigo,
        calibre_nome: calibreNome,
        total_paletes: 0,
        total_caixas: 0,
        registros: 0,
      });
    }

    const atual = mapa.get(calibreId);

    atual.total_paletes += numero(item.quantidade_paletes);
    atual.total_caixas += numero(item.total_caixas);
    atual.registros += 1;
  });

  return Array.from(mapa.values()).sort((a, b) =>
    String(a.calibre_codigo).localeCompare(String(b.calibre_codigo), "pt-BR", {
      numeric: true,
      sensitivity: "base",
    })
  );
}

export const listarClassificacoes = listarAlhoClassificado;