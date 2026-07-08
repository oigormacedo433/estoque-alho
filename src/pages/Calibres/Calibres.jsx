import { useEffect, useMemo, useState } from "react";

import {
  AlertBox,
  Badge,
  Button,
  Card,
  ConfirmModal,
  DataTable,
  Input,
  KpiCard,
  Select,
  Textarea,
} from "../../components/ui";

import {
  Edit,
  Layers,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

import {
  cadastrarCalibre,
  calcularResumoCalibres,
  editarCalibre,
  excluirCalibre,
  listarCalibres,
} from "../../services/calibresService";

const FORM_INICIAL = {
  codigo: "",
  nome: "",
  tipo: "Comercial",
  ordem: "",
  ativo: "true",
  observacao: "",
};

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function tipoVariant(tipo) {
  const valor = String(tipo || "").toLowerCase();

  if (valor.includes("ind")) return "warning";

  return "info";
}

function Calibres() {
  const [calibres, setCalibres] = useState([]);

  const [form, setForm] = useState(FORM_INICIAL);

  const [editandoId, setEditandoId] = useState(null);

  const [calibreParaExcluir, setCalibreParaExcluir] = useState(null);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const resumo = useMemo(() => {
    return calcularResumoCalibres(calibres);
  }, [calibres]);

  async function carregarCalibres() {
    try {
      setCarregando(true);
      setErro("");

      const dados = await listarCalibres();

      setCalibres(dados || []);
    } catch (error) {
      console.error("Erro ao carregar calibres:", error);
      setErro(error.message || "Não foi possível carregar os calibres.");
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
    setSucesso("");
  }

  function validarFormulario() {
    if (!form.codigo) return "Informe o código do calibre.";
    if (!form.nome) return "Informe o nome do calibre.";
    if (!form.tipo) return "Informe o tipo do calibre.";
    if (!form.ordem) return "Informe a ordem do calibre.";

    if (Number(form.ordem) <= 0) {
      return "A ordem precisa ser maior que zero.";
    }

    return "";
  }

  function limparFormulario() {
    setForm(FORM_INICIAL);
    setEditandoId(null);
    setErro("");
    setSucesso("");
  }

  function iniciarEdicao(calibre) {
    setEditandoId(calibre.id);

    setForm({
      codigo: calibre.codigo || "",
      nome: calibre.nome || "",
      tipo: calibre.tipo || "Comercial",
      ordem: String(calibre.ordem || ""),
      ativo: calibre.ativo ? "true" : "false",
      observacao: calibre.observacao || "",
    });

    setErro("");
    setSucesso("");

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

      const payload = {
        ...form,
        ativo: form.ativo === "true",
      };

      if (editandoId) {
        await editarCalibre(editandoId, payload);
        setSucesso("Calibre atualizado com sucesso.");
      } else {
        await cadastrarCalibre(payload);
        setSucesso("Calibre cadastrado com sucesso.");
      }

      limparFormulario();
      await carregarCalibres();
    } catch (error) {
      console.error("Erro ao salvar calibre:", error);
      setErro(error.message || "Não foi possível salvar o calibre.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirModalExcluir(calibre) {
    setCalibreParaExcluir(calibre);
    setErro("");
    setSucesso("");
  }

  function fecharModalExcluir() {
    if (excluindo) return;

    setCalibreParaExcluir(null);
  }

  async function confirmarExclusao() {
    if (!calibreParaExcluir?.id) return;

    try {
      setExcluindo(true);
      setErro("");
      setSucesso("");

      await excluirCalibre(calibreParaExcluir.id);

      setSucesso("Calibre excluído com sucesso.");

      if (editandoId === calibreParaExcluir.id) {
        limparFormulario();
      }

      setCalibreParaExcluir(null);

      await carregarCalibres();
    } catch (error) {
      console.error("Erro ao excluir calibre:", error);
      setErro(error.message || "Não foi possível excluir o calibre.");
    } finally {
      setExcluindo(false);
    }
  }

  const columns = [
    {
      key: "codigo",
      label: "Código",
      render: (value) => (
        <p className="font-black text-[var(--color-text-primary)]">
          {value || "-"}
        </p>
      ),
    },
    {
      key: "nome",
      label: "Nome",
      render: (value) => value || "-",
    },
    {
      key: "tipo",
      label: "Tipo",
      render: (value) => <Badge variant={tipoVariant(value)}>{value || "-"}</Badge>,
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
          <Badge variant="warning">Inativo</Badge>
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
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={salvando || excluindo}
            onClick={() => iniciarEdicao(row)}
          >
            <Edit size={16} />
            Editar
          </Button>

          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={salvando || excluindo}
            onClick={() => abrirModalExcluir(row)}
          >
            <Trash2 size={16} />
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <KpiCard
          title="Calibres cadastrados"
          value={formatarNumero(resumo.total)}
          description="Total salvo no sistema"
          icon={SlidersHorizontal}
          variant="info"
        />

        <KpiCard
          title="Calibres ativos"
          value={formatarNumero(resumo.ativos)}
          description="Aparecem nos lançamentos"
          icon={Layers}
          variant="success"
        />

        <KpiCard
          title="Calibres inativos"
          value={formatarNumero(resumo.inativos)}
          description="Ficam apenas no histórico"
          icon={X}
          variant="warning"
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
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h3 className="text-xl font-black text-[var(--color-text-primary)]">
              {editandoId ? "Editar calibre" : "Novo calibre"}
            </h3>

            <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
              Configure os calibres usados nas telas de classificação, produto
              final e saída.
            </p>
          </div>

          {editandoId ? (
            <Badge variant="warning">Editando</Badge>
          ) : (
            <Badge variant="info">Cadastro</Badge>
          )}
        </div>

        <form onSubmit={salvarCalibre}>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Input
              label="Código"
              name="codigo"
              value={form.codigo}
              onChange={atualizarCampo}
              placeholder="Ex: C4"
            />

            <Input
              label="Nome"
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
              options={[
                { value: "Comercial", label: "Comercial" },
                { value: "Indústria", label: "Indústria" },
              ]}
              placeholder="Selecione o tipo"
            />

            <Input
              label="Ordem"
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
              options={[
                { value: "true", label: "Ativo" },
                { value: "false", label: "Inativo" },
              ]}
              placeholder="Selecione o status"
            />

            <div className="md:col-span-2 xl:col-span-3">
              <Textarea
                label="Descrição / Observação"
                name="observacao"
                value={form.observacao}
                onChange={atualizarCampo}
                placeholder="Digite uma observação sobre o calibre..."
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {editandoId && (
              <Button
                type="button"
                variant="secondary"
                disabled={salvando}
                onClick={limparFormulario}
              >
                <X size={16} />
                Cancelar
              </Button>
            )}

            <Button type="submit" variant="primary" disabled={salvando}>
              {editandoId ? <Save size={16} /> : <Plus size={16} />}
              {salvando
                ? "Salvando..."
                : editandoId
                  ? "Salvar calibre"
                  : "Cadastrar calibre"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-xl font-black text-[var(--color-text-primary)]">
              Calibres cadastrados
            </h3>

            <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
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
            Carregando calibres...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={calibres}
            emptyMessage="Nenhum calibre cadastrado."
          />
        )}
      </Card>

      <Card>
        <AlertBox
          variant="info"
          title="Regra dos calibres ativos"
          description="Apenas calibres com status ativo aparecem nos selects das telas de Alho Classificado, Produto Final e Saída/Venda. Calibres inativos permanecem no histórico."
        />
      </Card>

      <ConfirmModal
        open={Boolean(calibreParaExcluir)}
        title="Excluir calibre?"
        description="Essa ação tenta remover o calibre selecionado. Se ele já foi usado em lançamentos, o banco pode bloquear a exclusão. Nesse caso, inative o calibre."
        variant="danger"
        confirmLabel="Confirmar exclusão"
        cancelLabel="Cancelar"
        loading={excluindo}
        onCancel={fecharModalExcluir}
        onConfirm={confirmarExclusao}
        details={
          calibreParaExcluir ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                  Código
                </p>
                <p className="mt-1 font-black text-[var(--color-text-primary)]">
                  {calibreParaExcluir.codigo || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                  Nome
                </p>
                <p className="mt-1 font-black text-[var(--color-text-primary)]">
                  {calibreParaExcluir.nome || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                  Tipo
                </p>
                <p className="mt-1 font-black text-[var(--color-text-primary)]">
                  {calibreParaExcluir.tipo || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
                  Status
                </p>
                <p className="mt-1 font-black text-[var(--color-text-primary)]">
                  {calibreParaExcluir.ativo ? "Ativo" : "Inativo"}
                </p>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}

export default Calibres;