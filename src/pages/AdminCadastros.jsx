import { useEffect, useMemo, useState } from "react";

// Padarias + Rotas
import {
  listarPadarias,
  criarPadaria,
  listarRotasPadaria,
  criarRota,
} from "../services/padariaService";

// Usuários
import {
  criarUsuario,
  listarUsuarios,
  excluirUsuario,
  atualizarUsuario,
} from "../services/usuarioService";

// Clientes
import {
  criarCliente,
  listarClientes,
  atualizarCliente,
  excluirCliente,
} from "../services/clienteService";

// Produtos
import {
  listarProdutos,
  criarProduto,
  atualizarProduto,
  excluirProduto,
} from "../services/produtoService";

const DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
const rotuloDia = {
  seg: "Seg",
  ter: "Ter",
  qua: "Qua",
  qui: "Qui",
  sex: "Sex",
  sab: "Sáb",
  dom: "Dom",
};

export default function AdminCadastros() {
  /* ============== PADARIAS ============== */
  const [padarias, setPadarias] = useState([]);
  const [loadingPads, setLoadingPads] = useState(true);

  const [pNome, setPNome] = useState("");
  const [pCidade, setPCidade] = useState("");
  const [pAtiva, setPAtiva] = useState(true);
  const [pRotasText, setPRotasText] = useState(""); // "A,B,C"
  const [pSaving, setPSaving] = useState(false);
  const [pErro, setPErro] = useState("");

  /* ============== USUÁRIOS ============== */
  const [uNome, setUNome] = useState("");
  const [uSenha, setUSenha] = useState("");
  const [uRole, setURole] = useState("entregador");
  const [uPadaria, setUPadaria] = useState("");
  const [uSaving, setUSaving] = useState(false);
  const [uErro, setUErro] = useState("");
  const [users, setUsers] = useState([]);
  const [uFiltroPadaria, setUFiltroPadaria] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [mostrarUsuarios, setMostrarUsuarios] = useState(false);
  const [uEdit, setUEdit] = useState(null);

  /* ============== PRODUTOS (seção própria) ============== */
  const [prPadaria, setPrPadaria] = useState("");
  const [prodNome, setProdNome] = useState("");
  const [prodPreco, setProdPreco] = useState("");
  const [prodAtivo, setProdAtivo] = useState(true);
  const [prodSaving, setProdSaving] = useState(false);
  const [prodErro, setProdErro] = useState("");
  const [prodLista, setProdLista] = useState([]);
  const [loadingProdLista, setLoadingProdLista] = useState(false);
  const [mostrarProdutosCadastrados, setMostrarProdutosCadastrados] =
    useState(false);

  /* ============== CLIENTES ============== */
  const [cPadaria, setCPadaria] = useState("");
  const [rotasPadaria, setRotasPadaria] = useState([]);

  // produtos usados na grade de padrão semanal (para a padaria atual do cliente)
  const [produtos, setProdutos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);

  // seleção de produtos para NOVO cliente (evita listar 100 de uma vez)
  const [selectedProds, setSelectedProds] = useState([]);
  const [showProdPicker, setShowProdPicker] = useState(false);
  const [prodSearch, setProdSearch] = useState("");

  // seleção de produtos para EDITAR cliente
  const [selectedProdsEdit, setSelectedProdsEdit] = useState([]);
  const [showProdPickerEdit, setShowProdPickerEdit] = useState(false);
  const [prodSearchEdit, setProdSearchEdit] = useState("");

  const [cNome, setCNome] = useState("");
  const [cEndereco, setCEndereco] = useState("");
  const [cRota, setCRota] = useState("");
  const [cLat, setCLat] = useState("");
  const [cLng, setCLng] = useState("");
  const [cTelefone, setCTelefone] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cObs, setCObs] = useState("");
  const [cInicio, setCInicio] = useState("");
  const [cSaving, setCSaving] = useState(false);
  const [cErro, setCErro] = useState("");
  const [clientes, setClientes] = useState([]);
  const [cFiltroPadaria, setCFiltroPadaria] = useState("");
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [cEdit, setCEdit] = useState(null);

  // Matriz Produto × Dia (novo)
  const [matriz, setMatriz] = useState({});
  // Matriz Produto × Dia (edição)
  const [matrizEdit, setMatrizEdit] = useState({});

  /* ============= BOOT: carrega padarias ============= */
  useEffect(() => {
    (async () => {
      setLoadingPads(true);
      try {
        const ps = await listarPadarias();
        setPadarias(ps);
        const first = ps[0]?._id || "";
        setUPadaria((v) => v || first);
        setCPadaria((v) => v || first);
        setUFiltroPadaria((v) => v || first);
        setCFiltroPadaria((v) => v || first);
        setPrPadaria((v) => v || first);
      } catch (e) {
        console.error("listarPadarias:", e);
      } finally {
        setLoadingPads(false);
      }
    })();
  }, []);

  /* ============= PADARIA: criar + rotas ============= */
  async function onCriarPadaria(e) {
    e.preventDefault();
    setPErro("");
    if (!pNome.trim() || !pCidade.trim()) {
      setPErro("Preencha nome e cidade.");
      return;
    }
    try {
      setPSaving(true);
      const nova = await criarPadaria({
        nome: pNome.trim(),
        cidade: pCidade.trim(),
        ativa: !!pAtiva,
      });

      const nomes = pRotasText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const nome of nomes) {
        await criarRota({ padaria: nova._id, nome, ativa: true });
      }

      setPadarias((prev) => [nova, ...prev]);
      if (!uPadaria) setUPadaria(nova._id);
      if (!cPadaria) setCPadaria(nova._id);
      if (!uFiltroPadaria) setUFiltroPadaria(nova._id);
      if (!cFiltroPadaria) setCFiltroPadaria(nova._id);
      if (!prPadaria) setPrPadaria(nova._id);

      setPNome("");
      setPCidade("");
      setPAtiva(true);
      setPRotasText("");
      alert("Padaria criada com sucesso!");
    } catch (e) {
      console.error(e);
      setPErro(e?.response?.data?.mensagem || "Falha ao criar padaria.");
    } finally {
      setPSaving(false);
    }
  }

  /* ============= USUÁRIOS: listar/criar/editar/excluir ============= */
  async function reloadUsers() {
    setLoadingUsers(true);
    try {
      const params = {};
      if (uFiltroPadaria) params.padaria = uFiltroPadaria;
      const us = await listarUsuarios(params);
      setUsers(Array.isArray(us) ? us : []);
    } catch (e) {
      console.error("listarUsuarios:", e);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }
  useEffect(() => {
    if (padarias.length) reloadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uFiltroPadaria, padarias.length]);

  async function onCriarUsuario(e) {
    e.preventDefault();
    setUErro("");
    if (!uNome.trim() || !uSenha.trim() || !uRole) {
      setUErro("Preencha nome, senha e cargo.");
      return;
    }
    if (uRole !== "admin" && !uPadaria) {
      setUErro("Selecione a padaria para gerente/entregador.");
      return;
    }
    try {
      setUSaving(true);
      await criarUsuario({
        nome: uNome.trim(),
        senha: uSenha.trim(),
        role: uRole,
        ...(uRole !== "admin" ? { padaria: uPadaria } : {}),
      });
      setUNome("");
      setUSenha("");
      await reloadUsers();
      alert("Usuário criado com sucesso!");
    } catch (e) {
      console.error(e);
      setUErro(e?.response?.data?.mensagem || "Falha ao criar usuário.");
    } finally {
      setUSaving(false);
    }
  }

  async function onExcluirUsuario(id) {
    if (!window.confirm("Deseja realmente excluir este usuário?")) return;
    try {
      await excluirUsuario(id);
      await reloadUsers();
    } catch (e) {
      alert(e?.response?.data?.mensagem || "Falha ao excluir usuário.");
    }
  }

  async function onSalvarUsuarioEditado() {
    if (!uEdit) return;
    try {
      await atualizarUsuario(uEdit._id, {
        nome: uEdit.nome,
        role: uEdit.role,
        ativo: !!uEdit.ativo,
      });
      setUEdit(null);
      await reloadUsers();
    } catch (e) {
      alert(e?.response?.data?.mensagem || "Falha ao salvar usuário.");
    }
  }

  /* ============= PRODUTOS (seção própria) ============= */
  async function reloadProdLista() {
    if (!prPadaria) return;
    setLoadingProdLista(true);
    try {
      const list = await listarProdutos({ padaria: prPadaria });
      setProdLista(Array.isArray(list) ? list : []);
    } catch {
      setProdLista([]);
    } finally {
      setLoadingProdLista(false);
    }
  }
  useEffect(() => {
    if (padarias.length) reloadProdLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prPadaria, padarias.length]);

  async function onCriarProduto(e) {
    e.preventDefault();
    setProdErro("");

    if (!prPadaria || !prodNome.trim()) {
      setProdErro("Informe a padaria e o nome do produto.");
      return;
    }

    // ZERO-MOD 2025-09-10: preço obrigatório + aceita vírgula
    const precoNum = parseFloat(String(prodPreco).replace(",", "."));
    if (!Number.isFinite(precoNum) || precoNum <= 0) {
      setProdErro("Informe um preço válido (ex.: 0.63).");
      return;
    }

    try {
      setProdSaving(true);
      await criarProduto({
        padaria: prPadaria,
        nome: prodNome.trim(),
        preco: +precoNum.toFixed(2), // arredonda para 2 casas (número)
        ativo: !!prodAtivo,
      });

      setProdNome("");
      setProdPreco("");
      setProdAtivo(true);

      await reloadProdLista();
      if (prPadaria === cPadaria) await reloadProdutosPadaria();
      alert("Produto criado!");
    } catch (e) {
      console.error(e);
      setProdErro(e?.response?.data?.mensagem || "Falha ao criar produto.");
    } finally {
      setProdSaving(false);
    }
  }

  async function onExcluirProduto(id) {
    if (!window.confirm("Excluir produto?")) return;
    try {
      await excluirProduto(id);
      await reloadProdLista();
      if (prPadaria === cPadaria) await reloadProdutosPadaria();
    } catch (e) {
      alert(e?.response?.data?.mensagem || "Falha ao excluir produto.");
    }
  }

  /* ============= CLIENTES: listar/criar/editar/excluir ============= */
  async function reloadClientes() {
    setLoadingClientes(true);
    try {
      const params = {};
      if (cFiltroPadaria) params.padaria = cFiltroPadaria;
      const cs = await listarClientes(params);
      setClientes(Array.isArray(cs) ? cs : []);
    } catch (e) {
      console.error("listarClientes:", e);
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  }
  useEffect(() => {
    if (padarias.length) reloadClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cFiltroPadaria, padarias.length]);

  // Carrega rotas + produtos da padaria (usados na área de clientes)
  // ZERO-MOD 2025-09-10: não deixar produtos zerarem se rotas falharem
  async function reloadProdutosPadaria() {
    if (!cPadaria) return;
    setLoadingProdutos(true);
    try {
      // rotas: erro não bloqueia produtos
      try {
        const rs = await listarRotasPadaria(cPadaria);
        setRotasPadaria(rs);
      } catch (e) {
        console.warn("listarRotasPadaria falhou:", e?.response?.status || e);
        setRotasPadaria([]);
      }

      // produtos: sempre tentar carregar
      let ps = [];
      try {
        ps = await listarProdutos({ padaria: cPadaria });
      } catch (e) {
        console.error("listarProdutos falhou:", e);
        ps = [];
      }
      const arr = Array.isArray(ps) ? ps : [];
      setProdutos(arr);

      // reconstroi a matriz para os produtos disponíveis
      const init = {};
      for (const p of arr)
        init[p._id] = DIAS.reduce((a, d) => ((a[d] = 0), a), {});
      setMatriz(init);
      setSelectedProds([]);
    } finally {
      setLoadingProdutos(false);
    }
  }

  useEffect(() => {
    reloadProdutosPadaria();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cPadaria]);

  function compilarPedidoSemanal(fromMatriz, selected) {
    const pedido = {};
    for (const d of DIAS) pedido[d] = [];
    for (const p of produtos) {
      if (!selected.includes(p._id)) continue;
      const linha = fromMatriz[p._id] || {};
      for (const d of DIAS) {
        const qtd = Number(linha[d] || 0);
        if (qtd > 0) pedido[d].push({ produto: p._id, quantidade: qtd });
      }
    }
    return pedido;
  }

  async function onCriarCliente(e) {
    e.preventDefault();
    setCErro("");
    if (!cPadaria || !cNome.trim() || !cEndereco.trim() || !cRota.trim()) {
      setCErro("Padaria, nome, endereço e rota são obrigatórios.");
      return;
    }
    const lat = Number(cLat),
      lng = Number(cLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setCErro("Latitude e longitude são obrigatórias e devem ser numéricas.");
      return;
    }
    if (selectedProds.length === 0) {
      setCErro("Selecione ao menos um produto para o padrão semanal.");
      return;
    }
    try {
      setCSaving(true);
      const pedidoSemanal = compilarPedidoSemanal(matriz, selectedProds);
      await criarCliente({
        padaria: cPadaria,
        nome: cNome.trim(),
        endereco: cEndereco.trim(),
        rota: cRota.trim().toUpperCase(),
        location: { lat, lng },
        ...(cTelefone ? { telefone: cTelefone.trim() } : {}),
        ...(cEmail ? { email: cEmail.trim().toLowerCase() } : {}),
        ...(cObs ? { observacoes: cObs.trim() } : {}),
        ...(cInicio ? { inicioCicloFaturamento: cInicio } : {}),
        pedidoSemanal,
      });
      // limpa form
      setCNome("");
      setCEndereco("");
      setCRota("");
      setCLat("");
      setCLng("");
      setCTelefone("");
      setCEmail("");
      setCObs("");
      setCInicio("");
      // zera quantidades dos selecionados
      setMatriz((prev) => {
        const copy = { ...prev };
        for (const id of selectedProds) {
          for (const d of DIAS) copy[id][d] = 0;
        }
        return copy;
      });
      setSelectedProds([]);
      await reloadClientes();
      alert("Cliente criado com sucesso!");
    } catch (e) {
      console.error(e);
      setCErro(e?.response?.data?.erro || "Falha ao criar cliente.");
    } finally {
      setCSaving(false);
    }
  }

  function prepararMatrizEditFromCliente(cli) {
    const base = {};
    for (const p of produtos)
      base[p._id] = DIAS.reduce((a, d) => ((a[d] = 0), a), {});
    const ped = cli?.pedidoSemanal || {};
    for (const d of DIAS) {
      for (const item of ped[d] || []) {
        const { produto, quantidade } = item || {};
        if (produto && base[produto])
          base[produto][d] = Number(quantidade || 0);
      }
    }
    setMatrizEdit(base);

    // pré-seleciona os produtos que já tinham quantidade
    const sel = [];
    for (const p of produtos) {
      const linha = base[p._id];
      const has = DIAS.some((d) => Number(linha?.[d] || 0) > 0);
      if (has) sel.push(p._id);
    }
    setSelectedProdsEdit(sel);
  }

  async function onSalvarClienteEditado() {
    if (!cEdit) return;
    try {
      const pedidoSemanal = compilarPedidoSemanal(
        matrizEdit,
        selectedProdsEdit
      );
      const payload = {
        nome: cEdit.nome,
        endereco: cEdit.endereco,
        rota: cEdit.rota || null,
        telefone: cEdit.telefone || undefined,
        email: cEdit.email || undefined,
        pedidoSemanal,
      };
      await atualizarCliente(cEdit._id, payload);
      setCEdit(null);
      await reloadClientes();
    } catch (e) {
      alert(e?.response?.data?.erro || "Falha ao salvar cliente.");
    }
  }

  async function onExcluirCliente(id) {
    if (!window.confirm("Excluir cliente?")) return;
    try {
      await excluirCliente(id);
      await reloadClientes();
    } catch (e) {
      alert(e?.response?.data?.erro || "Falha ao excluir cliente.");
    }
  }

  /* ============= PROD PICKERS (busca + seleção) ============= */
  const produtosFiltrados = useMemo(() => {
    const q = prodSearch.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter((p) =>
      String(p.nome || p.descricao || p._id)
        .toLowerCase()
        .includes(q)
    );
  }, [produtos, prodSearch]);

  const produtosFiltradosEdit = useMemo(() => {
    const q = prodSearchEdit.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter((p) =>
      String(p.nome || p.descricao || p._id)
        .toLowerCase()
        .includes(q)
    );
  }, [produtos, prodSearchEdit]);

  /* ====================== RENDER ====================== */
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Cadastros (Admin)</h1>

      {/* ===== PADARIAS ===== */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Padarias</h2>
          <div className="text-sm text-gray-500">
            {loadingPads ? "Carregando…" : `${padarias.length} cadastrada(s)`}
          </div>
        </div>

        <form
          onSubmit={onCriarPadaria}
          className="grid md:grid-cols-6 gap-2 mb-2"
        >
          <input
            className="border rounded px-2 py-1 md:col-span-2"
            placeholder="Nome da padaria"
            value={pNome}
            onChange={(e) => setPNome(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1 md:col-span-2"
            placeholder="Cidade"
            value={pCidade}
            onChange={(e) => setPCidade(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="Rotas (A,B,C...)"
            value={pRotasText}
            onChange={(e) => setPRotasText(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pAtiva}
                onChange={(e) => setPAtiva(e.target.checked)}
              />
              Ativa
            </label>
            <button
              className="px-3 py-1 rounded bg-indigo-600 text-white disabled:opacity-60"
              disabled={pSaving}
            >
              {pSaving ? "Salvando..." : "Criar padaria"}
            </button>
          </div>
        </form>
        {pErro && <div className="text-red-600 text-sm mb-3">{pErro}</div>}
        <p className="text-xs text-gray-500">
          * Gestão (ativar/desativar/deletar/editar) permanece na página
          “Padarias Cadastradas”.
        </p>
      </section>

      {/* DIVISÓRIA GRANDE */}
      <div className="my-8 border-t-4 border-gray-300 rounded" />

      {/* ===== USUÁRIOS ===== */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Usuários</h2>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-500">Filtrar por padaria</span>
            <select
              value={uFiltroPadaria}
              onChange={(e) => setUFiltroPadaria(e.target.value)}
              className="border rounded px-2 py-1"
            >
              {padarias.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.nome || p.razaoSocial || p._id}
                </option>
              ))}
            </select>
            <button onClick={reloadUsers} className="px-3 py-1 border rounded">
              Atualizar
            </button>
            <button
              className="px-3 py-1 border rounded"
              onClick={() => setMostrarUsuarios((s) => !s)}
            >
              {mostrarUsuarios
                ? "Ocultar usuários"
                : `Mostrar usuários cadastrados (${users.length})`}
            </button>
          </div>
        </div>

        <form
          onSubmit={onCriarUsuario}
          className="grid md:grid-cols-5 gap-2 mb-3"
        >
          <input
            className="border rounded px-2 py-1"
            placeholder="Nome"
            value={uNome}
            onChange={(e) => setUNome(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="Senha"
            type="password"
            value={uSenha}
            onChange={(e) => setUSenha(e.target.value)}
          />
          <select
            className="border rounded px-2 py-1"
            value={uRole}
            onChange={(e) => setURole(e.target.value)}
          >
            <option value="entregador">Entregador</option>
            <option value="gerente">Gerente</option>
            <option value="atendente">Atendente</option>
            <option value="admin">Admin</option>
          </select>
          {uRole !== "admin" ? (
            <select
              className="border rounded px-2 py-1"
              value={uPadaria}
              onChange={(e) => setUPadaria(e.target.value)}
            >
              {padarias.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.nome || p.razaoSocial || p._id}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="border rounded px-2 py-1 bg-gray-100"
              value="—"
              readOnly
            />
          )}
          <button
            className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
            disabled={uSaving}
          >
            {uSaving ? "Salvando..." : "Criar usuário"}
          </button>
        </form>
        {uErro && <div className="text-red-600 text-sm mb-3">{uErro}</div>}

        {mostrarUsuarios && (
          <div className="overflow-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Nome</th>
                  <th className="text-left p-2">Cargo</th>
                  <th className="text-left p-2">Padaria</th>
                  <th className="text-left p-2">Ativo</th>
                  <th className="text-left p-2 w-40">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr>
                    <td className="p-2" colSpan={5}>
                      Carregando…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="p-2" colSpan={5}>
                      Sem usuários.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u._id} className="border-t">
                      <td className="p-2">{u.nome}</td>
                      <td className="p-2 capitalize">{u.role}</td>
                      <td className="p-2">{u.padaria || "—"}</td>
                      <td className="p-2">{u.ativo ? "Sim" : "Não"}</td>
                      <td className="p-2 flex gap-2">
                        <button
                          className="px-2 py-1 border rounded"
                          onClick={() => setUEdit({ ...u })}
                        >
                          Editar
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-red-600 text-white"
                          onClick={() => onExcluirUsuario(u._id)}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* DIVISÓRIA GRANDE */}
      <div className="my-8 border-t-4 border-gray-300 rounded" />

      {/* ===== PRODUTOS ===== */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Produtos</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filtrar por padaria</span>
            <select
              className="border rounded px-2 py-1"
              value={prPadaria}
              onChange={(e) => setPrPadaria(e.target.value)}
            >
              {padarias.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.nome || p.razaoSocial || p._id}
                </option>
              ))}
            </select>
            <button
              className="px-3 py-1 border rounded"
              onClick={reloadProdLista}
            >
              Atualizar
            </button>
            <button
              className="px-3 py-1 border rounded"
              onClick={() => setMostrarProdutosCadastrados((s) => !s)}
            >
              {mostrarProdutosCadastrados
                ? "Ocultar produtos"
                : `Mostrar produtos cadastrados (${prodLista.length})`}
            </button>
          </div>
        </div>

        <form
          onSubmit={onCriarProduto}
          className="grid md:grid-cols-5 gap-2 mb-2"
        >
          <select
            className="border rounded px-2 py-1"
            value={prPadaria}
            onChange={(e) => setPrPadaria(e.target.value)}
          >
            {padarias.map((p) => (
              <option key={p._id} value={p._id}>
                {p.nome || p.razaoSocial || p._id}
              </option>
            ))}
          </select>
          <input
            className="border rounded px-2 py-1"
            placeholder="Nome do produto"
            value={prodNome}
            onChange={(e) => setProdNome(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="Preço"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={prodPreco}
            onChange={(e) => setProdPreco(e.target.value)}
          />

          <label className="flex items-center gap-2 text-sm px-2">
            <input
              type="checkbox"
              checked={prodAtivo}
              onChange={(e) => setProdAtivo(e.target.checked)}
            />
            Ativo
          </label>
          <button
            className="px-3 py-1 rounded bg-emerald-600 text-white disabled:opacity-60"
            disabled={prodSaving}
          >
            {prodSaving ? "Salvando..." : "Criar produto"}
          </button>
        </form>
        {prodErro && (
          <div className="text-red-600 text-sm mb-3">{prodErro}</div>
        )}

        {mostrarProdutosCadastrados && (
          <div className="overflow-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Nome</th>
                  <th className="text-left p-2">Preço</th>
                  <th className="text-left p-2">Ativo</th>
                  <th className="text-left p-2 w-32">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingProdLista ? (
                  <tr>
                    <td className="p-2" colSpan={4}>
                      Carregando…
                    </td>
                  </tr>
                ) : prodLista.length === 0 ? (
                  <tr>
                    <td className="p-2" colSpan={4}>
                      Sem produtos.
                    </td>
                  </tr>
                ) : (
                  prodLista.map((p) => (
                    <tr key={p._id} className="border-t">
                      <td className="p-2">{p.nome}</td>
                      <td className="p-2">{p.preco ?? "—"}</td>
                      <td className="p-2">{p.ativo ? "Sim" : "Não"}</td>
                      <td className="p-2 flex gap-2">
                        {/* edição simples: alterna ativo */}
                        <button
                          className="px-2 py-1 border rounded"
                          onClick={async () => {
                            await atualizarProduto(p._id, { ativo: !p.ativo });
                            await reloadProdLista();
                            if (prPadaria === cPadaria)
                              await reloadProdutosPadaria();
                          }}
                        >
                          {p.ativo ? "Desativar" : "Ativar"}
                        </button>
                        <button
                          className="px-2 py-1 bg-red-600 text-white rounded"
                          onClick={() => onExcluirProduto(p._id)}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* DIVISÓRIA GRANDE */}
      <div className="my-8 border-t-4 border-gray-300 rounded" />

      {/* ===== CLIENTES ===== */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Clientes</h2>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-500">Filtrar por padaria</span>
            <select
              value={cFiltroPadaria}
              onChange={(e) => setCFiltroPadaria(e.target.value)}
              className="border rounded px-2 py-1"
            >
              {padarias.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.nome || p.razaoSocial || p._id}
                </option>
              ))}
            </select>
            <button
              onClick={reloadClientes}
              className="px-3 py-1 border rounded"
            >
              Atualizar
            </button>
            <button
              className="px-3 py-1 border rounded"
              onClick={() => setMostrarClientes((s) => !s)}
            >
              {mostrarClientes
                ? "Ocultar clientes"
                : `Mostrar clientes (${clientes.length})`}
            </button>
          </div>
        </div>

        {/* Form novo cliente */}
        <form
          onSubmit={onCriarCliente}
          className="grid md:grid-cols-3 gap-2 mb-3"
        >
          <select
            className="border rounded px-2 py-1"
            value={cPadaria}
            onChange={(e) => setCPadaria(e.target.value)}
          >
            {padarias.map((p) => (
              <option key={p._id} value={p._id}>
                {p.nome || p.razaoSocial || p._id}
              </option>
            ))}
          </select>
          <input
            className="border rounded px-2 py-1"
            placeholder="Nome"
            value={cNome}
            onChange={(e) => setCNome(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="Endereço"
            value={cEndereco}
            onChange={(e) => setCEndereco(e.target.value)}
          />

          <select
            className="border rounded px-2 py-1"
            value={cRota}
            onChange={(e) => setCRota(e.target.value)}
          >
            <option value="">— Selecione a rota —</option>
            {rotasPadaria.map((r) => (
              <option key={r._id} value={r.nome}>
                {r.nome}
              </option>
            ))}
          </select>

          <input
            className="border rounded px-2 py-1"
            placeholder="Latitude"
            value={cLat}
            onChange={(e) => setCLat(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="Longitude"
            value={cLng}
            onChange={(e) => setCLng(e.target.value)}
          />

          <input
            className="border rounded px-2 py-1"
            placeholder="Telefone (opcional)"
            value={cTelefone}
            onChange={(e) => setCTelefone(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="E-mail (opcional)"
            value={cEmail}
            onChange={(e) => setCEmail(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1"
            type="date"
            value={cInicio}
            onChange={(e) => setCInicio(e.target.value)}
          />

          <textarea
            className="border rounded px-2 py-1 md:col-span-3"
            placeholder="Observações (opcional)"
            value={cObs}
            onChange={(e) => setCObs(e.target.value)}
          />
        </form>

        {/* Padrão semanal: barra de topo */}
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Padrão semanal</div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded border"
              onClick={() => setShowProdPicker(true)}
            >
              Produtos ({selectedProds.length})
            </button>
            <div className="text-xs text-gray-500 hidden md:block">
              Selecione os produtos e defina as quantidades por dia.
            </div>
          </div>
        </div>

        {/* Tabela Produto × Dia (apenas selecionados) */}
        {loadingProdutos ? (
          <div className="text-sm text-gray-500 mb-3">Carregando produtos…</div>
        ) : selectedProds.length === 0 ? (
          <div className="text-sm text-gray-500 mb-3">
            Nenhum produto selecionado. Clique no botão{" "}
            <strong>Produtos</strong> para escolher.
          </div>
        ) : (
          <div className="overflow-auto border rounded mb-3">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Produto</th>
                  {DIAS.map((d) => (
                    <th key={d} className="p-2 text-center">
                      {rotuloDia[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {produtos
                  .filter((p) => selectedProds.includes(p._id))
                  .map((p) => (
                    <tr key={p._id} className="border-t">
                      <td className="p-2">{p.nome || p.descricao || p._id}</td>
                      {DIAS.map((d) => (
                        <td key={d} className="p-2 text-center">
                          <input
                            type="number"
                            min={0}
                            className="w-20 border rounded px-2 py-1 text-center"
                            value={matriz?.[p._id]?.[d] ?? 0}
                            onChange={(e) => {
                              const val = Math.max(
                                0,
                                Number(e.target.value || 0)
                              );
                              setMatriz((prev) => {
                                const linha = { ...(prev[p._id] || {}) };
                                linha[d] = val;
                                return { ...prev, [p._id]: linha };
                              });
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={onCriarCliente}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
          disabled={cSaving}
        >
          {cSaving ? "Salvando..." : "Criar cliente"}
        </button>
        {cErro && <div className="text-red-600 text-sm mt-2">{cErro}</div>}

        {/* Lista de clientes recolhível */}
        {mostrarClientes && (
          <div className="mt-6 overflow-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Nome</th>
                  <th className="text-left p-2">Rota</th>
                  <th className="text-left p-2">Endereço</th>
                  <th className="text-left p-2">Telefone</th>
                  <th className="text-left p-2 w-40">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingClientes ? (
                  <tr>
                    <td className="p-2" colSpan={5}>
                      Carregando…
                    </td>
                  </tr>
                ) : clientes.length === 0 ? (
                  <tr>
                    <td className="p-2" colSpan={5}>
                      Sem clientes.
                    </td>
                  </tr>
                ) : (
                  clientes.map((c) => (
                    <tr key={c._id} className="border-t">
                      <td className="p-2">{c.nome}</td>
                      <td className="p-2">{c.rota || "—"}</td>
                      <td className="p-2">{c.endereco}</td>
                      <td className="p-2">{c.telefone || "—"}</td>
                      <td className="p-2 flex gap-2">
                        <button
                          className="px-2 py-1 border rounded"
                          onClick={() => {
                            setCEdit({ ...c });
                            prepararMatrizEditFromCliente(c);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="px-2 py-1 bg-red-600 text-white rounded"
                          onClick={() => onExcluirCliente(c._id)}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3">
          <button
            className="px-3 py-1 border rounded"
            onClick={() => setMostrarClientes((s) => !s)}
          >
            {mostrarClientes
              ? "Ocultar clientes"
              : `Mostrar clientes (${clientes.length})`}
          </button>
        </div>
      </section>

      {/* ===== MODAIS ===== */}

      {/* Editar usuário */}
      {uEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded p-4 w-[min(520px,92vw)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Editar usuário</h3>
              <button
                className="px-3 py-1 border rounded"
                onClick={() => setUEdit(null)}
              >
                Fechar
              </button>
            </div>
            <div className="grid gap-2">
              <input
                className="border rounded px-2 py-1"
                value={uEdit.nome}
                onChange={(e) =>
                  setUEdit((s) => ({ ...s, nome: e.target.value }))
                }
              />
              <select
                className="border rounded px-2 py-1"
                value={uEdit.role}
                onChange={(e) =>
                  setUEdit((s) => ({ ...s, role: e.target.value }))
                }
              >
                <option value="entregador">Entregador</option>
                <option value="gerente">Gerente</option>
                <option value="atendente">Atendente</option>
                <option value="admin">Admin</option>
              </select>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!uEdit.ativo}
                  onChange={(e) =>
                    setUEdit((s) => ({ ...s, ativo: e.target.checked }))
                  }
                />
                Ativo
              </label>
            </div>
            <div className="text-right mt-3">
              <button
                className="px-3 py-1 bg-indigo-600 text-white rounded"
                onClick={onSalvarUsuarioEditado}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editar cliente */}
      {cEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded p-4 w-[min(950px,95vw)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Editar cliente</h3>
              <button
                className="px-3 py-1 border rounded"
                onClick={() => setCEdit(null)}
              >
                Fechar
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-2 mb-3">
              <input
                className="border rounded px-2 py-1"
                value={cEdit.nome}
                onChange={(e) =>
                  setCEdit((s) => ({ ...s, nome: e.target.value }))
                }
              />
              <select
                className="border rounded px-2 py-1"
                value={cEdit.rota || ""}
                onChange={(e) =>
                  setCEdit((s) => ({ ...s, rota: e.target.value }))
                }
              >
                <option value="">— Selecione a rota —</option>
                {rotasPadaria.map((r) => (
                  <option key={r._id} value={r.nome}>
                    {r.nome}
                  </option>
                ))}
              </select>
              <input
                className="border rounded px-2 py-1 md:col-span-2"
                value={cEdit.endereco}
                onChange={(e) =>
                  setCEdit((s) => ({ ...s, endereco: e.target.value }))
                }
              />
              <input
                className="border rounded px-2 py-1"
                value={cEdit.telefone || ""}
                onChange={(e) =>
                  setCEdit((s) => ({ ...s, telefone: e.target.value }))
                }
              />
              <input
                className="border rounded px-2 py-1"
                value={cEdit.email || ""}
                onChange={(e) =>
                  setCEdit((s) => ({ ...s, email: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Padrão semanal</div>
              <button
                className="px-3 py-1 rounded border"
                onClick={() => setShowProdPickerEdit(true)}
              >
                Produtos ({selectedProdsEdit.length})
              </button>
            </div>

            {selectedProdsEdit.length === 0 ? (
              <div className="text-sm text-gray-500 mb-3">
                Nenhum produto selecionado. Clique em <strong>Produtos</strong>{" "}
                para escolher.
              </div>
            ) : (
              <div className="overflow-auto border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Produto</th>
                      {DIAS.map((d) => (
                        <th key={d} className="p-2 text-center">
                          {rotuloDia[d]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {produtos
                      .filter((p) => selectedProdsEdit.includes(p._id))
                      .map((p) => (
                        <tr key={p._id} className="border-t">
                          <td className="p-2">
                            {p.nome || p.descricao || p._id}
                          </td>
                          {DIAS.map((d) => (
                            <td key={d} className="p-2 text-center">
                              <input
                                type="number"
                                min={0}
                                className="w-20 border rounded px-2 py-1 text-center"
                                value={matrizEdit?.[p._id]?.[d] ?? 0}
                                onChange={(e) => {
                                  const val = Math.max(
                                    0,
                                    Number(e.target.value || 0)
                                  );
                                  setMatrizEdit((prev) => {
                                    const linha = { ...(prev[p._id] || {}) };
                                    linha[d] = val;
                                    return { ...prev, [p._id]: linha };
                                  });
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="text-right mt-3">
              <button
                className="px-3 py-1 bg-indigo-600 text-white rounded"
                onClick={onSalvarClienteEditado}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== PROD PICKER – NOVO ====== */}
      {showProdPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded p-4 w-[min(700px,95vw)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Selecionar produtos</h3>
              <button
                className="px-3 py-1 border rounded"
                onClick={() => setShowProdPicker(false)}
              >
                Fechar
              </button>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <input
                className="border rounded px-2 py-1 flex-1"
                placeholder="Buscar produto…"
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
              />
              <button
                className="px-2 py-1 border rounded"
                onClick={() => {
                  const ids = produtosFiltrados.map((p) => p._id);
                  // alterna seleção: se todos filtrados já estão, desmarca; senão, marca todos
                  const allSelected = ids.every((id) =>
                    selectedProds.includes(id)
                  );
                  setSelectedProds((prev) =>
                    allSelected
                      ? prev.filter((id) => !ids.includes(id))
                      : Array.from(new Set([...prev, ...ids]))
                  );
                }}
              >
                Selecionar/Desmarcar filtrados
              </button>
            </div>

            <div className="max-h-[50vh] overflow-auto border rounded">
              {produtosFiltrados.map((p) => (
                <label
                  key={p._id}
                  className="flex items-center gap-2 p-2 border-b"
                >
                  <input
                    type="checkbox"
                    checked={selectedProds.includes(p._id)}
                    onChange={(e) => {
                      setSelectedProds((prev) =>
                        e.target.checked
                          ? [...prev, p._id]
                          : prev.filter((id) => id !== p._id)
                      );
                    }}
                  />
                  <span>{p.nome || p.descricao || p._id}</span>
                </label>
              ))}
              {produtosFiltrados.length === 0 && (
                <div className="p-4 text-sm text-gray-500">
                  Nenhum produto encontrado.
                </div>
              )}
            </div>

            <div className="text-right mt-3">
              <button
                className="px-3 py-1 bg-indigo-600 text-white rounded"
                onClick={() => setShowProdPicker(false)}
              >
                Concluir ({selectedProds.length} selecionado
                {selectedProds.length === 1 ? "" : "s"})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== PROD PICKER – EDIÇÃO ====== */}
      {showProdPickerEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded p-4 w-[min(700px,95vw)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Selecionar produtos</h3>
              <button
                className="px-3 py-1 border rounded"
                onClick={() => setShowProdPickerEdit(false)}
              >
                Fechar
              </button>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <input
                className="border rounded px-2 py-1 flex-1"
                placeholder="Buscar produto…"
                value={prodSearchEdit}
                onChange={(e) => setProdSearchEdit(e.target.value)}
              />
              <button
                className="px-2 py-1 border rounded"
                onClick={() => {
                  const ids = produtosFiltradosEdit.map((p) => p._id);
                  const allSelected = ids.every((id) =>
                    selectedProdsEdit.includes(id)
                  );
                  setSelectedProdsEdit((prev) =>
                    allSelected
                      ? prev.filter((id) => !ids.includes(id))
                      : Array.from(new Set([...prev, ...ids]))
                  );
                }}
              >
                Selecionar/Desmarcar filtrados
              </button>
            </div>

            <div className="max-h-[50vh] overflow-auto border rounded">
              {produtosFiltradosEdit.map((p) => (
                <label
                  key={p._id}
                  className="flex items-center gap-2 p-2 border-b"
                >
                  <input
                    type="checkbox"
                    checked={selectedProdsEdit.includes(p._id)}
                    onChange={(e) => {
                      setSelectedProdsEdit((prev) =>
                        e.target.checked
                          ? [...prev, p._id]
                          : prev.filter((id) => id !== p._id)
                      );
                    }}
                  />
                  <span>{p.nome || p.descricao || p._id}</span>
                </label>
              ))}
              {produtosFiltradosEdit.length === 0 && (
                <div className="p-4 text-sm text-gray-500">
                  Nenhum produto encontrado.
                </div>
              )}
            </div>

            <div className="text-right mt-3">
              <button
                className="px-3 py-1 bg-indigo-600 text-white rounded"
                onClick={() => setShowProdPickerEdit(false)}
              >
                Concluir ({selectedProdsEdit.length} selecionado
                {selectedProdsEdit.length === 1 ? "" : "s"})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
