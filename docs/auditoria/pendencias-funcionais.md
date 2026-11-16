# Funcionalidades a introduzir ou concluir

Lista resultante da comparação dos 28 requisitos do resumo técnico com o commit `5e7c309` da branch CRUD, em 16/11/2026. **27 requisitos precisam de trabalho: 8 sem implementação operacional e 19 com implementação parcial.** Os números abaixo são os identificadores originais, sem criar um RF-023.

A prioridade Alta/Média é a do PDF. A ordem de implementação sugerida considera dependências: primeiro contas e permissões, depois gestão de eventos/quadras, inscrições, pagamentos e comunicação. Esta auditoria acrescenta testes e documentação; as funcionalidades abaixo permanecem pendentes.

## Introduzir funcionalidades ausentes

| RF | Prioridade | Trabalho necessário | Critério para concluir |
| --- | --- | --- | --- |
| RF-002 | Alta | Cadastro de organizador com organização, CNPJ único, telefone, endereço, e-mail único, senha, aceite e papel. | Organizador cria conta, autentica e acessa suas próprias funções de gestão; não pode administrar eventos de terceiros. |
| RF-005 | Alta | Recuperação de senha por e-mail e redefinição com token de uso único e expiração. | Link válido troca a senha; token expirado/reutilizado é recusado; nova senha segue a política mínima. |
| RF-009 | Alta | Painel e API para criar/editar/publicar eventos, com imagens, regulamento, modalidade, data, local, vagas e lotes. | Apenas organizador autenticado altera seus eventos; datas retroativas são recusadas e vagas vendidas são preservadas. |
| RF-010 | Alta | CRUD administrativo de quadras com coordenadas, modalidades e status oficial. | Alteração aparece no mapa; somente administrador altera status; excluir quadra com partida futura é bloqueado. |
| RF-011 | Alta | Cancelamento de inscrição e solicitação de reembolso ligados ao pagamento. | Prazo é verificado no servidor; cancelamento elegível registra reembolso e devolve a vaga ao lote correto. |
| RF-014 | Alta | Avaliações de quadras com nota, comentário, média e denúncia. | Cada conta tem no máximo uma avaliação por quadra; atualização da média e encaminhamento à moderação funcionam. |
| RF-015 | Alta | Fila de denúncias e painel de moderação com permissões e trilha de decisões. | Cada análise registra responsável/data/decisão; usuário comum não restaura conteúdo removido. |
| RF-027 | Média | E-mails transacionais de cadastro, inscrição, pagamento e cancelamento, com registro de entrega/falha e retentativa. | Ações críticas disparam confirmação e falhas podem ser reprocessadas sem duplicar mensagens indevidamente. |

## Concluir funcionalidades parciais

| RF | Prioridade | O que deve ser acrescentado/corrigido | Critério para concluir |
| --- | --- | --- | --- |
| RF-001 | Alta | Migração de `usuarios`; campos cadastrais exigidos pelo PDF; validação no servidor; unicidade; persistência do aceite e da versão dos termos. | Banco novo permite cadastrar; dados obrigatórios inválidos são recusados sem gravação; e-mail/CPF duplicados têm resposta legível; todos os campos do cadastro são preservados. |
| RF-003 | Alta | Sessão verificável, cadastro ativo, papéis e autorização; login por e-mail ou CPF/CNPJ; limitação de tentativas. | Sem sessão não há leitura/alteração privilegiada; permissões são verificadas pelo servidor; tentativas excessivas são limitadas. |
| RF-004 | Alta | Checkout ligado ao evento/modalidade/lote e participante reais; pedido, inscrição e comprovante persistidos. | `?evento=3` mostra Royal Night Run e seus valores; inscrição e vaga só são confirmadas após pagamento aprovado. |
| RF-006 | Alta | Unificar saídas desktop/móvel; limpar estado por conta; invalidar sessão; proteger páginas restritas. | Todos os botões Sair removem autenticação; retorno ao perfil exige novo login; dados da conta anterior não aparecem na próxima. |
| RF-007 | Alta | Ligar modal de perfil à API autenticada e salvar telefone, e-mail, interesses e foto por usuário. | Edição reaparece após novo login e em outro navegador; conflitos de e-mail/CPF/CNPJ são recusados; acesso a outra conta é negado. |
| RF-008 | Média | Favoritar/desfavoritar quadras e eventos, API persistente e lista no perfil. | Apenas autenticados salvam; repetir ação não duplica item; lista é isolada por conta. |
| RF-012 | Alta | Lotes e capacidade no banco, operações de gestão e reserva/confirmação transacional de vagas. | Concorrência não vende a mesma vaga duas vezes; lote esgotado bloqueia inscrição; troca de lote preserva inscrições confirmadas. |
| RF-013 | Alta | Partidas com modalidade/região, confirmação e desistência, lista e teto de participantes. | Última vaga não pode ser ocupada por duas contas; desistência libera vaga imediatamente; lista persiste. |
| RF-016 | Alta | Fazer modalidade/filtros/ordenação alterarem os eventos exibidos a partir de dados consistentes. | “Todas” restaura eventos ativos; modalidade exibe apenas correspondentes; esgotados/encerrados têm status correto. |
| RF-017 | Alta | Regulamento e lotes reais; substituir cards que apontam ao template genérico por eventos correspondentes. | Cada card abre seu próprio evento com informações completas e CTA conforme status/vagas/data. |
| RF-018 | Alta | Histórico autenticado, estados e comprovantes de inscrições reais. | Conta nova vê lista vazia; cada usuário acessa somente suas inscrições ativas/passadas/canceladas. |
| RF-019 | Média | Estatísticas calculadas de eventos ativos e participantes confirmados no mês corrente. | Confirmação/cancelamento muda os totais corretos; troca de mês altera a agregação. |
| RF-020 | Alta | Calendário por mês com navegação e destaques derivados dos eventos confirmados. | Setas mudam mês/ano corretamente e apenas dias de eventos confirmados são destacados e consultáveis. |
| RF-021 | Alta | Busca de eventos e quadras por texto, nome, modalidade e local, com lista de resultados. | Enter/pesquisa apresenta correspondências; termo sem correspondência mostra mensagem informativa. |
| RF-022 | Alta | Integrar quadras/status persistidos e acrescentar filtro por status combinado com modalidade. | Mudança administrativa reflete no mapa/lista; filtros produzem os mesmos locais nos cards e marcadores. |
| RF-024 | Alta | Identificar e registrar versão vigente de Termos/Política; completar links dos rodapés. | Documentos integrais são acessíveis em todos os caminhos e a versão aceita no cadastro pode ser identificada. |
| RF-025 | Alta | Gateway externo, pedido/transação, retorno autenticado e processamento idempotente de webhooks. | Pagamento aprovado confirma uma vez; recusa/pendência não confirma vaga; dados sensíveis não são armazenados pela aplicação. |
| RF-026 | Alta | Fonte persistente das coordenadas, integração em Joga Junto e tratamento de indisponibilidade do mapa. | Marcadores refletem os cadastros e filtros; falha do serviço mostra alternativa sem interromper as demais funções. |
| RF-029 | Alta | Validação dos quatro campos, envio por API/e-mail à equipe e confirmação visual. | Formulário vazio/e-mail inválido não envia; envio válido é recebido pela equipe; falha permite tentar novamente. |

## Correções prioritárias na base atual

Antes de usar o CRUD em um ambiente público, corrigir BUG-01 a BUG-10 do [relatório](relatorio-crud.md): migração, validação, conflitos, IDs, autorização, respostas JSON, sessão, limitação de tentativas, payload completo e origem da API. Em seguida, resolver logout, isolamento entre contas e persistência de perfil. Esses ajustes sustentam os RF-001, RF-003, RF-006 e RF-007 e evitam construir os demais fluxos sobre uma autenticação apenas visual.

O Guia de Fluxo de Desenvolvimento enviado pelo usuário exige novas branches por área, commits no padrão Conventional Commits e revisão antes da entrada na `main`. Para as próximas implementações, usar branches como `bugfix/autorizacao-usuarios`, `feature/cadastro-organizador` e `feature/inscricoes-eventos`, com PRs separados por área.
