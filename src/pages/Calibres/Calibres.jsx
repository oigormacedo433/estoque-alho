// Tela Cadastro de Calibres.
//
// Etapa 9:
// - Código
// - Nome do calibre
// - Descrição/observação
// - Ordem de exibição
// - Tipo
// - Status ativo/inativo
// - Salvar
// - Cancelar
// - Resumo
// - Tabela
// - Editar
// - Excluir, se permitido
//
// Não usamos dados fictícios.
// Tudo vem do Supabase.

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
  Clock,
  Layers,
  Pencil,
  SlidersHorizontal,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import {
  cadastrarCalibre,
  calcularResumoCalibres,
  editarCalibre,
  excluirCalibre,
  listarCalibres,
} from "../../services/calibresService";

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function formatarDataHora(data) {
  if (!data) {
    return "Sem atualização";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

function obterNomeTipo(tipo) {
  if (tipo === "industria") {
    return "Indústria";
  }

  return "Comercial";
}

function Calibres() {
  const [calibres, setCalibres] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [modoEdicao, setModoEdicao] = useState(false);
  const [registroEditandoId, setRegistroEditandoId] = useState(null);

  const [form, setForm] = useState({
    codigo: "",
    nome: "",
    tipo: "comercial",
    ordem: "",
    observacao: "",
    ativo: "true",
  });

  const resumo = useMemo(() => {
    return calcularResumoCalibres(calibres);
  }, [calibres]);

  async function carregarCalibres() {
    try {
      setCarregando(true);
      setErro("");

      const dados = await listarCalibres();

      setCalibres(dados);
    } catch (error) {
      console.error("Erro ao carregar calibres:", error);

      setErro(
        "Não foi possível carregar os calibres. Confira a conexão com o Supabase e as permissões da tabela."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarCalibres();
  }, []);

  function atualizarCampo(event) {
    const { name, value } = event.target;

    setForm((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));

    setErro("");
  }

  function limparFormulario() {
    setForm({
      codigo: "",
      nome: "",
      tipo: "comercial",
      ordem: "",
      observacao: "",
      ativo: "true",
    });

    setModoEdicao(false);
    setRegistroEditandoId(null);
  }

  function validarFormulario() {
    if (!form.codigo.trim()) {
      return "Informe o código do calibre.";
    }

    if (!form.nome.trim()) {
      return "Informe o nome do calibre.";
    }

    if (!form.tipo) {
      return "Selecione o tipo do calibre.";
    }

    if (form.ordem === "") {
      return "Informe a ordem de exibição.";
    }

    if (Number(form.ordem) < 0) {
      return "A ordem de exibição não pode ser negativa.";
    }

    return "";
  }

  function iniciarEdicao(registro) {
    setErro("");
    setSucesso("");

    setModoEdicao(true);
    setRegistroEditandoId(registro.id);

    setForm({
      codigo: registro.codigo || "",
      nome: registro.nome || "",
      tipo: registro.tipo || "comercial",
      ordem: String(registro.ordem ?? ""),
      observacao: registro.observacao || "",
      ativo: registro.ativo ? "true" : "false",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function salvarCalibre(event) {
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

      if (modoEdicao && registroEditandoId) {
        await editarCalibre(registroEditandoId, form);

        setSucesso("Calibre atualizado com sucesso.");
      } else {
        await cadastrarCalibre(form);

        setSucesso("Calibre cadastrado com sucesso.");
      }

      limparFormulario();

      await carregarCalibres();
    } catch (error) {
      console.error("Erro ao salvar calibre:", error);

      setErro(
        error.message ||
          "Não foi possível salvar o calibre. Confira os dados informados."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirRegistro(registro) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir este calibre?\n\nCódigo: ${registro.codigo}\nNome: ${registro.nome}\n\nSe ele já foi usado em lançamentos, o banco pode bloquear a exclusão. Nesse caso, inative o calibre.`
    );

    if (!confirmar) {
      return;
    }

    try {
      setErro("");
      setSucesso("");
      setExcluindoId(registro.id);

      await excluirCalibre(registro.id);

      if (registroEditandoId === registro.id) {
        limparFormulario();
      }

      setSucesso("Calibre excluído com sucesso.");

      await carregarCalibres();
    } catch (error) {
      console.error("Erro ao excluir calibre:", error);

      setErro(
        error.message ||
          "Não foi possível excluir o calibre. Se ele já foi usado, inative em vez de excluir."
      );
    } finally {
      setExcluindoId(null);
    }
  }

  const columns = [
    {
      key: "codigo",
      label: "Código",
      render: (value) => (
        <span className="font-bold text-[var(--color-text-primary)]">
          {value}
        </span>
      ),
    },
    {
      key: "nome",
      label: "Nome",
    },
    {
      key: "tipo",
      label: "Tipo",
      render: (value) =>
        value === "industria" ? (
          <Badge variant="warning">Indústria</Badge>
        ) : (
          <Badge variant="info">Comercial</Badge>
        ),
    },
    {
      key: "ordem",
      label: "Ordem",
      render: (value) => formatarNumero(value),
    },
    {
      key: "ativo",
      label: "Status",
      render: (value) =>
        value ? (
          <Badge variant="success">Ativo</Badge>
        ) : (
          <Badge variant="neutral">Inativo</Badge>
        ),
    },
    {
      key: "observacao",
      label: "Observação",
      render: (value) => value || "-",
    },
    {
      key: "acoes",
      label: "Ações",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={salvando || excluindoId === row.id}
            onClick={() => iniciarEdicao(row)}
          >
            <Pencil size={16} />
            Editar
          </Button>

          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={salvando || excluindoId === row.id}
            onClick={() => excluirRegistro(row)}
          >
            <Trash2 size={16} />
            {excluindoId === row.id ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total cadastrados"
          value={formatarNumero(resumo.totalCadastrados)}
          description="Calibres no banco"
          icon={SlidersHorizontal}
          variant="info"
        />

        <KpiCard
          title="Ativos"
          value={formatarNumero(resumo.ativos)}
          description="Aparecem nos selects"
          icon={CheckCircle}
          variant="success"
        />

        <KpiCard
          title="Inativos"
          value={formatarNumero(resumo.inativos)}
          description="Ocultos em novos lançamentos"
          icon={XCircle}
          variant={resumo.inativos > 0 ? "warning" : "success"}
        />

        <KpiCard
          title="Última atualização"
          value={formatarDataHora(resumo.ultimaAtualizacao)}
          description="Cadastro de calibres"
          icon={Clock}
          variant="info"
        />
      </section>

      {erro && (
        <AlertBox
          variant="danger"
          title="Atenção"
          description={erro}
        />
      )}

      {sucesso && (
        <AlertBox
          variant="success"
          title="Operação concluída"
          description={sucesso}
        />
      )}

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              {modoEdicao ? "Editar calibre" : "Cadastro de calibre"}
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Cadastre e organize os calibres usados nas telas do sistema.
            </p>
          </div>

          {modoEdicao && (
            <Badge variant="warning">Editando registro</Badge>
          )}
        </div>

        <form onSubmit={salvarCalibre}>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="Código"
              name="codigo"
              value={form.codigo}
              onChange={atualizarCampo}
              placeholder="Ex: C4, C5, IND"
            />

            <Input
              label="Nome do calibre"
              name="nome"
              value={form.nome}
              onChange={atualizarCampo}
              placeholder="Ex: Calibre 4"
            />

            <Select
              label="Tipo"
              name="tipo"
              value={form.tipo}
              onChange={atualizarCampo}
              placeholder="Selecione o tipo"
              options={[
                { value: "comercial", label: "Comercial" },
                { value: "industria", label: "Indústria" },
              ]}
            />

            <Input
              label="Ordem de exibição"
              name="ordem"
              type="number"
              value={form.ordem}
              onChange={atualizarCampo}
              placeholder="Ex: 1"
            />

            <Select
              label="Status"
              name="ativo"
              value={form.ativo}
              onChange={atualizarCampo}
              placeholder="Selecione o status"
              options={[
                { value: "true", label: "Ativo" },
                { value: "false", label: "Inativo" },
              ]}
            />

            <div className="md:col-span-2">
              <Textarea
                label="Descrição / Observação"
                name="observacao"
                value={form.observacao}
                onChange={atualizarCampo}
                placeholder="Digite uma observação sobre o calibre..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={limparFormulario}
              disabled={salvando}
            >
              {modoEdicao ? (
                <>
                  <X size={16} />
                  Cancelar edição
                </>
              ) : (
                "Cancelar"
              )}
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={salvando}
            >
              {salvando
                ? "Salvando..."
                : modoEdicao
                  ? "Salvar alterações"
                  : "Salvar calibre"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Calibres cadastrados
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Calibres salvos no banco de dados.
            </p>
          </div>

          <Badge variant="info">
            {carregando
              ? "Carregando"
              : `${formatarNumero(calibres.length)} registros`}
          </Badge>
        </div>

        {carregando ? (
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Carregando calibres do banco...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={calibres}
            emptyMessage="Nenhum calibre cadastrado no banco."
          />
        )}
      </Card>

      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-green-light)] text-[var(--color-green-primary)]">
            <Layers size={24} />
          </div>

          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Regra dos calibres ativos
            </h3>

            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              Apenas calibres com status ativo aparecem nos selects das telas de
              Alho Classificado, Produto Final e Saída/Venda. Calibres inativos
              permanecem no histórico, mas não devem ser usados em novos lançamentos.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Calibres;