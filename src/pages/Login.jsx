import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!usuario || !senha) {
      setErro("Preencha todos os campos");
      return;
    }

    try {
      const resposta = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome: usuario, senha }),
      });

      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Erro ao fazer login");

      localStorage.setItem("token", dados.token);
      localStorage.setItem("refreshToken", dados.refreshToken);
      localStorage.setItem("usuario", JSON.stringify(dados.usuario));

      const { role, padaria, _id } = dados.usuario;

      if (role === "admin") {
        navigate("/painel");
      } else if (role === "gerente") {
        navigate("/painel");
      } else if (role === "entregador") {
        navigate("/painel");
      } else {
        setErro("Tipo de usuário inválido");
      }
    } catch (err) {
      console.error("Erro no login:", err);
      setErro(err.message || "Erro inesperado");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h2>Login</h2>
      {erro && <p style={{ color: "red" }}>{erro}</p>}
      <form onSubmit={handleLogin}>
        <label style={{ display: "block", fontSize: 14, marginBottom: 6 }}>
          Usuário
        </label>
        <input
          type="text"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
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
          onChange={(e) => setSenha(e.target.value)}
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
