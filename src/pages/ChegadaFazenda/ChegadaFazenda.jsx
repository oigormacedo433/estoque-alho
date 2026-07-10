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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  Edit,
  Package,
  Save,
  Scale,
  Truck,
  X,
} from "lucide-react";

import { listarFazendasAtivas } from "../../services/fazendasService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";
import { listarAreasFazendaAtivas } from "../../services/areasFazendaService";

import {
  cadastrarChegadaFazenda,
  calcularResumoChegadaFazenda,
  editarChegadaFazenda,
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

  const [ano, mes, dia] = String(data).split("-");

  if (!ano || !mes || !dia) return "-";

  return `${dia}/${mes}/${ano}`;
}

function formatarHora(hora) {
  if (!hora) return "-";

  return String(hora).slice(0, 5);
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

function obterAreaNome(registro) {
  return (
    registro?.areas_fazenda?.nome ||
    registro?.area_nome ||
    registro?.area_fazenda_nome ||
    "-"
  );
}

function obterFazendaNome(registro) {
  return registro?.fazendas?.nome || registro?.fazenda_nome || "-";
}

function obterResponsavelNome(registro) {
  return registro?.responsaveis?.nome || registro?.responsavel_nome || "-";
}

function numero(valor) {
  const convertido = Number(valor);

  if (!Number.isFinite(convertido)) {
    return 0;
  }

  return convertido;
}

function obterValorOrdenacao(registro, campo) {
  switch (campo) {
    case "data_recebimento":
      return registro.data_recebimento || "";

    case "hora":
      return registro.hora || "";

    case "fazenda":
      return obterFazendaNome(registro);

    case "area":
      return obterAreaNome(registro);

    case "lote":
      return registro.lote || "";

    case "quantidade_caixas":
      return numero(registro.quantidade_caixas);

    case "media_peso_caixa_kg":
      return numero(registro.media_peso_caixa_kg);

    case "peso_total_estimado_kg":
      return numero(registro.peso_total_estimado_kg);

    case "conferido":
      return registro.conferido ? "Conferido" : "Pendente";

    case "responsavel":
      return obterResponsavelNome(registro);

    default:
      return "";
  }
}

function compararValores(valorA, valorB) {
  if (typeof valorA === "number" && typeof valorB === "number") {
    return valorA - valorB;
  }

  return String(valorA || "").localeCompare(String(valorB || ""), "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
}

function CabecalhoOrdenavel({ label, campo, ordenacao, onOrdenar }) {
  const ativo = ordenacao.campo === campo;
  const direcao = ordenacao.direcao;

  return (
    <button
      type="button"
      onClick={() => onOrdenar(campo)}
      className="
        inline-flex
        items-center
        gap-1.5
        rounded-lg
        text-left
        font-black
        uppercase
        tracking-wide
        text-[var(--color-text-muted)]
        transition
        hover:text-[var(--color-green-primary)]
      "
      title={`Ordenar por ${label}`}
    >
      <span>{label}</span>

      {!ativo && <ArrowUpDown size={14} />}

      {ativo && direcao === "asc" && <ArrowUp size={14} />}

      {ativo && direcao === "desc" && <ArrowDown size={14} />}
    </button>
  );
}

const FORM_INICIAL = {
  data_recebimento: "",
  hora: "",
  fazenda_id: "",
  area_fazenda_id: "",
  lote: "",
  quantidade_caixas: "",
  media_peso_caixa_kg: "",
  conferido: "sim",
  responsavel_id: "",
  observacao: "",
};

function ChegadaFazenda() {
  const [fazendas, setFazendas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [chegadas, setChegadas] = useState([]);

  const [form, setForm] = useState({
    ...FORM_INICIAL,
    data_recebimento: obterDataAtual(),
    hora: obterHoraAtual(),
  });

  const [editandoId, setEditandoId] = useState(null);

  const [ordenacao, setOrdenacao] = useState({
    campo: "data_recebimento",
    direcao: "desc",
  });

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const pesoTotalEstimado = useMemo(() => {
    const caixas = Number(form.quantidade_caixas || 0);
    const pesoMedio = Number(form.media_peso_caixa_kg || 0);

    return caixas * pesoMedio;
  }, [form.quantidade_caixas, form.media_peso_caixa_kg]);

  const resumo = useMemo(() => {
    return calcularResumoChegadaFazenda(chegadas);
  }, [chegadas]);

  const chegadasOrdenadas = useMemo(() => {
    const lista = [...chegadas];

    lista.sort((a, b) => {
      const valorA = obterValorOrdenacao(a, ordenacao.campo);
      const valorB = obterValorOrdenacao(b, ordenacao.campo);

      const resultado = compararValores(valorA, valorB);

      return ordenacao.direcao === "asc" ? resultado : resultado * -1;
    });

    return lista;
  }, [chegadas, ordenacao]);

  const fazendaOptions = useMemo(() => {
    return fazendas.map((fazenda) => ({
      value: fazenda.id,
      label: fazenda.nome,
    }));
  }, [fazendas]);

  const areaOptions = useMemo(() => {
    return areas.map((area) => ({
      value: area.id,
      label: area.nome,
    }));
  }, [areas]);

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

      const [fazendasBanco, areasBanco, responsaveisBanco, chegadasBanco] =
        await Promise.all([
          listarFazendasAtivas(),
          listarAreasFazendaAtivas(),
          listarResponsaveisAtivos(),
          listarChegadasFazenda(),
        ]);

      setFazendas(fazendasBanco || []);
      setAreas(areasBanco || []);
      setResponsaveis(responsaveisBanco || []);
      setChegadas(chegadasBanco || []);
    } catch (error) {
      console.error("Erro ao carregar chegada da fazenda:", error);
      setErro(error.message || "Não foi possível carregar a chegada da fazenda.");
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

  function alterarOrdenacao(campo) {
    setOrdenacao((estadoAtual) => {
      if (estadoAtual.campo === campo) {
        return {
          campo,
          direcao: estadoAtual.direcao === "asc" ? "desc" : "asc",
        };
      }

      return {
        campo,
        direcao: "asc",
      };
    });
  }

  function validarFormulario() {
    if (!form.data_recebimento) return "Informe a data de recebimento.";
    if (!form.hora) return "Informe a hora.";
    if (!form.fazenda_id) return "Selecione a fazenda.";
    if (!form.area_fazenda_id) return "Selecione a Área / Pivô.";
    if (!form.quantidade_caixas) return "Informe a quantidade de caixas.";
    if (!form.media_peso_caixa_kg) return "Informe o peso médio por caixa.";
    if (!form.responsavel_id) return "Selecione o responsável.";

    if (Number(form.quantidade_caixas) <= 0) {
      return "A quantidade de caixas precisa ser maior que zero.";
    }

    if (Number(form.media_peso_caixa_kg) <= 0) {
      return "O peso médio por caixa precisa ser maior que zero.";
    }

    return "";
  }

  function limparFormulario() {
    setEditandoId(null);

    setForm({
      ...FORM_INICIAL,
      data_recebimento: obterDataAtual(),
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
        conferido: form.conferido === "sim",
      };

      if (editandoId) {
        await editarChegadaFazenda(editandoId, payload);
        setSucesso("Chegada da fazenda atualizada com sucesso.");
      } else {
        await cadastrarChegadaFazenda(payload);
        setSucesso("Chegada da fazenda cadastrada com sucesso.");
      }

      limparFormulario();
      await carregarDados();
    } catch (error) {
      console.error("Erro ao salvar chegada:", error);
      setErro(error.message || "Não foi possível salvar a chegada da fazenda.");
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(registro) {
    setEditandoId(registro.id);

    setForm({
      data_recebimento: registro.data_recebimento || obterDataAtual(),
      hora: registro.hora ? String(registro.hora).slice(0, 5) : obterHoraAtual(),
      fazenda_id: registro.fazenda_id || registro.fazendas?.id || "",
      area_fazenda_id:
        registro.area_fazenda_id || registro.areas_fazenda?.id || "",
      lote: registro.lote || "",
      quantidade_caixas: String(registro.quantidade_caixas || ""),
      media_peso_caixa_kg: String(registro.media_peso_caixa_kg || ""),
      conferido: registro.conferido ? "sim" : "nao",
      responsavel_id: registro.responsavel_id || registro.responsaveis?.id || "",
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
      key: "data_recebimento",
      label: (
        <CabecalhoOrdenavel
          label="Data"
          campo="data_recebimento"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => formatarData(value),
    },
    {
      key: "hora",
      label: (
        <CabecalhoOrdenavel
          label="Hora"
          campo="hora"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => formatarHora(value),
    },
    {
      key: "fazendas",
      label: (
        <CabecalhoOrdenavel
          label="Fazenda"
          campo="fazenda"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (_, row) => obterFazendaNome(row),
    },
    {
      key: "areas_fazenda",
      label: (
        <CabecalhoOrdenavel
          label="Área / Pivô"
          campo="area"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (_, row) => obterAreaNome(row),
    },
    {
      key: "lote",
      label: (
        <CabecalhoOrdenavel
          label="Lote / Carga"
          campo="lote"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => value || "-",
    },
    {
      key: "quantidade_caixas",
      label: (
        <CabecalhoOrdenavel
          label="Caixas"
          campo="quantidade_caixas"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "media_peso_caixa_kg",
      label: (
        <CabecalhoOrdenavel
          label="Peso médio"
          campo="media_peso_caixa_kg"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => formatarKg(value),
    },
    {
      key: "peso_total_estimado_kg",
      label: (
        <CabecalhoOrdenavel
          label="Peso estimado"
          campo="peso_total_estimado_kg"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) => formatarKg(value),
    },
    {
      key: "conferido",
      label: (
        <CabecalhoOrdenavel
          label="Status"
          campo="conferido"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (value) =>
        value ? (
          <Badge variant="success">Conferido</Badge>
        ) : (
          <Badge variant="warning">Pendente</Badge>
        ),
    },
    {
      key: "responsaveis",
      label: (
        <CabecalhoOrdenavel
          label="Responsável"
          campo="responsavel"
          ordenacao={ordenacao}
          onOrdenar={alterarOrdenacao}
        />
      ),
      render: (_, row) => obterResponsavelNome(row),
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
          icon={Package}
          variant="success"
        />

        <KpiCard
          title="Peso estimado"
          value={formatarKg(resumo.pesoTotalEstimadoKg)}
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
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-[var(--color-text-primary)]">
              {editandoId
                ? "Editar chegada da fazenda"
                : "Nova chegada da fazenda"}
            </h3>

            <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
              Registre a entrada do alho bruto vindo da fazenda.
            </p>
          </div>

          {editandoId && <Badge variant="warning">Editando</Badge>}
        </div>

        <form onSubmit={salvarRegistro}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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

            <Select
              label="Área / Pivô"
              name="area_fazenda_id"
              value={form.area_fazenda_id}
              onChange={atualizarCampo}
              options={areaOptions}
              placeholder="Selecione a Área / Pivô"
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
              type="text"
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
                placeholder="Observações sobre a chegada..."
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
                Cancelar edição
              </Button>
            )}

            <Button type="submit" variant="primary" disabled={salvando}>
              <Save size={16} />
              {salvando
                ? "Salvando..."
                : editandoId
                  ? "Salvar chegada"
                  : "Salvar chegada"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-xl font-black text-[var(--color-text-primary)]">
              Chegadas recentes
            </h3>

            <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
              Clique no nome de uma coluna para ordenar os lançamentos.
            </p>
          </div>

          <Badge variant="info">
            {carregando
              ? "Carregando"
              : `${formatarNumero(chegadas.length)} registros`}
          </Badge>
        </div>

        {carregando ? (
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Carregando chegadas...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={chegadasOrdenadas}
            emptyMessage="Nenhuma chegada cadastrada."
          />
        )}
      </Card>
    </div>
  );
}

export default ChegadaFazenda;