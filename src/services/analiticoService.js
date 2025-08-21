import { getToken } from "../utils/auth";

export const buscarEntregasPorDia = async (padariaId) => {
  const token = getToken();

  const resposta = await fetch(
    `http://localhost:3000/analitico/entregas-por-dia-da-semana?padariaId=${padariaId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const json = await resposta.json();
  return json.dias || [];
};
export const buscarFaturamentoMensal = async (padariaId) => {
  const token = getToken();

  if (!padariaId || !token) return [];

  const resposta = await fetch(
    `http://localhost:3000/analitico/faturamento-mensal?padariaId=${padariaId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const json = await resposta.json();
  return json;
};

export const buscarInadimplencia = async (padariaId) => {
  const token = getToken();
  if (!padariaId || !token) return [];

  const resposta = await fetch(
    `http://localhost:3000/analitico/inadimplencia?padariaId=${padariaId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const json = await resposta.json();

  return [
    { name: "Pagantes", value: json.pagantes },
    { name: "Inadimplentes", value: json.inadimplentes },
  ];
};
const API_URL = "http://localhost:3000";

export const listarPadarias = async () => {
  const token = getToken();
  const resposta = await axios.get(`${API_URL}/padarias`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return resposta.data;
};

export const alterarStatusPadaria = async (id, acao) => {
  const token = getToken();
  return axios.patch(`${API_URL}/padarias/${id}/${acao}`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const deletarPadaria = async (id) => {
  const token = getToken();
  return axios.delete(`${API_URL}/padarias/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
