import React, { useEffect, useState } from "react";
import { getUsuario } from "../utils/auth";
import { buscarEntregasPorDia } from "../services/analiticoService";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function EntregasPorDiaChart({ padariaId }) {
  const [dados, setDados] = useState([]);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [temaEscuro, setTemaEscuro] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setTemaEscuro(mediaQuery.matches);

    const listener = (e) => setTemaEscuro(e.matches);
    mediaQuery.addEventListener("change", listener);

    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    const buscarDados = async () => {
      setCarregando(true);
      setErro(null);

      try {
        const usuario = getUsuario();
        if (usuario.role === "entregador") return;

        const dadosAPI = await buscarEntregasPorDia(padariaId);
        setDados(dadosAPI);
      } catch (error) {
        console.error("Erro ao buscar entregas por dia:", error);
        setErro("Erro ao carregar dados. Tente novamente.");
      } finally {
        setCarregando(false);
      }
    };

    if (padariaId) {
      buscarDados();
    }
  }, [padariaId]);

  if (carregando) {
    return <p>Carregando gráfico...</p>;
  }

  if (erro) {
    return <p className="text-red-600 font-semibold">{erro}</p>;
  }

  if (dados.length === 0) {
    return (
      <p className="text-gray-500">Nenhum dado encontrado para este período.</p>
    );
  }

  return (
    <div
      className={`p-4 rounded-2xl shadow-md mb-4 ${
        temaEscuro ? "bg-gray-800" : "bg-white"
      }`}
    >
      <h3
        className={`text-lg font-bold mb-2 ${
          temaEscuro ? "text-white" : "text-gray-800"
        }`}
      >
        Entregas por dia da semana
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={dados}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="_id" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total" fill={temaEscuro ? "#60a5fa" : "#4f46e5"} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
