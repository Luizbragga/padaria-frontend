// src/components/AvulsasModal.jsx
export default function AvulsasModal({ aberto, onClose, itens = [] }) {
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white rounded-xl p-4 w-[560px] max-h-[70vh] overflow-auto">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-lg font-semibold">Entregas Avulsas do mês</h4>
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Fechar
          </button>
        </div>
        <ul className="space-y-2">
          {itens.map((a) => (
            <li key={a._id} className="flex justify-between border rounded p-2">
              <span>{new Date(a.data || a.createdAt).toLocaleString()}</span>
              <span className="font-medium">
                {new Intl.NumberFormat("pt-PT", {
                  style: "currency",
                  currency: "EUR",
                }).format(a.valor ?? a.valorTotal ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
