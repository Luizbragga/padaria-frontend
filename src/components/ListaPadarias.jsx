import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUsuario } from "../utils/auth";

import {
  listarPadarias,
  alterarStatusPadaria,
  deletarPadaria,
} from "../services/padariaService";

const ListaPadarias = () => {
  const [padarias, setPadarias] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const token = getToken();
  const usuario = getUsuario();

  const buscarPadarias = async () => {
    try {
      setCarregando(true);
      const padariasAPI = await listarPadarias();
      setPadarias(padariasAPI);
    } catch (err) {
      console.error("Erro ao buscar padarias:", err);
      setErro("Erro ao buscar padarias");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarPadarias();
  }, []);

  const alterarStatus = async (id, acao) => {
    try {
      await alterarStatusPadaria(id, acao);
      buscarPadarias();
    } catch (err) {
      alert(`Erro ao ${acao === "ativar" ? "ativar" : "desativar"} padaria.`);
    }
  };

  const deletar = async (id) => {
    const confirmacao = window.confirm(
      "Tem certeza que deseja excluir essa padaria?"
    );
    if (!confirmacao) return;

    try {
      await deletarPadaria(id);
      buscarPadarias();
    } catch (err) {
      alert("Erro ao deletar padaria.");
    }
  };

  if (erro) return <p className="text-red-600">{erro}</p>;

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-4">Padarias Cadastradas</h2>
      {carregando ? (
        <p>Carregando padarias...</p>
      ) : padarias.length === 0 ? (
        <p>Nenhuma padaria cadastrada.</p>
      ) : (
        <ul className="space-y-4">
          {padarias.map((padaria) => (
            <li
              key={padaria._id}
              className="p-4 border rounded bg-white shadow flex flex-col md:flex-row md:items-center md:justify-between"
            >
              <div>
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
              <div className="mt-2 md:mt-0 space-x-2">
                {padaria.ativa ? (
                  <button
                    className="bg-yellow-500 text-white px-3 py-1 rounded"
                    onClick={() => alterarStatus(padaria._id, "desativar")}
                  >
                    Desativar
                  </button>
                ) : (
                  <button
                    className="bg-green-600 text-white px-3 py-1 rounded"
                    onClick={() => alterarStatus(padaria._id, "ativar")}
                  >
                    Ativar
                  </button>
                )}
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded"
                  onClick={() => deletar(padaria._id)}
                >
                  Deletar
                </button>
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                  onClick={() => navigate(`/painel?padaria=${padaria._id}`)}
                >
                  Ver painel
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ListaPadarias;
