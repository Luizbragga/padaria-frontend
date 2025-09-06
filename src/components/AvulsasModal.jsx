import { createPortal } from "react-dom";

const fmtEUR = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

export default function AvulsasModal({ aberto, onClose, itens = [] }) {
  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000]">
      {/* backdrop */}
      <button
        className="absolute inset-0 bg-black/40 cursor-default"
        onClick={onClose}
        aria-label="Fechar"
      />

      {/* caixa */}
      <div className="absolute left-1/2 top-10 -translate-x-1/2 w-[640px] max-h-[70vh] overflow-auto rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="text-lg font-semibold">Entregas Avulsas do mês</h4>
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Fechar
          </button>
        </div>

        <div className="p-4">
          {Array.isArray(itens) && itens.length > 0 ? (
            <ul className="space-y-2">
              {itens.map((a) => (
                <li
                  key={a.id || a._id}
                  className="grid grid-cols-5 gap-2 items-center border rounded p-2"
                >
                  <span className="col-span-2">
                    {a.data || a.createdAt
                      ? new Date(a.data || a.createdAt).toLocaleString()
                      : "--"}
                  </span>
                  <span
                    className="truncate"
                    title={a.descricao || a.cliente || "Entrega avulsa"}
                  >
                    {a.descricao || a.cliente || "Entrega avulsa"}
                  </span>
                  <span className="text-sm text-gray-600">
                    {a.forma || a.formaPagamento || "não informado"}
                  </span>
                  <span className="text-right font-semibold">
                    {fmtEUR.format(Number(a.valor ?? a.valorTotal ?? 0))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Nenhuma entrega avulsa no período.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
