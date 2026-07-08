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
  Plus,
  RefreshCcw,
  Save,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  buscarConfiguracoes,
  cadastrarFazenda,
  cadastrarResponsavel,
  editarFazenda,
  editarResponsavel,
  excluirFazenda,
  excluirResponsavel,
  listarFazendas,
  listarResponsaveis,
  salvarConfiguracoes,
} from "../../services/configuracoesService";

import {
  alternarStatusAreaFazenda,
  cadastrarAreaFazenda,
  calcularResumoAreas,
  editarAreaFazenda,
  excluirAreaFazenda,
  listarAreasFazenda,
} from "../../services/areasFazendaService";

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState("areas");

  const [configuracoes, setConfiguracoes] = useState({
    estoque_minimo_por_calibre: "",
    alerta_estoque_baixo: true,
    peso_caixa_final_kg: "",
  });

  const [fazendas, setFazendas] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [areas, setAreas] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [fazendaEditandoId, setFazendaEditandoId] = useState(null);
  const [responsavelEditandoId, setResponsavelEditandoId] = useState(null);
  const [areaEditandoId, setAreaEditandoId] = useState(null);

  const [formFazenda, setFormFazenda] = useState({
    nome: "",
    ativo: true,
  });

  const [formResponsavel, setFormResponsavel] = useState({
    nome: "",
    ativo: true,
  });

  const [formArea, setFormArea] = useState({
    fazenda_id: "",
    nome: "",
    descricao: "",
    ativo: true,
  });

  const resumoAreas = useMemo(() => {
    return calcularResumoAreas(areas);
  }, [areas]);

  const fazendaOptions = useMemo(() => {
    return fazendas
      .filter((fazenda) => fazenda.ativo !== false)
      .map((fazenda) => ({
        value: fazenda.id,
        label: fazenda.nome,
      }));
  }, [fazendas]);

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");
      setSucesso("");

      const [
        configuracoesBanco,
        fazendasBanco,
        responsaveisBanco,
        areasBanco,
      ] = await Promise.all([
        buscarConfiguracoes(),
        listarFazendas(),
        listarResponsaveis(),
        listarAreasFazenda(),
      ]);

      setConfiguracoes({
        estoque_minimo_por_calibre:
          configuracoesBanco?.estoque_minimo_por_calibre ?? "",
        alerta_estoque_baixo:
          configuracoesBanco?.alerta_estoque_baixo ?? true,
        peso_caixa_final_kg: configuracoesBanco?.peso_caixa_final_kg ?? "",
      });

      setFazendas(fazendasBanco || []);
      setResponsaveis(responsaveisBanco || []);
      setAreas(areasBanco || []);
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

  function atualizarConfiguracao(event) {
    const { name, value, type, checked } = event.target;

    setConfiguracoes((estadoAtual) => ({
      ...estadoAtual,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErro("");
  }

  function atualizarFazenda(event) {
    const { name, value } = event.target;

    setFormFazenda((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));

    setErro("");
  }

  function atualizarResponsavel(event) {
    const { name, value } = event.target;

    setFormResponsavel((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));

    setErro("");
  }

  function atualizarArea(event) {
    const { name, value } = event.target;

    setFormArea((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));

    setErro("");
  }

  async function salvarConfig(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      await salvarConfiguracoes(configuracoes);

      setSucesso("Configurações salvas com sucesso.");

      await carregarDados();
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      setErro(error.message || "Não foi possível salvar as configurações.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarFazenda(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      if (fazendaEditandoId) {
        await editarFazenda(fazendaEditandoId, formFazenda);
        setSucesso("Fazenda atualizada com sucesso.");
      } else {
        await cadastrarFazenda(formFazenda);
        setSucesso("Fazenda cadastrada com sucesso.");
      }

      setFazendaEditandoId(null);
      setFormFazenda({ nome: "", ativo: true });

      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível salvar a fazenda.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarResponsavel(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      if (responsavelEditandoId) {
        await editarResponsavel(responsavelEditandoId, formResponsavel);
        setSucesso("Responsável atualizado com sucesso.");
      } else {
        await cadastrarResponsavel(formResponsavel);
        setSucesso("Responsável cadastrado com sucesso.");
      }

      setResponsavelEditandoId(null);
      setFormResponsavel({ nome: "", ativo: true });

      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível salvar o responsável.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarArea(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      if (areaEditandoId) {
        await editarAreaFazenda(areaEditandoId, formArea);
        setSucesso("Área / Pivô atualizada com sucesso.");
      } else {
        await cadastrarAreaFazenda(formArea);
        setSucesso("Área / Pivô cadastrada com sucesso.");
      }

      setAreaEditandoId(null);
      setFormArea({
        fazenda_id: "",
        nome: "",
        descricao: "",
        ativo: true,
      });

      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível salvar a Área / Pivô.");
    } finally {
      setSalvando(false);
    }
  }

  function editarFazendaSelecionada(fazenda) {
    setFazendaEditandoId(fazenda.id);
    setFormFazenda({
      nome: fazenda.nome || "",
      ativo: fazenda.ativo !== false,
    });
  }

  function editarResponsavelSelecionado(responsavel) {
    setResponsavelEditandoId(responsavel.id);
    setFormResponsavel({
      nome: responsavel.nome || "",
      ativo: responsavel.ativo !== false,
    });
  }

  function editarAreaSelecionada(area) {
    setAreaEditandoId(area.id);
    setFormArea({
      fazenda_id: area.fazenda_id || "",
      nome: area.nome || "",
      descricao: area.descricao || "",
      ativo: area.ativo !== false,
    });
  }

  async function removerFazenda(id) {
    const confirmar = window.confirm("Deseja excluir esta fazenda?");
    if (!confirmar) return;

    try {
      await excluirFazenda(id);
      setSucesso("Fazenda excluída com sucesso.");
      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível excluir a fazenda.");
    }
  }

  async function removerResponsavel(id) {
    const confirmar = window.confirm("Deseja excluir este responsável?");
    if (!confirmar) return;

    try {
      await excluirResponsavel(id);
      setSucesso("Responsável excluído com sucesso.");
      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível excluir o responsável.");
    }
  }

  async function removerArea(id) {
    const confirmar = window.confirm(
      "Deseja excluir esta Área / Pivô? Se ela já foi usada em lançamentos, prefira inativar."
    );

    if (!confirmar) return;

    try {
      await excluirAreaFazenda(id);
      setSucesso("Área / Pivô excluída com sucesso.");
      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível excluir a Área / Pivô.");
    }
  }

  async function alternarArea(area) {
    try {
      await alternarStatusAreaFazenda(area.id, !area.ativo);
      setSucesso(
        area.ativo
          ? "Área / Pivô inativada com sucesso."
          : "Área / Pivô ativada com sucesso."
      );

      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível alterar o status da área.");
    }
  }

  const columnsAreas = [
    {
      key: "nome",
      label: "Área / Pivô",
      render: (value, row) => (
        <div>
          <p className="font-bold text-[var(--color-text-primary)]">{value}</p>
          <p className="text-xs font-semibold text-[var(--color-text-muted)]">
            {row.descricao || "Sem descrição"}
          </p>
        </div>
      ),
    },
    {
      key: "fazendas",
      label: "Fazenda",
      render: (value) => value?.nome || "-",
    },
    {
      key: "ativo",
      label: "Status",
      render: (value) =>
        value ? (
          <Badge variant="success">Ativa</Badge>
        ) : (
          <Badge variant="danger">Inativa</Badge>
        ),
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
            onClick={() => editarAreaSelecionada(row)}
          >
            <Edit size={16} />
            Editar
          </Button>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => alternarArea(row)}
          >
            {row.ativo ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
            {row.ativo ? "Inativar" : "Ativar"}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={() => removerArea(row.id)}
          >
            <Trash2 size={16} />
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  const columnsFazendas = [
    {
      key: "nome",
      label: "Fazenda",
    },
    {
      key: "ativo",
      label: "Status",
      render: (value) =>
        value ? (
          <Badge variant="success">Ativa</Badge>
        ) : (
          <Badge variant="danger">Inativa</Badge>
        ),
    },
    {
      key: "acoes",
      label: "Ações",
      render: (_, row) => (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => editarFazendaSelecionada(row)}
          >
            <Edit size={16} />
            Editar
          </Button>

          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={() => removerFazenda(row.id)}
          >
            <Trash2 size={16} />
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  const columnsResponsaveis = [
    {
      key: "nome",
      label: "Responsável",
    },
    {
      key: "ativo",
      label: "Status",
      render: (value) =>
        value ? (
          <Badge variant="success">Ativo</Badge>
        ) : (
          <Badge variant="danger">Inativo</Badge>
        ),
    },
    {
      key: "acoes",
      label: "Ações",
      render: (_, row) => (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => editarResponsavelSelecionado(row)}
          >
            <Edit size={16} />
            Editar
          </Button>

          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={() => removerResponsavel(row.id)}
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
          value={formatarNumero(resumoAreas.total)}
          description="Cadastradas"
          icon={MapPinned}
          variant="info"
        />

        <KpiCard
          title="Áreas ativas"
          value={formatarNumero(resumoAreas.ativas)}
          description="Disponíveis para lançamento"
          icon={CheckCircle}
          variant="success"
        />

        <KpiCard
          title="Fazendas"
          value={formatarNumero(fazendas.length)}
          description="Cadastradas"
          icon={Building2}
          variant="info"
        />

        <KpiCard
          title="Responsáveis"
          value={formatarNumero(responsaveis.length)}
          description="Conferentes / operadores"
          icon={UserRound}
          variant="info"
        />
      </section>

      {erro && (
        <AlertBox variant="danger" title="Atenção" description={erro} />
      )}

      {sucesso && (
        <AlertBox
          variant="success"
          title="Operação concluída"
          description={sucesso}
        />
      )}

      <Card>
        <div className="flex flex-wrap gap-3">
          {[
            { id: "areas", label: "Áreas / Pivôs" },
            { id: "fazendas", label: "Fazendas" },
            { id: "responsaveis", label: "Responsáveis" },
            { id: "geral", label: "Parâmetros gerais" },
          ].map((aba) => (
            <Button
              key={aba.id}
              type="button"
              variant={abaAtiva === aba.id ? "primary" : "secondary"}
              onClick={() => setAbaAtiva(aba.id)}
            >
              {aba.label}
            </Button>
          ))}
        </div>
      </Card>

      {abaAtiva === "areas" && (
        <>
          <Card>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                {areaEditandoId ? "Editar Área / Pivô" : "Cadastrar Área / Pivô"}
              </h3>

              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Cadastre as áreas, pivôs ou talhões vinculados a cada fazenda.
              </p>
            </div>

            <form onSubmit={salvarArea}>
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Select
                  label="Fazenda"
                  name="fazenda_id"
                  value={formArea.fazenda_id}
                  onChange={atualizarArea}
                  options={fazendaOptions}
                  placeholder="Selecione a fazenda"
                />

                <Input
                  label="Nome da Área / Pivô"
                  name="nome"
                  value={formArea.nome}
                  onChange={atualizarArea}
                  placeholder="Ex: Área 01 - Pivô Central"
                />

                <div className="md:col-span-2">
                  <Textarea
                    label="Descrição / Observação"
                    name="descricao"
                    value={formArea.descricao}
                    onChange={atualizarArea}
                    placeholder="Ex: área plantada no pivô norte, talhão 07..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {areaEditandoId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setAreaEditandoId(null);
                      setFormArea({
                        fazenda_id: "",
                        nome: "",
                        descricao: "",
                        ativo: true,
                      });
                    }}
                  >
                    <X size={16} />
                    Cancelar
                  </Button>
                )}

                <Button type="submit" variant="primary" disabled={salvando}>
                  {areaEditandoId ? <Save size={16} /> : <Plus size={16} />}
                  {salvando
                    ? "Salvando..."
                    : areaEditandoId
                      ? "Salvar alterações"
                      : "Cadastrar área"}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                  Áreas / Pivôs cadastrados
                </h3>

                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Essas opções aparecem nos lançamentos de chegada, classificação
                  e produto final.
                </p>
              </div>

              <Badge variant="info">
                {carregando ? "Carregando" : `${formatarNumero(areas.length)} áreas`}
              </Badge>
            </div>

            <DataTable
              columns={columnsAreas}
              data={areas}
              emptyMessage="Nenhuma Área / Pivô cadastrada."
            />
          </Card>
        </>
      )}

      {abaAtiva === "fazendas" && (
        <>
          <Card>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              {fazendaEditandoId ? "Editar fazenda" : "Cadastrar fazenda"}
            </h3>

            <form onSubmit={salvarFazenda}>
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input
                  label="Nome da fazenda"
                  name="nome"
                  value={formFazenda.nome}
                  onChange={atualizarFazenda}
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {fazendaEditandoId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setFazendaEditandoId(null);
                      setFormFazenda({ nome: "", ativo: true });
                    }}
                  >
                    Cancelar
                  </Button>
                )}

                <Button type="submit" variant="primary" disabled={salvando}>
                  Salvar
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <DataTable
              columns={columnsFazendas}
              data={fazendas}
              emptyMessage="Nenhuma fazenda cadastrada."
            />
          </Card>
        </>
      )}

      {abaAtiva === "responsaveis" && (
        <>
          <Card>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              {responsavelEditandoId
                ? "Editar responsável"
                : "Cadastrar responsável"}
            </h3>

            <form onSubmit={salvarResponsavel}>
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input
                  label="Nome do responsável"
                  name="nome"
                  value={formResponsavel.nome}
                  onChange={atualizarResponsavel}
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {responsavelEditandoId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setResponsavelEditandoId(null);
                      setFormResponsavel({ nome: "", ativo: true });
                    }}
                  >
                    Cancelar
                  </Button>
                )}

                <Button type="submit" variant="primary" disabled={salvando}>
                  Salvar
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <DataTable
              columns={columnsResponsaveis}
              data={responsaveis}
              emptyMessage="Nenhum responsável cadastrado."
            />
          </Card>
        </>
      )}

      {abaAtiva === "geral" && (
        <Card>
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Parâmetros gerais
          </h3>

          <form onSubmit={salvarConfig}>
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Estoque mínimo por calibre"
                name="estoque_minimo_por_calibre"
                type="number"
                value={configuracoes.estoque_minimo_por_calibre}
                onChange={atualizarConfiguracao}
              />

              <Input
                label="Peso padrão da caixa final"
                name="peso_caixa_final_kg"
                type="number"
                value={configuracoes.peso_caixa_final_kg}
                onChange={atualizarConfiguracao}
              />
            </div>

            <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                name="alerta_estoque_baixo"
                checked={Boolean(configuracoes.alerta_estoque_baixo)}
                onChange={atualizarConfiguracao}
              />
              Ativar alerta de estoque baixo
            </label>

            <div className="mt-6 flex justify-end">
              <Button type="submit" variant="primary" disabled={salvando}>
                <Save size={16} />
                Salvar configurações
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <Button type="button" variant="secondary" onClick={carregarDados}>
          <RefreshCcw size={16} />
          Atualizar dados
        </Button>
      </Card>
    </div>
  );
}

export default Configuracoes;