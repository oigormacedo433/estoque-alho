// Serviço de Fazendas / Origens.
//
// Usado nos selects das telas.
// Tudo vem do Supabase.

import { supabase } from "./supabaseClient";

// Lista somente fazendas/origens ativas.
export async function listarFazendasAtivas() {
  const { data, error } = await supabase
    .from("fazendas")
    .select("id, nome, ativo, observacao")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}