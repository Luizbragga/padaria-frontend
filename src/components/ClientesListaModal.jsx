// src/components/ClientesListaModal.jsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const fmtEUR = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

export default function ClientesListaModal({
  aberto,
  onClose,
  clientes = [],
  onSelectCliente, // (clienteObj) => void
}) {
  const [busca, setBusca] = useState("");
  const [rota, setRota] = useState("todas");

  // trava o scroll do body enquanto o modal está aberto
  useEffect(() => {
    if (!aberto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [aberto]);

  // rotas únicas (derivadas da lista)
  const rotas = useMemo(() => {
    const set = new Set();
    clientes.forEach((c) => {
      const r = (c.rota || "").trim().toUpperCase();
      if (r) set.add(r);
    });
    return ["todas", ...Array.from(set).sort()];
  }, [clientes]);

  // aplica filtro + ordenação
  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const rotaAtiva = rota.toLowerCase();

    const base = clientes.filter((c) => {
      const okNome =
        !termo ||
        String(c.nome || c.cliente || "")
          .toLowerCase()
          .includes(termo);
      const okRota =
        rotaAtiva === "todas" ||
        String(c.rota || "")
          .trim()
          .toLowerCase() === rotaAtiva;
      return okNome && okRota;
    });

    return base.sort((a, b) =>
      String(a.nome || a.cliente || "").localeCompare(
        String(b.nome || b.cliente || ""),
        "pt",
        { sensitivity: "base" }
      )
    );
  }, [clientes, busca, rota]);

  if (!aberto) return null;

  const modal = (
    <div className="fixed inset-0 z-[3000] flex items-start justify-center">
      {/* Backdrop: clicar fora fecha */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Conteúdo */}
      <div className="relative mt-10 w-full max-w-5xl bg-white rounded shadow-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <h3 className="font-bold text-lg">Clientes</h3>
          <button
            className="px-3 py-1 rounded border"
            onClick={onClose}
            title="Fechar"
          >
            Fechar
          </button>
        </div>

        <div className="p-4 border-b grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm mb-1">Buscar por nome</label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite o nome do cliente…"
              className="border rounded px-3 py-2 w-full"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Filtrar por rota</label>
            <select
              value={rota}
              onChange={(e) => setRota(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            >
              {rotas.map((r) => (
                <option key={r} value={r}>
                  {r === "todas" ? "Todas as rotas" : r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 overflow-auto max-h-[60vh]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-100">
                <th className="p-2">Cliente</th>
                <th className="p-2">Rota</th>
                <th className="p-2">Previsto</th>
                <th className="p-2">Pago</th>
                <th className="p-2">Pendente</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c, i) => (
                <tr
                  key={`${c.cliente || c._id || c.nome}-${i}`}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    onSelectCliente?.(c); // seleciona
                    onClose?.(); // fecha a lista
                  }}
                  title="Ver detalhes do cliente"
                >
                  <td className="p-2">{c.nome || c.cliente}</td>
                  <td className="p-2">{(c.rota || "").toUpperCase()}</td>
                  <td className="p-2">{fmtEUR.format(c.previsto || 0)}</td>
                  <td className="p-2">{fmtEUR.format(c.pago || 0)}</td>
                  <td className="p-2 font-semibold">
                    {fmtEUR.format(c.pendente || 0)}
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td className="p-2 text-gray-500" colSpan={5}>
                    Nenhum cliente encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t text-sm text-gray-600">
          Mostrando <strong>{lista.length}</strong> de{" "}
          <strong>{clientes.length}</strong> clientes.
        </div>
      </div>
    </div>
  );

  // Renderiza acima de qualquer header sticky
  return createPortal(modal, document.body);
}
