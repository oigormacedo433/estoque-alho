// Utilitários de validação geral do sistema.
//
// Objetivo:
// - Padronizar mensagens
// - Impedir campo vazio
// - Impedir número negativo
// - Impedir zero quando precisa ser maior que zero
// - Impedir texto em campo numérico

export function textoObrigatorio(valor, nomeCampo) {
  if (valor === null || valor === undefined || String(valor).trim() === "") {
    throw new Error(`${nomeCampo} é obrigatório.`);
  }

  return String(valor).trim();
}

export function campoObrigatorio(valor, nomeCampo) {
  if (valor === null || valor === undefined || String(valor).trim() === "") {
    throw new Error(`${nomeCampo} é obrigatório.`);
  }

  return valor;
}

export function numeroObrigatorio(valor, nomeCampo) {
  if (valor === null || valor === undefined || String(valor).trim() === "") {
    throw new Error(`${nomeCampo} é obrigatório.`);
  }

  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    throw new Error(`${nomeCampo} precisa ser um número válido.`);
  }

  return numero;
}

export function numeroMaiorQueZero(valor, nomeCampo) {
  const numero = numeroObrigatorio(valor, nomeCampo);

  if (numero <= 0) {
    throw new Error(`${nomeCampo} precisa ser maior que zero.`);
  }

  return numero;
}

export function inteiroMaiorQueZero(valor, nomeCampo) {
  const numero = numeroMaiorQueZero(valor, nomeCampo);

  if (!Number.isInteger(numero)) {
    throw new Error(`${nomeCampo} precisa ser um número inteiro.`);
  }

  return numero;
}

export function validarData(valor, nomeCampo = "Data") {
  campoObrigatorio(valor, nomeCampo);

  const data = new Date(`${valor}T00:00:00`);

  if (Number.isNaN(data.getTime())) {
    throw new Error(`${nomeCampo} inválida.`);
  }

  return valor;
}

export function validarHora(valor, nomeCampo = "Hora") {
  campoObrigatorio(valor, nomeCampo);

  const horaTexto = String(valor);

  if (!/^\d{2}:\d{2}/.test(horaTexto)) {
    throw new Error(`${nomeCampo} inválida.`);
  }

  return horaTexto.slice(0, 5);
}

export function booleanPorSimNao(valor) {
  return valor === true || valor === "sim";
}

export function mensagemErroSupabase(error) {
  const mensagem = error?.message || "";

  if (mensagem.includes("calibre inativo")) {
    return "Não é permitido usar calibre inativo em novo lançamento ou edição.";
  }

  if (mensagem.includes("violates check constraint")) {
    return "Algum campo obrigatório está vazio ou possui valor inválido.";
  }

  if (mensagem.includes("duplicate key")) {
    return "Já existe um registro com essas informações.";
  }

  if (mensagem.includes("invalid input syntax")) {
    return "Existe um campo com formato inválido. Confira os números, datas e seleções.";
  }

  return mensagem || "Não foi possível concluir a operação.";
}