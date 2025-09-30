// src/pages/Login.jsx  (ou o caminho onde está seu Login)
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { post } from "../services/api";

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (carregando) return;

    if (!usuario || !senha) {
      setErro("Preencha todos os campos");
      return;
    }

    setErro("");
    setCarregando(true);
    try {
      const dados = await post("/login", { nome: usuario, senha });

      // Esperado do backend:
      // { token, refreshToken, usuario:{ id, nome, role, padaria? } }
      localStorage.setItem("token", dados.token);
      // não salvamos mais o refreshToken; ele está no cookie HttpOnly
      localStorage.setItem("usuario", JSON.stringify(dados.usuario));

      navigate("/painel");
    } catch (err) {
      console.error("Erro no login:", err);
      setErro(err.message || "Erro ao fazer login");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto" }}>
      <h2>Login</h2>
      {erro && <p style={{ color: "red" }}>{erro}</p>}

      <form onSubmit={handleLogin}>
        <label style={{ display: "block", fontSize: 14, marginBottom: 6 }}>
          Usuário
        </label>
        <input
          type="text"
          value={usuario}
          onChange={(e) => {
            setUsuario(e.target.value);
            if (erro) setErro("");
          }}
          autoComplete="username"
          required
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #d1d5db",
          }}
        />

        <label style={{ display: "block", fontSize: 14, margin: "12px 0 6px" }}>
          Senha
        </label>
        <input
          type="password"
          value={senha}
          onChange={(e) => {
            setSenha(e.target.value);
            if (erro) setErro("");
          }}
          autoComplete="current-password"
          required
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #d1d5db",
          }}
        />

        <button
          type="submit"
          disabled={carregando}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            background: carregando ? "#9ca3af" : "#2563eb",
            color: "#fff",
            fontWeight: 600,
            cursor: carregando ? "not-allowed" : "pointer",
          }}
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
