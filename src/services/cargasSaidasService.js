import { supabase } from "./supabaseClient";

export async function confirmarCargaComoSaida(carga = {}) {
  if (!carga?.id) {
    throw new Error("Carga inválida para confirmação.");
  }

  const { data, error } = await supabase
    .from("cargas")
    .update({
      status: "confirmada",
      confirmada_em: new Date().toISOString(),
    })
    .eq("id", carga.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Não foi possível confirmar a carga.");
  }

  return {
    ...carga,
    ...data,
    status: "confirmada",
  };
}
