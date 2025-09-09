// src/pages/AdminCadastros.jsx
import { useEffect, useMemo, useState } from "react";
import { listarPadarias } from "../services/padariaService";
import {
  criarUsuario,
  listarUsuarios,
  excluirUsuario,
} from "../services/usuarioService";
import { criarCliente, listarClientes } from "../services/clienteService";

const money = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

export default function AdminCadastros() {
  // padarias para selects
  const [padarias, setPadarias] = useState([]);
  const [loadingPads, setLoadingPads] = useState(true);

  // ====== FORM: USUÁRIO ======
  const [uNome, setUNome] = useState("");
  const [uSenha, setUSenha] = useState("");
  const [uRole, setURole] = useState("entregador"); // admin | gerente | entregador
  const [uPadaria, setUPadaria] = useState("");
  const [uSaving, setUSaving] = useState(false);
  const [uErro, setUErro] = useState("");

  // listagem de usuários
  const [users, setUsers] = useState([]);
  const [uFiltroPadaria, setUFiltroPadaria] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ====== FORM: CLIENTE ======
  const [cPadaria, setCPadaria] = useState("");
  const [cNome, setCNome] = useState("");
  const [cEndereco, setCEndereco] = useState("");
  const [cRota, setCRota] = useState("");
  const [cLat, setCLat] = useState("");
  const [cLng, setCLng] = useState("");
  const [cTelefone, setCTelefone] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cObs, setCObs] = useState("");
  const [cInicio, setCInicio] = useState(""); // yyyy-mm-dd
  const [cSaving, setCSaving] = useState(false);
  const [cErro, setCErro] = useState("");

  // listagem de clientes (opcional: para feedback pós-criação)
  const [clientes, setClientes] = useState([]);
  const [cFiltroPadaria, setCFiltroPadaria] = useState("");
  const [loadingClientes, setLoadingClientes] = useState(false);

  // ====== LOAD PADARIAS ======
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingPads(true);
      try {
        const ps = await listarPadarias();
        if (!alive) return;
        setPadarias(ps);
        if (ps[0]?._id) {
          setUPadaria(ps[0]._id);
          setCPadaria(ps[0]._id);
          setUFiltroPadaria(ps[0]._id);
          setCFiltroPadaria(ps[0]._id);
        }
      } catch (e) {
        console.error("listarPadarias:", e);
      } finally {
        if (alive) setLoadingPads(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ====== LOAD USERS ======
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
    if (padarias.length) reloadUsers(); /* eslint-disable-next-line */
  }, [uFiltroPadaria, padarias.length]);

  // ====== LOAD CLIENTES ======
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
    if (padarias.length) reloadClientes(); /* eslint-disable-next-line */
  }, [cFiltroPadaria, padarias.length]);

  // ====== HANDLERS ======
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
    try {
      setCSaving(true);
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
      });
      // limpa
      setCNome("");
      setCEndereco("");
      setCRota("");
      setCLat("");
      setCLng("");
      setCTelefone("");
      setCEmail("");
      setCObs("");
      setCInicio("");
      await reloadClientes();
      alert("Cliente criado com sucesso!");
    } catch (e) {
      console.error(e);
      setCErro(e?.response?.data?.erro || "Falha ao criar cliente.");
    } finally {
      setCSaving(false);
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

  // ====== UI ======
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Cadastros (Admin)</h1>

      {/* USUÁRIOS */}
      <section className="mb-8">
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

        <div className="overflow-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Nome</th>
                <th className="text-left p-2">Cargo</th>
                <th className="text-left p-2">Padaria</th>
                <th className="text-left p-2">Ativo</th>
                <th className="text-left p-2 w-28">Ações</th>
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
                    <td className="p-2">
                      <button
                        onClick={() => onExcluirUsuario(u._id)}
                        className="px-2 py-1 rounded bg-red-600 text-white"
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
      </section>

      {/* CLIENTES */}
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
          </div>
        </div>

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
          <input
            className="border rounded px-2 py-1"
            placeholder="Rota (A, B…)"
            value={cRota}
            onChange={(e) => setCRota(e.target.value)}
          />
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
            className="border rounded px-2 py-1 md:col-span-2"
            placeholder="Observações (opcional)"
            value={cObs}
            onChange={(e) => setCObs(e.target.value)}
          />
          <button
            className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
            disabled={cSaving}
          >
            {cSaving ? "Salvando..." : "Criar cliente"}
          </button>
        </form>
        {cErro && <div className="text-red-600 text-sm mb-3">{cErro}</div>}

        <div className="overflow-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Nome</th>
                <th className="text-left p-2">Rota</th>
                <th className="text-left p-2">Endereço</th>
                <th className="text-left p-2">Telefone</th>
              </tr>
            </thead>
            <tbody>
              {loadingClientes ? (
                <tr>
                  <td className="p-2" colSpan={4}>
                    Carregando…
                  </td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td className="p-2" colSpan={4}>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
