# Padaria Frontend

Este é o frontend do sistema de entregas recorrentes para padarias.  
Ele foi desenvolvido em **React (Vite)** e consome a **API REST do backend** para exibir e gerenciar rotas, entregas, pagamentos e estatísticas de forma prática e organizada.

---

## Repositório do Backend

O repositório do backend deste sistema está disponível em:  
👉 [Padaria Backend](https://github.com/Luizbragga/padaria-backend)

---

## Tecnologias utilizadas

- React (Vite)
- React Router DOM (rotas)
- Axios (requisições HTTP)
- TailwindCSS (estilização)
- Recharts (gráficos)
- Leaflet + react-leaflet (mapas)
- JWT via `utils/auth.js` (token/refresh)
- ESLint + Prettier (padrões e qualidade de código)

---

## O que este frontend faz

- Login de usuários (**admin, gerente e entregador**) com JWT
- **Rotas protegidas** por perfil com `ProtectedRoute`
- **Painel (admin/gerente)** com:
  - Faturamento mensal
  - Resumo financeiro (recebido, pendente, clientes pagantes)
  - Entregas por dia (gráfico/tabela)
  - Ranking de entregadores
  - Inadimplência
  - Entregas em tempo real
  - Localização dos entregadores (mapa)
  - Notificações recentes
  - Pagamentos filtrados (data/forma)
- **Painel do Entregador**:
  - Mapa com suas entregas e ações (concluir, registrar pagamento — em evolução)
  - Página **Minhas Entregas** (`/entregador/entregas`) com listagem em tabela (botões desabilitados nesta fase)

---

## Autenticação e segurança

- Após login, salva em `localStorage`: `token`, `refreshToken`, `usuario`
- Todas as requisições protegidas usam:
  Authorization: Bearer <token>

yaml
Copiar
Editar

- O `ProtectedRoute` verifica token expirado e tenta **refresh** em `POST /token/refresh`.

---

## Comunicação com o backend

As URLs do backend são lidas do `.env` do frontend:

VITE_API_URL=http://localhost:3000

bash
Copiar
Editar

### Principais endpoints usados

| Método | Rota                                    | Uso                          |
| -----: | --------------------------------------- | ---------------------------- |
|   POST | `/login`                                | Autenticação                 |
|   POST | `/token/refresh`                        | Renovar token                |
|    GET | `/entregas/minhas`                      | Minhas Entregas (entregador) |
|    PUT | `/entregas/:id/concluir`                | Concluir entrega             |
|   POST | `/entregas/:id/registrar-pagamento`     | Registrar pagamento          |
|    GET | `/analitico/entregas-por-dia-da-semana` | Gráfico entregas por dia     |
|    GET | `/analitico/faturamento-mensal`         | Faturamento mensal           |
|    GET | `/analitico/inadimplencia`              | Inadimplência                |
|    GET | `/analitico/resumo-financeiro`          | Cards financeiros            |
|    GET | `/analitico/entregas-por-dia`           | Resumo por dia               |
|    GET | `/analitico/entregas-tempo-real`        | Tempo real                   |
|    GET | `/analitico/entregas-por-entregador`    | Ranking                      |
|    GET | `/analitico/notificacoes-recentes`      | Notificações                 |
|    GET | `/padarias` / `PATCH` / `DELETE`        | Admin padarias               |

---

## Como rodar o projeto localmente

1. Clonar este repositório

```bash
git clone https://github.com/Luizbragga/padaria-frontend.git
cd padaria-frontend
Instalar dependências

bash
Copiar
Editar
npm install
Criar .env

env
Copiar
Editar
VITE_API_URL=http://localhost:3000
Rodar em desenvolvimento

bash
Copiar
Editar
npm run dev
App: http://localhost:5173

Build de produção

bash
Copiar
Editar
npm run build
npm run preview
Estrutura do projeto
pgsql
Copiar
Editar
padaria-frontend/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
Status do projeto
Frontend em desenvolvimento

Backend funcional

Pronto para integração total e uso em ambiente real

Contato
Luiz Braga
📧 luizbragga@gmail.com
🔗 https://www.linkedin.com/in/luiz-henrique-333214287/
```
