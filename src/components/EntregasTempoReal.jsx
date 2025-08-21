import React, { useEffect, useState } from "react";
import { buscarEntregasTempoReal } from "../services/entregaService";

export default function EntregasTempoReal({ padariaId }) {
  const [entregas, setEntregas] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarEntregas = async () => {
      setCarregando(true);
      try {
        const dados = await buscarEntregasTempoReal(padariaId);
        setEntregas(dados);
        setErro("");
      } catch (erro) {
        console.error("Erro ao buscar entregas em tempo real:", erro);
        setErro("Erro ao carregar entregas em tempo real.");
      } finally {
        setCarregando(false);
      }
    };

    buscarEntregas();
    const intervalo = setInterval(buscarEntregas, 10000);
    return () => clearInterval(intervalo);
  }, [padariaId]);

  return (
    <div className="bg-white shadow rounded-lg p-4 mt-6">
      <h2 className="text-lg font-bold mb-2">📦 Entregas em Tempo Real</h2>

      {carregando ? (
        <p className="text-gray-500">Carregando entregas...</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : entregas.length === 0 ? (
        <p className="text-gray-500">Sem entregas em andamento.</p>
      ) : (
        <ul className="divide-y">
          {entregas.map((entrega) => (
            <li key={entrega._id} className="py-2 text-sm">
              <strong>{entrega.cliente}</strong> — {entrega.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
