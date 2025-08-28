// src/components/MinhasEntregas.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

// Normaliza resposta em um array de entregas
function normalizeEntregas(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (Array.isArray(data.entregas)) return data.entregas;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.itens)) return data.itens;
  }
  return [];
}

// Extrai nome do cliente de vários formatos possíveis
function getClienteLabel(e) {
  if (!e) return "Cliente";
  if (typeof e.cliente === "string") return e.cliente;
  if (e.cliente?.nome) return e.cliente.nome;
  return "Cliente";
}

export default function MinhasEntregas() {
  const [entregas, setEntregas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [showPendentes, setShowPendentes] = useState(true);

  const alive = useRef(true);

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const token = getToken();

      // 1ª tentativa: rota canônica do back
      let resp;
      try {
        resp = await axios.get(`${API_URL}/rota-entregador`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        // 2ª tentativa: compat com versão antiga
        resp = await axios.get(`${API_URL}/entregas/minhas`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const lista = normalizeEntregas(resp?.data);
      if (!alive.current) return;
      setEntregas(Array.isArray(lista) ? lista : []);
    } catch (e) {
      console.error(e);
      if (!alive.current) return;
      setErro("Erro ao carregar suas entregas.");
      setEntregas([]);
    } finally {
      if (alive.current) setCarregando(false);
    }
  }

  useEffect(() => {
    alive.current = true;
    carregar();
    return () => {
      alive.current = false;
    };
  }, []);

  // Ações
  async function concluirEntrega(id) {
    if (!id) return;
    try {
      const token = getToken();
      await axios.put(
        `${API_URL}/entregas/${id}/concluir`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // atualiza localmente: marca entregue
      setEntregas((prev) =>
        (Array.isArray(prev) ? prev : []).map((e) =>
          e._id === id ? { ...e, entregue: true } : e
        )
      );
    } catch (e) {
      console.error("Falha ao concluir entrega:", e);
      alert("Não foi possível concluir a entrega.");
    }
  }

  async function pagarEntrega(id) {
    if (!id) return;
    const valorStr = window.prompt("Valor pago (€):", "0");
    if (valorStr == null) return; // cancelou
    const valor = Number(valorStr.replace(",", "."));
    if (!Number.isFinite(valor) || valor < 0) {
      alert("Valor inválido.");
      return;
    }
    const forma = (
      window.prompt("Forma (dinheiro/cartão/mbway):", "dinheiro") || "dinheiro"
    )
      .trim()
      .toLowerCase();

    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/entregas/${id}/registrar-pagamento`,
        { valor, forma },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // marca como pago e entregue localmente
      setEntregas((prev) =>
        (Array.isArray(prev) ? prev : []).map((e) =>
          e._id === id ? { ...e, pago: true, entregue: true } : e
        )
      );
    } catch (e) {
      console.error("Falha ao registrar pagamento:", e);
      alert("Não foi possível registrar o pagamento.");
    }
  }

  const listaFiltrada = useMemo(() => {
    const base = Array.isArray(entregas) ? entregas : [];
    const filtrada = showPendentes ? base.filter((e) => !e?.entregue) : base;
    // ordena: pendentes primeiro, depois por horaPrevista ou createdAt
    return filtrada.sort((a, b) => {
      const pa = a?.entregue ? 1 : 0;
      const pb = b?.entregue ? 1 : 0;
      if (pa !== pb) return pa - pb;
      const da =
        a?.horaPrevista || a?.dataEntrega || a?.createdAt || a?.data || 0;
      const db =
        b?.horaPrevista || b?.dataEntrega || b?.createdAt || b?.data || 0;
      return new Date(da) - new Date(db);
    });
  }, [entregas, showPendentes]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Minhas Entregas</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm flex items-center gap-1">
            <input
              type="checkbox"
              checked={showPendentes}
              onChange={(e) => setShowPendentes(e.target.checked)}
            />
            Somente pendentes
          </label>
          <button
            className="text-sm px-3 py-1 rounded border"
            onClick={carregar}
            disabled={carregando}
            title="Atualizar"
          >
            {carregando ? "Atualizando…" : "Atualizar"}
          </button>
        </div>
      </div>

      {carregando ? (
        <p className="text-gray-500">Carregando...</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : !listaFiltrada.length ? (
        <p className="text-gray-500">Você não tem entregas atribuídas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-3 py-2 border-b">Cliente</th>
                <th className="px-3 py-2 border-b">Endereço</th>
                <th className="px-3 py-2 border-b">Entregue?</th>
                <th className="px-3 py-2 border-b">Pago?</th>
                <th className="px-3 py-2 border-b">Data</th>
                <th className="px-3 py-2 border-b">Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((e, idx) => {
                const dataVisivel =
                  e?.horaPrevista || e?.dataEntrega || e?.createdAt || e?.data;
                return (
                  <tr key={e._id || idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border-b">{getClienteLabel(e)}</td>
                    <td className="px-3 py-2 border-b">{e.endereco || "--"}</td>
                    <td className="px-3 py-2 border-b">
                      {e.entregue ? "Sim" : "Não"}
                    </td>
                    <td className="px-3 py-2 border-b">
                      {e.pago ? "Sim" : "Não"}
                    </td>
                    <td className="px-3 py-2 border-b">
                      {dataVisivel
                        ? new Date(dataVisivel).toLocaleString("pt-PT")
                        : "--"}
                    </td>
                    <td className="px-3 py-2 border-b space-x-2">
                      <button
                        className="px-2 py-1 rounded bg-green-600 text-white disabled:opacity-60"
                        disabled={!!e.entregue}
                        onClick={() => concluirEntrega(e._id)}
                        title="Concluir entrega"
                      >
                        Concluir
                      </button>
                      <button
                        className="px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
                        disabled={!!e.pago}
                        onClick={() => pagarEntrega(e._id)}
                        title="Registrar pagamento"
                      >
                        Pagar
                      </button>
                      <button
                        className="px-2 py-1 rounded bg-yellow-500 text-black opacity-60 cursor-not-allowed"
                        disabled
                        title="Reportar problema (em breve)"
                      >
                        Reportar problema
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
