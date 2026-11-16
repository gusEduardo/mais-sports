import assert from 'node:assert/strict';
import test, { before, after, beforeEach } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { createHarness, validUser } from './helpers/harness.mjs';

let api;
before(async () => { api = await createHarness(); });
after(async () => { await api?.close(); });
beforeEach(async () => { await api.reset(); });
const create = (...args) => api.request('/usuarios', { method: 'POST', body: args.length ? args[0] : validUser });
function status(result, expected) {
  assert.equal(result.status, expected, `Esperado HTTP ${expected}; recebido ${result.status} (${result.headers.get('content-type')})`);
}

test('BUG-01: migração de um banco novo precisa criar usuarios', async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL('../src/db/schema.sql', import.meta.url), 'utf8'));
    const { rows } = await db.query("SELECT to_regclass('public.usuarios') AS tabela");
    assert.equal(rows[0].tabela, 'usuarios', 'schema.sql não cria a tabela consumida pelo CRUD');
  } finally { await db.close(); }
});

for (const [name, body] of [
  ['nome vazio', { ...validUser, nome: '' }],
  ['e-mail inválido', { ...validUser, email: 'invalido' }],
  ['senha curta', { ...validUser, senha: 'a' }],
  ['CPF inválido', { ...validUser, cpf: '00000000000' }],
  ['UF inexistente', { ...validUser, uf: 'XX' }],
  ['termos não aceitos', { ...validUser, aceitouTermos: false }],
  ['termos ausentes', { ...validUser, aceitouTermos: undefined }],
  ['senha ausente', { ...validUser, senha: undefined }],
  ['senha de tipo inválido', { ...validUser, senha: 12345678 }],
  ['nome ausente', { ...validUser, nome: undefined }],
  ['corpo ausente', undefined],
]) test(`BUG-02 / RF-001: backend deve rejeitar ${name} com JSON 400`, async () => {
  const result = await create(body);
  status(result, 400);
  assert.match(result.headers.get('content-type'), /application\/json/);
  assert.equal((await api.db.query('SELECT * FROM usuarios')).rows.length, 0);
});

for (const field of ['email', 'cpf']) test(`BUG-03 / RF-001: ${field} duplicado deve gerar JSON 409`, async () => {
  await create();
  const other = { ...validUser, email: 'outra@example.test', cpf: '11144477735', [field]: validUser[field] };
  const result = await create(other);
  status(result, 409); assert.match(result.headers.get('content-type'), /application\/json/);
});

test('BUG-03: e-mail duplicado no PUT deve gerar JSON 409 sem alterar o registro', async () => {
  await create();
  const { data: other } = await create({ ...validUser, email: 'outra@example.test', cpf: '11144477735' });
  status(await api.request(`/usuarios/${other.id}`, { method: 'PUT', body: { nome: 'Outra Pessoa', email: validUser.email, uf: 'RJ' } }), 409);
});

test('BUG-03: cadastros concorrentes do mesmo e-mail devem produzir 201 e 409', async () => {
  const results = await Promise.all([create(), create()]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  assert.equal((await api.db.query('SELECT * FROM usuarios')).rows.length, 1);
});

test('BUG-02: PUT deve rejeitar dados vazios antes de alterar o banco', async () => {
  await create();
  status(await api.request('/usuarios/1', { method: 'PUT', body: { nome: '', email: 'invalido', uf: 'XX' } }), 400);
  assert.equal((await api.db.query('SELECT nome FROM usuarios WHERE id=1')).rows[0].nome, validUser.nome);
});

for (const id of ['abc', '0', '-1', '1abc', '9007199254740992']) test(`BUG-04: ID de usuário inválido ${id} deve gerar JSON 400`, async () => {
  const result = await api.request(`/usuarios/${id}`, { method: 'DELETE' });
  status(result, 400); assert.match(result.headers.get('content-type'), /application\/json/);
});

for (const [name, method, path] of [['listar', 'GET', '/usuarios'], ['alterar', 'PUT', '/usuarios/1'], ['remover', 'DELETE', '/usuarios/1']]) {
  test(`BUG-05 / RF-003: visitante não deve ${name} usuários`, async () => {
    await create();
    const result = await api.request(path, { method, ...(method === 'PUT' ? { body: validUser } : {}) });
    assert.ok([401, 403].includes(result.status), `Visitante conseguiu ${name}: HTTP ${result.status}`);
  });
}

test('BUG-06: JSON malformado precisa ser respondido em JSON 400', async () => {
  const result = await api.request('/usuarios', { method: 'POST', raw: '{"nome":' });
  status(result, 400); assert.match(result.headers.get('content-type'), /application\/json/);
});

for (const [method, path, body] of [
  ['POST', '/usuarios', validUser], ['POST', '/usuarios/login', validUser],
  ['GET', '/usuarios'], ['PUT', '/usuarios/1', validUser], ['DELETE', '/usuarios/1'],
]) test(`BUG-06: falha de banco em ${method} ${path} deve gerar JSON 500`, async () => {
  api.failNext(new Error('segredo-teste-nao-expor'));
  const result = await api.request(path, { method, body });
  status(result, 500); assert.match(result.headers.get('content-type'), /application\/json/);
  assert.ok(!result.text.includes('segredo-teste-nao-expor'));
});

test('BUG-07 / RF-003: login precisa estabelecer sessão verificável no servidor', async () => {
  await create();
  const result = await api.request('/usuarios/login', { method: 'POST', body: validUser });
  status(result, 200);
  assert.ok(result.headers.get('set-cookie') || result.data.token || result.data.accessToken, 'Login retorna só dados públicos, sem credencial de sessão');
});

test('BUG-08 / RF-003: tentativas inválidas repetidas devem ser limitadas', async () => {
  const statuses = [];
  for (let i = 0; i < 25; i++) statuses.push((await api.request('/usuarios/login', { method: 'POST', body: { email: 'naoexiste@example.test', senha: 'errada' } })).status);
  assert.ok(statuses.includes(429), '25 tentativas seguidas aceitas sem HTTP 429; limiar de auditoria, não definido no PDF');
});
