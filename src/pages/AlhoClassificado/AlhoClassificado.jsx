import { useEffect, useMemo, useState } from "react";
import {
  cadastrarAlhoClassificado,
  calcularResumoAlhoClassificado,
  calcularTotalCaixas,
  editarAlhoClassificado,
  excluirAlhoClassificado,
  listarAlhoClassificado,
  listarEstoqueAlhoClassificadoAtual,
  listarOpcoesAlhoClassificado,
} from "../../services/alhoClassificadoService";

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

function estadoInicialFormulario() {
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

export default function AlhoClassificado() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [registros, setRegistros] = useState([]);
  const [estoqueClassificado, setEstoqueClassificado] = useState([]);

  const [fazendas, setFazendas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [calibres, setCalibres] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);

  const [filtros, setFiltros] = useState(estadoInicialFiltros);

  const [modalAberto, setModalAberto] = useState(false);
  const [registroEditando, setRegistroEditando] = useState(null);
  const [formulario, setFormulario] = useState(estadoInicialFormulario);

  const resumo = useMemo(() => calcularResumoAlhoClassificado(registros), [registros]);

  const areasAtivas = useMemo(() => {
    return areas.filter((area) => area.ativo !== false);
  }, [areas]);

  const areasDoFormulario = useMemo(() => {
    if (!formulario.fazenda_id) {
      return areasAtivas;
    }

    const areasDaFazenda = areasAtivas.filter((area) => {
      return area.fazenda_id === formulario.fazenda_id;
    });

    if (areasDaFazenda.length > 0) {
      return areasDaFazenda;
    }

    return areasAtivas;
  }, [areasAtivas, formulario.fazenda_id]);

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

  const totalFormulario = useMemo(() => {
    return calcularTotalCaixas(formulario);
  }, [formulario]);

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");

      const [opcoes, listaRegistros, listaEstoque] = await Promise.all([
        listarOpcoesAlhoClassificado(),
        listarAlhoClassificado(filtros),
        listarEstoqueAlhoClassificadoAtual(filtros),
      ]);

      setFazendas(opcoes.fazendas || []);
      setAreas(opcoes.areas || []);
      setCalibres(opcoes.calibres || []);
      setResponsaveis(opcoes.responsaveis || []);

      setRegistros(listaRegistros || []);
      setEstoqueClassificado(listaEstoque || []);
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
    await carregarDados();
  }

  async function limparFiltros() {
    setFiltros(estadoInicialFiltros);

    setTimeout(() => {
      carregarDados();
    }, 0);
  }

  function abrirNovoLancamento() {
    setRegistroEditando(null);
    setFormulario(estadoInicialFormulario());
    setErro("");
    setSucesso("");
    setModalAberto(true);
  }

  function abrirEdicao(registro) {
    setRegistroEditando(registro);

    setFormulario({
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

  function fecharModal() {
    if (salvando) return;

    setModalAberto(false);
    setRegistroEditando(null);
    setFormulario(estadoInicialFormulario());
  }

  function atualizarFormulario(campo, valor) {
    setFormulario((estadoAtual) => {
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

  async function salvarFormulario(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      if (registroEditando) {
        await editarAlhoClassificado(registroEditando.id, formulario);
        setSucesso("Classificação atualizada com sucesso.");
      } else {
        await cadastrarAlhoClassificado(formulario);
        setSucesso("Classificação registrada com sucesso.");
      }

      setModalAberto(false);
      setRegistroEditando(null);
      setFormulario(estadoInicialFormulario());

      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível salvar a classificação.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao(registro) {
    const confirmar = window.confirm(
      `Excluir a classificação ${registro.calibre_codigo} da área ${registro.area_nome}?`
    );

    if (!confirmar) return;

    try {
      setErro("");
      setSucesso("");

      await excluirAlhoClassificado(registro.id);

      setSucesso("Classificação excluída com sucesso.");
      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível excluir a classificação.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-[var(--color-text-primary)]">
          Alho Classificado
        </h1>
        <p className="text-sm text-slate-500">
          Lançamento da classificação por calibre e controle próprio do estoque
          classificado.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Classificações</p>
          <strong className="mt-3 block text-3xl font-black text-slate-900">
            {formatarNumero(resumo.totalClassificacoes)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Registros encontrados</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Paletes</p>
          <strong className="mt-3 block text-3xl font-black text-slate-900">
            {formatarNumero(resumo.totalPaletes)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Total filtrado</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Caixas classificadas</p>
          <strong className="mt-3 block text-3xl font-black text-slate-900">
            {formatarNumero(resumo.totalCaixas)}
          </strong>
          <p className="mt-2 text-sm text-slate-400">Total lançado na classificação</p>
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
              Este saldo é separado do estoque atual do produto final.
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
                <th className="px-4 py-3 text-right">Classificado</th>
                <th className="px-4 py-3 text-right">Enviado ao Produto Final</th>
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
                      {formatarNumero(item.classificado_caixas)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatarNumero(item.produto_final_caixas)}
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

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Classificações registradas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Histórico de lançamentos que alimentam o estoque classificado.
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
                <th className="px-4 py-3">Fazenda</th>
                <th className="px-4 py-3">Área / Pivô</th>
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Calibre</th>
                <th className="px-4 py-3 text-right">Paletes</th>
                <th className="px-4 py-3 text-right">Caixas</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {carregando ? (
                <tr>
                  <td colSpan="10" className="px-4 py-10 text-center text-slate-400">
                    Carregando classificações...
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-10 text-center text-slate-400">
                    Nenhuma classificação encontrada.
                  </td>
                </tr>
              ) : (
                registros.map((registro) => (
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
                  {registroEditando ? "Editar classificação" : "Novo lançamento"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Este lançamento alimenta o estoque próprio do Alho Classificado.
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
                    value={formulario.data_classificacao}
                    onChange={(event) =>
                      atualizarFormulario("data_classificacao", event.target.value)
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
                  <span className="text-sm font-bold text-slate-700">Fazenda</span>
                  <select
                    value={formulario.fazenda_id}
                    onChange={(event) =>
                      atualizarFormulario("fazenda_id", event.target.value)
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
                    value={formulario.area_fazenda_id}
                    onChange={(event) =>
                      atualizarFormulario("area_fazenda_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecione</option>
                    {areasDoFormulario.map((area) => (
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
                    value={formulario.lote}
                    onChange={(event) => atualizarFormulario("lote", event.target.value)}
                    placeholder="Ex: Lote 01"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
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
                    value={formulario.quantidade_paletes}
                    onChange={(event) =>
                      atualizarFormulario("quantidade_paletes", event.target.value)
                    }
                    disabled={formulario.permitir_edicao_total_caixas}
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
                    value={formulario.caixas_por_palete}
                    onChange={(event) =>
                      atualizarFormulario("caixas_por_palete", event.target.value)
                    }
                    disabled={formulario.permitir_edicao_total_caixas}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
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

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formulario.permitir_edicao_total_caixas}
                    onChange={(event) =>
                      atualizarFormulario(
                        "permitir_edicao_total_caixas",
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700"
                  />
                  Permitir edição manual do total de caixas
                </label>

                {formulario.permitir_edicao_total_caixas ? (
                  <label className="mt-4 block space-y-2">
                    <span className="text-sm font-bold text-slate-700">
                      Total manual de caixas
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formulario.total_caixas_manual}
                      onChange={(event) =>
                        atualizarFormulario("total_caixas_manual", event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
                    />
                  </label>
                ) : null}

                <div className="mt-4 rounded-xl bg-white px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Total calculado para o estoque classificado
                  </p>
                  <strong className="mt-1 block text-2xl font-black text-emerald-700">
                    {formatarNumero(totalFormulario)} caixas
                  </strong>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">
                  Descrição / Observação
                </span>
                <textarea
                  value={formulario.observacao}
                  onChange={(event) =>
                    atualizarFormulario("observacao", event.target.value)
                  }
                  rows="4"
                  placeholder="Digite uma observação sobre a classificação..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                />
              </label>

              <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={formulario.conferido}
                  onChange={(event) =>
                    atualizarFormulario("conferido", event.target.checked)
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
                  {salvando ? "Salvando..." : "Salvar classificação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}