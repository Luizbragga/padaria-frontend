import React, { useEffect, useState } from "react";
import { getUsuario, getToken } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function RankingEntregadores({ padariaId }) {
  const [ranking, setRanking] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const buscarRanking = async () => {
      setCarregando(true);
      setErro("");

      try {
        const token = getToken();
        const usuario = getUsuario();

        if (!padariaId) return;
        if (
          !usuario ||
          (usuario.role !== "admin" && usuario.role !== "gerente")
        )
          return;

        const resp = await fetch(
          `${API_URL}/analitico/entregas-por-entregador?padaria=${padariaId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!resp.ok) throw new Error("Falha ao buscar ranking");
        const dados = await resp.json();

        // Ordena por total (desc) para parecer mais “ranking”
        const ordenado = [...dados].sort(
          (a, b) => (b.totalEntregas || 0) - (a.totalEntregas || 0)
        );

        setRanking(ordenado);
      } catch (e) {
        console.error("Erro ao buscar ranking de entregadores:", e);
        setErro("Erro ao carregar ranking de entregadores.");
      } finally {
        setCarregando(false);
      }
    };

    buscarRanking();
  }, [padariaId]);

  return (
    <div className="mt-10">
      <h3 className="text-xl font-semibold mb-4">Ranking de Entregadores</h3>

      {carregando ? (
        <p className="text-gray-500">Carregando ranking...</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : ranking.length === 0 ? (
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
              {ranking.map((linha, idx) => (
                <tr
                  key={linha.entregadorId || linha.entregador || idx}
                  className="hover:bg-gray-50"
                >
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
