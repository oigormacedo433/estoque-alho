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
  Boxes,
  CheckCircle,
  Layers,
  PackageCheck,
  Save,
} from "lucide-react";

import { listarFazendasAtivas } from "../../services/fazendasService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";
import { listarCalibresAtivos } from "../../services/calibresService";

import {
  cadastrarAlhoClassificado,
  calcularResumoAlhoClassificado,
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

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarHora(hora) {
  if (!hora) return "-";

  return hora.slice(0, 5);
}

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function AlhoClassificado() {
  const [fazendas, setFazendas] = useState([]);
  const [calibres, setCalibres] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [registros, setRegistros] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [form, setForm] = useState({
    data_classificacao: obterDataAtual(),
    hora: obterHoraAtual(),
    fazenda_id: "",
    lote: "",
    calibre_id: "",
    quantidade_paletes: "",
    caixas_por_palete: "",
    conferido: "sim",
    responsavel_id: "",
    observacao: "",
  });

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

  const resumo = useMemo(() => {
    return calcularResumoAlhoClassificado(registros);
  }, [registros]);

  const totalCaixas = useMemo(() => {
    return (
      Number(form.quantidade_paletes || 0) *
      Number(form.caixas_por_palete || 0)
    );
  }, [form.quantidade_paletes, form.caixas_por_palete]);

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");
      setSucesso("");

      const [
        fazendasBanco,
        calibresBanco,
        responsaveisBanco,
        registrosBanco,
      ] = await Promise.all([
        listarFazendasAtivas(),
        listarCalibresAtivos(),
        listarResponsaveisAtivos(),
        listarAlhoClassificado(),
      ]);

      setFazendas(fazendasBanco || []);
      setCalibres(calibresBanco || []);
      setResponsaveis(responsaveisBanco || []);
      setRegistros(registrosBanco || []);
    } catch (error) {
      console.error("Erro ao carregar alho classificado:", error);

      setErro(error.message || "Não foi possível carregar o alho classificado.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function atualizarCampo(event) {
    const { name, value } = event.target;

    setForm((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));

    setErro("");
    setSucesso("");
  }

  function validarFormulario() {
    if (!form.data_classificacao) return "Informe a data de classificação.";
    if (!form.hora) return "Informe a hora.";
    if (!form.fazenda_id) return "Selecione a fazenda.";
    if (!form.calibre_id) return "Selecione o calibre.";
    if (!form.quantidade_paletes) return "Informe a quantidade de paletes.";

    if (Number(form.quantidade_paletes) <= 0) {
      return "Quantidade de paletes precisa ser maior que zero.";
    }

    if (!form.caixas_por_palete) return "Informe as caixas por palete.";

    if (Number(form.caixas_por_palete) <= 0) {
      return "Caixas por palete precisa ser maior que zero.";
    }

    if (!form.responsavel_id) return "Selecione o responsável.";

    return "";
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

      await cadastrarAlhoClassificado(form);

      setSucesso("Classificação cadastrada com sucesso.");

      setForm({
        data_classificacao: obterDataAtual(),
        hora: obterHoraAtual(),
        fazenda_id: "",
        lote: "",
        calibre_id: "",
        quantidade_paletes: "",
        caixas_por_palete: "",
        conferido: "sim",
        responsavel_id: "",
        observacao: "",
      });

      await carregarDados();
    } catch (error) {
      console.error("Erro ao cadastrar classificação:", error);
      setErro(error.message || "Não foi possível cadastrar a classificação.");
    } finally {
      setSalvando(false);
    }
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
      key: "total_caixas",
      label: "Total caixas",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "responsaveis",
      label: "Responsável",
      render: (value) => value?.nome || "-",
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
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Classificações"
          value={formatarNumero(resumo.totalRegistros)}
          description="Registros cadastrados"
          icon={Boxes}
          variant="info"
        />

        <KpiCard
          title="Paletes"
          value={formatarNumero(resumo.totalPaletes)}
          description="Total classificado"
          icon={Layers}
          variant="success"
        />

        <KpiCard
          title="Caixas equivalentes"
          value={formatarNumero(resumo.totalCaixas)}
          description="Total calculado"
          icon={PackageCheck}
          variant="success"
        />

        <KpiCard
          title="Calibres"
          value={formatarNumero(resumo.calibres)}
          description="Calibres movimentados"
          icon={CheckCircle}
          variant="info"
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
        <div>
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Novo alho classificado
          </h3>

          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Lance a classificação por calibre.
          </p>
        </div>

        <form onSubmit={salvarRegistro}>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
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

            <Input
              label="Total de caixas calculado"
              name="total_caixas"
              value={`${formatarNumero(totalCaixas)} caixas`}
              disabled
            />

            <Select
              label="Status"
              name="conferido"
              value={form.conferido}
              onChange={atualizarCampo}
              options={[
                { value: "sim", label: "Conferido" },
                { value: "nao", label: "Pendente" },
              ]}
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

          <div className="mt-6 flex justify-end">
            <Button type="submit" variant="primary" disabled={salvando}>
              <Save size={16} />
              {salvando ? "Salvando..." : "Salvar classificação"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Últimas classificações registradas
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Histórico recente de classificações por calibre.
            </p>
          </div>

          <Badge variant="info">
            {carregando
              ? "Carregando"
              : `${formatarNumero(registros.length)} registros`}
          </Badge>
        </div>

        {carregando ? (
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Carregando classificações do banco...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={registros.slice(0, 10)}
            emptyMessage="Nenhuma classificação cadastrada."
          />
        )}
      </Card>
    </div>
  );
}

export default AlhoClassificado;