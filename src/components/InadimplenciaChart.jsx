import React, { useEffect, useState } from "react";
import { buscarInadimplencia } from "../services/analiticoService";
import { getUsuario } from "../utils/auth";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#16a34a", "#dc2626"]; // verde (pagou), vermelho (inadimplente)

export default function InadimplenciaChart({ padariaId }) {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const buscar = async () => {
      setCarregando(true);
      setErro("");

      try {
        const usuario = getUsuario();
        if (usuario.role === "entregador" || !padariaId) return;

        const dadosAPI = await buscarInadimplencia(padariaId);
        setDados(dadosAPI);
      } catch (erro) {
        console.error("Erro ao buscar inadimplência:", erro);
        setErro("Erro ao carregar inadimplência.");
      } finally {
        setCarregando(false);
      }
    };

    buscar();
  }, [padariaId]);

  if (!dados.length) return null;

  return (
    <div className="bg-white p-4 rounded shadow my-6">
      <h3 className="text-lg font-bold mb-2">📉 Inadimplência</h3>

      {carregando ? (
        <p className="text-gray-500">Carregando inadimplência...</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : !dados.length ? (
        <p className="text-gray-500">Nenhum dado encontrado.</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={dados}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              label
            >
              {dados.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
