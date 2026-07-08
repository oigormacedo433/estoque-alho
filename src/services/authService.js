// Serviço de autenticação.
//
// Responsável por:
// - fazer login
// - sair do sistema
// - buscar sessão atual
// - buscar perfil do usuário logado
//
// O login é feito pelo Supabase Auth.
// A tabela public.usuarios guarda nome, perfil e status ativo.

import { supabase } from "./supabaseClient";

// Faz login usando e-mail e senha.
export async function fazerLogin(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    throw error;
  }

  return data;
}

// Sai do sistema.
export async function sairDoSistema() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  return true;
}

// Busca a sessão atual.
// Se não tiver sessão, o usuário não está logado.
export async function buscarSessaoAtual() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

// Busca o usuário autenticado atual.
export async function buscarUsuarioAtual() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}

// Busca o perfil interno do usuário na tabela public.usuarios.
export async function buscarPerfilUsuario(usuarioId) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome, email, perfil, ativo, criado_em")
    .eq("id", usuarioId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}