import { supabase } from "./supabaseClient";

function texto(valor) {
  const tratado = String(valor || "").trim();
  return tratado || null;
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

function tratarErro(error) {
  const mensagem = String(error?.message || "");

  if (error?.code === "23505") {
    throw new Error("Já existe uma Área / Pivô com esse nome nessa fazenda.");
  }

  if (error?.code === "23503") {
    throw new Error(
      "Esta Área / Pivô já foi usada em lançamentos. Inative em vez de excluir."
    );
  }

  if (mensagem.includes("permission denied")) {
    throw new Error(
      "Sem permissão para carregar as Áreas / Pivôs. Verifique as permissões da tabela areas_fazenda no Supabase."
    );
  }

  throw error;
}

async function buscarFazendasPorIds(ids = []) {
  const idsLimpos = Array.from(new Set(ids.filter(Boolean)));

  if (idsLimpos.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("fazendas")
    .select("id, nome, ativo")
    .in("id", idsLimpos);

  if (error) {
    console.warn("Não foi possível carregar fazendas das áreas:", error);
    return [];
  }

  return data || [];
}

function normalizarArea(area, fazendas = []) {
  const fazenda =
    fazendas.find((item) => item.id === area.fazenda_id) ||
    area.fazendas ||
    null;

  return {
    ...area,
    id: area.id,
    nome: area.nome || "",
    fazenda_id: area.fazenda_id || fazenda?.id || "",
    ativo: area.ativo !== false,
    observacao: area.observacao || "",
    descricao: area.observacao || "",
    fazendas: fazenda,
    fazenda_nome: fazenda?.nome || "-",
  };
}

async function hidratarAreas(areas = []) {
  const fazendaIds = areas.map((area) => area.fazenda_id).filter(Boolean);
  const fazendas = await buscarFazendasPorIds(fazendaIds);

  return areas.map((area) => normalizarArea(area, fazendas));
}

// =========================================================
// LISTAGEM PRINCIPAL
// =========================================================

export async function listarAreasFazenda(opcoes = {}) {
  const { apenasAtivas = false, fazendaId = "" } = opcoes;

  let query = supabase
    .from("areas_fazenda")
    .select("id, nome, fazenda_id, ativo")
    .order("nome", { ascending: true });

  if (fazendaId) {
    query = query.eq("fazenda_id", fazendaId);
  }

  const { data, error } = await query;

  if (error) {
    tratarErro(error);
  }

  let areas = await hidratarAreas(data || []);

  if (apenasAtivas) {
    areas = areas.filter((area) => area.ativo !== false);
  }

  return areas;
}

export async function listarAreasFazendaAtivas() {
  return listarAreasFazenda({ apenasAtivas: true });
}

export async function listarAreasAtivas() {
  return listarAreasFazenda({ apenasAtivas: true });
}

export async function listarAreasAtivasPorFazenda(fazendaId) {
  if (!fazendaId) {
    return [];
  }

  return listarAreasFazenda({
    apenasAtivas: true,
    fazendaId,
  });
}

export async function listarAreasFazendaAtivasPorFazenda(fazendaId) {
  return listarAreasAtivasPorFazenda(fazendaId);
}

export async function listarAreasPorFazenda(fazendaId) {
  if (!fazendaId) {
    return [];
  }

  return listarAreasFazenda({ fazendaId });
}

// =========================================================
// BUSCAR POR ID
// =========================================================

export async function buscarAreaFazendaPorId(id) {
  const { data, error } = await supabase
    .from("areas_fazenda")
    .select("id, nome, fazenda_id, ativo")
    .eq("id", id)
    .single();

  if (error) {
    tratarErro(error);
  }

  const areas = await hidratarAreas([data]);

  return areas[0] || null;
}

// =========================================================
// CADASTRAR
// =========================================================

export async function cadastrarAreaFazenda(dados) {
  if (!texto(dados.nome)) {
    throw new Error("Informe o nome da Área / Pivô.");
  }

  if (!dados.fazenda_id) {
    throw new Error("Selecione a fazenda da Área / Pivô.");
  }

  const payload = {
    nome: texto(dados.nome),
    fazenda_id: dados.fazenda_id,
    ativo: booleano(dados.ativo ?? true),
  };

  const { data, error } = await supabase
    .from("areas_fazenda")
    .insert(payload)
    .select("id, nome, fazenda_id, ativo")
    .single();

  if (error) {
    tratarErro(error);
  }

  const areas = await hidratarAreas([data]);

  return areas[0] || null;
}

// =========================================================
// EDITAR
// =========================================================

export async function editarAreaFazenda(id, dados) {
  if (!texto(dados.nome)) {
    throw new Error("Informe o nome da Área / Pivô.");
  }

  if (!dados.fazenda_id) {
    throw new Error("Selecione a fazenda da Área / Pivô.");
  }

  const payload = {
    nome: texto(dados.nome),
    fazenda_id: dados.fazenda_id,
    ativo: booleano(dados.ativo ?? true),
  };

  const { data, error } = await supabase
    .from("areas_fazenda")
    .update(payload)
    .eq("id", id)
    .select("id, nome, fazenda_id, ativo")
    .single();

  if (error) {
    tratarErro(error);
  }

  const areas = await hidratarAreas([data]);

  return areas[0] || null;
}

// =========================================================
// EXCLUIR / INATIVAR
// =========================================================

export async function excluirAreaFazenda(id) {
  const { error } = await supabase.from("areas_fazenda").delete().eq("id", id);

  if (error) {
    tratarErro(error);
  }

  return true;
}

export async function inativarAreaFazenda(id) {
  const { data, error } = await supabase
    .from("areas_fazenda")
    .update({ ativo: false })
    .eq("id", id)
    .select("id, nome, fazenda_id, ativo")
    .single();

  if (error) {
    tratarErro(error);
  }

  const areas = await hidratarAreas([data]);

  return areas[0] || null;
}

// =========================================================
// RESUMO
// =========================================================

export function calcularResumoAreasFazenda(areas = []) {
  const totalAreas = areas.length;
  const areasAtivas = areas.filter((area) => area.ativo !== false).length;
  const areasInativas = totalAreas - areasAtivas;

  const fazendas = new Set();

  areas.forEach((area) => {
    if (area.fazenda_id) {
      fazendas.add(area.fazenda_id);
    }
  });

  return {
    totalAreas,
    areasAtivas,
    areasInativas,
    fazendasComAreas: fazendas.size,
  };
}

// =========================================================
// ALIASES PARA NÃO QUEBRAR OUTRAS TELAS
// =========================================================

export const listarAreas = listarAreasFazenda;
export const listarAreasFazendaPorFazenda = listarAreasPorFazenda;
export const listarAreasAtivasFazenda = listarAreasFazendaAtivas;
export const calcularResumoAreas = calcularResumoAreasFazenda;