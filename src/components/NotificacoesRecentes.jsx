import { useEffect, useState } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";

export default function NotificacoesRecentes() {
  const [eventos, setEventos] = useState([]);
  const [erro, setErro] = useState("");

  const buscarEventos = async () => {
    try {
      const token = getToken();
      const resposta = await axios.get(
        "http://localhost:3000/analitico/notificacoes-recentes",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setEventos(resposta.data.eventos || []);
      setErro("");
    } catch (erro) {
      console.error("Erro ao buscar notificações:", erro.message);
      setErro("Erro ao carregar notificações recentes.");
    }
  };

  useEffect(() => {
    buscarEventos();
    const intervalo = setInterval(buscarEventos, 10000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="bg-white shadow rounded-lg p-4 mt-6">
      <h2 className="text-lg font-bold mb-2">🔔 Notificações Recentes</h2>

      {erro && <p className="text-red-600">{erro}</p>}

      {eventos.length === 0 ? (
        <p className="text-gray-500">Sem eventos recentes hoje.</p>
      ) : (
        <ul className="divide-y">
          {eventos.map((evento) => (
            <li
              key={evento._id || evento.id || Math.random()}
              className="py-2 text-sm"
            >
              <strong>{evento.tipo}</strong> — {evento.cliente} às{" "}
              {new Date(evento.horario).toLocaleTimeString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
