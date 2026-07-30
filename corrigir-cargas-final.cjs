const fs = require("fs");

const filePath = "src/pages/Cargas/Cargas.jsx";
let content = fs.readFileSync(filePath, "utf8");

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  let inString = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = openIndex; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === inString) {
        inString = null;
      }

      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }

    if (char === "{") depth++;

    if (char === "}") {
      depth--;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function replaceFunctionByName(functionName, newFunctionCode) {
  const functionToken = `function ${functionName}`;
  const functionStart = content.indexOf(functionToken);

  if (functionStart >= 0) {
    const braceStart = content.indexOf("{", functionStart);
    const braceEnd = findMatchingBrace(content, braceStart);

    if (braceStart < 0 || braceEnd < 0) {
      throw new Error(`Nao consegui fechar a funcao ${functionName}.`);
    }

    content =
      content.slice(0, functionStart) +
      newFunctionCode +
      content.slice(braceEnd + 1);

    return true;
  }

  const constToken = `const ${functionName}`;
  const constStart = content.indexOf(constToken);

  if (constStart >= 0) {
    const arrowIndex = content.indexOf("=>", constStart);
    const braceStart = content.indexOf("{", arrowIndex);
    const braceEnd = findMatchingBrace(content, braceStart);

    if (arrowIndex < 0 || braceStart < 0 || braceEnd < 0) {
      throw new Error(`Nao consegui fechar o componente ${functionName}.`);
    }

    let end = braceEnd + 1;

    while (content[end] === ";" || content[end] === "\r" || content[end] === "\n") {
      end++;
    }

    content =
      content.slice(0, constStart) +
      newFunctionCode +
      "\n" +
      content.slice(end);

    return true;
  }

  return false;
}

function findChartComponentName() {
  const titleIndex = content.indexOf("Cargas planejadas por dia");

  if (titleIndex < 0) {
    return "";
  }

  const chunk = content.slice(titleIndex, titleIndex + 3000);
  const match = chunk.match(/<([A-Z][A-Za-z0-9_]*)\b[^>]*(dados|data|lista|itens)=/);

  return match ? match[1] : "";
}

function createChartFunction(functionName) {
  return `function ${functionName}(props = {}) {
  const listaOriginal = Array.isArray(props)
    ? props
    : Array.isArray(props.dados)
      ? props.dados
      : Array.isArray(props.data)
        ? props.data
        : Array.isArray(props.lista)
          ? props.lista
          : Array.isArray(props.itens)
            ? props.itens
            : [];

  const dados = listaOriginal.slice(-15).map((item) => {
    const valorBruto =
      item.quantidade_cargas ??
      item.total_cargas ??
      item.cargas ??
      item.quantidade ??
      item.total ??
      item.valor ??
      item.registros ??
      0;

    const dataBruta =
      item.data ??
      item.data_carga ??
      item.dia ??
      item.label ??
      item.nome ??
      "";

    const valorNumerico = Number(valorBruto);

    function formatarLabelData(valor) {
      const texto = String(valor || "");

      if (!texto) return "-";

      if (/^\\\\d{4}-\\\\d{2}-\\\\d{2}/.test(texto)) {
        const [ano, mes, dia] = texto.slice(0, 10).split("-");
        return dia + "/" + mes;
      }

      return texto;
    }

    return {
      label: formatarLabelData(dataBruta),
      valor: Number.isFinite(valorNumerico) ? valorNumerico : 0,
    };
  });

  if (dados.length === 0) {
    return (
      <div className="flex h-[360px] w-full items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-400">
        Nenhum dado para exibir.
      </div>
    );
  }

  const largura = 1000;
  const altura = 360;
  const esquerda = 70;
  const direita = 40;
  const topo = 35;
  const baixo = 60;
  const areaLargura = largura - esquerda - direita;
  const areaAltura = altura - topo - baixo;

  const maiorValor = Math.max(...dados.map((item) => item.valor), 1);

  function obterX(indice) {
    if (dados.length === 1) {
      return esquerda + areaLargura / 2;
    }

    return esquerda + (indice / (dados.length - 1)) * areaLargura;
  }

  function obterY(valor) {
    return topo + areaAltura - (Number(valor || 0) / maiorValor) * areaAltura;
  }

  function formatarNumeroLocal(valor) {
    return Number(valor || 0).toLocaleString("pt-BR");
  }

  const pontosLinha = dados
    .map((item, indice) => obterX(indice) + "," + obterY(item.valor))
    .join(" ");

  const pontosArea = [
    esquerda + "," + (topo + areaAltura),
    pontosLinha,
    largura - direita + "," + (topo + areaAltura),
  ].join(" ");

  return (
    <div className="flex h-[360px] w-full items-center justify-center">
      <svg
        viewBox={\`0 0 \${largura} \${altura}\`}
        className="h-full w-full max-w-[1080px] overflow-visible"
      >
        <defs>
          <linearGradient id="graficoCargasPlanejadasCentro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#047857" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((linha) => {
          const y = topo + (linha / 3) * areaAltura;

          return (
            <line
              key={linha}
              x1={esquerda}
              x2={largura - direita}
              y1={y}
              y2={y}
              stroke="#E8EEF2"
              strokeWidth="1"
            />
          );
        })}

        <polygon points={pontosArea} fill="url(#graficoCargasPlanejadasCentro)" />

        <polyline
          points={pontosLinha}
          fill="none"
          stroke="#047857"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {dados.map((item, indice) => {
          const x = obterX(indice);
          const y = obterY(item.valor);

          return (
            <g key={item.label + "-" + indice}>
              <circle cx={x} cy={y} r="7" fill="#047857" stroke="#FFFFFF" strokeWidth="4" />

              <text
                x={x}
                y={y - 16}
                textAnchor="middle"
                fontSize="18"
                fontWeight="600"
                fill="#0F172A"
              >
                {formatarNumeroLocal(item.valor)}
              </text>

              <text
                x={x}
                y={altura - 18}
                textAnchor="middle"
                fontSize="17"
                fontWeight="500"
                fill="#64748B"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}`;
}

const chartComponentName = findChartComponentName();

if (chartComponentName) {
  const changedChart = replaceFunctionByName(
    chartComponentName,
    createChartFunction(chartComponentName)
  );

  if (!changedChart) {
    console.warn("Aviso: encontrei o componente do grafico, mas nao consegui substituir:", chartComponentName);
  }
} else {
  console.warn("Aviso: nao encontrei automaticamente o componente do grafico de cargas por dia.");
}

function patchEstoqueCell() {
  const sectionIndex = content.indexOf("Cargas registradas");

  if (sectionIndex < 0) {
    throw new Error("Nao encontrei a secao Cargas registradas.");
  }

  const section = content.slice(sectionIndex);
  const keyMatch = section.match(/key=\{([A-Za-z_$][A-Za-z0-9_$]*)\.id\}/);

  if (!keyMatch) {
    throw new Error("Nao encontrei a linha da tabela de cargas com key={carga.id}.");
  }

  const variableName = keyMatch[1];
  const keyIndex = sectionIndex + keyMatch.index;
  const rowStart = content.lastIndexOf("<tr", keyIndex);
  const rowEnd = content.indexOf("</tr>", keyIndex);

  if (rowStart < 0 || rowEnd < 0) {
    throw new Error("Nao consegui localizar a linha completa da tabela de cargas.");
  }

  const row = content.slice(rowStart, rowEnd + 5);
  const tdMatches = Array.from(row.matchAll(/<td\b/g));

  if (tdMatches.length < 7) {
    throw new Error("Nao encontrei colunas suficientes na linha da tabela de cargas.");
  }

  const tdStart = rowStart + tdMatches[6].index;
  const tdEnd = content.indexOf("</td>", tdStart);

  if (tdEnd < 0) {
    throw new Error("Nao consegui fechar a coluna Estoque.");
  }

  const oldTd = content.slice(tdStart, tdEnd + 5);

  if (oldTd.includes(`${variableName}.status === "pendente"`) && oldTd.includes("> - <")) {
    console.log("Coluna Estoque ja estava protegida para confirmada/cancelada.");
    return;
  }

  const firstClose = oldTd.indexOf(">");
  const inner = oldTd.slice(firstClose + 1, -5).trim();

  const newTd = `<td className="px-4 py-3">
                      {${variableName}.status === "pendente" ? (
                        <>
                          ${inner}
                        </>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">-</span>
                      )}
                    </td>`;

  content = content.slice(0, tdStart) + newTd + content.slice(tdEnd + 5);
}

patchEstoqueCell();

fs.writeFileSync(filePath, content, "utf8");

console.log("OK: ajustes aplicados.");
console.log("- Estoque confirmado/cancelado agora mostra apenas '-'.");
console.log("- Estoque pendente continua mostrando saldo.");
console.log("- Grafico de cargas por dia foi centralizado/aumentado dentro do mesmo card.");
