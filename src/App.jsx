// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminCadastros from "./pages/AdminCadastros";
import Login from "./pages/Login";
import Painel from "./pages/Painel";
import MinhasEntregas from "./pages/MinhasEntregas";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Painel (admin, gerente e entregador) */}
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

        {/* Entregador: Minhas Entregas */}
        <Route
          path="/entregador/entregas"
          element={
            <ProtectedRoute rolesPermitidos={["entregador"]}>
              <MinhasEntregas />
            </ProtectedRoute>
          }
        />

        {/* Admin: Cadastros (usuários e clientes) */}
        <Route
          path="/admin/cadastros"
          element={
            <ProtectedRoute rolesPermitidos={["admin"]}>
              <AdminCadastros />
            </ProtectedRoute>
          }
        />

        {/* fallback opcional */}
        {/* <Route path="*" element={<Navigate to="/" replace />} /> */}
      </Routes>
    </BrowserRouter>
  );
}
