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
  CheckCircle,
  Edit,
  PackageCheck,
  Save,
  Scale,
  Trash2,
  X,
} from "lucide-react";

import { listarCalibresAtivos } from "../../services/calibresService";
import { listarResponsaveisAtivos } from "../../services/responsaveisService";
import { buscarConfiguracoes } from "../../services/configuracoesService";
import { listarAreasAtivas } from "../../services/areasFazendaService";

import {
  cadastrarProdutoFinal,
  calcularProdutoFinalPorArea,
  calcularProdutoFinalPorCalibre,
  calcularResumoProdutoFinal,
  editarProdutoFinal,
  excluirProdutoFinal,
  listarProdutoFinal,
} from "../../services/produtoFinalService";

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
  data_registro: "",
  hora: "",
  area_id: "",
  calibre_id: "",
  quantidade_caixas: "",
  peso_por_caixa_kg: "",
  conferido: "sim",
  responsavel_id: "",
  observacao: "",
};

function ProdutoFinal() {
  const [areas, setAreas] = useState([]);
  const [calibres, setCalibres] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [registros, setRegistros] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [editandoId, setEditandoId] = useState(null);
  const [registroParaExcluir, setRegistroParaExcluir] = useState(null);

  const [form, setForm] = useState({
    ...FORM_INICIAL,
    data_registro: obterDataAtual(),
    hora: obterHoraAtual(),
  });

  const areaOptions = useMemo(() => {
    return areas.map((area) => ({
      value: area.id,
      label: `${area.fazendas?.nome || "Fazenda"} — ${area.nome}`,
    }));
  }, [areas]);

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
    return calcularResumoProdutoFinal(registros);
  }, [registros]);

  const produtoPorCalibre = useMemo(() => {
    return calcularProdutoFinalPorCalibre(registros);
  }, [registros]);

  const produtoPorArea = useMemo(() => {
    return calcularProdutoFinalPorArea(registros);
  }, [registros]);

  const pesoTotalCalculado = useMemo(() => {
    return (
      Number(form.quantidade_caixas || 0) *
      Number(form.peso_por_caixa_kg || 0)
    );
  }, [form.quantidade_caixas, form.peso_por_caixa_kg]);

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");
      setSucesso("");

      const [
        areasBanco,
        calibresBanco,
        responsaveisBanco,
        configuracoesBanco,
        registrosBanco,
      ] = await Promise.all([
        listarAreasAtivas(),
        listarCalibresAtivos(),
        listarResponsaveisAtivos(),
        buscarConfiguracoes(),
        listarProdutoFinal(),
      ]);

      const pesoPadrao = configuracoesBanco?.peso_caixa_final_kg || "";

      setAreas(areasBanco || []);
      setCalibres(calibresBanco || []);
      setResponsaveis(responsaveisBanco || []);
      setRegistros(registrosBanco || []);

      setForm((estadoAtual) => ({
        ...estadoAtual,
        peso_por_caixa_kg:
          estadoAtual.peso_por_caixa_kg || String(pesoPadrao || ""),
      }));
    } catch (error) {
      console.error("Erro ao carregar produto final:", error);

      setErro(error.message || "Não foi possível carregar produto final.");
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
    if (!form.data_registro) return "Informe a data do lançamento.";
    if (!form.hora) return "Informe a hora.";
    if (!form.area_id) return "Selecione a Área / Pivô de origem.";
    if (!form.calibre_id) return "Selecione o calibre.";
    if (!form.quantidade_caixas) return "Informe a quantidade de caixas.";

    if (Number(form.quantidade_caixas) <= 0) {
      return "Quantidade de caixas precisa ser maior que zero.";
    }

    if (!form.peso_por_caixa_kg) return "Informe o peso por caixa.";

    if (Number(form.peso_por_caixa_kg) <= 0) {
      return "Peso por caixa precisa ser maior que zero.";
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

      if (editandoId) {
        await editarProdutoFinal(editandoId, form);
        setSucesso("Produto final atualizado com sucesso.");
      } else {
        await cadastrarProdutoFinal(form);
        setSucesso("Produto final cadastrado com sucesso.");
      }

      setEditandoId(null);

      setForm({
        ...FORM_INICIAL,
        data_registro: obterDataAtual(),
        hora: obterHoraAtual(),
        peso_por_caixa_kg: form.peso_por_caixa_kg,
      });

      await carregarDados();
    } catch (error) {
      console.error("Erro ao salvar produto final:", error);
      setErro(error.message || "Não foi possível salvar produto final.");
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(registro) {
    setEditandoId(registro.id);

    setForm({
      data_registro: registro.data_registro || obterDataAtual(),
      hora: registro.hora ? registro.hora.slice(0, 5) : obterHoraAtual(),
      area_id: registro.areas_fazenda?.id || registro.area_id || "",
      calibre_id: registro.calibres?.id || registro.calibre_id || "",
      quantidade_caixas: String(registro.quantidade_caixas || ""),
      peso_por_caixa_kg: String(registro.peso_por_caixa_kg || ""),
      conferido: registro.conferido ? "sim" : "nao",
      responsavel_id: registro.responsaveis?.id || registro.responsavel_id || "",
      observacao: registro.observacao || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelarEdicao() {
    setEditandoId(null);

    setForm({
      ...FORM_INICIAL,
      data_registro: obterDataAtual(),
      hora: obterHoraAtual(),
      peso_por_caixa_kg: form.peso_por_caixa_kg,
    });
  }

  function solicitarExclusao(registro) {
    setRegistroParaExcluir(registro);
    setErro("");
    setSucesso("");
  }

  function cancelarExclusao() {
    if (excluindoId) return;

    setRegistroParaExcluir(null);
  }

  async function confirmarExclusao() {
    if (!registroParaExcluir) return;

    try {
      setErro("");
      setSucesso("");
      setExcluindoId(registroParaExcluir.id);

      await excluirProdutoFinal(registroParaExcluir.id);

      if (editandoId === registroParaExcluir.id) {
        cancelarEdicao();
      }

      setRegistroParaExcluir(null);
      setSucesso("Produto final excluído com sucesso.");

      await carregarDados();
    } catch (error) {
      console.error("Erro ao excluir produto final:", error);
      setErro(error.message || "Não foi possível excluir produto final.");
    } finally {
      setExcluindoId(null);
    }
  }

  const columnsProduto = [
    {
      key: "data_registro",
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
      render: (value) =>
        value
          ? `${value.fazendas?.nome || "Fazenda"} — ${value.nome}`
          : "-",
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
      key: "peso_por_caixa_kg",
      label: "Peso por caixa",
      render: (value) => formatarKg(value),
    },
    {
      key: "peso_total_kg",
      label: "Peso total",
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
    {
      key: "acoes",
      label: "Ações",
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={salvando || excluindoId === row.id}
            onClick={() => iniciarEdicao(row)}
          >
            <Edit size={16} />
            Editar
          </Button>

          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={salvando || excluindoId === row.id}
            onClick={() => solicitarExclusao(row)}
          >
            <Trash2 size={16} />
            {excluindoId === row.id ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      ),
    },
  ];

  const columnsCalibre = [
    {
      key: "calibre_codigo",
      label: "Calibre",
      render: (value, row) => `${value} — ${row.calibre_nome}`,
    },
    {
      key: "total_caixas",
      label: "Caixas",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "peso_total_kg",
      label: "Peso",
      render: (value) => formatarKg(value),
    },
    {
      key: "registros",
      label: "Registros",
      render: (value) => formatarNumero(value),
    },
  ];

  const columnsArea = [
    {
      key: "area_nome",
      label: "Área / Pivô",
      render: (value, row) => (
        <div>
          <p className="font-bold text-[var(--color-text-primary)]">{value}</p>
          <p className="text-xs font-semibold text-[var(--color-text-muted)]">
            {row.fazenda_nome}
          </p>
        </div>
      ),
    },
    {
      key: "total_caixas",
      label: "Caixas",
      render: (value) => `${formatarNumero(value)} caixas`,
    },
    {
      key: "peso_total_kg",
      label: "Peso",
      render: (value) => formatarKg(value),
    },
    {
      key: "registros",
      label: "Registros",
      render: (value) => formatarNumero(value),
    },
  ];

  return (
    <div className="space-y-8">
      <ConfirmModal
        open={Boolean(registroParaExcluir)}
        title="Excluir produto final?"
        description="Essa ação remove o lançamento selecionado e recalcula automaticamente os saldos do estoque."
        confirmLabel="Confirmar exclusão"
        cancelLabel="Cancelar"
        variant="danger"
        loading={Boolean(excluindoId)}
        onCancel={cancelarExclusao}
        onConfirm={confirmarExclusao}
        details={[
          {
            label: "Data",
            value: formatarData(registroParaExcluir?.data_registro),
          },
          {
            label: "Área / Pivô",
            value: registroParaExcluir?.areas_fazenda
              ? `${registroParaExcluir.areas_fazenda.fazendas?.nome || "Fazenda"} — ${registroParaExcluir.areas_fazenda.nome}`
              : "-",
          },
          {
            label: "Calibre",
            value: registroParaExcluir?.calibres
              ? `${registroParaExcluir.calibres.codigo} — ${registroParaExcluir.calibres.nome}`
              : "-",
          },
          {
            label: "Quantidade",
            value: `${formatarNumero(
              registroParaExcluir?.quantidade_caixas
            )} caixas`,
          },
          {
            label: "Peso total",
            value: formatarKg(registroParaExcluir?.peso_total_kg),
          },
        ]}
      />

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Lançamentos"
          value={formatarNumero(resumo.totalRegistros)}
          description="Registros cadastrados"
          icon={PackageCheck}
          variant="info"
        />

        <KpiCard
          title="Caixas finais"
          value={formatarNumero(resumo.totalCaixas)}
          description="Produto final produzido"
          icon={CheckCircle}
          variant="success"
        />

        <KpiCard
          title="Peso final"
          value={formatarKg(resumo.pesoTotalKg)}
          description="Peso total produzido"
          icon={Scale}
          variant="success"
        />

        <KpiCard
          title="Áreas / Pivôs"
          value={formatarNumero(resumo.areasComProdutoFinal)}
          description="Áreas com produto final"
          icon={PackageCheck}
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
              {editandoId ? "Editar produto final" : "Novo produto final"}
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Registre as caixas finais prontas para venda, informando a Área / Pivô de origem.
            </p>
          </div>

          {editandoId && <Badge variant="warning">Editando</Badge>}
        </div>

        <form onSubmit={salvarRegistro}>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="Data do lançamento"
              name="data_registro"
              type="date"
              value={form.data_registro}
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
              label="Área / Pivô de origem"
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
              placeholder="Selecione o calibre"
            />

            <Input
              label="Quantidade de caixas"
              name="quantidade_caixas"
              type="number"
              value={form.quantidade_caixas}
              onChange={atualizarCampo}
            />

            <Input
              label="Peso por caixa em kg"
              name="peso_por_caixa_kg"
              type="number"
              value={form.peso_por_caixa_kg}
              onChange={atualizarCampo}
            />

            <Input
              label="Peso total calculado"
              name="peso_total_calculado"
              value={formatarKg(pesoTotalCalculado)}
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
                placeholder="Observações sobre o produto final..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            {editandoId && (
              <Button
                type="button"
                variant="secondary"
                onClick={cancelarEdicao}
                disabled={salvando}
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
                  : "Salvar produto final"}
            </Button>
          </div>
        </form>
      </Card>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <div className="mb-5">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Produto final por calibre
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Soma das caixas finais por calibre.
            </p>
          </div>

          <DataTable
            columns={columnsCalibre}
            data={produtoPorCalibre}
            emptyMessage="Nenhum produto final por calibre."
          />
        </Card>

        <Card>
          <div className="mb-5">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Produto final por Área / Pivô
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Soma das caixas finais por área de origem.
            </p>
          </div>

          <DataTable
            columns={columnsArea}
            data={produtoPorArea}
            emptyMessage="Nenhum produto final por área."
          />
        </Card>
      </section>

      <Card>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Produtos finais lançados
            </h3>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Registros salvos no banco.
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
            Carregando produto final do banco...
          </div>
        ) : (
          <DataTable
            columns={columnsProduto}
            data={registros}
            emptyMessage="Nenhum produto final cadastrado."
          />
        )}
      </Card>
    </div>
  );
}

export default ProdutoFinal;