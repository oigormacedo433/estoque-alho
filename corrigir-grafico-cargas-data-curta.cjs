const fs = require("fs");

const filePath = "src/pages/Cargas/Cargas.jsx";

if (!fs.existsSync(filePath)) {
  throw new Error("Arquivo não encontrado: " + filePath);
}

let content = fs.readFileSync(filePath, "utf8");

fs.writeFileSync(filePath + ".bak-grafico-cargas-data-curta", content, "utf8");

function findMatching(text, openIndex, openChar, closeChar) {
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

    if (char === openChar) depth++;

    if (char === closeChar) {
      depth--;

      if (depth === 0) return i;
    }
  }

  return -1;
}

function replaceFunctionByName(functionName, newFunctionCode) {
  const functionToken = "function " + functionName;
  const functionStart = content.indexOf(functionToken);

  if (functionStart < 0) {
    throw new Error("Não encontrei a função do gráfico: " + functionName);
  }

  const paramsOpen = content.indexOf("(", functionStart);
  const paramsClose = findMatching(content, paramsOpen, "(", ")");
  const bodyOpen = content.indexOf("{", paramsClose);
  const bodyClose = findMatching(content, bodyOpen, "{", "}");

  if (paramsOpen < 0 || paramsClose < 0 || bodyOpen < 0 || bodyClose < 0) {
    throw new Error("Não consegui localizar o bloco completo da função: " + functionName);
  }

  content =
    content.slice(0, functionStart) +
    newFunctionCode +
    content.slice(bodyClose + 1);
}

function findChartComponentName() {
  const titleIndex = content.indexOf("Cargas planejadas por dia");

  if (titleIndex < 0) {
    throw new Error("Não encontrei o título Cargas planejadas por dia.");
  }

  const chunk = content.slice(titleIndex, titleIndex + 7000);

  const match = chunk.match(/<([A-Z][A-Za-z0-9_]*)\b[^>]*(dados|data|lista|itens)=/);

  if (!match) {
    throw new Error("Não encontrei automaticamente o componente do gráfico perto do título.");
  }

  return match[1];
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

  const dados = listaOriginal.slice(-25).map((item) => {
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
      const texto = String(valor || "").trim();

      if (!texto) return "-";

      if (texto.includes("-")) {
        const dataLimpa = texto.slice(0, 10);
        const partes = dataLimpa.split("-");

        if (partes.length === 3 && partes[0].length === 4) {
          return partes[2] + "/" + partes[1];
        }
      }

      if (texto.includes("/")) {
        const partes = texto.split("/");

        if (partes.length >= 2) {
          return String(partes[0]).padStart(2, "0") + "/" + String(partes[1]).padStart(2, "0");
        }
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

  const largura = 1160;
  const altura = 360;
  const esquerda = 28;
  const direita = 28;
  const topo = 34;
  const baixo = 58;
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
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="graficoCargasPlanejadasDataCurta" x1="0" y1="0" x2="0" y2="1">
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

        <polygon points={pontosArea} fill="url(#graficoCargasPlanejadasDataCurta)" />

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
replaceFunctionByName(chartComponentName, createChartFunction(chartComponentName));

fs.writeFileSync(filePath, content, "utf8");

console.log("OK: gráfico corrigido.");
console.log("- Datas agora ficam em DD/MM.");
console.log("- Máximo de 25 datas.");
console.log("- Gráfico esticado mais para as laterais.");
