# Implementação da autenticação JWT

Este documento explica o planejamento, as decisões e o funcionamento das
alterações feitas para adicionar autenticação JWT ao +Sports. Para instruções
de uso das rotas e do cadastro/login, consulte também
[Autenticação e CRUD de usuários](./autenticacao-e-usuarios.md).

## Objetivo e planejamento

Antes das alterações, o login já consultava o usuário no banco e comparava a
senha com `bcrypt`, mas não emitia credencial para requisições posteriores. O
navegador guardava apenas os dados do usuário, e todas as rotas CRUD de usuários
estavam acessíveis sem autenticação. Também não havia um campo de perfil
declarado no modelo de usuários disponível neste projeto.

O trabalho foi organizado para preservar o que já era público e implementar
autorização sem exigir uma mudança de schema:

1. Reutilizar o login e a comparação bcrypt existentes; adicionar a emissão do
   JWT somente após credenciais válidas.
2. Centralizar assinatura, validação do token e checagem de permissões em
   middleware, para reutilizar o mesmo padrão nas rotas.
3. Proteger operações de usuários de acordo com sua sensibilidade, mantendo
   login, cadastro, páginas e eventos públicos.
4. Atualizar o navegador para armazenar, enviar e remover o token sem expô-lo
   em logs.
5. Cobrir os casos principais com testes e documentar a configuração.

## Alterações e motivos

### Dependência e validação de build

[`package.json`](../package.json) e
[`package-lock.json`](../package-lock.json) incluem `jsonwebtoken`, usado para
assinar e verificar tokens. O comando de build também verifica a sintaxe do
novo middleware de autenticação.

### Middleware JWT

[`src/middlewares/authMiddleware.js`](../src/middlewares/authMiddleware.js) reúne as
responsabilidades de autenticação:

- `getJwtSecret()` lê `JWT_SECRET` do ambiente e rejeita segredo ausente ou
  menor que 32 bytes. Isso evita um segredo fraco ou fixo no código.
- `createAccessToken()` assina com `HS256`, emissor `mais-sports` e expiração de
  uma hora.
- `auth()` exige `Authorization: Bearer <token>`, valida assinatura, algoritmo,
  emissor e expiração com `jwt.verify`, e coloca `{ id, acesso }` em `req.user`.
  Token ausente, inválido ou expirado recebe `401` com resposta padronizada.
- `authAdmin()` exige `acesso: "admin"`; se o token for válido, mas o perfil
  não tiver permissão, responde `403`.
- `authOwnerOrAdmin()` permite atualizar o próprio usuário ou permite a
  operação a um administrador. Os demais usuários autenticados recebem `403`.

O segredo nunca é retornado em respostas nem registrado pelo middleware. Erros
de configuração do servidor seguem o tratamento de erros da aplicação, em vez
de serem confundidos com credenciais inválidas.

### Login, cadastro e perfil

[`src/controllers/usuarioController.js`](../src/controllers/usuarioController.js)
mantém a validação de credenciais existente: procura pelo e-mail e compara a
senha enviada com o hash via `bcrypt.compare`. Só depois de uma comparação
válida cria o token e responde com os campos públicos `id`, `nome`, `email` e
`acesso`. Senha, hash, CPF e UF não entram no payload nem na resposta do login.

Como o schema de usuários deste projeto não define um campo persistente de
perfil, o papel administrativo é determinado pela allowlist do servidor
`JWT_ADMIN_EMAILS`, comparando os e-mails sem diferenciar maiúsculas de
minúsculas. O cliente não pode escolher o próprio papel. Para evitar que alguém
se registre com um endereço administrativo ainda não cadastrado, o endpoint
público de cadastro rejeita e-mails reservados; as contas admin precisam ser
provisionadas fora desse cadastro.

O cadastro também devolve um JWT. Isso mantém o comportamento atual do
formulário, que inicia a sessão local assim que a conta é criada, mas agora a
sessão tem credencial que o servidor pode validar. A validação do segredo ocorre
antes de gravar o novo usuário.

### Proteção das rotas

[`src/routes/usuarioRoute.js`](../src/routes/usuarioRoute.js) aplica os
middlewares diretamente às rotas privadas:

| Rota | Acesso | Motivo |
|---|---|---|
| `POST /usuarios/login` | Público | Permite obter um token. |
| `POST /usuarios` | Público | Permite criar uma conta; endereços admin são reservados. |
| `GET /usuarios` | Autenticado + admin | A listagem inclui dados pessoais e deve ser restrita. |
| `PUT /usuarios/:id` | Titular ou admin | Permite atualizar os próprios dados, sem autorizar alteração de outros usuários. |
| `DELETE /usuarios/:id` | Autenticado + admin | Remoção é uma operação administrativa. |

As rotas e páginas de eventos não foram alteradas e continuam públicas.

### Cliente e sessão no navegador

[`public/js/auth.js`](../public/js/auth.js) passou a guardar o JWT sob
`sportsToken`, junto aos dados públicos em `sportsUser`:

- `setSession(user, token)` grava os dois valores após login ou cadastro.
- `getToken()` lê o token para chamadas autenticadas.
- `fetchWithAuth(url, options)` adiciona
  `Authorization: Bearer <token>` sem imprimir o token no console.
- `clearUser()` remove tanto os dados do usuário quanto o token.

As páginas [`login.html`](../public/views/login.html) e
[`cadastro.html`](../public/views/cadastro.html) validam que a resposta contém
um token antes de criar a sessão. O logout em
[`global.js`](../public/js/global.js) também remove `sportsToken`, inclusive no
caminho alternativo em que o helper de sessão não esteja disponível.

O helper de requisição autenticada fica disponível para chamadas privadas. As
telas atuais não faziam chamadas ao CRUD privado antes desta implementação;
portanto, não foi adicionada uma tela administrativa ou uma nova chamada que
alterasse o comportamento visual do site.

### Configuração e documentação

[`.env.example`](../.env.example) lista:

- `JWT_SECRET`: obrigatório, aleatório e com pelo menos 32 bytes.
- `JWT_ADMIN_EMAILS`: opcional; e-mails autorizados como administradores,
  separados por vírgula.

O arquivo `.env.example` não contém um segredo real. O valor deve ser criado e
configurado em `.env.local` ou no gerenciador de segredos do ambiente de
deploy, sem ser commitado. A documentação existente foi atualizada com as
rotas, permissões e o ciclo de sessão.

## Fluxo em execução

1. O navegador envia e-mail e senha para `POST /usuarios/login`.
2. O controller busca o usuário e verifica a senha com bcrypt.
3. Se a autenticação falhar, retorna `401` sem indicar se o e-mail existe.
4. Se for válida, o servidor cria um token com `sub` (ID), `acesso`, `iss`,
   `iat` e `exp`, assinado por `JWT_SECRET`, e responde junto aos dados públicos.
5. O navegador armazena o token e, numa chamada privada, o envia no cabeçalho
   Bearer.
6. `auth()` verifica o token e disponibiliza o usuário em `req.user`. O
   middleware de perfil/titularidade então autoriza a operação ou responde
   `403`.
7. Ao sair, o navegador remove o token e os dados de sessão locais.

Um JWT assinado não é criptografado: seu conteúdo pode ser lido por quem o
possui. Por isso, o payload mantém apenas o necessário para identidade e
autorização, e o token tem validade limitada. O armazenamento em `localStorage`
também exige proteção contra XSS e não deve ser tratado como substituto da
validação do servidor.

## Testes

Os testes em [`test/auth.test.js`](../test/auth.test.js) cobrem emissão e
expiração, payload sem dados sensíveis, senha incorreta, token ausente/inválido,
permissões de admin e titularidade, além das rotas HTTP. Os testes em
[`test/auth-client.test.js`](../test/auth-client.test.js) verificam o
armazenamento, envio do cabeçalho Bearer e remoção do token pelo helper.

Comandos executados durante a implementação:

```text
npm test       — 13 testes aprovados
npm run build  — aprovado
```

Os testes HTTP usam um repositório simulado; eles não substituem um teste
conectado ao banco Neon configurado para cada ambiente.
