import React, { useEffect, useState } from "react";
import { getUsuario, getToken } from "../utils/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ResumoEntregas({ padariaId }) {
  const [entregas, setEntregas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const usuario = getUsuario();

  useEffect(() => {
    const buscarEntregas = async () => {
      setCarregando(true);
      setErro("");

      try {
        const token = getToken();

        let rota = "";
        if (usuario?.role === "entregador") {
          rota = "/entregas/minhas";
        } else if (padariaId) {
          rota = `/analitico/entregas-por-dia?padaria=${padariaId}`;
        } else {
          console.warn("⚠️ Nenhuma padariaId fornecida.");
          return;
        }

        const resposta = await fetch(`${API_URL}${rota}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!resposta.ok) throw new Error("Falha ao buscar entregas");
        const dados = await resposta.json();
        setEntregas(dados);
      } catch (err) {
        console.error("Erro ao buscar entregas:", err);
        setErro("Erro ao carregar resumo de entregas.");
      } finally {
        setCarregando(false);
      }
    };

    buscarEntregas();
  }, [padariaId, usuario?.role]);

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold mb-2">📦 Entregas por Dia</h3>

      {carregando ? (
        <p className="text-gray-500">Carregando dados...</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : entregas.length === 0 ? (
        <p className="text-gray-500">Nenhuma entrega registrada.</p>
      ) : usuario?.role === "entregador" ? (
        <table className="w-full border-collapse mt-3">
          <thead>
            <tr>
              <th style={estiloCabecalho}>Data</th>
              <th style={estiloCabecalho}>Entregues</th>
              <th style={estiloCabecalho}>Não Entregues</th>
            </tr>
          </thead>
          <tbody>
            {entregas.map((dia, index) => (
              <tr key={index}>
                <td style={estiloCelula}>
                  {new Date(dia.data).toLocaleDateString()}
                </td>
                <td style={estiloCelula}>{dia.entregues}</td>
                <td style={estiloCelula}>{dia.naoEntregues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ width: "100%", height: 400 }}>
          <ResponsiveContainer>
            <BarChart
              data={entregas}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="entregues" fill="#82ca9d" name="Entregues" />
              <Bar dataKey="naoEntregues" fill="#ff6666" name="Não Entregues" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const estiloCabecalho = {
  borderBottom: "2px solid #ccc",
  padding: "8px",
  textAlign: "left",
};

const estiloCelula = {
  borderBottom: "1px solid #eee",
  padding: "8px",
};
