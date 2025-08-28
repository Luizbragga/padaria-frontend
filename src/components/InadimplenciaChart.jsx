// src/components/InadimplenciaChart.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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

const COLORS = ["#16a34a", "#dc2626", "#f59e0b", "#2563eb", "#9333ea"]; // seguro p/ n fatias

export default function InadimplenciaChart({ padariaId }) {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const usuario = getUsuario();
  const role = usuario?.role ?? null;

  // evita setState após unmount
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    async function buscar() {
      setCarregando(true);
      setErro("");

      // oculto para entregador ou sem padaria definida
      if (role === "entregador" || !padariaId) {
        setDados([]);
        setCarregando(false);
        return;
      }

      try {
        const dadosAPI = await buscarInadimplencia(padariaId);
        if (!alive.current) return;
        // normaliza: espera [{name: 'Pagou', value: X}, {name:'Inadimplente', value:Y}]
        const arr = Array.isArray(dadosAPI) ? dadosAPI : [];
        setDados(arr);
      } catch (e) {
        console.error("Erro ao buscar inadimplência:", e);
        if (!alive.current) return;
        setErro("Erro ao carregar inadimplência.");
        setDados([]);
      } finally {
        if (alive.current) setCarregando(false);
      }
    }

    buscar();

    return () => {
      alive.current = false;
    };
  }, [padariaId, role]);

  // total e labels mais amigáveis
  const total = useMemo(
    () => dados.reduce((acc, d) => acc + (Number(d?.value) || 0), 0),
    [dados]
  );

  const labelFormatter = (entry) => {
    const v = Number(entry.value) || 0;
    const pct = total > 0 ? ((v / total) * 100).toFixed(1) : 0;
    return `${entry.name}: ${v} (${pct}%)`;
  };

  const valueFormatter = (value) => {
    const v = Number(value) || 0;
    const pct = total > 0 ? ((v / total) * 100).toFixed(1) : 0;
    return `${v} (${pct}%)`;
  };

  return (
    <div className="bg-white p-4 rounded shadow my-6">
      <h3 className="text-lg font-bold mb-2">📉 Inadimplência</h3>

      {role === "entregador" ? (
        <p className="text-gray-500">Visão disponível apenas para gestão.</p>
      ) : carregando ? (
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
              label={labelFormatter}
              isAnimationActive={false}
            >
              {dados.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={valueFormatter}
              labelFormatter={(name) => `${name}`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
