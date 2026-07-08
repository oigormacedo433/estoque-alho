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
  Edit,
  MapPinned,
  PackageCheck,
  Save,
  Scale,
  Trash2,
  Truck,
  X,
} from "lucide-react";

import { listarAreasAtivas } from "../../services/areasFazendaService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";

import {
  buscarSaldoDisponivelPorAreaCalibre,
  cadastrarSaidaVenda,
  calcularResumoSaidasVendas,
  editarSaidaVenda,
  excluirSaidaVenda,
  listarEstoqueDisponivelSaida,
  listarSaidasVendas,
} from "../../services/saidaVendaService";

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

const FORM_INICIAL = {
  data_saida: "",
  hora: "",
  area_id: "",
  cliente: "",
  numero_pedido: "",
  calibre_id: "",
  quantidade_caixas: "",
  responsavel_id: "",
  observacao: "",
};

function SaidaVenda() {
  const [areas, setAreas] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [estoqueDisponivel, setEstoqueDisponivel] = useState([]);
  const [saidas, setSaidas] = useState([]);

  const [saldoSelecionado, setSaldoSelecionado] = useState(null);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);

  const [editandoId, setEditandoId] = useState(null);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [form, setForm] = useState({
    ...FORM_INICIAL,
    data_saida: obterDataAtual(),
    hora: obterHoraAtual(),
  });

  const areaOptions = useMemo(() => {
    return areas.map((area) => ({
      value: area.id,
      label: area.nome,
    }));
  }, [areas]);

  const calibreOptions = useMemo(() => {
    const mapa = new Map();

    estoqueDisponivel
      .filter((item) => !form.area_id || item.area_id === form.area_id)
      .forEach((item) => {
        mapa.set(item.calibre_id, {
          value: item.calibre_id,
          label: `${item.calibre_codigo} — ${item.calibre_nome}`,
        });
      });

    return Array.from(mapa.values());
  }, [estoqueDisponivel, form.area_id]);

  const responsavelOptions = useMemo(() => {
    return responsaveis.map((responsavel) => ({
      value: responsavel.id,
      label: responsavel.nome,
    }));
  }, [responsaveis]);

  const resumo = useMemo(() => {
    return calcularResumoSaidasVendas(saidas);
  }, [saidas]);

  const pesoTotalCalculado = useMemo(() => {
    const quantidade = Number(form.quantidade_caixas || 0);
    const pesoMedio = Number(saldoSelecionado?.peso_medio_por_caixa_kg || 0);

    return quantidade * pesoMedio;
  }, [form.quantidade_caixas, saldoSelecionado]);

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");
      setSucesso("");

      const [areasBanco, responsaveisBanco, estoqueBanco, saidasBanco] =
        await Promise.all([
          listarAreasAtivas(),
          listarResponsaveisAtivos(),
          listarEstoqueDisponivelSaida(),
          listarSaidasVendas(),
        ]);

      setAreas(areasBanco || []);
      setResponsaveis(responsaveisBanco || []);
      setEstoqueDisponivel(estoqueBanco || []);
      setSaidas(saidasBanco || []);
    } catch (error) {
      console.error("Erro ao carregar saída/venda:", error);
      setErro(error.message || "Não foi possível carregar saída/venda.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function atualizarSaldo(areaId, calibreId) {
    if (!areaId || !calibreId) {
      setSaldoSelecionado(null);
      return;
    }

    try {
      const saldo = await buscarSaldoDisponivelPorAreaCalibre(areaId, calibreId);
      setSaldoSelecionado(saldo);
    } catch (error) {
      console.error("Erro ao buscar saldo:", error);
      setSaldoSelecionado(null);
      setErro(error.message || "Não foi possível buscar o saldo da área.");
    }
  }

  async function atualizarCampo(event) {
    const { name, value } = event.target;

    setErro("");
    setSucesso("");

    if (name === "area_id") {
      setForm((estadoAtual) => ({
        ...estadoAtual,
        area_id: value,
        calibre_id: "",
      }));

      setSaldoSelecionado(null);

      try {
        const estoque = await listarEstoqueDisponivelSaida({ areaId: value });
        setEstoqueDisponivel((estadoAtual) => {
          const outros = estadoAtual.filter((item) => item.area_id !== value);
          return [...outros, ...(estoque || [])];
        });
      } catch (error) {
        setErro(error.message || "Não foi possível carregar estoque da área.");
      }

      return;
    }

    if (name === "calibre_id") {
      const novoForm = {
        ...form,
        calibre_id: value,
      };

      setForm(novoForm);

      await atualizarSaldo(novoForm.area_id, value);

      return;
    }

    setForm((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }));
  }

  function validarFormulario() {
    if (!form.data_saida) return "Informe a data da saída.";
    if (!form.hora) return "Informe a hora.";
    if (!form.area_id) return "Selecione a Área / Pivô.";
    if (!form.cliente) return "Informe o cliente.";
    if (!form.calibre_id) return "Selecione o calibre.";
    if (!form.quantidade_caixas) return "Informe a quantidade de caixas.";

    if (Number(form.quantidade_caixas) <= 0) {
      return "Quantidade de caixas precisa ser maior que zero.";
    }

    if (!form.responsavel_id) return "Selecione o responsável.";

    const saldo = Number(saldoSelecionado?.saldo_disponivel_caixas || 0);

    if (saldo <= 0) {
      return "Não existe saldo disponível para esta Área / Pivô e calibre.";
    }

    if (Number(form.quantidade_caixas) > saldo) {
      return `Estoque insuficiente nesta área. Saldo disponível: ${saldo} caixas.`;
    }

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

      if (editandoId) {
        await editarSaidaVenda(editandoId, form);
        setSucesso("Saída/Venda atualizada com sucesso.");
      } else {
        await cadastrarSaidaVenda(form);
        setSucesso("Saída/Venda cadastrada com sucesso.");
      }

      setEditandoId(null);
      setSaldoSelecionado(null);

      setForm({
        ...FORM_INICIAL,
        data_saida: obterDataAtual(),
        hora: obterHoraAtual(),
      });

      await carregarDados();
    } catch (error) {
      console.error("Erro ao salvar saída/venda:", error);
      setErro(error.message || "Não foi possível salvar a saída/venda.");
    } finally {
      setSalvando(false);
    }
  }

  async function iniciarEdicao(registro) {
    setEditandoId(registro.id);

    const novoForm = {
      data_saida: registro.data_saida || obterDataAtual(),
      hora: registro.hora ? registro.hora.slice(0, 5) : obterHoraAtual(),
      area_id: registro.area_id || "",
      cliente: registro.cliente || "",
      numero_pedido: registro.numero_pedido || "",
      calibre_id: registro.calibre_id || "",
      quantidade_caixas: String(registro.quantidade_caixas || ""),
      responsavel_id: registro.responsavel_id || "",
      observacao: registro.observacao || "",
    };

    setForm(novoForm);

    await atualizarSaldo(novoForm.area_id, novoForm.calibre_id);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setSaldoSelecionado(null);

    setForm({
      ...FORM_INICIAL,
      data_saida: obterDataAtual(),
      hora: obterHoraAtual(),
    });
  }

  async function removerRegistro(registro) {
    const confirmar = window.confirm(
      `Deseja excluir esta saída de ${registro.quantidade_caixas} caixas? O estoque da área voltará automaticamente.`
    );

    if (!confirmar) return;

    try {
      setExcluindoId(registro.id);
      setErro("");
      setSucesso("");

      await excluirSaidaVenda(registro.id);

      setSucesso("Saída/Venda excluída com sucesso.");

      if (editandoId === registro.id) {
        cancelarEdicao();
      }

      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível excluir a saída/venda.");
    } finally {
      setExcluindoId(null);
    }
  }

  const columns = [
    {
      key: "data_saida",
      label: "Data",
      render: (value) => formatarData(value),
    },
    {
      key: "hora",
      label: "Hora",
      render: (value) => formatarHora(value),
    },
    {
      key: "areas_fazenda",
      label: "Área / Pivô",
      render: (value) => value?.nome || "-",
    },
    {
      key: "cliente",
      label: "Cliente",
      render: (value) => value || "-",
    },
    {
      key: "numero_pedido",
      label: "Pedido/Carga",
      render: (value) => value || "-",
    },
    {
      key: "calibres",
      label: "Calibre",
      render: (value) => (value ? `${value.codigo} — ${value.nome}` : "-"),
    },
    {
      key: "quantidade_caixas",
      label: "Caixas",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "peso_total_kg",
      label: "Peso",
      render: (value) => formatarKg(value),
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
            disabled={salvando || excluindoId === row.id}
            onClick={() => iniciarEdicao(row)}
          >
            <Edit size={16} />
            Editar
          </Button>

          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={salvando || excluindoId === row.id}
            onClick={() => removerRegistro(row)}
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
          title="Saídas"
          value={formatarNumero(resumo.totalRegistros)}
          description="Registros cadastrados"
          icon={Truck}
          variant="info"
        />

        <KpiCard
          title="Caixas expedidas"
          value={formatarNumero(resumo.totalCaixas)}
          description="Total de caixas"
          icon={PackageCheck}
          variant="warning"
        />

        <KpiCard
          title="Peso expedido"
          value={formatarKg(resumo.pesoTotalKg)}
          description="Peso total"
          icon={Scale}
          variant="warning"
        />

        <KpiCard
          title="Áreas com saída"
          value={formatarNumero(resumo.areasComSaida)}
          description="Áreas movimentadas"
          icon={MapPinned}
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              {editandoId ? "Editar saída / venda" : "Nova saída / venda"}
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              A saída baixa o estoque da Área / Pivô e calibre selecionados.
            </p>
          </div>

          {editandoId && <Badge variant="warning">Editando</Badge>}
        </div>

        <form onSubmit={salvarRegistro}>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="Data da saída"
              name="data_saida"
              type="date"
              value={form.data_saida}
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
              label="Área / Pivô"
              name="area_id"
              value={form.area_id}
              onChange={atualizarCampo}
              options={areaOptions}
              placeholder="Selecione a Área / Pivô"
            />

            <Select
              label="Calibre"
              name="calibre_id"
              value={form.calibre_id}
              onChange={atualizarCampo}
              options={calibreOptions}
              placeholder={
                form.area_id
                  ? "Selecione o calibre disponível nesta área"
                  : "Selecione a área primeiro"
              }
            />

            <Input
              label="Cliente"
              name="cliente"
              value={form.cliente}
              onChange={atualizarCampo}
              placeholder="Nome do cliente"
            />

            <Input
              label="Pedido / Carga"
              name="numero_pedido"
              value={form.numero_pedido}
              onChange={atualizarCampo}
              placeholder="Ex: Pedido 120, Carga 03..."
            />

            <Input
              label="Quantidade de caixas"
              name="quantidade_caixas"
              type="number"
              value={form.quantidade_caixas}
              onChange={atualizarCampo}
            />

            <Input
              label="Peso total calculado"
              name="peso_total_calculado"
              value={formatarKg(pesoTotalCalculado)}
              disabled
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
              {saldoSelecionado ? (
                <AlertBox
                  variant="info"
                  title="Saldo disponível nesta área"
                  description={`${saldoSelecionado.area_nome} / ${saldoSelecionado.calibre_codigo} — ${saldoSelecionado.calibre_nome}: ${formatarNumero(
                    saldoSelecionado.saldo_disponivel_caixas
                  )} caixas disponíveis (${formatarKg(
                    saldoSelecionado.peso_disponivel_kg
                  )}).`}
                />
              ) : (
                <AlertBox
                  variant="warning"
                  title="Selecione Área / Pivô e calibre"
                  description="O sistema vai mostrar o saldo disponível antes de salvar a saída."
                />
              )}
            </div>

            <div className="md:col-span-2">
              <Textarea
                label="Observação"
                name="observacao"
                value={form.observacao}
                onChange={atualizarCampo}
                placeholder="Observações sobre a saída..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
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
                  ? "Salvar alterações"
                  : "Salvar saída"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Saídas registradas
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Histórico de saídas com Área / Pivô vinculada.
            </p>
          </div>

          <Badge variant="info">
            {carregando
              ? "Carregando"
              : `${formatarNumero(saidas.length)} registros`}
          </Badge>
        </div>

        {carregando ? (
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-slate-50 p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Carregando saídas...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={saidas}
            emptyMessage="Nenhuma saída cadastrada."
          />
        )}
      </Card>
    </div>
  );
}

export default SaidaVenda;