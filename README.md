Padaria Frontend

Este é o frontend do sistema de entregas recorrentes para padarias.
Ele foi desenvolvido em React (Vite) e consome a API REST do backend para exibir e gerenciar rotas, entregas, pagamentos e estatísticas de forma prática e organizada.

Repositório do Backend

O repositório do backend deste sistema está disponível em:
👉 Padaria Backend

Tecnologias utilizadas

React (Vite)

React Router DOM (rotas)

Axios (requisições HTTP)

TailwindCSS (estilização)

Context API (autenticação e estado global)

ESLint + Prettier (padrões e qualidade de código)

O que este frontend faz

Realiza login de usuários (admin, gerente e entregador) com JWT

Controla acesso às páginas de acordo com a role do usuário

Exibe painel administrativo com estatísticas e relatórios

Exibe painel do gerente com gestão de entregas, pagamentos e inadimplência

Exibe painel do entregador com:

rota no mapa

entregas do dia

botão de concluir entrega

registrar pagamentos

relatar problemas

Consome a API REST do backend em tempo real

Estrutura pronta para dashboards e relatórios visuais

Autenticação e segurança

O frontend utiliza o token JWT fornecido pelo backend para autenticar o usuário.

O token é armazenado em localStorage e enviado automaticamente no header Authorization em todas as requisições.

Comunicação com o backend

O frontend se comunica com o backend via API REST, recebendo e enviando dados em formato JSON.

Como rodar o projeto localmente

Clone este repositório:

git clone https://github.com/Luizbragga/padaria-frontend.git


Acesse a pasta:

cd padaria-frontend


Instale as dependências:

npm install


Configure as variáveis de ambiente (crie um arquivo .env baseado no .env.example):

VITE_API_URL=http://localhost:3000


Inicie o servidor de desenvolvimento:

npm run dev


O frontend estará rodando localmente em:
👉 http://localhost:5173

Estrutura do projeto
padaria-frontend/
├── public/            # Arquivos estáticos
├── src/
│   ├── components/    # Componentes reutilizáveis
│   ├── pages/         # Páginas (rotas principais)
│   ├── context/       # Context API (auth, estados globais)
│   ├── hooks/         # Hooks customizados
│   ├── utils/         # Funções utilitárias
│   ├── App.jsx        # Roteamento principal
│   └── main.jsx       # Ponto de entrada
├── .env.example       # Variáveis de ambiente exemplo
├── package.json       # Dependências e scripts

Status do projeto

Frontend em desenvolvimento 🚧

Backend funcional ✅

Pronto para integração total e uso em ambiente real 🔥

Contato

Caso queira saber mais, testar o sistema ou contribuir:

👤 Luiz Braga
📧 luizbragga@gmail.com

🔗 LinkedIn
