import React, { useEffect, useState } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";

const PagamentosFiltrados = ({ dataInicial, dataFinal, forma }) => {
  const [pagamentos, setPagamentos] = useState([]);
  const [totalRecebido, setTotalRecebido] = useState(0);
  const [clientesPagantes, setClientesPagantes] = useState(0);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const buscarPagamentos = async () => {
      try {
        const token = getToken();
        const params = {};

        if (dataInicial) params.dataInicial = dataInicial;
        if (dataFinal) params.dataFinal = dataFinal;
        if (forma && forma.toLowerCase() !== "todas") {
          params.forma = forma.toLowerCase();
        }

        const resposta = await axios.get("/analitico/pagamentos", {
          headers: { Authorization: `Bearer ${token}` },
          params, // usa os filtros aqui
        });
        console.log("Resposta do backend:", resposta.data);
        setPagamentos(resposta.data.pagamentos);
        setTotalRecebido(resposta.data.totalRecebido);
        setClientesPagantes(resposta.data.clientesPagantes);

        setErro("");
      } catch (err) {
        console.error(err);
        setErro("Erro ao buscar pagamentos");
      }
    };

    buscarPagamentos();
  }, [dataInicial, dataFinal, forma]);

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Pagamentos Filtrados</h2>
      {erro && <p className="text-red-500">{erro}</p>}
      {!pagamentos || pagamentos.length === 0 ? (
        <p className="text-gray-600">
          Nenhum pagamento encontrado com esses filtros.
        </p>
      ) : (
        <>
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Cliente</th>
                <th className="border p-2">Entregador</th>
                <th className="border p-2">Valor</th>
                <th className="border p-2">Forma</th>
                <th className="border p-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p._id} className="text-center">
                  <td className="border p-2">{p.cliente}</td>
                  <td className="border p-2">{p.entregador}</td>
                  <td className="border p-2">€ {p.valor.toFixed(2)}</td>
                  <td className="border p-2">
                    € {p.valor ? p.valor.toFixed(2) : "0.00"}
                  </td>
                  <td className="border p-2">
                    {p.data
                      ? new Date(p.data).toLocaleDateString("pt-PT")
                      : "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-4 font-medium">
            Total Recebido: € {totalRecebido.toFixed(2)}
          </p>
          <p className="font-medium">Clientes Pagantes: {clientesPagantes}</p>
        </>
      )}
    </div>
  );
};

export default PagamentosFiltrados;
