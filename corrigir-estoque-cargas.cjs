const fs = require("fs");

const path = "src/pages/Cargas/Cargas.jsx";
let content = fs.readFileSync(path, "utf8");

function replaceAllSafe(search, replace) {
  if (content.includes(search)) {
    content = content.replaceAll(search, replace);
    return true;
  }

  return false;
}

let changed = false;

/*
  Regra:
  - Confirmada: mostra apenas OK
  - Cancelada: mostra apenas -
  - Pendente: mantém o cálculo de estoque atual
*/

const functionPatterns = [
  /function\s+obterStatusEstoqueCarga\s*\(\s*carga\s*\)\s*\{([\s\S]*?)\n\}/,
  /function\s+calcularStatusEstoqueCarga\s*\(\s*carga\s*\)\s*\{([\s\S]*?)\n\}/,
  /function\s+obterResumoEstoqueCarga\s*\(\s*carga\s*\)\s*\{([\s\S]*?)\n\}/,
];

for (const pattern of functionPatterns) {
  const match = content.match(pattern);

  if (!match) continue;

  const fullFunction = match[0];

  if (
    fullFunction.includes('carga?.status === "confirmada"') ||
    fullFunction.includes("carga?.status === 'confirmada'")
  ) {
    changed = true;
    break;
  }

  const patchedFunction = fullFunction.replace(
    "{",
    `{
  if (carga?.status === "confirmada") {
    return {
      status: "ok",
      texto: "OK",
      rotulo: "OK",
      label: "OK",
      descricao: "",
      detalhe: "",
      detalhes: "",
      classe: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (carga?.status === "cancelada") {
    return {
      status: "vazio",
      texto: "-",
      rotulo: "-",
      label: "-",
      descricao: "",
      detalhe: "",
      detalhes: "",
      classe: "border-slate-200 bg-slate-50 text-slate-500",
    };
  }
`
  );

  content = content.replace(fullFunction, patchedFunction);
  changed = true;
  break;
}

const tableCellPattern = /(<td[^>]*>\s*\{[^{}]*(?:estoque|Estoque)[^{}]*\?[^{}]*:[^{}]*\}\s*<\/td>)/;

if (!changed) {
  const estoqueCellPatterns = [
    /(<td[^>]*>\s*<span[^>]*>\s*\{[^{}]*(?:texto|rotulo|label)[^{}]*\}\s*<\/span>\s*\{[^{}]*(?:detalhe|detalhes|descricao)[^{}]*\?[\s\S]*?\}\s*<\/td>)/,
    /(<td[^>]*>\s*<div[^>]*>\s*<span[^>]*>\s*\{[^{}]*(?:texto|rotulo|label)[^{}]*\}\s*<\/span>[\s\S]*?<\/div>\s*<\/td>)/,
  ];

  for (const pattern of estoqueCellPatterns) {
    const match = content.match(pattern);

    if (!match) continue;

    const original = match[1];

    const patched = `<td className="px-4 py-3">
                      {carga.status === "confirmada" ? (
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          OK
                        </span>
                      ) : carga.status === "cancelada" ? (
                        <span className="text-sm font-semibold text-slate-400">-</span>
                      ) : (
                        ${original
                          .replace(/^<td[^>]*>/, "")
                          .replace(/<\/td>$/, "")
                          .trim()}
                      )}
                    </td>`;

    content = content.replace(original, patched);
    changed = true;
    break;
  }
}

if (!changed) {
  throw new Error(
    "Não consegui localizar automaticamente a função/célula de estoque. Me mande o trecho do arquivo Cargas.jsx onde aparece a coluna ESTOQUE."
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("OK: regra da coluna Estoque ajustada.");
console.log("- Confirmada: OK");
console.log("- Cancelada: -");
console.log("- Pendente: mantém saldo parcial/sim/não.");
