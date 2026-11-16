import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { createHarness } from './helpers/harness.mjs';
import { erroMiddleware } from '../src/midwares/erroMiddleware.js';

let api;
before(async () => { api = await createHarness({ users: false }); });
after(async () => { await api?.close(); });

for (const id of [1, 2, 3, 4]) test(`Eventos: API e página do evento ${id} funcionam com SQL real`, async () => {
  const result = await api.request(`/api/eventos/${id}`);
  assert.equal(result.status, 200); assert.equal(result.data.id, id);
  assert.equal(result.data.organizador.id, result.data.organizadorId);
  const page = await api.request(`/evento/${id}`);
  assert.equal(page.status, 200); assert.match(page.text, /evento\.js/);
});

for (const id of ['0', '-1', 'abc', '1abc', '01', '1.5', '9007199254740992']) {
  test(`Eventos: ID inválido ${id} retorna JSON 400 na API e HTML 400 na página`, async () => {
    const result = await api.request(`/api/eventos/${id}`);
    assert.equal(result.status, 400); assert.match(result.data.message, /inválido/);
    const page = await api.request(`/evento/${id}`);
    assert.equal(page.status, 400); assert.match(page.headers.get('content-type'), /text\/html/);
  });
}

test('Eventos: ausente retorna 404 nas duas rotas', async () => {
  assert.equal((await api.request('/api/eventos/999')).status, 404);
  assert.equal((await api.request('/evento/999')).status, 404);
});

test('Eventos: organizador ausente retorna null sem derrubar a consulta', async () => {
  await api.db.query('UPDATE sports_events SET data = jsonb_set(data, \'{organizadorId}\', \'999\') WHERE id=1');
  try { assert.equal((await api.request('/api/eventos/1')).data.organizador, null); }
  finally { await api.db.query('UPDATE sports_events SET data = jsonb_set(data, \'{organizadorId}\', \'1\') WHERE id=1'); }
});

test('Eventos: falha de banco retorna JSON 500 na API e HTML 500 na página', async () => {
  api.failNext(); const result = await api.request('/api/eventos/1');
  assert.equal(result.status, 500); assert.match(result.headers.get('content-type'), /application\/json/);
  api.failNext(); const page = await api.request('/evento/1');
  assert.equal(page.status, 500); assert.match(page.headers.get('content-type'), /text\/html/);
});

test('Servidor: lista, home e arquivos públicos funcionam; arquivos privados não são servidos', async () => {
  for (const path of ['/', '/eventos', '/login.html', '/cadastro.html', '/js/auth.js', '/css/global.css']) {
    assert.equal((await api.request(path)).status, 200, path);
  }
  for (const path of ['/.env', '/src/db/schema.sql', '/package.json', '/inexistente']) {
    assert.equal((await api.request(path)).status, 404, path);
  }
});

test('Middleware: erro depois de enviar cabeçalhos é delegado sem enviar outra resposta', () => {
  const error = new Error('Fluxo interrompido');
  let delegated;
  erroMiddleware(error, {}, { headersSent: true }, value => { delegated = value; });
  assert.equal(delegated, error);
});
