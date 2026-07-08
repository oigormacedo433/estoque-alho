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
  PackageCheck,
  Save,
  Scale,
  Truck,
} from "lucide-react";

import { listarFazendasAtivas } from "../../services/fazendasService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";

import {
  cadastrarChegadaFazenda,
  calcularResumoChegadaFazenda,
  listarChegadasFazenda,
} from "../../services/chegadaFazendaService";

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

function formatarKg(valor) {
  return `${Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
}

function ChegadaFazenda() {
  const [fazendas, setFazendas] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [registros, setRegistros] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [form, setForm] = useState({
    data_recebimento: obterDataAtual(),
    hora: obterHoraAtual(),
    fazenda_id: "",
    lote: "",
    quantidade_caixas: "",
    media_peso_caixa_kg: "",
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

  const responsavelOptions = useMemo(() => {
    return responsaveis.map((responsavel) => ({
      value: responsavel.id,
      label: responsavel.nome,
    }));
  }, [responsaveis]);

  const resumo = useMemo(() => {
    return calcularResumoChegadaFazenda(registros);
  }, [registros]);

  const pesoTotalEstimado = useMemo(() => {
    const caixas = Number(form.quantidade_caixas || 0);
    const pesoMedio = Number(form.media_peso_caixa_kg || 0);

    return caixas * pesoMedio;
  }, [form.quantidade_caixas, form.media_peso_caixa_kg]);

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");
      setSucesso("");

      const [fazendasBanco, responsaveisBanco, registrosBanco] =
        await Promise.all([
          listarFazendasAtivas(),
          listarResponsaveisAtivos(),
          listarChegadasFazenda(),
        ]);

      setFazendas(fazendasBanco || []);
      setResponsaveis(responsaveisBanco || []);
      setRegistros(registrosBanco || []);
    } catch (error) {
      console.error("Erro ao carregar chegada da fazenda:", error);

      setErro(
        error.message ||
          "Não foi possível carregar os dados da chegada da fazenda."
      );
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
    if (!form.data_recebimento) return "Informe a data de recebimento.";
    if (!form.hora) return "Informe a hora.";
    if (!form.fazenda_id) return "Selecione a fazenda.";
    if (!form.quantidade_caixas) return "Informe a quantidade de caixas.";

    if (Number(form.quantidade_caixas) <= 0) {
      return "Quantidade de caixas precisa ser maior que zero.";
    }

    if (!form.media_peso_caixa_kg) return "Informe o peso médio por caixa.";

    if (Number(form.media_peso_caixa_kg) <= 0) {
      return "Peso médio por caixa precisa ser maior que zero.";
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

      await cadastrarChegadaFazenda(form);

      setSucesso("Chegada da fazenda cadastrada com sucesso.");

      setForm({
        data_recebimento: obterDataAtual(),
        hora: obterHoraAtual(),
        fazenda_id: "",
        lote: "",
        quantidade_caixas: "",
        media_peso_caixa_kg: "",
        conferido: "sim",
        responsavel_id: "",
        observacao: "",
      });

      await carregarDados();
    } catch (error) {
      console.error("Erro ao cadastrar chegada da fazenda:", error);
      setErro(error.message || "Não foi possível cadastrar a chegada.");
    } finally {
      setSalvando(false);
    }
  }

  const columns = [
    {
      key: "data_recebimento",
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
      label: "Lote / Carga",
      render: (value) => value || "-",
    },
    {
      key: "quantidade_caixas",
      label: "Caixas",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "peso_total_estimado_kg",
      label: "Peso estimado",
      render: (value) => formatarKg(value),
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
          title="Recebimentos"
          value={formatarNumero(resumo.totalRegistros)}
          description="Registros cadastrados"
          icon={Truck}
          variant="info"
        />

        <KpiCard
          title="Caixas recebidas"
          value={formatarNumero(resumo.totalCaixas)}
          description="Total de caixas"
          icon={PackageCheck}
          variant="success"
        />

        <KpiCard
          title="Peso estimado"
          value={formatarKg(resumo.pesoEstimadoKg)}
          description="Peso total estimado"
          icon={Scale}
          variant="success"
        />

        <KpiCard
          title="Conferidos"
          value={formatarNumero(resumo.conferidos)}
          description={`${formatarNumero(resumo.pendentes)} pendentes`}
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
            Nova chegada da fazenda
          </h3>

          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Registre a entrada do alho bruto vindo da fazenda.
          </p>
        </div>

        <form onSubmit={salvarRegistro}>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="Data de recebimento"
              name="data_recebimento"
              type="date"
              value={form.data_recebimento}
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
              label="Lote / Carga"
              name="lote"
              value={form.lote}
              onChange={atualizarCampo}
              placeholder="Ex: Carga 01, Lote A..."
            />

            <Input
              label="Quantidade de caixas"
              name="quantidade_caixas"
              type="number"
              value={form.quantidade_caixas}
              onChange={atualizarCampo}
            />

            <Input
              label="Peso médio por caixa em kg"
              name="media_peso_caixa_kg"
              type="number"
              value={form.media_peso_caixa_kg}
              onChange={atualizarCampo}
            />

            <Input
              label="Peso total estimado"
              name="peso_total_estimado"
              value={formatarKg(pesoTotalEstimado)}
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
                placeholder="Observações sobre a chegada..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="submit" variant="primary" disabled={salvando}>
              <Save size={16} />
              {salvando ? "Salvando..." : "Salvar chegada"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Últimas chegadas registradas
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Histórico recente de entradas vindas da fazenda.
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
            Carregando chegadas do banco...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={registros.slice(0, 10)}
            emptyMessage="Nenhuma chegada cadastrada."
          />
        )}
      </Card>
    </div>
  );
}

export default ChegadaFazenda;