import React, { useEffect, useState } from "react";
import { buscarFaturamentoMensal } from "../services/analiticoService";
import { getUsuario } from "../utils/auth";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function FaturamentoMensal({ padariaId }) {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const buscarDados = async () => {
      setCarregando(true);
      setErro("");

      try {
        const usuario = getUsuario();
        if (usuario.role === "entregador" || !padariaId) return;

        const dadosAPI = await buscarFaturamentoMensal(padariaId);
        setDados(dadosAPI);
      } catch (erro) {
        console.error("Erro ao buscar faturamento mensal:", erro);
        setErro("Erro ao carregar faturamento.");
      } finally {
        setCarregando(false);
      }
    };

    buscarDados();
  }, [padariaId]);

  if (!dados.length) return null;

  return (
    <div className="bg-white shadow rounded p-6 mt-6">
      <h3 className="text-xl font-bold mb-4">📈 Faturamento Mensal</h3>

      {carregando ? (
        <p className="text-gray-500">Carregando faturamento...</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : !dados.length ? (
        <p className="text-gray-500">Nenhum dado encontrado.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dados}>
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="valorTotal" fill="#4ade80" name="Faturamento (€)" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
