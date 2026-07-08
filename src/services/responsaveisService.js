// Serviço de Responsáveis.
//
// Usado nos selects das telas.
// Tudo vem do Supabase.

import { supabase } from "./supabaseClient";

// Lista somente responsáveis ativos.
export async function listarResponsaveisAtivos() {
  const { data, error } = await supabase
    .from("responsaveis")
    .select("id, nome, ativo, observacao")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}