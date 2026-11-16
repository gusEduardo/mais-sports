# Auditoria da branch CRUD

**A branch CRUD não está 100% funcional nem pronta para uso público.** Os fluxos básicos de usuários e consulta de eventos funcionam com o banco preparado, mas foram reproduzidas falhas de validação, autorização, sessão e integração entre interface e backend. Os testes de aceitação permanecem falhando para tornar esses problemas verificáveis.

Auditoria em **16/11/2026**, branch de trabalho **`feature/verificacao-crud`**, código avaliado **`5e7c30930cca7f3ef7ee8257b768e451d6bed00e`**. A `main` e a `CRUD` foram preservadas. As alterações da auditoria acrescentam testes, dependências de desenvolvimento e documentação.

## Fluxo de desenvolvimento aplicado

O guia enviado pelo usuário foi consultado em `D:\a Faculdade\3 - 2026.2\Projetos\Guia_Fluxo_Desenvolvimento.docx`. Foram atualizadas as referências remotas com `git fetch origin`, criada a branch com o prefixo permitido `feature/` a partir de `origin/main` (`2c23c1c`) e incorporada a `origin/CRUD` por fast-forward. A nova branch chegou exatamente ao commit avaliado, sem conflitos. O nome usa minúsculas e hífens, conforme o guia.

A finalidade é verificar e documentar a CRUD. A implementação dos demais RF é trabalho futuro, organizado na [lista de pendências](pendencias-funcionais.md). A aprovação e o merge na `main` cabem à revisão prevista no guia; esta auditoria não aprova uma integração de código com falhas conhecidas.

O PDF foi usado como especificação do produto. Seus textos de orientação acadêmica não foram tratados como tarefas adicionais. O DOCX foi usado para o fluxo Git solicitado pelo usuário.

## Ambiente e método

- Node.js 24.21.0 e dependências do projeto, incluindo Express, bcrypt e pg.
- `node:test` para requisições HTTP reais à aplicação Express e verificação da persistência com PGlite 0.5.16, PostgreSQL executado localmente em WASM.
- O ponto substituído nos testes é `pool.query`: o SQL original dos repositories é executado pelo PGlite. Não foram substituídos controllers, rotas, respostas HTTP ou funções de hash.
- A fixture de `usuarios` é separada do schema de produção e declara explicitamente colunas, campos obrigatórios e unicidade de e-mail/CPF. **Não é evidência do schema real do Neon.** Um teste independente executa somente `schema.sql` e demonstra que a tabela está ausente.
- Playwright 1.62.1, Chromium e WebKit, viewports 1440×1000 e 390×844. Foram aproveitados do Buraco a abordagem de servidor isolado, `node:test`, Playwright e capturas, sem importar regras do jogo nem alterar aquele repositório.
- Tailwind e Leaflet originais são baixados e reutilizados em cache. Fontes, imagens remotas e tiles de mapa são bloqueados para tornar os testes locais determinísticos. Os marcadores e filtros usam a biblioteca Leaflet real. A disponibilidade dos tiles não foi validada.
- O relógio dos navegadores é fixado em 16/11/2026 às 12h de São Paulo. O servidor principal dos testes de navegador usa a porta 3000, por causa das URLs fixas do produto; outra porta/origem é aberta para reproduzir esse defeito.

Nenhum teste utilizou credenciais, registros de pessoas reais ou conexão ao Neon. Não foi possível atestar conectividade/TLS, permissões ou schema do Neon; também não foram exercitados pagamentos, envio real de e-mail ou a implantação publicada. O processo de migração completo `migrate.js` e o entrypoint `server.js` não entram na cobertura dos módulos carregados; o schema SQL e a aplicação Express são exercitados diretamente.

## Resultados

Antes da auditoria, `npm run build` passava e `npm test` encontrava **zero testes**. O build existente verifica sintaxe e não comprova funcionamento dos fluxos.

| Verificação | Casos | Aprovados | Falhas |
| --- | ---: | ---: | ---: |
| API, SQL e middleware | 64 | 31 | 33 |
| Chromium | 52 | 35 | 17 |
| WebKit | 52 | 35 | 17 |
| Total de execuções | 168 | 101 | 67 |

Os dois navegadores repetem os mesmos 52 cenários e reproduziram as mesmas 17 falhas; portanto, o total de execuções não equivale a 168 fluxos distintos. A inspeção dos demais RF também utiliza análise do código e das rotas, sem afirmar teste ponta a ponta de funcionalidades ainda ausentes.

Os testes de API cobrem 100% das linhas, funções e ramificações **dos módulos de backend carregados pela suíte**. Essa cobertura inclui os caminhos que falham nos critérios de aceitação e não representa 100% dos requisitos nem comprova a integração ao Neon. Os resultados individuais e condições ficam em [resultados.json](resultados.json).

## O que funcionou

- Cadastro válido com hash bcrypt de custo 10 e resposta sem senha/hash.
- Login válido, espaços em volta do e-mail, senha incorreta, conta inexistente, campos ausentes/tipos incorretos e tentativa de injeção SQL.
- Listagem vazia e ordenada; atualização de nome/e-mail/UF preservando CPF/hash; exclusão, repetição da exclusão e login recusado após remoção.
- Queries parametrizadas tratando sintaxe SQL como dados.
- Consulta dos quatro eventos e seus organizadores; organizador ausente; IDs inválidos; evento inexistente; falhas de banco; respostas JSON/HTML adequadas nas rotas de eventos.
- Formulários com validação no navegador, feedback de indisponibilidade, botões reabilitados e mostrar/ocultar senha.
- Cadastro e login no navegador, nome real no perfil e persistência visual após recarga, em desktop e móvel.
- Logout global, carregar mais/menos, abertura do evento por teclado, bloqueios do CTA por status/vagas/data e retorno à lista.
- Mapa e filtro por modalidade, FAQ, acesso aos textos de Termos/Privacidade e ausência de rolagem horizontal nas quatro páginas medidas a 390px.

A medição de largura não equivale a uma aprovação visual completa em todos os aparelhos. A tabela de resultados do perfil usa rolagem interna no móvel, e recursos remotos bloqueados pelo teste podem alterar fontes e aparência.

## Defeitos reproduzidos

Os códigos abaixo identificam grupos de falhas, e não a quantidade de asserções. “Crítica” indica leitura ou alteração de dados sem controle de acesso; a prioridade de correção é a avaliação desta auditoria.

| ID | Prioridade | Reprodução e resultado observado | Local principal |
| --- | --- | --- | --- |
| BUG-01 | Alta | Executar `schema.sql` em banco vazio não cria `usuarios`; cadastro/login dependem de preparação externa. | `src/db/schema.sql` |
| BUG-02 | Alta | POST aceita nome vazio, e-mail/CPF/UF inválidos, senha curta e termos ausentes/recusados com 201. Campos ausentes/tipos inválidos podem virar 500. PUT também grava dados inválidos. | `src/controllers/usuarioController.js` |
| BUG-03 | Alta | Com restrições UNIQUE na fixture, e-mail/CPF duplicado e conflito no PUT resultam em 500 HTML. Duas criações concorrentes produzem 201/500, em vez de 201/409. A existência dessas restrições no Neon não foi confirmada. | Controller e middleware de erro |
| BUG-04 | Média | DELETE com `abc`, `1abc` ou inteiro fora do limite produz erro de banco/500; `0` e `-1` retornam 404 em vez de validação de ID. | `src/routes/usuarioRoute.js` |
| BUG-05 | Crítica | Sem login, GET lista dados pessoais, incluindo CPF; PUT altera e DELETE remove a conta. | `usuarioRoute.js`, sem middleware de autorização |
| BUG-06 | Alta | JSON malformado e falha de banco em cada operação de usuário retornam HTML. No cadastro duplicado, o HTML inteiro aparece no campo de erro. | `erroMiddleware.js`, `cadastro.html` |
| BUG-07 | Crítica | Login válido responde dados do usuário, sem cookie/token de sessão verificável. Não há identidade autenticada/papel para proteger operações. | `usuarioController.login` |
| BUG-08 | Alta | 25 logins inválidos consecutivos continuam recebendo 401, sem limitação. O PDF exige limitação, mas não fixa limiar; 25 é o limiar escolhido no teste. | Rota de login |
| BUG-09 | Alta | Preencher telefone, interesse e termos envia apenas nome/e-mail/senha/CPF/UF; demais dados são descartados. | `cadastro.html` |
| BUG-10 | Alta | Abrir login/cadastro em outra porta/origem mantém a chamada a `http://localhost:3000`; o fluxo deixa de funcionar naquela origem. | `login.html`, `cadastro.html` |
| BUG-11 | Alta | Visitante abre perfil e Meus Eventos diretamente, sem redirecionamento ao login. | `telaPerfil.html`, `meus-eventos.html` |
| BUG-12 | Alta | No perfil móvel: menu → Encerrar Sessão → confirmar. Vai ao login, mas `sportsUser` continua salvo. | Handler `logoutConfirm` de `telaPerfil.html` |
| BUG-13 | Alta | Editar nome no perfil altera o texto local; SELECT no banco mantém “Ana Souza”. Não há PUT do formulário. | Modal de perfil |
| BUG-14 | Alta | Conta A salva telefone/endereço em `profileData`, sai pelo botão global e a conta B acessa o modal: telefone de A aparece para B. Chaves locais não são isoladas/limpas por conta. | `auth.js`, `global.js`, perfil |
| BUG-15 | Média | Clicar Ciclismo na Home mantém os mesmos cards; só muda o botão ativo. | `public/js/index.js` |
| BUG-16 | Média | Expandir a busca do cabeçalho, digitar termo inexistente e pressionar Enter não mostra resultados nem mensagem de ausência. | `global.js`, páginas de consulta |
| BUG-17 | Média | Os quatro campos do Contato não têm validação obrigatória. | `contato.html` |
| BUG-18 | Alta | Abrir `/views/checkout.html?evento=3` exibe Corrida do Guerreiro e preços fixos, em vez de Royal Night Run. | `checkout.html` |
| BUG-19 | Média | Clicar “Salvar evento” não faz requisição nem persiste seleção local. | `eventos.html` |
| BUG-20 | Média | Clicar “Próximo mês” mantém o calendário em Junho 2026. | `index.html`, `index.js` |
| BUG-21 | Média | Preencher Contato e clicar Enviar mensagem não envia nada ao servidor. | `contato.html` |
| BUG-22 | Alta | Conta nova, sem inscrições, recebe histórico fixo com Corrida do Guerreiro. | `meus-eventos.html` |

Os defeitos BUG-01 a BUG-10 são da integração de usuários ou de sua base. Os demais incluem lacunas já existentes nas telas, descobertas ao cruzar o website com os requisitos; não são todos regressões introduzidas pelo commit CRUD.

Os códigos HTTP 400 para validação, 409 para conflito e 401/403 para acesso negado são contratos adotados pela suíte para respostas consistentes. O PDF não prescreve esses números nem um limiar exato de tentativas de login. Validar o checksum de CPF e a UF é um critério técnico da auditoria.

## Como reproduzir

```powershell
npm ci
npm run browser:install
npm run build
npm test
npm run test:coverage
npm run test:browser
npm run test:browser -- webkit
```

A porta 3000 precisa estar livre para os testes de navegador. Não configurar banco real para os testes: o helper utiliza PGlite isolado. `npm test`, cobertura e navegadores retornam **código 1 enquanto os defeitos persistirem**; não foram usados `skip` ou `todo` para esconder falhas. O build deve retornar 0.

Os resultados temporários ficam em `.artifacts/`: logs, capturas por caso com falha e capturas de perfil desktop/móvel. O JSON consolidado versionado mantém a lista de casos e condições da execução. Fontes externas necessárias ao primeiro teste de navegador são guardadas em `.artifacts/browser-cache/`.

## Relação com os requisitos

A [matriz dos 28 RF](requisitos-funcionais.md) mostra cada requisito, situação e evidências. A [lista dos 27 RF pendentes](pendencias-funcionais.md) separa funcionalidades ausentes das que exigem conclusão e traz critérios verificáveis para cada entrega.

Para reavaliar a CRUD, corrigir primeiro migração, validação, autenticação/autorização, tratamento de erros e origem da API; em seguida, perfil/logout e os fluxos funcionais restantes. Uma nova execução deve comprovar a passagem dos testes afetados, seguida de validação em uma branch de banco de teste no Neon antes de afirmar funcionamento da integração hospedada.
