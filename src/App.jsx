// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Painel from "./pages/Painel";
import MinhasEntregas from "./pages/MinhasEntregas";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Painel atual (admin, gerente e entregador) */}
        <Route
          path="/painel"
          element={
            <ProtectedRoute
              rolesPermitidos={["admin", "gerente", "entregador"]}
            >
              <Painel />
            </ProtectedRoute>
          }
        />

        {/* Nova rota do entregador: Minhas Entregas (tabela) */}
        <Route
          path="/entregador/entregas"
          element={
            <ProtectedRoute rolesPermitidos={["entregador"]}>
              <MinhasEntregas />
            </ProtectedRoute>
          }
        />

        {/* fallback opcional para rotas desconhecidas */}
        {/* <Route path="*" element={<Navigate to="/" replace />} /> */}
      </Routes>
    </BrowserRouter>
  );
}
