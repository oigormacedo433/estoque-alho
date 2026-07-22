import { useEffect, useMemo, useState } from "react";
import {
  cadastrarProdutoFinal,
  calcularProdutoFinalPorArea,
  calcularProdutoFinalPorCalibre,
  calcularResumoProdutoFinal,
  editarProdutoFinal,
  excluirProdutoFinal,
  listarOpcoesProdutoFinal,
  listarProdutoFinal,
} from "../../services/produtoFinalService";

const filtrosIniciais = {
  dataInicial: "",
  dataFinal: "",
  areaId: "",
  calibreId: "",
  responsavelId: "",
};

function dataHoje() {
  return new Date().toISOString().slice(0, 10);
}

function horaAgora() {
  return new Date().toTimeString().slice(0, 5);
}

function formularioInicial() {
  return {
    data_producao: dataHoje(),
    hora: horaAgora(),
    area_id: "",
    calibre_id: "",
    quantidade_caixas: "",
    peso_por_caixa_kg: "10",
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

function formatarPeso(valor) {
  return `${Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
}

function formatarData(data) {
  if (!data) return "-";

  const [ano, mes, dia] = String(data).split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function ProdutoFinal() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [registros, setRegistros] = useState([]);
  const [areas, setAreas] = useState([]);
  const [calibres, setCalibres] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);

  const [filtros, setFiltros] = useState(filtrosIniciais);

  const [modalAberto, setModalAberto] = useState(false);
  const [registroEditando, setRegistroEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial());

  const resumo = useMemo(() => calcularResumoProdutoFinal(registros), [registros]);

  const produtoPorArea = useMemo(() => {
    return calcularProdutoFinalPorArea(registros);
  }, [registros]);

  const produtoPorCalibre = useMemo(() => {
    return calcularProdutoFinalPorCalibre(registros);
  }, [registros]);

  const opcoesArea = useMemo(() => {
    const mapa = new Map();

    areas.forEach((area) => {
      if (area.ativo === false) return;

      mapa.set(area.id, {
        id: area.id,
        nome: area.nome || "Área sem nome",
        fazenda_nome: area.fazendas?.nome || area.fazenda_nome || "",
      });
    });

    registros.forEach((item) => {
      const areaId = item.area_id || item.area_fazenda_id;

      if (!areaId || mapa.has(areaId)) return;

      mapa.set(areaId, {
        id: areaId,
        nome: item.area_nome || "Área sem nome",
        fazenda_nome: "",
      });
    });

    return Array.from(mapa.values()).sort((a, b) =>
      String(a.nome).localeCompare(String(b.nome), "pt-BR")
    );
  }, [areas, registros]);

  const opcoesCalibre = useMemo(() => {
    const mapa = new Map();

    calibres.forEach((calibre) => {
      if (calibre.ativo === false) return;

      mapa.set(calibre.id, {
        id: calibre.id,
        codigo: calibre.codigo || "-",
        nome: calibre.nome || "Calibre sem nome",
        ordem: numero(calibre.ordem),
      });
    });

    registros.forEach((item) => {
      if (!item.calibre_id || mapa.has(item.calibre_id)) return;

      mapa.set(item.calibre_id, {
        id: item.calibre_id,
        codigo: item.calibre_codigo || "-",
        nome: item.calibre_nome || "Calibre sem nome",
        ordem: numero(item.calibre_ordem),
      });
    });

    return Array.from(mapa.values()).sort((a, b) => {
      if (a.ordem !== b.ordem) {
        return a.ordem - b.ordem;
      }

      return String(a.codigo).localeCompare(String(b.codigo), "pt-BR");
    });
  }, [calibres, registros]);

  const quantidadeDigitada = useMemo(() => {
    return numero(formulario.quantidade_caixas);
  }, [formulario.quantidade_caixas]);

  const pesoTotalCalculado = useMemo(() => {
    return quantidadeDigitada * numero(formulario.peso_por_caixa_kg);
  }, [quantidadeDigitada, formulario.peso_por_caixa_kg]);

  const formularioPodeSalvar = useMemo(() => {
    if (salvando) return false;
    if (!formulario.data_producao) return false;
    if (!formulario.hora) return false;
    if (!formulario.area_id) return false;
    if (!formulario.calibre_id) return false;
    if (quantidadeDigitada <= 0) return false;
    if (numero(formulario.peso_por_caixa_kg) <= 0) return false;

    return true;
  }, [salvando, formulario, quantidadeDigitada]);

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");

      const [listaProdutoFinal, opcoes] = await Promise.all([
        listarProdutoFinal(filtros),
        listarOpcoesProdutoFinal(),
      ]);

      setRegistros(listaProdutoFinal || []);
      setAreas(opcoes.areas || []);
      setCalibres(opcoes.calibres || []);
      setResponsaveis(opcoes.responsaveis || []);
    } catch (error) {
      setErro(error.message || "Não foi possível carregar produto final.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function aplicarFiltros() {
    await carregarDados();
  }

  async function limparFiltros() {
    setFiltros(filtrosIniciais);

    setTimeout(() => {
      carregarDados();
    }, 0);
  }

  function abrirNovoLancamento() {
    setRegistroEditando(null);
    setFormulario(formularioInicial());
    setErro("");
    setSucesso("");
    setModalAberto(true);
  }

  function abrirEdicao(registro) {
    setRegistroEditando(registro);

    setFormulario({
      data_producao: registro.data_producao || registro.data_registro || dataHoje(),
      hora: registro.hora || horaAgora(),
      area_id: registro.area_id || registro.area_fazenda_id || "",
      calibre_id: registro.calibre_id || "",
      quantidade_caixas: registro.quantidade_caixas || "",
      peso_por_caixa_kg: registro.peso_por_caixa_kg || "10",
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
    setFormulario(formularioInicial());
  }

  function atualizarFormulario(campo, valor) {
    setFormulario((estadoAtual) => ({
      ...estadoAtual,
      [campo]: valor,
    }));
  }

  async function salvarFormulario(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      if (!formularioPodeSalvar) {
        throw new Error("Verifique os campos obrigatórios do produto final.");
      }

      if (registroEditando) {
        await editarProdutoFinal(registroEditando.id, formulario);
        setSucesso("Produto final atualizado com sucesso.");
      } else {
        await cadastrarProdutoFinal(formulario);
        setSucesso("Produto final lançado com sucesso.");
      }

      setModalAberto(false);
      setRegistroEditando(null);
      setFormulario(formularioInicial());

      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível salvar o produto final.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao(registro) {
    const confirmar = window.confirm(
      `Excluir o produto final ${registro.calibre_codigo} da área ${registro.area_nome}?`
    );

    if (!confirmar) return;

    try {
      setErro("");
      setSucesso("");

      await excluirProdutoFinal(registro.id);

      setSucesso("Produto final excluído com sucesso.");
      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível excluir o produto final.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-[var(--color-text-primary)]">
          Produto Final
        </h1>
        <p className="text-sm text-slate-500">
          Lançamento das caixas finais prontas para venda por Área / Pivô.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Lançamentos</p>
          <strong className="mt-3 block text-3xl font-black text-slate-900">
            {formatarNumero(resumo.totalRegistros)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Registros encontrados</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Caixas finais</p>
          <strong className="mt-3 block text-3xl font-black text-slate-900">
            {formatarNumero(resumo.totalCaixas)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Produto final filtrado</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Peso final</p>
          <strong className="mt-3 block text-3xl font-black text-slate-900">
            {formatarPeso(resumo.pesoTotalKg)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Peso total filtrado</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Áreas / Pivôs</p>
          <strong className="mt-3 block text-3xl font-black text-slate-900">
            {formatarNumero(resumo.areasComProduto)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Áreas com produto final</p>
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
            <h2 className="text-xl font-black text-slate-900">Filtros do produto final</h2>
            <p className="mt-1 text-sm text-slate-500">
              Filtre os lançamentos por período, área, calibre e responsável.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNovoLancamento}
            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
          >
            + Novo lançamento
          </button>
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
              {opcoesArea.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.fazenda_nome ? `${area.fazenda_nome} — ` : ""}
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
              {opcoesCalibre.map((calibre) => (
                <option key={calibre.id} value={calibre.id}>
                  {calibre.codigo} — {calibre.nome}
                </option>
              ))}
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

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">Produto final por calibre</h2>
          <div className="mt-5 space-y-3">
            {produtoPorCalibre.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-400">
                Nenhum produto final por calibre.
              </p>
            ) : (
              produtoPorCalibre.map((item) => (
                <div
                  key={item.calibre_id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 p-4"
                >
                  <div>
                    <strong className="text-slate-900">
                      {item.calibre_codigo} — {item.calibre_nome}
                    </strong>
                    <p className="text-sm text-slate-400">
                      {formatarNumero(item.registros)} lançamento(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <strong className="text-emerald-700">
                      {formatarNumero(item.quantidade_caixas)} caixas
                    </strong>
                    <p className="text-sm text-slate-400">
                      {formatarPeso(item.peso_total_kg)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">
            Produto final por Área / Pivô
          </h2>
          <div className="mt-5 space-y-3">
            {produtoPorArea.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-400">
                Nenhum produto final por área.
              </p>
            ) : (
              produtoPorArea.map((item) => (
                <div
                  key={item.area_id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 p-4"
                >
                  <div>
                    <strong className="text-slate-900">{item.area_nome}</strong>
                    <p className="text-sm text-slate-400">
                      {formatarNumero(item.registros)} lançamento(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <strong className="text-emerald-700">
                      {formatarNumero(item.quantidade_caixas)} caixas
                    </strong>
                    <p className="text-sm text-slate-400">
                      {formatarPeso(item.peso_total_kg)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Lançamentos de Produto Final
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Histórico de produtos finais lançados no estoque final.
            </p>
          </div>

          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            {formatarNumero(registros.length)} registros
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Área / Pivô</th>
                <th className="px-4 py-3">Calibre</th>
                <th className="px-4 py-3 text-right">Caixas</th>
                <th className="px-4 py-3 text-right">Peso caixa</th>
                <th className="px-4 py-3 text-right">Peso total</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {carregando ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-400">
                    Carregando produto final...
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-400">
                    Nenhum produto final encontrado.
                  </td>
                </tr>
              ) : (
                registros.map((registro) => (
                  <tr key={registro.id}>
                    <td className="px-4 py-3 text-slate-600">
                      {formatarData(registro.data_producao || registro.data_registro)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {registro.area_nome}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {registro.calibre_codigo} — {registro.calibre_nome}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {formatarNumero(registro.quantidade_caixas)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatarPeso(registro.peso_por_caixa_kg)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      {formatarPeso(registro.peso_total_kg)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {registro.responsavel_nome}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(registro)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => confirmarExclusao(registro)}
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
      </section>

      {modalAberto ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {registroEditando ? "Editar produto final" : "Novo produto final"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Registre as caixas finais prontas para venda.
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
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">
                    Data do lançamento
                  </span>
                  <input
                    type="date"
                    value={formulario.data_producao}
                    onChange={(event) =>
                      atualizarFormulario("data_producao", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Hora</span>
                  <input
                    type="time"
                    value={formulario.hora}
                    onChange={(event) => atualizarFormulario("hora", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">
                    Área / Pivô de origem
                  </span>
                  <select
                    value={formulario.area_id}
                    onChange={(event) => atualizarFormulario("area_id", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {opcoesArea.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.fazenda_nome ? `${area.fazenda_nome} — ` : ""}
                        {area.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Calibre</span>
                  <select
                    value={formulario.calibre_id}
                    onChange={(event) =>
                      atualizarFormulario("calibre_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {opcoesCalibre.map((calibre) => (
                      <option key={calibre.id} value={calibre.id}>
                        {calibre.codigo} — {calibre.nome}
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
                    value={formulario.quantidade_caixas}
                    onChange={(event) =>
                      atualizarFormulario("quantidade_caixas", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">
                    Peso por caixa em kg
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formulario.peso_por_caixa_kg}
                    onChange={(event) =>
                      atualizarFormulario("peso_por_caixa_kg", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">
                    Peso total calculado
                  </span>
                  <input
                    type="text"
                    value={formatarPeso(pesoTotalCalculado)}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Responsável</span>
                  <select
                    value={formulario.responsavel_id}
                    onChange={(event) =>
                      atualizarFormulario("responsavel_id", event.target.value)
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
                  value={formulario.observacao}
                  onChange={(event) =>
                    atualizarFormulario("observacao", event.target.value)
                  }
                  rows="4"
                  placeholder="Observações sobre o produto final..."
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
                  disabled={!formularioPodeSalvar}
                  className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar produto final"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}