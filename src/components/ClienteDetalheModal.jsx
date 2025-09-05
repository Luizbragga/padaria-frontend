// src/components/ClienteDetalheModal.jsx
export default function ClienteDetalheModal({ aberto, onClose, cliente }) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-4 w-[560px] shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-lg font-semibold">Cliente</h4>
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Fechar
          </button>
        </div>

        {!cliente ? (
          <p className="text-gray-500">Sem dados.</p>
        ) : (
          <div className="space-y-2">
            <div>
              <span className="text-gray-500">ID:</span>{" "}
              <code>{cliente.cliente}</code>
            </div>
            <div>
              <span className="text-gray-500">Previsto:</span> €{" "}
              {cliente.previsto?.toFixed(2)}
            </div>
            <div>
              <span className="text-gray-500">Pago:</span> €{" "}
              {cliente.pago?.toFixed(2)}
            </div>
            <div>
              <span className="text-gray-500">Pendente:</span> €{" "}
              {cliente.pendente?.toFixed(2)}
            </div>
            {/* futuramente: nome/endereço/padrão semanal/pagamentos */}
          </div>
        )}
      </div>
    </div>
  );
}
