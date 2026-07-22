import { useEffect, useMemo, useState } from "react";
import {
  cadastrarAlhoClassificado,
  cadastrarSaidaAlhoClassificado,
  calcularResumoAlhoClassificado,
  calcularTotalCaixas,
  editarAlhoClassificado,
  editarSaidaAlhoClassificado,
  excluirAlhoClassificado,
  excluirSaidaAlhoClassificado,
  listarAlhoClassificado,
  listarEstoqueAlhoClassificadoAtual,
  listarOpcoesAlhoClassificado,
  listarSaidasAlhoClassificado,
} from "../../services/alhoClassificadoService";

const REGISTROS_POR_PAGINA = 10;

const estadoInicialFiltros = {
  dataInicial: "",
  dataFinal: "",
  fazendaId: "",
  areaId: "",
  calibreId: "",
  status: "",
  responsavelId: "",
};

function dataHoje() {
  return new Date().toISOString().slice(0, 10);
}

function horaAgora() {
  return new Date().toTimeString().slice(0, 5);
}

function estadoInicialEntrada() {
  return {
    data_classificacao: dataHoje(),
    hora: horaAgora(),
    fazenda_id: "",
    area_fazenda_id: "",
    lote: "",
    calibre_id: "",
    quantidade_paletes: "",
    caixas_por_palete: "",
    permitir_edicao_total_caixas: false,
    total_caixas_manual: "",
    conferido: true,
    responsavel_id: "",
    observacao: "",
  };
}

function estadoInicialSaida() {
  return {
    data_saida: dataHoje(),
    hora: horaAgora(),
    area_fazenda_id: "",
    calibre_id: "",
    quantidade_caixas: "",
    responsavel_id: "",
    observacao: "",
  };
}

function numero(valor) {
  const convertido = Number(valor);

  if (!Number.isFinite(convertido)) {
    return 0;
  }

  return convertido;
}

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function formatarData(data) {
  if (!data) return "-";

  const [ano, mes, dia] = String(data).split("-");
  return `${dia}/${mes}/${ano}`;
}

function classeBadgeStatus(status) {
  if (status === "sem_saldo") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (status === "pendente") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function obterSaldoClassificado(item) {
  return numero(item?.saldo_classificado_caixas);
}

function normalizarTextoOrdenacao(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function obterValorOrdenacaoEntrada(registro, campo) {
  if (campo === "data") return registro.data_classificacao || "";
  if (campo === "fazenda") return normalizarTextoOrdenacao(registro.fazenda_nome);
  if (campo === "area") return normalizarTextoOrdenacao(registro.area_nome);
  if (campo === "lote") return normalizarTextoOrdenacao(registro.lote);
  if (campo === "calibre") {
    return `${String(numero(registro.calibre_ordem)).padStart(6, "0")}-${
      registro.calibre_codigo || ""
    }`;
  }
  if (campo === "paletes") return numero(registro.quantidade_paletes);
  if (campo === "caixas") return numero(registro.total_caixas_calculado);
  if (campo === "responsavel") return normalizarTextoOrdenacao(registro.responsavel_nome);
  if (campo === "status") return normalizarTextoOrdenacao(registro.status_texto);

  return "";
}

function obterValorOrdenacaoSaida(registro, campo) {
  if (campo === "data") return registro.data_saida || "";
  if (campo === "area") return normalizarTextoOrdenacao(registro.area_nome);
  if (campo === "calibre") {
    return `${String(numero(registro.calibre_ordem)).padStart(6, "0")}-${
      registro.calibre_codigo || ""
    }`;
  }
  if (campo === "caixas") return numero(registro.quantidade_caixas);
  if (campo === "responsavel") return normalizarTextoOrdenacao(registro.responsavel_nome);
  if (campo === "observacao") return normalizarTextoOrdenacao(registro.observacao);

  return "";
}

function ordenarRegistros(lista, ordenacao, tipo) {
  const obterValor =
    tipo === "entrada" ? obterValorOrdenacaoEntrada : obterValorOrdenacaoSaida;

  return [...lista].sort((a, b) => {
    const valorA = obterValor(a, ordenacao.campo);
    const valorB = obterValor(b, ordenacao.campo);

    if (typeof valorA === "number" && typeof valorB === "number") {
      return ordenacao.direcao === "asc" ? valorA - valorB : valorB - valorA;
    }

    const comparacao = String(valorA).localeCompare(String(valorB), "pt-BR", {
      numeric: true,
    });

    return ordenacao.direcao === "asc" ? comparacao : comparacao * -1;
  });
}

function calcularTotalPaginas(totalRegistros) {
  return Math.max(Math.ceil(totalRegistros / REGISTROS_POR_PAGINA), 1);
}

function paginarRegistros(lista, paginaAtual) {
  const inicio = (paginaAtual - 1) * REGISTROS_POR_PAGINA;
  const fim = inicio + REGISTROS_POR_PAGINA;

  return lista.slice(inicio, fim);
}

function BotaoOrdenacao({ children, campo, ordenacao, onClick, align = "left" }) {
  const ativo = ordenacao.campo === campo;
  const icone = ativo ? (ordenacao.direcao === "asc" ? "↑" : "↓") : "↕";

  return (
    <button
      type="button"
      onClick={() => onClick(campo)}
      className={`inline-flex items-center gap-1 font-black uppercase tracking-wide transition hover:text-emerald-700 ${
        align === "right" ? "ml-auto justify-end text-right" : "justify-start text-left"
      } ${ativo ? "text-emerald-700" : "text-slate-500"}`}
    >
      <span>{children}</span>
      <span className="text-[10px]">{icone}</span>
    </button>
  );
}

function Paginacao({ paginaAtual, totalPaginas, totalRegistros, onChange }) {
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm md:flex-row md:items-center md:justify-between">
      <p className="text-slate-500">
        Mostrando até {REGISTROS_POR_PAGINA} por página • {formatarNumero(totalRegistros)}{" "}
        registro(s)
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={paginaAtual <= 1}
          onClick={() => onChange(paginaAtual - 1)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>

        <span className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
          Página {paginaAtual} de {totalPaginas}
        </span>

        <button
          type="button"
          disabled={paginaAtual >= totalPaginas}
          onClick={() => onChange(paginaAtual + 1)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

export default function AlhoClassificado() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [entradas, setEntradas] = useState([]);
  const [saidas, setSaidas] = useState([]);
  const [estoqueClassificado, setEstoqueClassificado] = useState([]);

  const [fazendas, setFazendas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [calibres, setCalibres] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);

  const [filtros, setFiltros] = useState(estadoInicialFiltros);

  const [paginaEntradas, setPaginaEntradas] = useState(1);
  const [paginaSaidas, setPaginaSaidas] = useState(1);

  const [ordenacaoEntradas, setOrdenacaoEntradas] = useState({
    campo: "data",
    direcao: "desc",
  });

  const [ordenacaoSaidas, setOrdenacaoSaidas] = useState({
    campo: "data",
    direcao: "desc",
  });

  const [modalAberto, setModalAberto] = useState(false);
  const [modalTipo, setModalTipo] = useState("entrada");
  const [registroEditando, setRegistroEditando] = useState(null);

  const [formularioEntrada, setFormularioEntrada] = useState(estadoInicialEntrada());
  const [formularioSaida, setFormularioSaida] = useState(estadoInicialSaida());

  const resumo = useMemo(
    () => calcularResumoAlhoClassificado(entradas, saidas),
    [entradas, saidas]
  );

  const entradasOrdenadas = useMemo(() => {
    return ordenarRegistros(entradas, ordenacaoEntradas, "entrada");
  }, [entradas, ordenacaoEntradas]);

  const saidasOrdenadas = useMemo(() => {
    return ordenarRegistros(saidas, ordenacaoSaidas, "saida");
  }, [saidas, ordenacaoSaidas]);

  const totalPaginasEntradas = useMemo(() => {
    return calcularTotalPaginas(entradasOrdenadas.length);
  }, [entradasOrdenadas.length]);

  const totalPaginasSaidas = useMemo(() => {
    return calcularTotalPaginas(saidasOrdenadas.length);
  }, [saidasOrdenadas.length]);

  const entradasPaginadas = useMemo(() => {
    return paginarRegistros(entradasOrdenadas, paginaEntradas);
  }, [entradasOrdenadas, paginaEntradas]);

  const saidasPaginadas = useMemo(() => {
    return paginarRegistros(saidasOrdenadas, paginaSaidas);
  }, [saidasOrdenadas, paginaSaidas]);

  const areasAtivas = useMemo(() => {
    return areas.filter((area) => area.ativo !== false);
  }, [areas]);

  const areasEntradaFormulario = useMemo(() => {
    if (!formularioEntrada.fazenda_id) {
      return areasAtivas;
    }

    const areasDaFazenda = areasAtivas.filter((area) => {
      return area.fazenda_id === formularioEntrada.fazenda_id;
    });

    if (areasDaFazenda.length > 0) {
      return areasDaFazenda;
    }

    return areasAtivas;
  }, [areasAtivas, formularioEntrada.fazenda_id]);

  const areasDosFiltros = useMemo(() => {
    if (!filtros.fazendaId) {
      return areasAtivas;
    }

    const areasDaFazenda = areasAtivas.filter((area) => {
      return area.fazenda_id === filtros.fazendaId;
    });

    if (areasDaFazenda.length > 0) {
      return areasDaFazenda;
    }

    return areasAtivas;
  }, [areasAtivas, filtros.fazendaId]);

  const totalFormularioEntrada = useMemo(() => {
    return calcularTotalCaixas(formularioEntrada);
  }, [formularioEntrada]);

  const estoqueComSaldo = useMemo(() => {
    return estoqueClassificado.filter((item) => obterSaldoClassificado(item) > 0);
  }, [estoqueClassificado]);

  const areasSaidaFormulario = useMemo(() => {
    const mapa = new Map();

    estoqueComSaldo.forEach((item) => {
      const areaId = item.area_id || item.area_fazenda_id;

      if (!areaId) return;

      if (!mapa.has(areaId)) {
        mapa.set(areaId, {
          id: areaId,
          nome: item.area_nome || "Área sem nome",
          saldo: 0,
        });
      }

      const atual = mapa.get(areaId);
      atual.saldo += obterSaldoClassificado(item);

      mapa.set(areaId, atual);
    });

    if (modalTipo === "saida" && registroEditando) {
      const areaId = registroEditando.area_fazenda_id || registroEditando.area_id;

      if (areaId && !mapa.has(areaId)) {
        mapa.set(areaId, {
          id: areaId,
          nome: registroEditando.area_nome || "Área sem nome",
          saldo: numero(registroEditando.quantidade_caixas),
        });
      }
    }

    return Array.from(mapa.values()).sort((a, b) =>
      String(a.nome).localeCompare(String(b.nome), "pt-BR")
    );
  }, [estoqueComSaldo, modalTipo, registroEditando]);

  const calibresSaidaFormulario = useMemo(() => {
    if (!formularioSaida.area_fazenda_id) {
      return [];
    }

    const lista = estoqueComSaldo.filter((item) => {
      const areaId = item.area_id || item.area_fazenda_id;
      return areaId === formularioSaida.area_fazenda_id;
    });

    const jaExiste = lista.some((item) => item.calibre_id === formularioSaida.calibre_id);

    if (
      modalTipo === "saida" &&
      registroEditando &&
      formularioSaida.calibre_id &&
      !jaExiste
    ) {
      lista.push({
        area_id: formularioSaida.area_fazenda_id,
        area_fazenda_id: formularioSaida.area_fazenda_id,
        calibre_id: formularioSaida.calibre_id,
        calibre_codigo: registroEditando.calibre_codigo || "-",
        calibre_nome: registroEditando.calibre_nome || "-",
        calibre_ordem: registroEditando.calibre_ordem || 0,
        saldo_classificado_caixas: numero(registroEditando.quantidade_caixas),
      });
    }

    return lista.sort((a, b) => {
      const ordemA = numero(a.calibre_ordem);
      const ordemB = numero(b.calibre_ordem);

      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }

      return String(a.calibre_codigo || "").localeCompare(
        String(b.calibre_codigo || ""),
        "pt-BR"
      );
    });
  }, [
    estoqueComSaldo,
    formularioSaida.area_fazenda_id,
    formularioSaida.calibre_id,
    modalTipo,
    registroEditando,
  ]);

  const estoqueSaidaSelecionado = useMemo(() => {
    if (!formularioSaida.area_fazenda_id || !formularioSaida.calibre_id) {
      return null;
    }

    return (
      estoqueClassificado.find((item) => {
        const areaId = item.area_id || item.area_fazenda_id;
        return (
          areaId === formularioSaida.area_fazenda_id &&
          item.calibre_id === formularioSaida.calibre_id
        );
      }) || null
    );
  }, [estoqueClassificado, formularioSaida.area_fazenda_id, formularioSaida.calibre_id]);

  const devolucaoSaidaEdicao = useMemo(() => {
    if (modalTipo !== "saida" || !registroEditando) {
      return 0;
    }

    const mesmaArea =
      (registroEditando.area_fazenda_id || registroEditando.area_id) ===
      formularioSaida.area_fazenda_id;

    const mesmoCalibre = registroEditando.calibre_id === formularioSaida.calibre_id;

    if (!mesmaArea || !mesmoCalibre) {
      return 0;
    }

    return numero(registroEditando.quantidade_caixas);
  }, [
    modalTipo,
    registroEditando,
    formularioSaida.area_fazenda_id,
    formularioSaida.calibre_id,
  ]);

  const saldoSaidaSelecionado = useMemo(() => {
    return obterSaldoClassificado(estoqueSaidaSelecionado) + devolucaoSaidaEdicao;
  }, [estoqueSaidaSelecionado, devolucaoSaidaEdicao]);

  const quantidadeSaidaDigitada = useMemo(() => {
    return numero(formularioSaida.quantidade_caixas);
  }, [formularioSaida.quantidade_caixas]);

  const mensagemSaldoSaida = useMemo(() => {
    if (!formularioSaida.area_fazenda_id || !formularioSaida.calibre_id) {
      return {
        tipo: "neutro",
        texto: "Selecione uma Área/Pivô e um calibre para ver o saldo disponível.",
      };
    }

    if (saldoSaidaSelecionado <= 0) {
      return {
        tipo: "erro",
        texto: "Não existe saldo disponível para esta Área/Pivô e este calibre.",
      };
    }

    if (quantidadeSaidaDigitada > saldoSaidaSelecionado) {
      return {
        tipo: "erro",
        texto: `Quantidade maior que o saldo disponível. Disponível: ${formatarNumero(
          saldoSaidaSelecionado
        )} caixas.`,
      };
    }

    return {
      tipo: "ok",
      texto: `Saldo disponível no Alho Classificado: ${formatarNumero(
        saldoSaidaSelecionado
      )} caixas.`,
    };
  }, [
    formularioSaida.area_fazenda_id,
    formularioSaida.calibre_id,
    saldoSaidaSelecionado,
    quantidadeSaidaDigitada,
  ]);

  const formularioSaidaPodeSalvar = useMemo(() => {
    if (salvando) return false;
    if (!formularioSaida.data_saida) return false;
    if (!formularioSaida.hora) return false;
    if (!formularioSaida.area_fazenda_id) return false;
    if (!formularioSaida.calibre_id) return false;
    if (!formularioSaida.responsavel_id) return false;
    if (quantidadeSaidaDigitada <= 0) return false;
    if (quantidadeSaidaDigitada > saldoSaidaSelecionado) return false;

    return true;
  }, [salvando, formularioSaida, quantidadeSaidaDigitada, saldoSaidaSelecionado]);

  useEffect(() => {
    if (paginaEntradas > totalPaginasEntradas) {
      setPaginaEntradas(totalPaginasEntradas);
    }
  }, [paginaEntradas, totalPaginasEntradas]);

  useEffect(() => {
    if (paginaSaidas > totalPaginasSaidas) {
      setPaginaSaidas(totalPaginasSaidas);
    }
  }, [paginaSaidas, totalPaginasSaidas]);

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");

      const [opcoes, listaEntradas, listaSaidas, listaEstoque] = await Promise.all([
        listarOpcoesAlhoClassificado(),
        listarAlhoClassificado(filtros),
        listarSaidasAlhoClassificado(filtros),
        listarEstoqueAlhoClassificadoAtual(filtros),
      ]);

      setFazendas(opcoes.fazendas || []);
      setAreas(opcoes.areas || []);
      setCalibres(opcoes.calibres || []);
      setResponsaveis(opcoes.responsaveis || []);

      setEntradas(listaEntradas || []);
      setSaidas(listaSaidas || []);
      setEstoqueClassificado(listaEstoque || []);

      setPaginaEntradas(1);
      setPaginaSaidas(1);
    } catch (error) {
      setErro(error.message || "Não foi possível carregar alho classificado.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function aplicarFiltros() {
    setPaginaEntradas(1);
    setPaginaSaidas(1);
    await carregarDados();
  }

  async function limparFiltros() {
    setFiltros(estadoInicialFiltros);
    setPaginaEntradas(1);
    setPaginaSaidas(1);

    setTimeout(() => {
      carregarDados();
    }, 0);
  }

  function alternarOrdenacaoEntradas(campo) {
    setPaginaEntradas(1);

    setOrdenacaoEntradas((estadoAtual) => {
      if (estadoAtual.campo === campo) {
        return {
          campo,
          direcao: estadoAtual.direcao === "asc" ? "desc" : "asc",
        };
      }

      return {
        campo,
        direcao: campo === "data" ? "desc" : "asc",
      };
    });
  }

  function alternarOrdenacaoSaidas(campo) {
    setPaginaSaidas(1);

    setOrdenacaoSaidas((estadoAtual) => {
      if (estadoAtual.campo === campo) {
        return {
          campo,
          direcao: estadoAtual.direcao === "asc" ? "desc" : "asc",
        };
      }

      return {
        campo,
        direcao: campo === "data" ? "desc" : "asc",
      };
    });
  }

  function abrirNovaEntrada() {
    setModalTipo("entrada");
    setRegistroEditando(null);
    setFormularioEntrada(estadoInicialEntrada());
    setErro("");
    setSucesso("");
    setModalAberto(true);
  }

  function abrirNovaSaida() {
    setModalTipo("saida");
    setRegistroEditando(null);
    setFormularioSaida(estadoInicialSaida());
    setErro("");
    setSucesso("");
    setModalAberto(true);
  }

  function abrirEdicaoEntrada(registro) {
    setModalTipo("entrada");
    setRegistroEditando(registro);

    setFormularioEntrada({
      data_classificacao: registro.data_classificacao || dataHoje(),
      hora: registro.hora || horaAgora(),
      fazenda_id: registro.fazenda_id || "",
      area_fazenda_id: registro.area_fazenda_id || registro.area_id || "",
      lote: registro.lote || "",
      calibre_id: registro.calibre_id || "",
      quantidade_paletes: registro.quantidade_paletes || "",
      caixas_por_palete: registro.caixas_por_palete || "",
      permitir_edicao_total_caixas: Boolean(registro.permitir_edicao_total_caixas),
      total_caixas_manual: registro.total_caixas_manual || "",
      conferido: Boolean(registro.conferido),
      responsavel_id: registro.responsavel_id || "",
      observacao: registro.observacao || "",
    });

    setErro("");
    setSucesso("");
    setModalAberto(true);
  }

  function abrirEdicaoSaida(registro) {
    setModalTipo("saida");
    setRegistroEditando(registro);

    setFormularioSaida({
      data_saida: registro.data_saida || dataHoje(),
      hora: registro.hora || horaAgora(),
      area_fazenda_id: registro.area_fazenda_id || registro.area_id || "",
      calibre_id: registro.calibre_id || "",
      quantidade_caixas: registro.quantidade_caixas || "",
      responsavel_id: registro.responsavel_id || "",
      observacao: registro.observacao || "",
    });

    setErro("");
    setSucesso("");
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) return;

    setModalAberto(false);
    setRegistroEditando(null);
    setFormularioEntrada(estadoInicialEntrada());
    setFormularioSaida(estadoInicialSaida());
  }

  function atualizarFormularioEntrada(campo, valor) {
    setFormularioEntrada((estadoAtual) => {
      const proximo = {
        ...estadoAtual,
        [campo]: valor,
      };

      if (campo === "fazenda_id") {
        const areasDaFazenda = areasAtivas.filter((area) => {
          return area.fazenda_id === valor;
        });

        if (areasDaFazenda.length === 1) {
          proximo.area_fazenda_id = areasDaFazenda[0].id;
        } else {
          proximo.area_fazenda_id = "";
        }
      }

      if (campo === "area_fazenda_id" && valor && !proximo.fazenda_id) {
        const areaSelecionada = areasAtivas.find((area) => area.id === valor);

        if (areaSelecionada?.fazenda_id) {
          proximo.fazenda_id = areaSelecionada.fazenda_id;
        }
      }

      if (campo === "permitir_edicao_total_caixas" && !valor) {
        proximo.total_caixas_manual = "";
      }

      return proximo;
    });
  }

  function atualizarFormularioSaida(campo, valor) {
    setFormularioSaida((estadoAtual) => {
      const proximo = {
        ...estadoAtual,
        [campo]: valor,
      };

      if (campo === "area_fazenda_id") {
        proximo.calibre_id = "";
        proximo.quantidade_caixas = "";
      }

      if (campo === "calibre_id") {
        proximo.quantidade_caixas = "";
      }

      return proximo;
    });
  }

  async function salvarFormulario(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      if (modalTipo === "entrada") {
        if (registroEditando) {
          await editarAlhoClassificado(registroEditando.id, formularioEntrada);
          setSucesso("Entrada atualizada com sucesso.");
        } else {
          await cadastrarAlhoClassificado(formularioEntrada);
          setSucesso("Entrada registrada com sucesso.");
        }
      }

      if (modalTipo === "saida") {
        if (!formularioSaidaPodeSalvar) {
          throw new Error("Verifique os campos da saída e o saldo disponível.");
        }

        if (registroEditando) {
          await editarSaidaAlhoClassificado(registroEditando.id, formularioSaida);
          setSucesso("Saída atualizada com sucesso.");
        } else {
          await cadastrarSaidaAlhoClassificado(formularioSaida);
          setSucesso("Saída registrada com sucesso.");
        }
      }

      setModalAberto(false);
      setRegistroEditando(null);
      setFormularioEntrada(estadoInicialEntrada());
      setFormularioSaida(estadoInicialSaida());

      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível salvar o lançamento.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusaoEntrada(registro) {
    const confirmar = window.confirm(
      `Excluir a entrada ${registro.calibre_codigo} da área ${registro.area_nome}?`
    );

    if (!confirmar) return;

    try {
      setErro("");
      setSucesso("");

      await excluirAlhoClassificado(registro.id);

      setSucesso("Entrada excluída com sucesso.");
      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível excluir a entrada.");
    }
  }

  async function confirmarExclusaoSaida(registro) {
    const confirmar = window.confirm(
      `Excluir a saída ${registro.calibre_codigo} da área ${registro.area_nome}?`
    );

    if (!confirmar) return;

    try {
      setErro("");
      setSucesso("");

      await excluirSaidaAlhoClassificado(registro.id);

      setSucesso("Saída excluída com sucesso.");
      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível excluir a saída.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-[var(--color-text-primary)]">
          Alho Classificado
        </h1>
        <p className="text-sm text-slate-500">
          Controle próprio de entrada, saída e saldo do alho classificado.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Entradas</p>
          <strong className="mt-3 block text-3xl font-black text-slate-900">
            {formatarNumero(resumo.totalEntradas)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Caixas classificadas</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Saídas</p>
          <strong className="mt-3 block text-3xl font-black text-slate-900">
            {formatarNumero(resumo.totalSaidas)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Caixas retiradas</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Saldo atual</p>
          <strong className="mt-3 block text-3xl font-black text-emerald-700">
            {formatarNumero(resumo.saldoAtual)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Entrada menos saída</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Paletes</p>
          <strong className="mt-3 block text-3xl font-black text-slate-900">
            {formatarNumero(resumo.totalPaletes)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Total filtrado</p>
        </div>
      </div>

      {erro ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <strong>Atenção</strong>
          <p className="mt-1">{erro}</p>
        </div>
      ) : null}

      {sucesso ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          <strong>Sucesso</strong>
          <p className="mt-1">{sucesso}</p>
        </div>
      ) : null}

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Filtros da classificação</h2>
            <p className="mt-1 text-sm text-slate-500">
              Filtre por período, fazenda, área, calibre, status e responsável.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={abrirNovaEntrada}
              className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
            >
              + Entrada
            </button>

            <button
              type="button"
              onClick={abrirNovaSaida}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
            >
              + Saída
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Data inicial</span>
            <input
              type="date"
              value={filtros.dataInicial}
              onChange={(event) =>
                setFiltros((estado) => ({
                  ...estado,
                  dataInicial: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Data final</span>
            <input
              type="date"
              value={filtros.dataFinal}
              onChange={(event) =>
                setFiltros((estado) => ({
                  ...estado,
                  dataFinal: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Fazenda</span>
            <select
              value={filtros.fazendaId}
              onChange={(event) =>
                setFiltros((estado) => ({
                  ...estado,
                  fazendaId: event.target.value,
                  areaId: "",
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">Todas as fazendas</option>
              {fazendas.map((fazenda) => (
                <option key={fazenda.id} value={fazenda.id}>
                  {fazenda.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Área / Pivô</span>
            <select
              value={filtros.areaId}
              onChange={(event) =>
                setFiltros((estado) => ({
                  ...estado,
                  areaId: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">Todas as áreas</option>
              {areasDosFiltros.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Calibre</span>
            <select
              value={filtros.calibreId}
              onChange={(event) =>
                setFiltros((estado) => ({
                  ...estado,
                  calibreId: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">Todos os calibres</option>
              {calibres.map((calibre) => (
                <option key={calibre.id} value={calibre.id}>
                  {calibre.codigo} — {calibre.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Status</span>
            <select
              value={filtros.status}
              onChange={(event) =>
                setFiltros((estado) => ({
                  ...estado,
                  status: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">Todos</option>
              <option value="conferido">Conferido</option>
              <option value="pendente">Pendente</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Responsável</span>
            <select
              value={filtros.responsavelId}
              onChange={(event) =>
                setFiltros((estado) => ({
                  ...estado,
                  responsavelId: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">Todos os responsáveis</option>
              {responsaveis.map((responsavel) => (
                <option key={responsavel.id} value={responsavel.id}>
                  {responsavel.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={limparFiltros}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Limpar filtros
          </button>

          <button
            type="button"
            onClick={aplicarFiltros}
            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            Atualizar
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Estoque do Alho Classificado
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Entrada menos saída dentro da própria tela de Alho Classificado.
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
            {formatarNumero(estoqueClassificado.length)} combinações
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Área / Pivô</th>
                <th className="px-4 py-3">Calibre</th>
                <th className="px-4 py-3 text-right">Entradas</th>
                <th className="px-4 py-3 text-right">Saídas</th>
                <th className="px-4 py-3 text-right">Saldo disponível</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {estoqueClassificado.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-slate-400">
                    Nenhum estoque classificado encontrado.
                  </td>
                </tr>
              ) : (
                estoqueClassificado.map((item) => (
                  <tr key={`${item.area_id}-${item.calibre_id}`}>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {item.area_nome}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.calibre_codigo} — {item.calibre_nome}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {formatarNumero(
                        item.entrada_classificado_caixas || item.classificado_caixas
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-700">
                      {formatarNumero(
                        item.saida_classificado_caixas || item.saidas_classificado_caixas
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700">
                      {formatarNumero(item.saldo_classificado_caixas)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${classeBadgeStatus(
                          item.status_classificado
                        )}`}
                      >
                        {item.status_classificado === "sem_saldo"
                          ? "Sem saldo"
                          : "Normal"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Entradas registradas</h2>
              <p className="mt-1 text-sm text-slate-500">
                Histórico de entradas que alimentam o estoque classificado.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              {formatarNumero(entradas.length)} registros
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-[980px] divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    <BotaoOrdenacao
                      campo="data"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                    >
                      Data
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3">
                    <BotaoOrdenacao
                      campo="fazenda"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                    >
                      Fazenda
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3">
                    <BotaoOrdenacao
                      campo="area"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                    >
                      Área / Pivô
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3">
                    <BotaoOrdenacao
                      campo="lote"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                    >
                      Lote
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3">
                    <BotaoOrdenacao
                      campo="calibre"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                    >
                      Calibre
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <BotaoOrdenacao
                      campo="paletes"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                      align="right"
                    >
                      Paletes
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <BotaoOrdenacao
                      campo="caixas"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                      align="right"
                    >
                      Caixas
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3">
                    <BotaoOrdenacao
                      campo="responsavel"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                    >
                      Responsável
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3">
                    <BotaoOrdenacao
                      campo="status"
                      ordenacao={ordenacaoEntradas}
                      onClick={alternarOrdenacaoEntradas}
                    >
                      Status
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {carregando ? (
                  <tr>
                    <td colSpan="10" className="px-4 py-10 text-center text-slate-400">
                      Carregando entradas...
                    </td>
                  </tr>
                ) : entradasOrdenadas.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-4 py-10 text-center text-slate-400">
                      Nenhuma entrada encontrada.
                    </td>
                  </tr>
                ) : (
                  entradasPaginadas.map((registro) => (
                    <tr key={registro.id}>
                      <td className="px-4 py-3 text-slate-600">
                        {formatarData(registro.data_classificacao)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {registro.fazenda_nome}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {registro.area_nome}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {registro.lote || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {registro.calibre_codigo} — {registro.calibre_nome}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatarNumero(registro.quantidade_paletes)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">
                        {formatarNumero(registro.total_caixas_calculado)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {registro.responsavel_nome}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${classeBadgeStatus(
                            registro.conferido ? "normal" : "pendente"
                          )}`}
                        >
                          {registro.status_texto}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => abrirEdicaoEntrada(registro)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => confirmarExclusaoEntrada(registro)}
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Paginacao
            paginaAtual={paginaEntradas}
            totalPaginas={totalPaginasEntradas}
            totalRegistros={entradasOrdenadas.length}
            onChange={setPaginaEntradas}
          />
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Saídas registradas</h2>
              <p className="mt-1 text-sm text-slate-500">
                Histórico de saídas que reduzem o estoque classificado.
              </p>
            </div>

            <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
              {formatarNumero(saidas.length)} registros
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-[780px] divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    <BotaoOrdenacao
                      campo="data"
                      ordenacao={ordenacaoSaidas}
                      onClick={alternarOrdenacaoSaidas}
                    >
                      Data
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3">
                    <BotaoOrdenacao
                      campo="area"
                      ordenacao={ordenacaoSaidas}
                      onClick={alternarOrdenacaoSaidas}
                    >
                      Área / Pivô
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3">
                    <BotaoOrdenacao
                      campo="calibre"
                      ordenacao={ordenacaoSaidas}
                      onClick={alternarOrdenacaoSaidas}
                    >
                      Calibre
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <BotaoOrdenacao
                      campo="caixas"
                      ordenacao={ordenacaoSaidas}
                      onClick={alternarOrdenacaoSaidas}
                      align="right"
                    >
                      Caixas
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3">
                    <BotaoOrdenacao
                      campo="responsavel"
                      ordenacao={ordenacaoSaidas}
                      onClick={alternarOrdenacaoSaidas}
                    >
                      Responsável
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3">
                    <BotaoOrdenacao
                      campo="observacao"
                      ordenacao={ordenacaoSaidas}
                      onClick={alternarOrdenacaoSaidas}
                    >
                      Observação
                    </BotaoOrdenacao>
                  </th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {carregando ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-10 text-center text-slate-400">
                      Carregando saídas...
                    </td>
                  </tr>
                ) : saidasOrdenadas.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-10 text-center text-slate-400">
                      Nenhuma saída registrada.
                    </td>
                  </tr>
                ) : (
                  saidasPaginadas.map((registro) => (
                    <tr key={registro.id}>
                      <td className="px-4 py-3 text-slate-600">
                        {formatarData(registro.data_saida)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {registro.area_nome}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {registro.calibre_codigo} — {registro.calibre_nome}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-700">
                        {formatarNumero(registro.quantidade_caixas)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {registro.responsavel_nome}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {registro.observacao || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => abrirEdicaoSaida(registro)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => confirmarExclusaoSaida(registro)}
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Paginacao
            paginaAtual={paginaSaidas}
            totalPaginas={totalPaginasSaidas}
            totalRegistros={saidasOrdenadas.length}
            onChange={setPaginaSaidas}
          />
        </section>
      </div>

      {modalAberto && modalTipo === "entrada" ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {registroEditando ? "Editar entrada" : "Nova entrada"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Esta entrada aumenta o estoque próprio do Alho Classificado.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={salvarFormulario} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Data</span>
                  <input
                    type="date"
                    value={formularioEntrada.data_classificacao}
                    onChange={(event) =>
                      atualizarFormularioEntrada("data_classificacao", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Hora</span>
                  <input
                    type="time"
                    value={formularioEntrada.hora}
                    onChange={(event) =>
                      atualizarFormularioEntrada("hora", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Fazenda</span>
                  <select
                    value={formularioEntrada.fazenda_id}
                    onChange={(event) =>
                      atualizarFormularioEntrada("fazenda_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {fazendas.map((fazenda) => (
                      <option key={fazenda.id} value={fazenda.id}>
                        {fazenda.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Área / Pivô</span>
                  <select
                    value={formularioEntrada.area_fazenda_id}
                    onChange={(event) =>
                      atualizarFormularioEntrada("area_fazenda_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {areasEntradaFormulario.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Lote</span>
                  <input
                    type="text"
                    value={formularioEntrada.lote}
                    onChange={(event) =>
                      atualizarFormularioEntrada("lote", event.target.value)
                    }
                    placeholder="Ex: Lote 01"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Calibre</span>
                  <select
                    value={formularioEntrada.calibre_id}
                    onChange={(event) =>
                      atualizarFormularioEntrada("calibre_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {calibres.map((calibre) => (
                      <option key={calibre.id} value={calibre.id}>
                        {calibre.codigo} — {calibre.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">
                    Quantidade de paletes
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formularioEntrada.quantidade_paletes}
                    onChange={(event) =>
                      atualizarFormularioEntrada("quantidade_paletes", event.target.value)
                    }
                    disabled={formularioEntrada.permitir_edicao_total_caixas}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">
                    Caixas por palete
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formularioEntrada.caixas_por_palete}
                    onChange={(event) =>
                      atualizarFormularioEntrada("caixas_por_palete", event.target.value)
                    }
                    disabled={formularioEntrada.permitir_edicao_total_caixas}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Responsável</span>
                  <select
                    value={formularioEntrada.responsavel_id}
                    onChange={(event) =>
                      atualizarFormularioEntrada("responsavel_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {responsaveis.map((responsavel) => (
                      <option key={responsavel.id} value={responsavel.id}>
                        {responsavel.nome}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formularioEntrada.permitir_edicao_total_caixas}
                    onChange={(event) =>
                      atualizarFormularioEntrada(
                        "permitir_edicao_total_caixas",
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700"
                  />
                  Permitir edição manual do total de caixas
                </label>

                {formularioEntrada.permitir_edicao_total_caixas ? (
                  <label className="mt-4 block space-y-2">
                    <span className="text-sm font-bold text-slate-700">
                      Total manual de caixas
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formularioEntrada.total_caixas_manual}
                      onChange={(event) =>
                        atualizarFormularioEntrada(
                          "total_caixas_manual",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
                    />
                  </label>
                ) : null}

                <div className="mt-4 rounded-xl bg-white px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Total calculado para entrada
                  </p>
                  <strong className="mt-1 block text-2xl font-black text-emerald-700">
                    {formatarNumero(totalFormularioEntrada)} caixas
                  </strong>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">
                  Descrição / Observação
                </span>
                <textarea
                  value={formularioEntrada.observacao}
                  onChange={(event) =>
                    atualizarFormularioEntrada("observacao", event.target.value)
                  }
                  rows="4"
                  placeholder="Digite uma observação sobre a entrada..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                />
              </label>

              <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={formularioEntrada.conferido}
                  onChange={(event) =>
                    atualizarFormularioEntrada("conferido", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700"
                />
                Lançamento conferido
              </label>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  {salvando ? "Salvando..." : "Salvar entrada"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalAberto && modalTipo === "saida" ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {registroEditando ? "Editar saída" : "Nova saída"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Esta saída reduz o estoque próprio do Alho Classificado.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={salvarFormulario} className="space-y-6">
              <div
                className={`rounded-2xl border px-5 py-4 text-sm ${
                  mensagemSaldoSaida.tipo === "erro"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : mensagemSaldoSaida.tipo === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                <strong>Saldo do Alho Classificado</strong>
                <p className="mt-1">{mensagemSaldoSaida.texto}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Data da saída</span>
                  <input
                    type="date"
                    value={formularioSaida.data_saida}
                    onChange={(event) =>
                      atualizarFormularioSaida("data_saida", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Hora</span>
                  <input
                    type="time"
                    value={formularioSaida.hora}
                    onChange={(event) =>
                      atualizarFormularioSaida("hora", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Área / Pivô</span>
                  <select
                    value={formularioSaida.area_fazenda_id}
                    onChange={(event) =>
                      atualizarFormularioSaida("area_fazenda_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {areasSaidaFormulario.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.nome} — {formatarNumero(area.saldo)} caixas
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Calibre</span>
                  <select
                    value={formularioSaida.calibre_id}
                    onChange={(event) =>
                      atualizarFormularioSaida("calibre_id", event.target.value)
                    }
                    disabled={!formularioSaida.area_fazenda_id}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
                  >
                    <option value="">Selecione</option>
                    {calibresSaidaFormulario.map((item) => (
                      <option key={item.calibre_id} value={item.calibre_id}>
                        {item.calibre_codigo} — {item.calibre_nome} —{" "}
                        {formatarNumero(
                          obterSaldoClassificado(item) +
                            (registroEditando?.calibre_id === item.calibre_id
                              ? devolucaoSaidaEdicao
                              : 0)
                        )}{" "}
                        caixas
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">
                    Quantidade de caixas
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formularioSaida.quantidade_caixas}
                    onChange={(event) =>
                      atualizarFormularioSaida("quantidade_caixas", event.target.value)
                    }
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-emerald-600 ${
                      quantidadeSaidaDigitada > saldoSaidaSelecionado
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200"
                    }`}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Responsável</span>
                  <select
                    value={formularioSaida.responsavel_id}
                    onChange={(event) =>
                      atualizarFormularioSaida("responsavel_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {responsaveis.map((responsavel) => (
                      <option key={responsavel.id} value={responsavel.id}>
                        {responsavel.nome}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Observação</span>
                <textarea
                  value={formularioSaida.observacao}
                  onChange={(event) =>
                    atualizarFormularioSaida("observacao", event.target.value)
                  }
                  rows="4"
                  placeholder="Observações sobre a saída..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={!formularioSaidaPodeSalvar}
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar saída"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}