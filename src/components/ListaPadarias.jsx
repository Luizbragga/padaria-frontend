// src/components/ListaPadarias.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarPadarias,
  alterarStatusPadaria,
  deletarPadaria,
} from "../services/padariaService";

export default function ListaPadarias() {
  const [padarias, setPadarias] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [busyId, setBusyId] = useState(null); // id da padaria sendo alterada/deletada
  const navigate = useNavigate();
  const alive = useRef(true);

  async function buscarPadarias() {
    try {
      setCarregando(true);
      setErro("");
      const padariasAPI = await listarPadarias();
      if (!alive.current) return;
      setPadarias(Array.isArray(padariasAPI) ? padariasAPI : []);
    } catch (err) {
      console.error("Erro ao buscar padarias:", err);
      if (!alive.current) return;
      setErro("Erro ao buscar padarias.");
    } finally {
      if (alive.current) setCarregando(false);
    }
  }

  useEffect(() => {
    alive.current = true;
    buscarPadarias();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function alterarStatus(id, acao) {
    try {
      setBusyId(id);
      await alterarStatusPadaria(id, acao);
      await buscarPadarias();
    } catch (err) {
      console.error(err);
      alert(`Erro ao ${acao === "ativar" ? "ativar" : "desativar"} padaria.`);
    } finally {
      setBusyId(null);
    }
  }

  async function deletar(id) {
    const ok = window.confirm("Tem certeza que deseja excluir essa padaria?");
    if (!ok) return;
    try {
      setBusyId(id);
      await deletarPadaria(id);
      await buscarPadarias();
    } catch (err) {
      console.error(err);
      alert("Erro ao deletar padaria.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Padarias Cadastradas</h2>
        <button
          className="text-sm px-3 py-1 rounded border"
          onClick={buscarPadarias}
          disabled={carregando}
          title="Atualizar lista"
        >
          {carregando ? "Atualizando…" : "Atualizar"}
        </button>
      </div>

      {erro && <p className="text-red-600 mb-3">{erro}</p>}

      {carregando && padarias.length === 0 ? (
        <p>Carregando padarias...</p>
      ) : padarias.length === 0 ? (
        <p>Nenhuma padaria cadastrada.</p>
      ) : (
        <ul className="space-y-4">
          {padarias.map((padaria) => {
            const disabled = busyId === padaria._id || carregando;
            return (
              <li
                key={padaria._id}
                className="p-4 border rounded bg-white shadow flex flex-col md:flex-row md:items-center md:justify-between"
              >
                <div className="mb-2 md:mb-0">
                  <p>
                    <strong>Nome:</strong> {padaria.nome}
                  </p>
                  <p>
                    <strong>Cidade:</strong> {padaria.cidade}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    {padaria.ativa ? "Ativa" : "Desativada"}
                  </p>
                </div>

                <div className="mt-2 md:mt-0 flex flex-wrap gap-2">
                  {padaria.ativa ? (
                    <button
                      className="bg-yellow-500 text-white px-3 py-1 rounded disabled:opacity-60"
                      onClick={() => alterarStatus(padaria._id, "desativar")}
                      disabled={disabled}
                    >
                      Desativar
                    </button>
                  ) : (
                    <button
                      className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-60"
                      onClick={() => alterarStatus(padaria._id, "ativar")}
                      disabled={disabled}
                    >
                      Ativar
                    </button>
                  )}

                  <button
                    className="bg-red-600 text-white px-3 py-1 rounded disabled:opacity-60"
                    onClick={() => deletar(padaria._id)}
                    disabled={disabled}
                  >
                    Deletar
                  </button>

                  <button
                    className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-60"
                    onClick={() => navigate(`/painel?padaria=${padaria._id}`)}
                    disabled={disabled}
                  >
                    Ver painel
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
