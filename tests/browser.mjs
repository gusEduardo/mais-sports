import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import app from '../src/app.js';
import { createHarness, validUser } from './helpers/harness.mjs';

const engine = process.argv[2] || 'chromium';
assert.ok(['chromium', 'webkit'].includes(engine), 'Use chromium ou webkit');
const output = `.artifacts/browser/${engine}`;
await mkdir(output, { recursive: true });
const api = await createHarness({ port: 3000, host: '::' });
const alternate = app.listen(0, '127.0.0.1');
await once(alternate, 'listening');
const alternateBase = `http://127.0.0.1:${alternate.address().port}`;
let browser;
const results = [];
const cache = new Map();
const resources = {
  'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4': 'tailwind.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js': 'leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css': 'leaflet.css',
};

// Cache dos recursos reais do site. Sem substitutos para Tailwind ou Leaflet.
async function cacheResources() {
  await mkdir('.artifacts/browser-cache', { recursive: true });
  for (const [url, name] of Object.entries(resources)) {
    const path = `.artifacts/browser-cache/${name}`;
    let body;
    try { body = await readFile(path); }
    catch {
      const response = await fetch(url);
      assert.ok(response.ok, `Dependência externa indisponível: ${url}`);
      body = Buffer.from(await response.arrayBuffer());
      await writeFile(path, body);
    }
    cache.set(url, body);
  }
}

async function check(id, name, run, { mobile = false, seed = false, offlineMap = false } = {}) {
  await api.reset();
  if (seed) assert.equal((await api.request('/usuarios', { method: 'POST', body: validUser })).status, 201);
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    ...(mobile ? { hasTouch: true } : {}),
  });
  // Evita depender de fontes, imagens remotas e tiles. Bibliotecas JS/CSS são
  // as originais, baixadas acima. Isso não valida a disponibilidade dos tiles.
  await context.route('**/*', async route => {
    const url = route.request().url();
    if (url.startsWith(api.base) || url.startsWith(alternateBase) || url.startsWith('data:')) return route.continue();
    if (offlineMap && url.includes('leaflet')) return route.abort();
    if (cache.has(url)) return route.fulfill({ status: 200, body: cache.get(url), contentType: url.endsWith('.css') ? 'text/css' : 'application/javascript' });
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  // Data da auditoria: mantém os cenários de eventos reproduzíveis no futuro.
  await page.clock.setFixedTime(new Date('2026-11-16T15:00:00Z'));
  const errors = [];
  const calls = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method())) calls.push({ method: request.method(), url: request.url(), body: request.postDataJSON() });
  });
  const result = { id, name, viewport: mobile ? '390x844' : '1440x1000' };
  try {
    await run({ page, context, errors, calls });
    result.status = 'pass';
  } catch (error) {
    result.status = 'fail'; result.error = error.message;
    await page.screenshot({ path: `${output}/${id}.png`, fullPage: true }).catch(() => {});
  } finally {
    result.pageErrors = errors;
    results.push(result);
    console.log(`${result.status === 'pass' ? 'PASS' : 'FAIL'} ${id}: ${name}${result.error ? ' | ' + result.error.split('\n')[0] : ''}`);
    await context.close();
  }
}

async function open(page, path, base = api.base) {
  await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.SportsAuth);
}
async function fillSignup(page) {
  await page.locator('#nome').fill(validUser.nome);
  await page.locator('#telefone').fill('24999990000');
  await page.locator('#email').fill(validUser.email);
  await page.locator('#cpf').fill(validUser.cpf);
  await page.locator('#estado').selectOption('RJ');
  await page.locator('#senha').fill(validUser.senha);
  await page.locator('#confirmar').fill(validUser.senha);
  await page.locator('#termos').check();
}
async function submit(page, form) {
  await page.locator(`${form} button[type=submit]`).click();
  await page.waitForFunction(selector => !document.querySelector(`${selector} button[type=submit]`).disabled, form);
}
async function session(context, user = { id: 1, nome: validUser.nome, email: validUser.email }) {
  await context.addInitScript(value => {
    if (!sessionStorage.getItem('audit-seeded')) {
      localStorage.setItem('sportsUser', JSON.stringify(value));
      sessionStorage.setItem('audit-seeded', '1');
    }
  }, user);
}
async function login(page) {
  await open(page, '/login.html');
  await page.locator('#email').fill(validUser.email);
  await page.locator('#senha').fill(validUser.senha);
  await page.locator('#formLogin button[type=submit]').click();
  await page.waitForURL('**/telaPerfil.html');
}

try {
  await cacheResources();
  browser = await ({ chromium, webkit }[engine]).launch({ headless: true });

  await check('B01', 'Cadastro vazio mostra validações e não chama a API', async ({ page, calls }) => {
    await open(page, '/cadastro.html'); await submit(page, '#formCadastro');
    for (const field of ['nome', 'telefone', 'email', 'cpf', 'senha', 'termos']) assert.equal(await page.locator(`#err-${field}`).isVisible(), true, field);
    assert.equal(calls.length, 0);
  });

  for (const [id, field, value, error] of [
    ['B02', 'nome', 'Ana', 'nome'], ['B03', 'telefone', '123', 'telefone'],
    ['B04', 'email', 'invalido', 'email'], ['B05', 'cpf', '123', 'cpf'],
    ['B06', 'senha', 'curta', 'senha'], ['B07', 'confirmar', 'outrasenha', 'confirmar'],
  ]) await check(id, `Cadastro bloqueia ${field} inválido`, async ({ page, calls }) => {
    await open(page, '/cadastro.html'); await fillSignup(page); await page.locator(`#${field}`).fill(value);
    await submit(page, '#formCadastro'); assert.equal(await page.locator(`#err-${error}`).isVisible(), true); assert.equal(calls.length, 0);
  });

  await check('B08', 'Cadastro exige termos', async ({ page, calls }) => {
    await open(page, '/cadastro.html'); await fillSignup(page); await page.locator('#termos').uncheck();
    await submit(page, '#formCadastro'); assert.equal(await page.locator('#err-termos').isVisible(), true); assert.equal(calls.length, 0);
  });

  for (const mobile of [false, true]) await check(mobile ? 'B10' : 'B09', 'Cadastro completo usa o backend, abre confirmação e salva sessão local', async ({ page, errors }) => {
    await open(page, '/cadastro.html'); await fillSignup(page); await submit(page, '#formCadastro');
    assert.equal(await page.locator('#modalSucesso').isVisible(), true);
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('sportsUser')))).email, validUser.email);
    assert.equal((await api.db.query('SELECT count(*)::int AS n FROM usuarios')).rows[0].n, 1);
    assert.deepEqual(errors, []);
  }, { mobile });

  await check('B11', 'BUG-09 / RF-001: telefone, interesses e aceite devem ser enviados e persistidos', async ({ page, calls }) => {
    await open(page, '/cadastro.html'); await fillSignup(page); await page.locator('label[for=sp-corrida]').click();
    await submit(page, '#formCadastro');
    const body = calls.find(call => call.url.endsWith('/usuarios'))?.body;
    assert.ok(body?.telefone && body?.esportes && body?.aceitouTermos, `Payload contém apenas: ${Object.keys(body || {}).join(', ')}`);
  });

  await check('B12', 'Cadastro com API indisponível mostra erro e reabilita botão', async ({ page }) => {
    await open(page, '/cadastro.html'); await fillSignup(page);
    await page.route('**/usuarios', route => route.abort()); await submit(page, '#formCadastro');
    assert.equal(await page.locator('#err-cadastro').isVisible(), true);
    assert.equal(await page.locator('#modalSucesso').isVisible(), false);
    assert.equal(await page.evaluate(() => localStorage.getItem('sportsUser')), null);
  });

  await check('B13', 'BUG-06: cadastro duplicado deve mostrar uma mensagem legível', async ({ page }) => {
    await open(page, '/cadastro.html'); await fillSignup(page); await submit(page, '#formCadastro');
    const text = await page.locator('#err-cadastro').innerText();
    assert.ok(!/<(?:html|!doctype)/i.test(text), 'Página HTML inteira é exibida dentro do erro do cadastro');
  }, { seed: true });

  await check('B14', 'Login vazio mostra erros sem enviar requisição', async ({ page, calls }) => {
    await open(page, '/login.html'); await submit(page, '#formLogin');
    assert.equal(await page.locator('#err-email').isVisible(), true); assert.equal(await page.locator('#err-senha').isVisible(), true); assert.equal(calls.length, 0);
  });

  await check('B15', 'Login incorreto mostra resposta 401 e não cria sessão', async ({ page }) => {
    await open(page, '/login.html'); await page.locator('#email').fill(validUser.email); await page.locator('#senha').fill('errada');
    await submit(page, '#formLogin'); assert.match(await page.locator('#err-senha').innerText(), /inválidos/);
    assert.equal(await page.evaluate(() => localStorage.getItem('sportsUser')), null);
  }, { seed: true });

  for (const mobile of [false, true]) await check(mobile ? 'B17' : 'B16', 'Login correto abre perfil com nome real e sobrevive ao recarregamento', async ({ page, errors }) => {
    await login(page); await page.reload();
    assert.equal(await page.locator('#profileName').innerText(), 'ANA SOUZA');
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('sportsUser')))).email, validUser.email);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${output}/${mobile ? 'perfil-mobile' : 'perfil-desktop'}.png`, fullPage: true });
  }, { seed: true, mobile });

  await check('B18', 'Login com API fora do ar mostra erro e reabilita botão', async ({ page }) => {
    await open(page, '/login.html'); await page.locator('#email').fill(validUser.email); await page.locator('#senha').fill(validUser.senha);
    await page.route('**/usuarios/login', route => route.abort()); await submit(page, '#formLogin');
    assert.equal(await page.locator('#err-senha').isVisible(), true);
  });

  await check('B19', 'Mostrar e ocultar senha funciona no login e cadastro', async ({ page }) => {
    for (const path of ['/login.html', '/cadastro.html']) {
      await open(page, path); await page.locator('#toggleSenha').click(); assert.equal(await page.locator('#senha').getAttribute('type'), 'text');
      await page.locator('#toggleSenha').click(); assert.equal(await page.locator('#senha').getAttribute('type'), 'password');
    }
  });

  for (const [id, path] of [['B20', '/login.html'], ['B21', '/cadastro.html']]) await check(id, `BUG-10: ${path} deve usar a origem atual ao acessar a API`, async ({ page, calls }) => {
    await open(page, path, alternateBase);
    if (path.includes('cadastro')) { await fillSignup(page); await submit(page, '#formCadastro'); }
    else { await page.locator('#email').fill(validUser.email); await page.locator('#senha').fill(validUser.senha); await submit(page, '#formLogin'); }
    assert.ok(calls.some(call => call.url.startsWith(alternateBase)), `API chamada em: ${calls.map(call => call.url).join(', ')}`);
  }, { seed: path.includes('login') });

  for (const [id, path] of [['B22', '/telaPerfil.html'], ['B23', '/meus-eventos.html']]) await check(id, `BUG-11 / RF-006: visitante em ${path} deve ir ao login`, async ({ page }) => {
    await open(page, path); assert.match(new URL(page.url()).pathname, /login\.html$/);
  });

  await check('B24', 'Logout pelo botão global limpa sportsUser e volta à Home', async ({ page, context }) => {
    await session(context); await open(page, '/eventos.html');
    await page.locator('[data-sports-auth-controls] button').click(); await page.waitForURL('**/index.html');
    assert.equal(await page.evaluate(() => localStorage.getItem('sportsUser')), null);
  });

  await check('B25', 'BUG-12 / RF-006: Encerrar Sessão do menu móvel do perfil deve limpar sportsUser', async ({ page, context }) => {
    await session(context); await open(page, '/telaPerfil.html');
    await page.locator('#btnMenu').click(); await page.locator('#logoutBtnMobile').click(); await page.locator('#logoutConfirm').click();
    await page.waitForURL('**/login.html'); assert.equal(await page.evaluate(() => localStorage.getItem('sportsUser')), null);
  }, { mobile: true });

  await check('B26', 'BUG-13 / RF-007: edição do perfil precisa chegar ao banco', async ({ page, context }) => {
    await session(context); await open(page, '/telaPerfil.html'); await page.locator('#editProfileBtn').click();
    await page.locator('#inputName').fill('Ana Atualizada'); await page.locator('#editProfileForm button[type=submit]').click();
    assert.equal(await page.locator('#profileName').innerText(), 'ANA ATUALIZADA');
    assert.equal((await api.db.query('SELECT nome FROM usuarios WHERE id=1')).rows[0].nome, 'Ana Atualizada', 'A edição fica apenas no localStorage');
  }, { seed: true });

  await check('B27', 'BUG-14: logout deve impedir vazamento de profileData entre duas contas', async ({ page, context }) => {
    await session(context); await open(page, '/eventos.html');
    await page.evaluate(() => localStorage.setItem('profileData', JSON.stringify({ name: 'Ana Souza', phone: '24999990000', address: 'Endereco privado da Ana' })));
    await page.locator('[data-sports-auth-controls] button').click(); await page.waitForURL('**/index.html');
    await page.evaluate(() => localStorage.setItem('sportsUser', JSON.stringify({ id: 2, nome: 'Beto Silva', email: 'beto@example.test' })));
    await open(page, '/telaPerfil.html'); await page.locator('#editProfileBtn').click();
    assert.equal(await page.locator('#inputPhone').inputValue(), '', 'Telefone da conta anterior aparece na nova conta');
  });

  await check('B28', 'Auth tolera JSON inválido no armazenamento sem erro JavaScript', async ({ page, context, errors }) => {
    await context.addInitScript(() => localStorage.setItem('sportsUser', '{invalido'));
    await open(page, '/login.html'); assert.equal(await page.evaluate(() => SportsAuth.getUser()), null); assert.deepEqual(errors, []);
  });

  await check('B29', 'Eventos: carregar mais e carregar menos alteram a lista', async ({ page }) => {
    await open(page, '/eventos.html'); const cards = page.locator('#eventsGrid article:visible');
    const initial = await cards.count(); await page.locator('#loadMoreBtn').click(); assert.ok(await cards.count() > initial);
    await page.locator('#loadLessBtn').click(); assert.equal(await cards.count(), initial);
  });

  await check('B30', 'RF-017: clique e teclado abrem a página dinâmica do evento', async ({ page }) => {
    await open(page, '/eventos.html'); await page.locator('[data-event-link="/evento/3"]').press('Enter');
    await page.waitForURL('**/evento/3'); await page.waitForFunction(() => document.title.includes('Royal'));
    assert.equal(await page.locator('#evento-inscricao').getAttribute('href'), '/views/checkout.html?evento=3');
  });

  for (const [id, statusName, vacancies, date] of [
    ['B31', 'esgotadas', 0, '2027-11-30T20:00:00-03:00'],
    ['B32', 'encerradas', 10, '2027-11-30T20:00:00-03:00'],
    ['B33', 'em_breve', 10, '2027-11-30T20:00:00-03:00'],
    ['B34', 'canceladas', 10, '2027-11-30T20:00:00-03:00'],
    ['B35', 'abertas', 10, '2020-01-01T10:00:00-03:00'],
  ]) await check(id, `RF-017: inscrição bloqueada para ${statusName}, vagas=${vacancies}, data=${date}`, async ({ page }) => {
    const original = (await api.db.query('SELECT data FROM sports_events WHERE id=3')).rows[0].data;
    try {
      await api.db.query('UPDATE sports_events SET data=$1::jsonb WHERE id=3', [JSON.stringify({ ...original, statusInscricao: statusName, data: date, vagas: { total: 10, disponiveis: vacancies } })]);
      await open(page, '/evento/3'); await page.waitForFunction(() => document.querySelector('#evento-inscricao').getAttribute('aria-disabled') === 'true');
      assert.equal(await page.locator('#evento-inscricao').getAttribute('href'), null);
    } finally { await api.db.query('UPDATE sports_events SET data=$1::jsonb WHERE id=3', [JSON.stringify(original)]); }
  });

  await check('B36', 'BUG-15 / RF-016: filtro de modalidade deve alterar os cards', async ({ page }) => {
    await open(page, '/index.html');
    const before = await page.locator('[data-event-link]:visible').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-event-link')));
    await page.locator('.filtro-btn').filter({ hasText: 'Ciclismo' }).click();
    const after = await page.locator('[data-event-link]:visible').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-event-link')));
    assert.notDeepEqual(after, before, 'O filtro só troca a aparência do botão');
  });

  await check('B37', 'BUG-16 / RF-021: pesquisa inexistente deve informar ausência de resultados', async ({ page }) => {
    await open(page, '/eventos.html'); const input = page.locator('header input[type=search]').first();
    await page.locator('header .site-search').hover();
    await input.fill('zzzauditoria987654'); await input.press('Enter');
    assert.match(await page.locator('main').innerText(), /nenhum|não encontrad|sem resultado/i);
  });

  await check('B38', 'Mapa: biblioteca real renderiza marcadores e filtra por modalidade', async ({ page }) => {
    await open(page, '/mapa.html'); await page.locator('.place-card').first().waitFor();
    const initial = await page.locator('.place-card').count(); assert.ok(initial > 0);
    await page.locator('[data-filter=basquete]').click(); assert.ok(await page.locator('.place-card').count() < initial);
    assert.equal(await page.locator('.sports-map-marker:visible').count(), await page.locator('.place-card').count());
    await page.locator('.place-card').first().click(); assert.equal(await page.locator('.place-card.is-active').count(), 1);
  });

  await check('B39', 'RF-026: mapa indisponível preserva menu e navegação às outras páginas', async ({ page }) => {
    await open(page, '/mapa.html'); await page.locator('header a[href="eventos.html"]').first().click();
    await page.waitForURL('**/eventos.html'); assert.ok(await page.locator('#eventsGrid article').count() > 0);
  }, { offlineMap: true });

  await check('B40', 'RF-028: FAQ abre respostas e oferece Contato', async ({ page }) => {
    await open(page, '/ajuda.html'); const second = page.locator('details').nth(1);
    await second.locator('summary').click(); assert.equal(await second.getAttribute('open'), '');
    assert.ok(await page.locator('a[href="contato.html"]').count() > 0);
  });

  await check('B41', 'RF-024: Termos e Política são acessíveis pelo cadastro', async ({ page }) => {
    await open(page, '/cadastro.html');
    for (const path of ['termos.html', 'privacidade.html']) {
      assert.equal(await page.locator(`#formCadastro a[href="${path}"]`).count(), 1);
      const response = await page.request.get(api.base + '/' + path); assert.equal(response.status(), 200);
      assert.match(await response.text(), /<h2/);
    }
  });

  await check('B42', 'BUG-17 / RF-029: Contato deve validar campos obrigatórios', async ({ page }) => {
    await open(page, '/contato.html');
    assert.equal(await page.locator('form input[required], form textarea[required]').count(), 4, 'Nenhum dos quatro campos é obrigatório no HTML');
  });

  await check('B43', 'BUG-18 / RF-004: checkout precisa usar o evento selecionado', async ({ page }) => {
    await open(page, '/views/checkout.html?evento=3');
    assert.match(await page.locator('main').innerText(), /Royal Night Run/);
  });

  await check('B44', 'Navegação da página dinâmica retorna à lista de eventos', async ({ page }) => {
    await open(page, '/evento/3');
    const [response] = await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      page.locator('header a[href="/eventos"]').first().click(),
    ]);
    assert.equal(new URL(page.url()).pathname, '/eventos');
    assert.equal(response.status(), 200);
  });

  for (const [id, path] of [['B45', '/login.html'], ['B46', '/cadastro.html'], ['B47', '/telaPerfil.html'], ['B48', '/eventos.html']]) {
    await check(id, `Responsividade: ${path} sem rolagem horizontal em 390px`, async ({ page, context }) => {
      await session(context); await open(page, path);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Página excede a largura da tela');
    }, { mobile: true });
  }

  await check('B49', 'BUG-19 / RF-008: favoritar evento precisa persistir a escolha', async ({ page, context, calls }) => {
    await session(context); await open(page, '/eventos.html');
    const previous = await page.evaluate(() => JSON.stringify(localStorage));
    await page.getByRole('button', { name: 'Salvar evento', exact: true }).first().click();
    assert.ok(calls.length > 0 || await page.evaluate(() => JSON.stringify(localStorage)) !== previous, 'Favoritar não chama API nem grava a seleção');
  });

  await check('B50', 'BUG-20 / RF-020: calendário deve navegar entre meses', async ({ page }) => {
    await open(page, '/index.html');
    const grid = page.locator('#calendario-grid');
    const previous = await grid.evaluate(node => node.parentElement.innerText);
    await page.getByRole('button', { name: 'Próximo mês', exact: true }).click();
    assert.notEqual(await grid.evaluate(node => node.parentElement.innerText), previous, 'Calendário permanece em Junho 2026');
  });

  await check('B51', 'BUG-21 / RF-029: Contato preenchido precisa enviar mensagem', async ({ page, calls }) => {
    await open(page, '/contato.html');
    await page.getByPlaceholder('Seu nome', { exact: true }).fill('Ana Souza');
    await page.getByPlaceholder('voce@email.com', { exact: true }).fill('ana@example.test');
    await page.getByPlaceholder('Inscrição, suporte, parceria...').fill('Dúvida');
    await page.getByPlaceholder('Descreva sua dúvida ou solicitação').fill('Mensagem sintética da auditoria local.');
    await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
    assert.ok(calls.length > 0, 'Botão sem envio para o servidor');
  });

  await check('B52', 'BUG-22 / RF-018: conta nova não pode receber inscrições de exemplo', async ({ page, context }) => {
    await session(context); await open(page, '/meus-eventos.html');
    assert.doesNotMatch(await page.locator('main').innerText(), /Corrida do Guerreiro/, 'Histórico mostra inscrição fixa para uma conta sem inscrições');
  }, { seed: true });
} finally {
  await browser?.close();
  alternate.closeAllConnections(); await new Promise(resolve => alternate.close(resolve));
  await api.close();
  const summary = { engine, total: results.length, passed: results.filter(item => item.status === 'pass').length, failed: results.filter(item => item.status === 'fail').length };
  await writeFile(`${output}/resultados.json`, JSON.stringify({ summary, conditions: { database: 'PGlite isolado, fixture usuarios separada do schema de produção', externalResources: 'Tailwind e Leaflet reais em cache; fontes, imagens e tiles externos bloqueados', apiOrigin: 'http://localhost:3000', browserClock: '2026-11-16T15:00:00Z' }, results }, null, 2) + '\n');
  console.log(JSON.stringify(summary));
  if (summary.failed) process.exitCode = 1;
}
