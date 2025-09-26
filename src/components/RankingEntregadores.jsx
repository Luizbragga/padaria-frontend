// src/components/RankingEntregadores.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getUsuario, getToken } from "../utils/auth";
import axios from "axios";
import { API_BASE } from "../services/http";

const buildUrl = (path, params) => {
  const u = new URL(path.replace(/^\/+/, ""), API_BASE);
  if (params)
    Object.entries(params).forEach(
      ([k, v]) => v != null && u.searchParams.set(k, v)
    );
  return u.href;
};

// aceita vários formatos do backend e padroniza
function normaliza(data) {
  const arr = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : [];
  return arr.map((row, i) => {
    const nome =
      row?.entregador ??
      row?.nome ??
      row?.userName ??
      row?.usuario ??
      row?.entregadorNome ??
      (typeof row?.usuario === "object" ? row.usuario?.nome : "") ??
      "—";

    const total =
      Number(row?.totalEntregas ?? row?.total ?? row?.qtd ?? 0) || 0;
    const entregues = Number(row?.entregues ?? row?.feitas ?? 0) || 0;
    const pendentes =
      Number(row?.pendentes ?? row?.naoEntregues ?? total - entregues) || 0;

    return {
      key: row?.entregadorId ?? row?.usuarioId ?? row?._id ?? i,
      entregador: nome,
      totalEntregas: total,
      entregues,
      pendentes: pendentes < 0 ? 0 : pendentes,
    };
  });
}

export default function RankingEntregadores({ padariaId }) {
  const usuario = getUsuario();
  const [ranking, setRanking] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const alive = useRef(true);

  const ehGerencial =
    usuario && (usuario.role === "admin" || usuario.role === "gerente");
  const podeMostrar = ehGerencial && !!padariaId;

  useEffect(() => {
    alive.current = true;
    if (!podeMostrar) {
      setRanking([]);
      setCarregando(false);
      setErro("");
      return () => {
        alive.current = false;
      };
    }

    async function fetchRanking() {
      setCarregando(true);
      setErro("");
      try {
        const token = getToken();
        const { data } = await axios.get(
          buildUrl("analitico/entregas-por-entregador", { padaria: padariaId }),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!alive.current) return;
        const lista = normaliza(data)
          // ordena por total desc, depois por nome asc (estável)
          .sort((a, b) =>
            a.totalEntregas === b.totalEntregas
              ? String(a.entregador).localeCompare(String(b.entregador))
              : b.totalEntregas - a.totalEntregas
          );
        setRanking(lista);
      } catch (e) {
        if (!alive.current) return;

        const code = e?.response?.status ?? null;
        // Sem dados / rota ainda não feita -> trata como estado vazio (sem erro visual)
        if (code === 404 || code === 204) {
          setRanking([]);
          setErro(""); // não exibe texto vermelho
        } else {
          console.error("Erro ao buscar ranking de entregadores:", e);
          setErro("Erro ao carregar ranking de entregadores.");
          setRanking([]);
        }
      } finally {
        if (alive.current) setCarregando(false);
      }
    }

    fetchRanking();
    return () => {
      alive.current = false;
    };
  }, [padariaId, podeMostrar]);

  // Não renderiza para entregador / sem padaria
  if (!podeMostrar) return null;

  const linhas = useMemo(() => ranking, [ranking]);

  return (
    <div className="mt-10">
      <h3 className="text-xl font-semibold mb-4">Ranking de Entregadores</h3>

      {carregando ? (
        <p className="text-gray-500">Carregando ranking...</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : !linhas.length ? (
        <p className="text-gray-500">Nenhum dado para exibir.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 rounded shadow">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-4 py-2 border-b">#</th>
                <th className="px-4 py-2 border-b">Entregador</th>
                <th className="px-4 py-2 border-b">Total</th>
                <th className="px-4 py-2 border-b">Entregues</th>
                <th className="px-4 py-2 border-b">Pendentes</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, idx) => (
                <tr key={linha.key} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{idx + 1}</td>
                  <td className="px-4 py-2 border-b">{linha.entregador}</td>
                  <td className="px-4 py-2 border-b">{linha.totalEntregas}</td>
                  <td className="px-4 py-2 border-b">{linha.entregues}</td>
                  <td className="px-4 py-2 border-b">{linha.pendentes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
