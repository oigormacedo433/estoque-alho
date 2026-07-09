import { useEffect, useMemo, useState } from "react";

import {
  AlertBox,
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  KpiCard,
  Select,
  Textarea,
} from "../../components/ui";

import {
  CheckCircle,
  Edit,
  Layers,
  PackageCheck,
  Save,
  X,
} from "lucide-react";

import { listarFazendasAtivas } from "../../services/fazendasService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";
import { listarCalibresAtivos } from "../../services/calibresService";

import {
  cadastrarAlhoClassificado,
  calcularResumoAlhoClassificado,
  editarAlhoClassificado,
  listarAlhoClassificado,
} from "../../services/alhoClassificadoService";

function obterDataAtual() {
  const data = new Date();
  const dataLocal = new Date(data.getTime() - data.getTimezoneOffset() * 60000);

  return dataLocal.toISOString().slice(0, 10);
}

function obterHoraAtual() {
  return new Date().toTimeString().slice(0, 5);
}

function formatarData(data) {
  if (!data) return "-";

  const [ano, mes, dia] = String(data).split("-");

  if (!ano || !mes || !dia) return data;

  return `${dia}/${mes}/${ano}`;
}

function formatarHora(hora) {
  if (!hora) return "-";

  return String(hora).slice(0, 5);
}

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

const FORM_INICIAL = {
  data_classificacao: "",
  hora: "",
  fazenda_id: "",
  lote: "",
  calibre_id: "",
  quantidade_paletes: "",
  caixas_por_palete: "",
  permitir_edicao_total_caixas: false,
  total_caixas_manual: "",
  conferido: "true",
  responsavel_id: "",
  observacao: "",
};

function AlhoClassificado() {
  const [fazendas, setFazendas] = useState([]);
  const [calibres, setCalibres] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [classificacoes, setClassificacoes] = useState([]);

  const [form, setForm] = useState({
    ...FORM_INICIAL,
    data_classificacao: obterDataAtual(),
    hora: obterHoraAtual(),
  });

  const [editandoId, setEditandoId] = useState(null);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const totalAutomatico = useMemo(() => {
    const paletes = Number(form.quantidade_paletes || 0);
    const caixasPorPalete = Number(form.caixas_por_palete || 0);

    return paletes * caixasPorPalete;
  }, [form.quantidade_paletes, form.caixas_por_palete]);

  const totalFinalExibido = useMemo(() => {
    if (form.permitir_edicao_total_caixas) {
      return Number(form.total_caixas_manual || 0);
    }

    return totalAutomatico;
  }, [
    form.permitir_edicao_total_caixas,
    form.total_caixas_manual,
    totalAutomatico,
  ]);

  const resumo = useMemo(() => {
    return calcularResumoAlhoClassificado(classificacoes);
  }, [classificacoes]);

  const fazendaOptions = useMemo(() => {
    return fazendas.map((fazenda) => ({
      value: fazenda.id,
      label: fazenda.nome,
    }));
  }, [fazendas]);

  const calibreOptions = useMemo(() => {
    return calibres.map((calibre) => ({
      value: calibre.id,
      label: `${calibre.codigo} — ${calibre.nome}`,
    }));
  }, [calibres]);

  const responsavelOptions = useMemo(() => {
    return responsaveis.map((responsavel) => ({
      value: responsavel.id,
      label: responsavel.nome,
    }));
  }, [responsaveis]);

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");
      setSucesso("");

      const [
        fazendasBanco,
        calibresBanco,
        responsaveisBanco,
        classificacoesBanco,
      ] = await Promise.all([
        listarFazendasAtivas(),
        listarCalibresAtivos(),
        listarResponsaveisAtivos(),
        listarAlhoClassificado(),
      ]);

      setFazendas(fazendasBanco || []);
      setCalibres(calibresBanco || []);
      setResponsaveis(responsaveisBanco || []);
      setClassificacoes(classificacoesBanco || []);
    } catch (error) {
      console.error("Erro ao carregar alho classificado:", error);
      setErro(error.message || "Não foi possível carregar a classificação.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function atualizarCampo(event) {
    const { name, value, type, checked } = event.target;

    setErro("");
    setSucesso("");

    if (name === "permitir_edicao_total_caixas") {
      setForm((estadoAtual) => {
        const vaiPermitir = checked;

        const totalCalculadoAgora =
          Number(estadoAtual.quantidade_paletes || 0) *
          Number(estadoAtual.caixas_por_palete || 0);

        return {
          ...estadoAtual,
          permitir_edicao_total_caixas: vaiPermitir,
          total_caixas_manual: vaiPermitir
            ? String(estadoAtual.total_caixas_manual || totalCalculadoAgora || "")
            : "",
        };
      });

      return;
    }

    setForm((estadoAtual) => {
      const novoEstado = {
        ...estadoAtual,
        [name]: type === "checkbox" ? checked : value,
      };

      if (
        !novoEstado.permitir_edicao_total_caixas &&
        (name === "quantidade_paletes" || name === "caixas_por_palete")
      ) {
        novoEstado.total_caixas_manual = "";
      }

      return novoEstado;
    });
  }

  function validarFormulario() {
    if (!form.data_classificacao) return "Informe a data de classificação.";
    if (!form.hora) return "Informe a hora.";
    if (!form.fazenda_id) return "Selecione a fazenda.";
    if (!form.calibre_id) return "Selecione o calibre.";
    if (!form.quantidade_paletes) return "Informe a quantidade de paletes.";
    if (!form.caixas_por_palete) return "Informe as caixas por palete.";
    if (!form.responsavel_id) return "Selecione o responsável.";

    if (Number(form.quantidade_paletes) <= 0) {
      return "A quantidade de paletes precisa ser maior que zero.";
    }

    if (Number(form.caixas_por_palete) <= 0) {
      return "As caixas por palete precisam ser maior que zero.";
    }

    if (form.permitir_edicao_total_caixas) {
      if (!form.total_caixas_manual) {
        return "Informe o total de caixas manual.";
      }

      if (Number(form.total_caixas_manual) <= 0) {
        return "O total de caixas manual precisa ser maior que zero.";
      }
    }

    return "";
  }

  function limparFormulario() {
    setEditandoId(null);

    setForm({
      ...FORM_INICIAL,
      data_classificacao: obterDataAtual(),
      hora: obterHoraAtual(),
    });
  }

  async function salvarRegistro(event) {
    event.preventDefault();

    try {
      setErro("");
      setSucesso("");

      const mensagemErro = validarFormulario();

      if (mensagemErro) {
        setErro(mensagemErro);
        return;
      }

      setSalvando(true);

      const payload = {
        ...form,
        permitir_edicao_total_caixas: Boolean(
          form.permitir_edicao_total_caixas
        ),
        total_caixas_manual: form.permitir_edicao_total_caixas
          ? form.total_caixas_manual
          : null,
        conferido: form.conferido === "true",
      };

      if (editandoId) {
        await editarAlhoClassificado(editandoId, payload);
        setSucesso("Classificação atualizada com sucesso.");
      } else {
        await cadastrarAlhoClassificado(payload);
        setSucesso("Classificação cadastrada com sucesso.");
      }

      limparFormulario();
      await carregarDados();
    } catch (error) {
      console.error("Erro ao salvar classificação:", error);
      setErro(error.message || "Não foi possível salvar a classificação.");
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(registro) {
    setEditandoId(registro.id);

    setForm({
      data_classificacao: registro.data_classificacao || obterDataAtual(),
      hora: registro.hora ? String(registro.hora).slice(0, 5) : obterHoraAtual(),
      fazenda_id: registro.fazenda_id || "",
      lote: registro.lote || "",
      calibre_id: registro.calibre_id || "",
      quantidade_paletes: String(registro.quantidade_paletes || ""),
      caixas_por_palete: String(registro.caixas_por_palete || ""),
      permitir_edicao_total_caixas: Boolean(
        registro.permitir_edicao_total_caixas
      ),
      total_caixas_manual: registro.permitir_edicao_total_caixas
        ? String(registro.total_caixas_manual || registro.total_caixas || "")
        : "",
      conferido: registro.conferido ? "true" : "false",
      responsavel_id: registro.responsavel_id || "",
      observacao: registro.observacao || "",
    });

    setErro("");
    setSucesso("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelarEdicao() {
    limparFormulario();
    setErro("");
    setSucesso("");
  }

  const columns = [
    {
      key: "data_classificacao",
      label: "Data",
      render: (value) => formatarData(value),
    },
    {
      key: "hora",
      label: "Hora",
      render: (value) => formatarHora(value),
    },
    {
      key: "fazendas",
      label: "Fazenda",
      render: (value) => value?.nome || "-",
    },
    {
      key: "lote",
      label: "Lote",
      render: (value) => value || "-",
    },
    {
      key: "calibres",
      label: "Calibre",
      render: (value) => (value ? `${value.codigo} — ${value.nome}` : "-"),
    },
    {
      key: "quantidade_paletes",
      label: "Paletes",
      render: (value) => formatarNumero(value),
    },
    {
      key: "caixas_por_palete",
      label: "Caixas por palete",
      render: (value) => formatarNumero(value),
    },
    {
      key: "total_caixas",
      label: "Total de caixas",
      render: (value, row) => (
        <div>
          <p className="font-black text-[var(--color-text-primary)]">
            {formatarNumero(value)} caixas
          </p>

          {row.permitir_edicao_total_caixas && (
            <p className="mt-1 text-xs font-bold text-orange-700">
              Ajustado manualmente
            </p>
          )}
        </div>
      ),
    },
    {
      key: "conferido",
      label: "Status",
      render: (value) =>
        value ? (
          <Badge variant="success">Conferido</Badge>
        ) : (
          <Badge variant="warning">Pendente</Badge>
        ),
    },
    {
      key: "responsaveis",
      label: "Responsável",
      render: (value) => value?.nome || "-",
    },
    {
      key: "acoes",
      label: "Ações",
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={salvando}
            onClick={() => iniciarEdicao(row)}
          >
            <Edit size={16} />
            Editar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <KpiCard
          title="Classificações"
          value={formatarNumero(resumo.totalRegistros)}
          description="Registros cadastrados"
          icon={Layers}
          variant="info"
        />

        <KpiCard
          title="Paletes"
          value={formatarNumero(resumo.totalPaletes)}
          description="Total classificado"
          icon={PackageCheck}
          variant="success"
        />

        <KpiCard
          title="Caixas"
          value={formatarNumero(resumo.totalCaixas)}
          description="Total final classificado"
          icon={CheckCircle}
          variant="success"
        />
      </section>

      {erro && <AlertBox variant="danger" title="Atenção" description={erro} />}

      {sucesso && (
        <AlertBox
          variant="success"
          title="Operação concluída"
          description={sucesso}
        />
      )}

      <Card>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-[var(--color-text-primary)]">
              {editandoId ? "Editar alho classificado" : "Novo alho classificado"}
            </h3>

            <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
              Lance a classificação por calibre.
            </p>
          </div>

          {editandoId && <Badge variant="warning">Editando</Badge>}
        </div>

        <form onSubmit={salvarRegistro}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="Data de classificação"
              name="data_classificacao"
              type="date"
              value={form.data_classificacao}
              onChange={atualizarCampo}
            />

            <Input
              label="Hora"
              name="hora"
              type="time"
              value={form.hora}
              onChange={atualizarCampo}
            />

            <Select
              label="Fazenda"
              name="fazenda_id"
              value={form.fazenda_id}
              onChange={atualizarCampo}
              options={fazendaOptions}
              placeholder="Selecione a fazenda"
            />

            <Input
              label="Lote"
              name="lote"
              value={form.lote}
              onChange={atualizarCampo}
              placeholder="Ex: Lote A, Carga 02..."
            />

            <Select
              label="Calibre"
              name="calibre_id"
              value={form.calibre_id}
              onChange={atualizarCampo}
              options={calibreOptions}
              placeholder="Selecione o calibre"
            />

            <Input
              label="Quantidade de paletes"
              name="quantidade_paletes"
              type="number"
              value={form.quantidade_paletes}
              onChange={atualizarCampo}
            />

            <Input
              label="Caixas por palete"
              name="caixas_por_palete"
              type="number"
              value={form.caixas_por_palete}
              onChange={atualizarCampo}
            />

            <div>
              <Input
                label={
                  form.permitir_edicao_total_caixas
                    ? "Total de caixas manual"
                    : "Total de caixas calculado"
                }
                name="total_caixas_manual"
                type="number"
                value={
                  form.permitir_edicao_total_caixas
                    ? form.total_caixas_manual
                    : totalAutomatico
                }
                onChange={atualizarCampo}
                disabled={!form.permitir_edicao_total_caixas}
              />

              <label className="mt-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  name="permitir_edicao_total_caixas"
                  checked={Boolean(form.permitir_edicao_total_caixas)}
                  onChange={atualizarCampo}
                  className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-green-primary)]"
                />

                <span className="text-sm font-bold text-[var(--color-text-primary)]">
                  Permitir edição manual do total de caixas
                </span>
              </label>

              <p className="mt-2 text-xs font-semibold text-[var(--color-text-muted)]">
                Cálculo automático: {formatarNumero(totalAutomatico)} caixas.
                Total usado no lançamento: {formatarNumero(totalFinalExibido)} caixas.
              </p>
            </div>

            <Select
              label="Status"
              name="conferido"
              value={form.conferido}
              onChange={atualizarCampo}
              options={[
                { value: "true", label: "Conferido" },
                { value: "false", label: "Pendente" },
              ]}
              placeholder="Selecione o status"
            />

            <Select
              label="Responsável"
              name="responsavel_id"
              value={form.responsavel_id}
              onChange={atualizarCampo}
              options={responsavelOptions}
              placeholder="Selecione o responsável"
            />

            <div className="md:col-span-2">
              <Textarea
                label="Observação"
                name="observacao"
                value={form.observacao}
                onChange={atualizarCampo}
                placeholder="Observações sobre a classificação..."
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {editandoId && (
              <Button
                type="button"
                variant="secondary"
                disabled={salvando}
                onClick={cancelarEdicao}
              >
                <X size={16} />
                Cancelar
              </Button>
            )}

            <Button type="submit" variant="primary" disabled={salvando}>
              <Save size={16} />
              {salvando
                ? "Salvando..."
                : editandoId
                  ? "Salvar classificação"
                  : "Salvar classificação"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-xl font-black text-[var(--color-text-primary)]">
              Classificações recentes
            </h3>

            <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
              Histórico recente de classificações lançadas.
            </p>
          </div>

          <Badge variant="info">
            {carregando
              ? "Carregando"
              : `${formatarNumero(classificacoes.length)} registros`}
          </Badge>
        </div>

        {carregando ? (
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Carregando classificações...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={classificacoes}
            emptyMessage="Nenhuma classificação cadastrada."
          />
        )}
      </Card>
    </div>
  );
}

export default AlhoClassificado;