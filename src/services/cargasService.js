import { supabase } from "./supabaseClient";

function numero(valor) {
  const convertido = Number(valor);

  if (!Number.isFinite(convertido)) {
    return 0;
  }

  return convertido;
}

function texto(valor) {
  return String(valor || "").trim();
}

function formatarNumeroCarga(numeroCarga) {
  return `CGA-${String(numeroCarga).padStart(4, "0")}`;
}

function normalizarItens(itens = []) {
  return (itens || [])
    .map((item) => ({
      calibre_id: item.calibre_id || null,
      quantidade_caixas: numero(item.quantidade_caixas),
    }))
    .filter((item) => item.calibre_id && item.quantidade_caixas > 0);
}

function calcularTotalDistribuido(itens = []) {
  return normalizarItens(itens).reduce((total, item) => {
    return total + numero(item.quantidade_caixas);
  }, 0);
}

function montarPayload(dados = {}) {
  const quantidadeTotal = numero(dados.quantidade_total_caixas);
  const pesoPorCaixa = numero(dados.peso_por_caixa_kg);
  const pesoTotal = quantidadeTotal * pesoPorCaixa;

  return {
    data_carga: dados.data_carga || new Date().toISOString().slice(0, 10),
    hora: dados.hora || new Date().toTimeString().slice(0, 5),
    numero_carga: texto(dados.numero_carga),
    cliente: texto(dados.cliente),
    status: dados.status || "pendente",
    quantidade_total_caixas: quantidadeTotal,
    peso_por_caixa_kg: pesoPorCaixa,
    peso_total_kg: pesoTotal,
    responsavel_id: dados.responsavel_id || null,
    observacao: texto(dados.observacao),
  };
}

function validarCarga(dados = {}) {
  const payload = montarPayload(dados);
  const itens = normalizarItens(dados.itens || []);
  const totalDistribuido = calcularTotalDistribuido(itens);

  if (!payload.data_carga) {
    throw new Error("Informe a data da carga.");
  }

  if (!payload.hora) {
    throw new Error("Informe a hora da carga.");
  }

  if (!payload.numero_carga) {
    throw new Error("Informe o numero da carga.");
  }

  if (!payload.cliente) {
    throw new Error("Informe o cliente.");
  }

  if (!["pendente", "confirmada", "cancelada"].includes(payload.status)) {
    throw new Error("Status da carga invalido.");
  }

  if (payload.quantidade_total_caixas <= 0) {
    throw new Error("Informe o total de caixas.");
  }

  if (payload.peso_por_caixa_kg <= 0) {
    throw new Error("Informe o peso por caixa.");
  }

  if (itens.length === 0) {
    throw new Error("Informe ao menos um calibre na carga.");
  }

  if (totalDistribuido !== payload.quantidade_total_caixas) {
    throw new Error("A soma dos calibres precisa bater com o total de caixas da carga.");
  }

  return {
    payload,
    itens,
  };
}

async function buscarItensPorCargas(cargaIds = []) {
  const ids = Array.from(new Set((cargaIds || []).filter(Boolean)));

  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("carga_itens")
    .select(
      `
        *,
        calibres (
          id,
          codigo,
          nome,
          ordem
        )
      `
    )
    .in("carga_id", ids);

  if (error) {
    throw new Error(error.message || "Nao foi possivel carregar os itens das cargas.");
  }

  return data || [];
}

export async function buscarProximoNumeroCarga() {
  const { data, error } = await supabase
    .from("cargas")
    .select("numero_carga")
    .not("numero_carga", "is", null);

  if (error) {
    throw new Error(error.message || "Nao foi possivel gerar o numero da carga.");
  }

  const maiorNumero = (data || []).reduce((maior, item) => {
    const encontrado = String(item.numero_carga || "").match(/CGA-(\d+)/i);
    const valor = encontrado ? Number(encontrado[1]) : 0;

    if (!Number.isFinite(valor)) {
      return maior;
    }

    return Math.max(maior, valor);
  }, 0);

  return formatarNumeroCarga(maiorNumero + 1);
}

export async function listarOpcoesCargas() {
  const [responsaveisResult, calibresResult, clientesResult] = await Promise.all([
    supabase.from("responsaveis").select("id, nome").order("nome", { ascending: true }),
    supabase.from("calibres").select("id, codigo, nome, ordem, ativo").order("ordem", { ascending: true }),
    supabase.from("cargas").select("cliente").order("cliente", { ascending: true }),
  ]);

  if (responsaveisResult.error) {
    throw new Error(responsaveisResult.error.message || "Nao foi possivel carregar responsaveis.");
  }

  if (calibresResult.error) {
    throw new Error(calibresResult.error.message || "Nao foi possivel carregar calibres.");
  }

  if (clientesResult.error) {
    throw new Error(clientesResult.error.message || "Nao foi possivel carregar clientes.");
  }

  const clientes = Array.from(
    new Set((clientesResult.data || []).map((item) => texto(item.cliente)).filter(Boolean))
  );

  return {
    responsaveis: responsaveisResult.data || [],
    calibres: (calibresResult.data || []).filter((calibre) => calibre.ativo !== false),
    clientes,
  };
}

export async function listarCargas(filtros = {}) {
  let query = supabase
    .from("cargas")
    .select(
      `
        *,
        responsaveis (
          id,
          nome
        )
      `
    )
    .order("data_carga", { ascending: false })
    .order("hora", { ascending: false });

  if (filtros.dataInicial) {
    query = query.gte("data_carga", filtros.dataInicial);
  }

  if (filtros.dataFinal) {
    query = query.lte("data_carga", filtros.dataFinal);
  }

  if (filtros.cliente) {
    query = query.ilike("cliente", `%${filtros.cliente}%`);
  }

  if (filtros.status) {
    query = query.eq("status", filtros.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "Nao foi possivel carregar cargas.");
  }

  const cargas = data || [];
  const itens = await buscarItensPorCargas(cargas.map((carga) => carga.id));

  const itensPorCarga = new Map();

  itens.forEach((item) => {
    const lista = itensPorCarga.get(item.carga_id) || [];
    lista.push(item);
    itensPorCarga.set(item.carga_id, lista);
  });

  return cargas.map((carga) => ({
    ...carga,
    responsavel_nome: carga.responsaveis?.nome || "",
    itens: (itensPorCarga.get(carga.id) || []).sort((a, b) => {
      const ordemA = numero(a.calibres?.ordem);
      const ordemB = numero(b.calibres?.ordem);

      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }

      return String(a.calibres?.codigo || "").localeCompare(String(b.calibres?.codigo || ""), "pt-BR");
    }),
  }));
}

async function salvarItensCarga(cargaId, itens = []) {
  const { error: removerError } = await supabase
    .from("carga_itens")
    .delete()
    .eq("carga_id", cargaId);

  if (removerError) {
    throw new Error(removerError.message || "Nao foi possivel atualizar os calibres da carga.");
  }

  const itensLimpos = normalizarItens(itens).map((item) => ({
    carga_id: cargaId,
    calibre_id: item.calibre_id,
    quantidade_caixas: item.quantidade_caixas,
  }));

  if (itensLimpos.length === 0) {
    return;
  }

  const { error: inserirError } = await supabase.from("carga_itens").insert(itensLimpos);

  if (inserirError) {
    throw new Error(inserirError.message || "Nao foi possivel salvar os calibres da carga.");
  }
}

export async function cadastrarCarga(dados = {}) {
  const numeroCarga = dados.numero_carga || (await buscarProximoNumeroCarga());
  const { payload, itens } = validarCarga({
    ...dados,
    numero_carga: numeroCarga,
  });

  const { data, error } = await supabase
    .from("cargas")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Nao foi possivel cadastrar a carga.");
  }

  await salvarItensCarga(data.id, itens);

  return data;
}

export async function editarCarga(id, dados = {}) {
  if (!id) {
    throw new Error("Carga nao encontrada.");
  }

  const { payload, itens } = validarCarga(dados);

  const { data, error } = await supabase
    .from("cargas")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Nao foi possivel editar a carga.");
  }

  await salvarItensCarga(id, itens);

  return data;
}

export async function atualizarStatusCarga(id, status) {
  if (!id) {
    throw new Error("Carga nao encontrada.");
  }

  if (!["pendente", "confirmada", "cancelada"].includes(status)) {
    throw new Error("Status invalido.");
  }

  const { data, error } = await supabase
    .from("cargas")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Nao foi possivel alterar o status da carga.");
  }

  return data;
}

export async function excluirCarga(id) {
  if (!id) {
    throw new Error("Carga nao encontrada.");
  }

  const { error } = await supabase.from("cargas").delete().eq("id", id);

  if (error) {
    throw new Error(error.message || "Nao foi possivel excluir a carga.");
  }

  return true;
}

export function calcularResumoCargas(cargas = []) {
  const totalCargas = cargas.length;
  const pendentes = cargas.filter((carga) => carga.status === "pendente").length;
  const confirmadas = cargas.filter((carga) => carga.status === "confirmada").length;
  const canceladas = cargas.filter((carga) => carga.status === "cancelada").length;
  const pesoTotal = cargas.reduce((total, carga) => total + numero(carga.peso_total_kg), 0);
  const caixasTotal = cargas.reduce((total, carga) => total + numero(carga.quantidade_total_caixas), 0);

  return {
    totalCargas,
    pendentes,
    confirmadas,
    canceladas,
    pesoTotal,
    caixasTotal,
    taxaConfirmacao: totalCargas > 0 ? (confirmadas / totalCargas) * 100 : 0,
  };
}
