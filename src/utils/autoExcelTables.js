import * as XLSX from "xlsx";

const BOTAO_MARK = "data-auto-excel-button";
const TABELA_MARK = "data-auto-excel-ready";

function limparTexto(valor) {
  return String(valor || "")
    .replace(/\s+/g, " ")
    .replace(/↕|↑|↓|⇅/g, "")
    .trim();
}

function normalizarNomeArquivo(valor) {
  const base = limparTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return base || "tabela";
}

function nomePagina() {
  const h1 = document.querySelector("main h1, h1");
  const titulo = limparTexto(h1?.textContent);
  const rota = window.location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");

  return titulo || rota || "estoque-alho";
}

function tituloDaTabela(table) {
  const section = table.closest("section, article, .card, div");

  if (section) {
    const titulo = section.querySelector("h1, h2, h3, [data-title]");
    const textoTitulo = limparTexto(titulo?.textContent);

    if (textoTitulo) return textoTitulo;
  }

  let anterior = table.parentElement;

  for (let i = 0; i < 5 && anterior; i++) {
    const titulo = anterior.querySelector("h1, h2, h3");
    const textoTitulo = limparTexto(titulo?.textContent);

    if (textoTitulo) return textoTitulo;

    anterior = anterior.parentElement;
  }

  return nomePagina();
}

function deveIgnorarColuna(cabecalho) {
  const texto = limparTexto(cabecalho).toLowerCase();

  return (
    texto === "ações" ||
    texto === "acoes" ||
    texto === "ação" ||
    texto === "acao" ||
    texto.includes("ações") ||
    texto.includes("acoes")
  );
}

function extrairTabela(table) {
  const linhas = Array.from(table.querySelectorAll("tr"));
  const matriz = [];

  let indicesPermitidos = null;

  linhas.forEach((tr, rowIndex) => {
    const celulas = Array.from(tr.querySelectorAll("th, td"));

    if (!celulas.length) return;

    if (rowIndex === 0) {
      indicesPermitidos = celulas
        .map((cell, index) => ({ cell, index }))
        .filter(({ cell }) => !deveIgnorarColuna(cell.textContent))
        .map(({ index }) => index);
    }

    const linha = (indicesPermitidos || celulas.map((_, index) => index)).map((index) => {
      const cell = celulas[index];
      return limparTexto(cell?.innerText || cell?.textContent || "");
    });

    if (linha.some(Boolean)) matriz.push(linha);
  });

  return matriz;
}

function ajustarLargura(ws, matriz) {
  const larguras = [];

  matriz.forEach((linha) => {
    linha.forEach((valor, index) => {
      const tamanho = Math.min(Math.max(String(valor || "").length + 2, 12), 42);
      larguras[index] = Math.max(larguras[index] || 12, tamanho);
    });
  });

  ws["!cols"] = larguras.map((wch) => ({ wch }));
}

function baixarTabela(table) {
  const matriz = extrairTabela(table);

  if (!matriz.length) {
    alert("Essa tabela não tem dados para exportar.");
    return;
  }

  const titulo = tituloDaTabela(table);
  const pagina = nomePagina();

  const ws = XLSX.utils.aoa_to_sheet(matriz);
  ajustarLargura(ws, matriz);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tabela");

  const data = new Date().toISOString().slice(0, 10);
  const nomeArquivo = normalizarNomeArquivo(pagina + "-" + titulo) + "-" + data + ".xlsx";

  XLSX.writeFile(wb, nomeArquivo);
}

function criarBotao(table) {
  if (!table || table.dataset.autoExcelReady === "true") return;
  if (table.closest("[data-sem-excel='true']")) return;

  table.dataset.autoExcelReady = "true";

  const wrapper = table.parentElement;
  if (!wrapper) return;

  const existente = wrapper.querySelector(":scope > [" + BOTAO_MARK + "='true']");
  if (existente) return;

  const barra = document.createElement("div");
  barra.setAttribute(BOTAO_MARK, "true");
  barra.className = "mb-3 flex justify-end";

  const botao = document.createElement("button");
  botao.type = "button";
  botao.className =
    "inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50";
  botao.textContent = "Baixar Excel";

  botao.addEventListener("click", () => baixarTabela(table));

  barra.appendChild(botao);
  wrapper.insertBefore(barra, table);
}

function aplicar() {
  document.querySelectorAll("table").forEach(criarBotao);
}

function iniciar() {
  aplicar();

  const observer = new MutationObserver(() => {
    window.clearTimeout(window.__autoExcelTimer);
    window.__autoExcelTimer = window.setTimeout(aplicar, 100);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}
