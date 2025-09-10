import { http } from "./http";

/** Lista produtos; pode filtrar por padaria. */
export async function listarProdutos(params = {}) {
  const { data } = await http.get("/produtos", { params });
  return Array.isArray(data) ? data : data?.produtos ?? [];
}

/** Cria produto. Ex.: { padaria, nome, preco?, ativo } */
export async function criarProduto(payload) {
  const { data } = await http.post("/produtos", payload);
  return data;
}

/** Atualiza produto. Ex.: atualizarProduto(id, { ativo:false }) */
export async function atualizarProduto(id, payload) {
  const { data } = await http.patch(`/produtos/${id}`, payload);
  return data;
}

/** Exclui produto. */
export async function excluirProduto(id) {
  const { data } = await http.delete(`/produtos/${id}`);
  return data;
}
