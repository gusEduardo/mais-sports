# Autenticação e CRUD de usuários

Este guia descreve o cadastro, o login e as operações de usuários disponíveis no
backend Express do +Sports. A aplicação persiste os dados no Neon PostgreSQL e
usa `bcrypt` para não armazenar senhas em texto puro.

## 1. Arquitetura

O fluxo é dividido em três camadas:

1. As páginas `public/views/cadastro.html` e `public/views/login.html` validam os
   campos no navegador e enviam JSON para o servidor com `fetch`.
2. `src/routes/usuarioRoute.js` encaminha cada URL ao controller correspondente.
3. `src/controllers/usuarioController.js` aplica as regras de negócio e chama
   `src/repositories/usuarioRepository.js`, que executa as queries parametrizadas
   usando o pool de `src/db/pool.js`.

O servidor lê `DATABASE_URL` para conectar ao Neon. A API fica disponível na
porta `3000` quando executada localmente.

## 2. Arquivos e dependências

- **`src/repositories/usuarioRepository.js`**: consultas SQL para criar, buscar,
  listar, atualizar e remover usuários.
- **`src/controllers/usuarioController.js`**: hash e comparação de senha,
  emissão do JWT, respostas HTTP e tratamento de erros.
- **`src/routes/usuarioRoute.js`**: rotas REST de usuários.
- **`src/middlewares/authMiddleware.js`**: validação Bearer JWT e autorização
  por perfil/titularidade.
- **`src/app.js`**: configura `express.json()` antes das rotas e registra
  `usuarioRoute`.
- **`public/views/cadastro.html`**: envia o cadastro e inicia a sessão local
  após receber `201 Created`.
- **`public/views/login.html`**: autentica no servidor, persiste os dados
  retornados e redireciona ao perfil.
- **`public/js/auth.js`**: expõe `SportsAuth.setUser`, `getUser` e `clearUser`,
  que operam sobre a chave `sportsUser` no `localStorage`.
- **`public/js/global.js`**: atualiza os controles da navegação quando existe
  um usuário salvo.

O projeto usa ES Modules: o `package.json` define `"type": "module"` e os
módulos do backend usam `import` e `export default`.

Dependências relevantes em `package.json`:

- `bcrypt`: cria e verifica hashes de senha.
- `pg`: conecta o servidor ao PostgreSQL do Neon.
- `express`: servidor HTTP e parser JSON.
- `jsonwebtoken`: assinatura e validação dos tokens de acesso.
- `cors`: está listado como dependência, mas **não é ativado atualmente** em
  `src/app.js`. Quando a página e a API são servidas pelo mesmo endereço
  (`http://localhost:3000`), o navegador não precisa de CORS. Se o frontend
  for servido em outra origem/porta, configure `cors()` no Express para permitir
  explicitamente essa origem antes de registrar as rotas.

## 3. Preparar e executar

1. Instale as dependências do projeto:

   ```bash
   npm install
   ```

2. Configure `DATABASE_URL` para o banco Neon. Em desenvolvimento, o projeto
   pode carregar a variável de `.env` ou `.env.local`; esses arquivos não devem
   ser versionados.

3. Configure `JWT_SECRET` com pelo menos 32 bytes aleatórios. O arquivo
   `.env.example` lista as variáveis esperadas; adicione-as ao `.env.local`
   existente (ou copie o exemplo se o arquivo ainda não existir) e gere o
   segredo, por exemplo, com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
   Para conceder acesso administrativo, informe os e-mails autorizados em
   `JWT_ADMIN_EMAILS`, separados por vírgula. Essa allowlist é mantida no
   servidor; crie previamente as contas administrativas fora do cadastro
   público, que rejeita esses e-mails reservados.

4. Confirme que o banco contém a tabela `usuarios` com as colunas consumidas
   pelo código: `id`, `nome`, `email`, `senha`, `cpf`, `uf` e `criado_em`.
   **Atenção:** `src/db/schema.sql` atualmente cria as tabelas de eventos e
   organizadores, mas não declara `usuarios`. Portanto, `npm run db:migrate`
   não cria essa tabela; ela precisa existir no banco por uma migração/configuração
   separada antes de usar cadastro e login em um banco novo.

5. Inicie o servidor:

   ```bash
   npm start
   ```

   As páginas são servidas pelo Express e a API fica em
   `http://localhost:3000`.

## 4. Rotas disponíveis

| Método | Endpoint | Comportamento |
|---|---|---|
| `POST` | `/usuarios` | Público. Cria o usuário e inicia sessão com JWT. |
| `POST` | `/usuarios/login` | Público. Valida e-mail e senha; retorna JWT + dados públicos ou `401` para credenciais inválidas. |
| `GET` | `/usuarios` | Exige token e perfil `admin`. |
| `PUT` | `/usuarios/:id` | Exige token; permite ao titular atualizar seus dados ou ao perfil `admin` atualizar qualquer usuário. |
| `DELETE` | `/usuarios/:id` | Exige token e perfil `admin`. |

As páginas e rotas de eventos permanecem públicas. Envie tokens no cabeçalho
`Authorization: Bearer <token>`. Tokens expiram em uma hora; tokens ausentes,
inválidos ou expirados retornam `401`, e usuários autenticados sem permissão
recebem `403`.

O parser JSON precisa estar registrado antes das rotas:

```js
app.use(express.json());
app.use(usuarioRoute);
```

### Criar usuário

O cadastro envia `nome`, `email`, `senha`, `cpf` e `uf` em JSON. Exemplo do
corpo esperado:

```json
{
  "nome": "Ana Souza",
  "email": "ana@example.com",
  "senha": "uma-senha-fornecida-pelo-usuario",
  "cpf": "00000000000",
  "uf": "RJ"
}
```

O controller executa `bcrypt.hash(senha, 10)` e passa o hash ao repositório.
O repositório grava o hash na coluna `senha` com parâmetros SQL (`$1` a `$5`) e
retorna os campos públicos. O formulário exige CPF porque o backend inclui esse
campo na inserção.

### Autenticar

O login envia somente e-mail e senha:

```json
{
  "email": "ana@example.com",
  "senha": "a-senha-digitada"
}
```

`buscarPorEmail(email)` consulta o usuário e recupera o hash armazenado. O
controller usa `bcrypt.compare(senhaDigitada, usuario.senha)`; a senha recebida
não é comparada diretamente com o hash nem devolvida na resposta.

Resposta de sucesso (`200`):

```json
{
  "message": "Login realizado com sucesso.",
  "token": "<JWT>",
  "usuario": {
    "id": 1,
    "nome": "Ana Souza",
    "email": "ana@example.com",
    "acesso": "usuario"
  }
}
```

O payload do token contém somente o identificador do usuário (`sub`) e seu
perfil (`acesso`), além das claims de emissão e expiração. Senha, hash, CPF e
UF não são incluídos. O perfil `admin` é atribuído somente aos e-mails listados
em `JWT_ADMIN_EMAILS`.

Para e-mail inexistente, senha incorreta ou campos ausentes, a API responde
`401` com uma mensagem genérica para não revelar se o e-mail está cadastrado:

```json
{ "message": "E-mail ou senha inválidos." }
```

### Listar, atualizar e remover

- `GET /usuarios` seleciona `id`, `nome`, `email`, `cpf`, `uf` e `criado_em`;
  a senha não faz parte da seleção.
- `PUT /usuarios/:id` recebe `nome`, `email` e `uf` em JSON.
- `DELETE /usuarios/:id` remove o usuário correspondente ao ID.

O repository usa queries parametrizadas para esses comandos, em vez de montar
SQL concatenando valores da requisição.

## 5. Ciclo de vida ponta a ponta

### Cadastro

1. A pessoa preenche o formulário em `cadastro.html`. O navegador valida nome,
   telefone, e-mail, CPF, senha, confirmação e aceite dos termos.
2. O script envia um `POST http://localhost:3000/usuarios` com
   `Content-Type: application/json`.
3. `express.json()` transforma o corpo em `req.body`; a rota chama
   `usuarioController.criar`.
4. O controller gera um hash bcrypt com custo `10` e o repository insere os
   dados no Neon.
5. Se o servidor responder `201`, o frontend grava os dados públicos em
   `sportsUser` e o JWT em `sportsToken`, via `SportsAuth.setSession`, e exibe
   o modal de sucesso. Erros são mostrados no formulário.

### Login

1. A pessoa informa e-mail e senha em `login.html`; a página faz validação
   básica antes da requisição.
2. O frontend envia `POST http://localhost:3000/usuarios/login`.
3. A rota chama `usuarioController.login`, que busca o registro pelo e-mail e
   compara a senha com o hash usando `bcrypt.compare`.
4. Em caso de sucesso, a resposta `200` inclui o token e os dados públicos,
   sem senha ou CPF. O frontend salva o token e `usuario` e navega para
   `telaPerfil.html`.
5. Em caso de `401`, a mensagem JSON do servidor aparece no campo de erro da
   senha; a tela não cria uma sessão.

## 6. Sessão e interface

`SportsAuth` grava e lê o objeto JSON sob a chave `sportsUser` e o token sob
`sportsToken`. `SportsAuth.fetchWithAuth(url, options)` envia o cabeçalho
Bearer nas chamadas autenticadas. O `global.js`
consulta essa chave durante o `DOMContentLoaded`; quando há usuário, substitui
os links de entrada/cadastro da navegação por um link para o perfil com o
primeiro nome e um botão **Sair**. O logout remove `sportsUser` e
`sportsToken`, e redireciona para `index.html`. A página `telaPerfil.html`
também usa `sportsUser.nome` para renderizar o nome e as iniciais do avatar.

Essa persistência no navegador não substitui a validação do servidor: rotas
privadas exigem o JWT no cabeçalho. Não use a presença isolada de `sportsUser`
no `localStorage` como autorização.

## 7. Limitações e cuidados de segurança

- A tabela `usuarios` não está declarada no `src/db/schema.sql` atual; bancos
  novos precisam de uma migração própria antes de executar essas rotas.
- O pacote `cors` está instalado, mas sem middleware `cors()` ativo. Mantenha
  frontend e API na mesma origem ou habilite uma origem explícita se forem
  separados.
- Configure `JWT_SECRET` em cada ambiente; sem um segredo forte, login e
  cadastro não emitem tokens. Mantenha-o fora do controle de versão.
- O CRUD de usuários exige autenticação; listagem e remoção são restritas a
  administradores, e atualização é limitada ao titular ou a um administrador.
- `SportsAuth` armazena dados no `localStorage`, acessível a scripts executados
  na mesma origem; não armazene senha, hash ou CPF no navegador. Proteja a
  aplicação contra XSS e limpe a sessão ao sair.
- O cadastro atual não valida o formato/checksum do CPF no backend e não
  implementa tratamento específico para e-mail duplicado. Considere validação
  e restrições apropriadas na camada de banco/API antes de produção.
- O middleware global de erros retorna JSON para caminhos `/api/...`; as rotas
  de usuários não usam esse prefixo. Falhas inesperadas nessas rotas podem
  receber a página HTML de erro atual, embora os erros de credenciais do login
  sejam respondidos diretamente como JSON `401`.
