import { supabase } from "./supabaseClient";

import { mensagemErroSupabase } from "../utils/validacoes";

function numero(valor) {
  return Number(valor || 0);
}

function statusTexto(status) {
  if (status === "sem_estoque") return "Sem estoque";
  if (status === "baixo") return "Estoque baixo";
  return "Normal";
}

export async function listarEstoqueAtualPorArea(filtros = {}) {
  let query = supabase
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

  if (filtros.areaId) {
    query = query.eq("area_id", filtros.areaId);
  }

  if (filtros.calibreId) {
    query = query.eq("calibre_id", filtros.calibreId);
  }

  if (filtros.status) {
    query = query.eq("status_estoque_area", filtros.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  return data || [];
}

export async function listarEstoqueAtualGeral() {
  const { data, error } = await supabase
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

  if (error) {
    throw new Error(mensagemErroSupabase(error));
  }

  return data || [];
}

export function calcularResumoEstoqueArea(registros = []) {
  const totalProdutoFinal = registros.reduce((total, item) => {
    return total + numero(item.produto_final_caixas);
  }, 0);

  const totalProdutoFinalPeso = registros.reduce((total, item) => {
    return total + numero(item.produto_final_peso_kg);
  }, 0);

  const totalSaidas = registros.reduce((total, item) => {
    return total + numero(item.saidas_caixas);
  }, 0);

  const totalSaidasPeso = registros.reduce((total, item) => {
    return total + numero(item.saidas_peso_kg);
  }, 0);

  const saldoDisponivel = registros.reduce((total, item) => {
    return total + numero(item.saldo_disponivel_caixas);
  }, 0);

  const pesoDisponivel = registros.reduce((total, item) => {
    return total + numero(item.peso_disponivel_kg);
  }, 0);

  const areasComEstoque = new Set(
    registros
      .filter((item) => numero(item.saldo_disponivel_caixas) > 0)
      .map((item) => item.area_id)
      .filter(Boolean)
  ).size;

  const areasEmAlerta = new Set(
    registros
      .filter((item) => {
        return (
          item.status_estoque_area === "baixo" ||
          item.status_estoque_area === "sem_estoque"
        );
      })
      .map((item) => item.area_id)
      .filter(Boolean)
  ).size;

  const calibresComEstoque = new Set(
    registros
      .filter((item) => numero(item.saldo_disponivel_caixas) > 0)
      .map((item) => item.calibre_id)
      .filter(Boolean)
  ).size;

  const itensSemEstoque = registros.filter((item) => {
    return item.status_estoque_area === "sem_estoque";
  }).length;

  const itensEstoqueBaixo = registros.filter((item) => {
    return item.status_estoque_area === "baixo";
  }).length;

  const itensNormais = registros.filter((item) => {
    return item.status_estoque_area === "normal";
  }).length;

  return {
    totalProdutoFinal,
    totalProdutoFinalPeso,
    totalSaidas,
    totalSaidasPeso,
    saldoDisponivel,
    pesoDisponivel,
    areasComEstoque,
    areasEmAlerta,
    calibresComEstoque,
    itensSemEstoque,
    itensEstoqueBaixo,
    itensNormais,
  };
}

export function calcularResumoPorArea(registros = []) {
  const mapa = new Map();

  registros.forEach((item) => {
    const areaId = item.area_id || "sem_area";

    const atual = mapa.get(areaId) || {
      area_id: areaId,
      area_nome: item.area_nome || "Sem área",
      produto_final_caixas: 0,
      produto_final_peso_kg: 0,
      saidas_caixas: 0,
      saidas_peso_kg: 0,
      saldo_disponivel_caixas: 0,
      peso_disponivel_kg: 0,
      calibres: new Set(),
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
      atual.calibres.add(item.calibre_id);
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
      total_calibres: item.calibres.size,
      calibres_com_saldo: item.calibres_com_saldo.size,
      status_area:
        item.saldo_disponivel_caixas <= 0
          ? "sem_estoque"
          : item.alertas > 0
            ? "baixo"
            : "normal",
      giro_area:
        item.produto_final_caixas > 0
          ? (item.saidas_caixas / item.produto_final_caixas) * 100
          : 0,
    }))
    .sort((a, b) => {
      return numero(b.saldo_disponivel_caixas) - numero(a.saldo_disponivel_caixas);
    });
}

export function calcularResumoPorCalibreDentroDasAreas(registros = []) {
  const mapa = new Map();

  registros.forEach((item) => {
    const calibreId = item.calibre_id || "sem_calibre";

    const atual = mapa.get(calibreId) || {
      calibre_id: calibreId,
      calibre_codigo: item.calibre_codigo || "-",
      calibre_nome: item.calibre_nome || "Sem calibre",
      calibre_ordem: item.calibre_ordem || 999,
      produto_final_caixas: 0,
      saidas_caixas: 0,
      saldo_disponivel_caixas: 0,
      peso_disponivel_kg: 0,
      areas: new Set(),
      alertas: 0,
    };

    atual.produto_final_caixas += numero(item.produto_final_caixas);
    atual.saidas_caixas += numero(item.saidas_caixas);
    atual.saldo_disponivel_caixas += numero(item.saldo_disponivel_caixas);
    atual.peso_disponivel_kg += numero(item.peso_disponivel_kg);

    if (item.area_id) {
      atual.areas.add(item.area_id);
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
      total_areas: item.areas.size,
      status_calibre:
        item.saldo_disponivel_caixas <= 0
          ? "sem_estoque"
          : item.alertas > 0
            ? "baixo"
            : "normal",
    }))
    .sort((a, b) => {
      return numero(a.calibre_ordem) - numero(b.calibre_ordem);
    });
}

export function obterStatusTextoEstoque(status) {
  return statusTexto(status);
}