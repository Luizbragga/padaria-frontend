import { getToken } from "../utils/auth";

// Listar todas as padarias
export const listarPadarias = async () => {
  const token = getToken();

  const resposta = await fetch("http://localhost:3000/padarias", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await resposta.json();
  return json;
};

// Alterar status da padaria (ativar ou desativar)
export const alterarStatusPadaria = async (id, acao) => {
  const token = getToken();

  await fetch(`http://localhost:3000/padarias/${id}/${acao}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

// Deletar uma padaria
export const deletarPadaria = async (id) => {
  const token = getToken();

  await fetch(`http://localhost:3000/padarias/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
