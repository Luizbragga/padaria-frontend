// src/components/ClienteDetalheModal.jsx
import { createPortal } from "react-dom";
import { useEffect } from "react";

export default function ClienteDetalheModal({ aberto, onClose, cliente }) {
  if (!aberto) return null;

  // trava o scroll do body enquanto o modal está aberto + fecha com ESC
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [aberto, onClose]);

  const modal = (
    <div className="fixed inset-0 z-[3001] flex items-start justify-center">
      {/* backdrop; clicou fora = fecha */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* conteúdo do modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative mt-6 w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-auto max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h4 className="text-lg font-semibold">
            {cliente?.nome || "Cliente"}
            {cliente?.rota
              ? ` • Rota ${String(cliente.rota).toUpperCase()}`
              : ""}
          </h4>
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Fechar
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500">Endereço</label>
            <input
              readOnly
              className="w-full border rounded px-3 py-2"
              value={cliente?.endereco || ""}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Rota</label>
            <input
              readOnly
              className="w-full border rounded px-3 py-2"
              value={(cliente?.rota || "").toString().toUpperCase()}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Telefone</label>
            <input
              readOnly
              className="w-full border rounded px-3 py-2"
              value={cliente?.telefone || ""}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">E-mail</label>
            <input
              readOnly
              className="w-full border rounded px-3 py-2"
              value={cliente?.email || ""}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500">Observações</label>
            <textarea
              readOnly
              className="w-full border rounded px-3 py-2 min-h-[110px]"
              value={cliente?.observacoes || ""}
            />
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-blue-600 text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );

  // renderiza por cima do header (no body) com z-index maior
  return createPortal(modal, document.body);
}
