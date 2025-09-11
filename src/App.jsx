// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminCadastros from "./pages/AdminCadastros";
import Login from "./pages/Login";
import Painel from "./pages/Painel";
import MinhasEntregas from "./pages/MinhasEntregas";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/painel/*"
          element={
            <ProtectedRoute
              rolesPermitidos={["admin", "gerente", "entregador", "atendente"]}
            >
              <Painel />
            </ProtectedRoute>
          }
        />

        <Route
          path="/entregador/entregas"
          element={
            <ProtectedRoute rolesPermitidos={["entregador"]}>
              <MinhasEntregas />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/cadastros"
          element={
            <ProtectedRoute rolesPermitidos={["admin"]}>
              <AdminCadastros />
            </ProtectedRoute>
          }
        />

        {/* fallback opcional */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
