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
  Building2,
  CheckCircle,
  Edit,
  MapPinned,
  RefreshCcw,
  Save,
  Settings,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { supabase } from "../../services/supabaseClient";

const ABA_AREAS = "areas";
const ABA_FAZENDAS = "fazendas";
const ABA_RESPONSAVEIS = "responsaveis";
const ABA_PARAMETROS = "parametros";

const FORM_CADASTRO_INICIAL = {
  nome: "",
  ativo: "true",
  observacao: "",
};

const FORM_PARAMETROS_INICIAL = {
  estoque_minimo_por_calibre: "0",
  peso_caixa_final_kg: "10",
  alerta_estoque_baixo: true,
};

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function booleano(valor) {
  return valor === true || valor === "true" || valor === "sim" || valor === 1 || valor === "1";
}

function numeroCampo(valor, fallback = 0) {
  if (valor === "" || valor === null || valor === undefined) {
    return fallback;
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return fallback;
  }

  return numero;
}

function textoObservacao(item) {
  return item?.observacao || item?.descricao || "-";
}

function normalizarParametros(configuracoes) {
  return {
    estoque_minimo_por_calibre: String(
      configuracoes?.estoque_minimo_por_calibre ?? 0
    ),

    peso_caixa_final_kg: String(
      configuracoes?.peso_caixa_final_kg ??
        configuracoes?.peso_padrao_caixa_final_kg ??
        10
    ),

    alerta_estoque_baixo: configuracoes?.alerta_estoque_baixo !== false,
  };
}

function montarPayloadCadastro(form) {
  return {
    nome: String(form.nome || "").trim(),
    ativo: booleano(form.ativo),
    observacao: form.observacao ? String(form.observacao).trim() : null,
  };
}

function montarPayloadCadastroComDescricao(form) {
  return {
    nome: String(form.nome || "").trim(),
    ativo: booleano(form.ativo),
    descricao: form.observacao ? String(form.observacao).trim() : null,
  };
}

function erroAmigavel(error, entidade = "registro") {
  const mensagem = error?.message || "";

  if (error?.code === "23505" || mensagem.includes("duplicate key")) {
    return `Já existe ${entidade} com esse nome.`;
  }

  if (error?.code === "23503" || mensagem.includes("foreign key")) {
    return `Este ${entidade} já foi usado em lançamentos. Inative em vez de excluir.`;
  }

  if (mensagem.includes("estoque_minimo_por_calibre")) {
    return "Não foi possível salvar o estoque mínimo. Confira a estrutura da tabela configurações.";
  }

  if (mensagem.includes("peso_caixa_final_kg")) {
    return "Não foi possível salvar o peso padrão da caixa final. Confira a estrutura da tabela configurações.";
  }

  return mensagem || `Não foi possível salvar ${entidade}.`;
}

function AbaBotao({ ativa, children, onClick }) {
  return (
    <Button
      type="button"
      variant={ativa ? "primary" : "secondary"}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState(ABA_AREAS);

  const [areas, setAreas] = useState([]);
  const [fazendas, setFazendas] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [configuracoes, setConfiguracoes] = useState(null);

  const [formArea, setFormArea] = useState(FORM_CADASTRO_INICIAL);
  const [formFazenda, setFormFazenda] = useState(FORM_CADASTRO_INICIAL);
  const [formResponsavel, setFormResponsavel] = useState(FORM_CADASTRO_INICIAL);
  const [formParametros, setFormParametros] = useState(FORM_PARAMETROS_INICIAL);

  const [editandoAreaId, setEditandoAreaId] = useState(null);
  const [editandoFazendaId, setEditandoFazendaId] = useState(null);
  const [editandoResponsavelId, setEditandoResponsavelId] = useState(null);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const resumo = useMemo(() => {
    return {
      areas: areas.length,
      areasAtivas: areas.filter((item) => item.ativo).length,
      fazendas: fazendas.length,
      fazendasAtivas: fazendas.filter((item) => item.ativo).length,
      responsaveis: responsaveis.length,
      responsaveisAtivos: responsaveis.filter((item) => item.ativo).length,
    };
  }, [areas, fazendas, responsaveis]);

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");
      setSucesso("");

      const [
        areasResponse,
        fazendasResponse,
        responsaveisResponse,
        configuracoesResponse,
      ] = await Promise.all([
        supabase
          .from("areas_fazenda")
          .select("*")
          .order("nome", { ascending: true }),

        supabase
          .from("fazendas")
          .select("*")
          .order("nome", { ascending: true }),

        supabase
          .from("responsaveis")
          .select("*")
          .order("nome", { ascending: true }),

        supabase
          .from("configuracoes")
          .select("*")
          .limit(1)
          .maybeSingle(),
      ]);

      if (areasResponse.error) throw areasResponse.error;
      if (fazendasResponse.error) throw fazendasResponse.error;
      if (responsaveisResponse.error) throw responsaveisResponse.error;
      if (configuracoesResponse.error) throw configuracoesResponse.error;

      const configuracaoBanco = configuracoesResponse.data || null;

      setAreas(areasResponse.data || []);
      setFazendas(fazendasResponse.data || []);
      setResponsaveis(responsaveisResponse.data || []);
      setConfiguracoes(configuracaoBanco);

      setFormParametros(normalizarParametros(configuracaoBanco));
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      setErro(error.message || "Não foi possível carregar as configurações.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function limparMensagens() {
    setErro("");
    setSucesso("");
  }

  function atualizarFormArea(event) {
    const { name, value } = event.target;

    setFormArea((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));

    limparMensagens();
  }

  function atualizarFormFazenda(event) {
    const { name, value } = event.target;

    setFormFazenda((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));

    limparMensagens();
  }

  function atualizarFormResponsavel(event) {
    const { name, value } = event.target;

    setFormResponsavel((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));

    limparMensagens();
  }

  function atualizarFormParametros(event) {
    const { name, value, checked, type } = event.target;

    setFormParametros((estadoAtual) => ({
      ...estadoAtual,
      [name]: type === "checkbox" ? checked : value,
    }));

    limparMensagens();
  }

  function validarCadastro(form, entidade) {
    if (!String(form.nome || "").trim()) {
      return `Informe o nome de ${entidade}.`;
    }

    return "";
  }

  function cancelarArea() {
    setEditandoAreaId(null);
    setFormArea(FORM_CADASTRO_INICIAL);
    limparMensagens();
  }

  function cancelarFazenda() {
    setEditandoFazendaId(null);
    setFormFazenda(FORM_CADASTRO_INICIAL);
    limparMensagens();
  }

  function cancelarResponsavel() {
    setEditandoResponsavelId(null);
    setFormResponsavel(FORM_CADASTRO_INICIAL);
    limparMensagens();
  }

  function iniciarEdicaoArea(item) {
    setEditandoAreaId(item.id);
    setFormArea({
      nome: item.nome || "",
      ativo: item.ativo ? "true" : "false",
      observacao: item.observacao || item.descricao || "",
    });
    setAbaAtiva(ABA_AREAS);
    limparMensagens();
  }

  function iniciarEdicaoFazenda(item) {
    setEditandoFazendaId(item.id);
    setFormFazenda({
      nome: item.nome || "",
      ativo: item.ativo ? "true" : "false",
      observacao: item.observacao || item.descricao || "",
    });
    setAbaAtiva(ABA_FAZENDAS);
    limparMensagens();
  }

  function iniciarEdicaoResponsavel(item) {
    setEditandoResponsavelId(item.id);
    setFormResponsavel({
      nome: item.nome || "",
      ativo: item.ativo ? "true" : "false",
      observacao: item.observacao || item.descricao || "",
    });
    setAbaAtiva(ABA_RESPONSAVEIS);
    limparMensagens();
  }

  async function salvarCadastroGenerico({
    event,
    tabela,
    form,
    editandoId,
    entidade,
    onCancel,
  }) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const mensagemErro = validarCadastro(form, entidade);

      if (mensagemErro) {
        setErro(mensagemErro);
        return;
      }

      const payload = montarPayloadCadastro(form);

      let response;

      if (editandoId) {
        response = await supabase
          .from(tabela)
          .update(payload)
          .eq("id", editandoId)
          .select()
          .single();
      } else {
        response = await supabase
          .from(tabela)
          .insert(payload)
          .select()
          .single();
      }

      if (
        response.error &&
        String(response.error.message || "").includes("observacao")
      ) {
        const payloadDescricao = montarPayloadCadastroComDescricao(form);

        if (editandoId) {
          response = await supabase
            .from(tabela)
            .update(payloadDescricao)
            .eq("id", editandoId)
            .select()
            .single();
        } else {
          response = await supabase
            .from(tabela)
            .insert(payloadDescricao)
            .select()
            .single();
        }
      }

      if (response.error) {
        throw response.error;
      }

      setSucesso(
        editandoId
          ? `${entidade} atualizado com sucesso.`
          : `${entidade} cadastrado com sucesso.`
      );

      onCancel();
      await carregarDados();
    } catch (error) {
      console.error(`Erro ao salvar ${entidade}:`, error);
      setErro(erroAmigavel(error, entidade));
    } finally {
      setSalvando(false);
    }
  }

  async function excluirCadastroGenerico({ tabela, id, entidade }) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir este ${entidade}? Se ele já foi usado em lançamentos, inative em vez de excluir.`
    );

    if (!confirmar) return;

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const { error } = await supabase.from(tabela).delete().eq("id", id);

      if (error) {
        throw error;
      }

      setSucesso(`${entidade} excluído com sucesso.`);
      await carregarDados();
    } catch (error) {
      console.error(`Erro ao excluir ${entidade}:`, error);
      setErro(erroAmigavel(error, entidade));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarParametros(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const estoqueMinimo = numeroCampo(
        formParametros.estoque_minimo_por_calibre,
        0
      );

      const pesoPadrao = numeroCampo(formParametros.peso_caixa_final_kg, 10);

      if (estoqueMinimo < 0) {
        setErro("O estoque mínimo não pode ser negativo.");
        return;
      }

      if (pesoPadrao <= 0) {
        setErro("O peso padrão da caixa final precisa ser maior que zero.");
        return;
      }

      const payload = {
        estoque_minimo_por_calibre: estoqueMinimo,
        peso_caixa_final_kg: pesoPadrao,
        alerta_estoque_baixo: Boolean(formParametros.alerta_estoque_baixo),
      };

      let response;

      if (configuracoes?.id) {
        response = await supabase
          .from("configuracoes")
          .update(payload)
          .eq("id", configuracoes.id)
          .select()
          .single();
      } else {
        response = await supabase
          .from("configuracoes")
          .insert({
            ...payload,
            unidade_principal: "caixas",
            embalagem_padrao: "caixa",
            permitir_lancamento_palete: true,
            exigir_conferencia_recebimento: false,
            prazo_alerta_conferencia_horas: 24,
            atualizacao_automatica_painel: true,
          })
          .select()
          .single();
      }

      if (response.error) {
        throw response.error;
      }

      setConfiguracoes(response.data);

      setFormParametros({
        estoque_minimo_por_calibre: String(estoqueMinimo),
        peso_caixa_final_kg: String(pesoPadrao),
        alerta_estoque_baixo: Boolean(formParametros.alerta_estoque_baixo),
      });

      setSucesso("Parâmetros gerais salvos com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar parâmetros:", error);
      setErro(erroAmigavel(error, "parâmetro"));
    } finally {
      setSalvando(false);
    }
  }

  const colunasAreas = [
    {
      key: "nome",
      label: "Área / Pivô",
      render: (value) => (
        <p className="font-black text-[var(--color-text-primary)]">
          {value || "-"}
        </p>
      ),
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
      render: (_, row) => textoObservacao(row),
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
            onClick={() => iniciarEdicaoArea(row)}
          >
            <Edit size={16} />
            Editar
          </Button>

          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={salvando}
            onClick={() =>
              excluirCadastroGenerico({
                tabela: "areas_fazenda",
                id: row.id,
                entidade: "Área / Pivô",
              })
            }
          >
            <Trash2 size={16} />
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  const colunasFazendas = [
    {
      key: "nome",
      label: "Fazenda",
      render: (value) => (
        <p className="font-black text-[var(--color-text-primary)]">
          {value || "-"}
        </p>
      ),
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
      render: (_, row) => textoObservacao(row),
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
            onClick={() => iniciarEdicaoFazenda(row)}
          >
            <Edit size={16} />
            Editar
          </Button>

          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={salvando}
            onClick={() =>
              excluirCadastroGenerico({
                tabela: "fazendas",
                id: row.id,
                entidade: "Fazenda",
              })
            }
          >
            <Trash2 size={16} />
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  const colunasResponsaveis = [
    {
      key: "nome",
      label: "Responsável",
      render: (value) => (
        <p className="font-black text-[var(--color-text-primary)]">
          {value || "-"}
        </p>
      ),
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
      render: (_, row) => textoObservacao(row),
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
            onClick={() => iniciarEdicaoResponsavel(row)}
          >
            <Edit size={16} />
            Editar
          </Button>

          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={salvando}
            onClick={() =>
              excluirCadastroGenerico({
                tabela: "responsaveis",
                id: row.id,
                entidade: "Responsável",
              })
            }
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
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Áreas / Pivôs"
          value={formatarNumero(resumo.areas)}
          description="Cadastradas"
          icon={MapPinned}
          variant="info"
        />

        <KpiCard
          title="Áreas ativas"
          value={formatarNumero(resumo.areasAtivas)}
          description="Disponíveis para lançamento"
          icon={CheckCircle}
          variant="success"
        />

        <KpiCard
          title="Fazendas"
          value={formatarNumero(resumo.fazendas)}
          description="Cadastradas"
          icon={Building2}
          variant="info"
        />

        <KpiCard
          title="Responsáveis"
          value={formatarNumero(resumo.responsaveis)}
          description="Conferentes / operadores"
          icon={UserRound}
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
        <div className="flex flex-wrap gap-3">
          <AbaBotao
            ativa={abaAtiva === ABA_AREAS}
            onClick={() => setAbaAtiva(ABA_AREAS)}
          >
            Áreas / Pivôs
          </AbaBotao>

          <AbaBotao
            ativa={abaAtiva === ABA_FAZENDAS}
            onClick={() => setAbaAtiva(ABA_FAZENDAS)}
          >
            Fazendas
          </AbaBotao>

          <AbaBotao
            ativa={abaAtiva === ABA_RESPONSAVEIS}
            onClick={() => setAbaAtiva(ABA_RESPONSAVEIS)}
          >
            Responsáveis
          </AbaBotao>

          <AbaBotao
            ativa={abaAtiva === ABA_PARAMETROS}
            onClick={() => setAbaAtiva(ABA_PARAMETROS)}
          >
            Parâmetros gerais
          </AbaBotao>
        </div>
      </Card>

      {abaAtiva === ABA_AREAS && (
        <>
          <Card>
            <h3 className="text-xl font-black text-[var(--color-text-primary)]">
              {editandoAreaId ? "Editar Área / Pivô" : "Nova Área / Pivô"}
            </h3>

            <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
              Cadastre as áreas usadas no Produto Final e na Saída/Venda.
            </p>

            <form
              onSubmit={(event) =>
                salvarCadastroGenerico({
                  event,
                  tabela: "areas_fazenda",
                  form: formArea,
                  editandoId: editandoAreaId,
                  entidade: "Área / Pivô",
                  onCancel: cancelarArea,
                })
              }
            >
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input
                  label="Nome da Área / Pivô"
                  name="nome"
                  value={formArea.nome}
                  onChange={atualizarFormArea}
                  placeholder="Ex: Área 01, Pivô 02..."
                />

                <Select
                  label="Status"
                  name="ativo"
                  value={formArea.ativo}
                  onChange={atualizarFormArea}
                  options={[
                    { value: "true", label: "Ativo" },
                    { value: "false", label: "Inativo" },
                  ]}
                  placeholder="Selecione o status"
                />

                <div className="md:col-span-2">
                  <Textarea
                    label="Observação"
                    name="observacao"
                    value={formArea.observacao}
                    onChange={atualizarFormArea}
                    placeholder="Observações sobre a área..."
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {editandoAreaId && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={salvando}
                    onClick={cancelarArea}
                  >
                    <X size={16} />
                    Cancelar
                  </Button>
                )}

                <Button type="submit" variant="primary" disabled={salvando}>
                  <Save size={16} />
                  {salvando
                    ? "Salvando..."
                    : editandoAreaId
                      ? "Salvar Área / Pivô"
                      : "Cadastrar Área / Pivô"}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-[var(--color-text-primary)]">
                  Áreas / Pivôs cadastrados
                </h3>

                <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
                  Lista de áreas disponíveis no sistema.
                </p>
              </div>

              <Badge variant="info">
                {carregando
                  ? "Carregando"
                  : `${formatarNumero(areas.length)} registros`}
              </Badge>
            </div>

            <DataTable
              columns={colunasAreas}
              data={areas}
              emptyMessage="Nenhuma Área / Pivô cadastrada."
            />
          </Card>
        </>
      )}

      {abaAtiva === ABA_FAZENDAS && (
        <>
          <Card>
            <h3 className="text-xl font-black text-[var(--color-text-primary)]">
              {editandoFazendaId ? "Editar fazenda" : "Nova fazenda"}
            </h3>

            <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
              Cadastre as fazendas/origens usadas na chegada e classificação.
            </p>

            <form
              onSubmit={(event) =>
                salvarCadastroGenerico({
                  event,
                  tabela: "fazendas",
                  form: formFazenda,
                  editandoId: editandoFazendaId,
                  entidade: "Fazenda",
                  onCancel: cancelarFazenda,
                })
              }
            >
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input
                  label="Nome da fazenda"
                  name="nome"
                  value={formFazenda.nome}
                  onChange={atualizarFormFazenda}
                  placeholder="Ex: Fazenda São José"
                />

                <Select
                  label="Status"
                  name="ativo"
                  value={formFazenda.ativo}
                  onChange={atualizarFormFazenda}
                  options={[
                    { value: "true", label: "Ativo" },
                    { value: "false", label: "Inativo" },
                  ]}
                  placeholder="Selecione o status"
                />

                <div className="md:col-span-2">
                  <Textarea
                    label="Observação"
                    name="observacao"
                    value={formFazenda.observacao}
                    onChange={atualizarFormFazenda}
                    placeholder="Observações sobre a fazenda..."
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {editandoFazendaId && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={salvando}
                    onClick={cancelarFazenda}
                  >
                    <X size={16} />
                    Cancelar
                  </Button>
                )}

                <Button type="submit" variant="primary" disabled={salvando}>
                  <Save size={16} />
                  {salvando
                    ? "Salvando..."
                    : editandoFazendaId
                      ? "Salvar fazenda"
                      : "Cadastrar fazenda"}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-[var(--color-text-primary)]">
                  Fazendas cadastradas
                </h3>

                <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
                  Lista de fazendas/origens do sistema.
                </p>
              </div>

              <Badge variant="info">
                {carregando
                  ? "Carregando"
                  : `${formatarNumero(fazendas.length)} registros`}
              </Badge>
            </div>

            <DataTable
              columns={colunasFazendas}
              data={fazendas}
              emptyMessage="Nenhuma fazenda cadastrada."
            />
          </Card>
        </>
      )}

      {abaAtiva === ABA_RESPONSAVEIS && (
        <>
          <Card>
            <h3 className="text-xl font-black text-[var(--color-text-primary)]">
              {editandoResponsavelId ? "Editar responsável" : "Novo responsável"}
            </h3>

            <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
              Cadastre responsáveis, conferentes ou operadores.
            </p>

            <form
              onSubmit={(event) =>
                salvarCadastroGenerico({
                  event,
                  tabela: "responsaveis",
                  form: formResponsavel,
                  editandoId: editandoResponsavelId,
                  entidade: "Responsável",
                  onCancel: cancelarResponsavel,
                })
              }
            >
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input
                  label="Nome do responsável"
                  name="nome"
                  value={formResponsavel.nome}
                  onChange={atualizarFormResponsavel}
                  placeholder="Ex: João Silva"
                />

                <Select
                  label="Status"
                  name="ativo"
                  value={formResponsavel.ativo}
                  onChange={atualizarFormResponsavel}
                  options={[
                    { value: "true", label: "Ativo" },
                    { value: "false", label: "Inativo" },
                  ]}
                  placeholder="Selecione o status"
                />

                <div className="md:col-span-2">
                  <Textarea
                    label="Observação"
                    name="observacao"
                    value={formResponsavel.observacao}
                    onChange={atualizarFormResponsavel}
                    placeholder="Observações sobre o responsável..."
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {editandoResponsavelId && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={salvando}
                    onClick={cancelarResponsavel}
                  >
                    <X size={16} />
                    Cancelar
                  </Button>
                )}

                <Button type="submit" variant="primary" disabled={salvando}>
                  <Save size={16} />
                  {salvando
                    ? "Salvando..."
                    : editandoResponsavelId
                      ? "Salvar responsável"
                      : "Cadastrar responsável"}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-[var(--color-text-primary)]">
                  Responsáveis cadastrados
                </h3>

                <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
                  Lista de responsáveis disponíveis para lançamento.
                </p>
              </div>

              <Badge variant="info">
                {carregando
                  ? "Carregando"
                  : `${formatarNumero(responsaveis.length)} registros`}
              </Badge>
            </div>

            <DataTable
              columns={colunasResponsaveis}
              data={responsaveis}
              emptyMessage="Nenhum responsável cadastrado."
            />
          </Card>
        </>
      )}

      {abaAtiva === ABA_PARAMETROS && (
        <Card>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-[var(--color-text-primary)]">
                Parâmetros gerais
              </h3>

              <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
                Configure somente os parâmetros usados atualmente no sistema.
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-green-light)] text-[var(--color-green-primary)]">
              <Settings size={24} />
            </div>
          </div>

          <form onSubmit={salvarParametros}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Estoque mínimo por calibre"
                name="estoque_minimo_por_calibre"
                type="number"
                value={formParametros.estoque_minimo_por_calibre}
                onChange={atualizarFormParametros}
                placeholder="Ex: 100"
              />

              <Input
                label="Peso padrão da caixa final"
                name="peso_caixa_final_kg"
                type="number"
                value={formParametros.peso_caixa_final_kg}
                onChange={atualizarFormParametros}
                placeholder="Ex: 10"
              />

              <label className="flex items-center gap-3 md:col-span-2">
                <input
                  type="checkbox"
                  name="alerta_estoque_baixo"
                  checked={Boolean(formParametros.alerta_estoque_baixo)}
                  onChange={atualizarFormParametros}
                  className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-green-primary)]"
                />

                <span className="text-sm font-bold text-[var(--color-text-primary)]">
                  Ativar alerta de estoque baixo
                </span>
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={carregando || salvando}
                onClick={carregarDados}
              >
                <RefreshCcw size={16} />
                Atualizar dados
              </Button>

              <Button type="submit" variant="primary" disabled={salvando}>
                <Save size={16} />
                {salvando ? "Salvando..." : "Salvar configurações"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

export default Configuracoes;