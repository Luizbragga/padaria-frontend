import { useEffect, useState } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

export default function MinhasEntregas() {
  const [entregas, setEntregas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const buscar = async () => {
      setCarregando(true);
      setErro("");
      try {
        const resp = await axios.get(`${API_URL}/entregas/minhas`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        setEntregas(resp.data || []);
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar suas entregas.");
      } finally {
        setCarregando(false);
      }
    };
    buscar();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Minhas Entregas</h1>

      {carregando ? (
        <p className="text-gray-500">Carregando...</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : !entregas.length ? (
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
              {entregas.map((e, idx) => (
                <tr key={e._id || idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border-b">{e.cliente}</td>
                  <td className="px-3 py-2 border-b">{e.endereco}</td>
                  <td className="px-3 py-2 border-b">
                    {e.entregue ? "Sim" : "Não"}
                  </td>
                  <td className="px-3 py-2 border-b">
                    {e.pago ? "Sim" : "Não"}
                  </td>
                  <td className="px-3 py-2 border-b">
                    {e.data
                      ? new Date(e.data).toLocaleDateString("pt-PT")
                      : "--"}
                  </td>
                  <td className="px-3 py-2 border-b space-x-2">
                    <button
                      className="px-2 py-1 rounded bg-green-500 text-white opacity-60 cursor-not-allowed"
                      disabled
                      title="Concluir (em breve)"
                    >
                      Concluir
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-blue-600 text-white opacity-60 cursor-not-allowed"
                      disabled
                      title="Registrar pagamento (em breve)"
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
