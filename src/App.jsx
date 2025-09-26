import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminCadastros from "./pages/AdminCadastros";
import Login from "./pages/Login";
import Painel from "./pages/Painel";
import MinhasEntregas from "./pages/MinhasEntregas";
import NavegacaoWaze from "./components/NavegacaoWaze";

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

        {/* NOVA ROTA: tela de navegação estilo Waze */}
        <Route
          path="/navegacao"
          element={
            <ProtectedRoute rolesPermitidos={["entregador"]}>
              <NavegacaoWaze />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
