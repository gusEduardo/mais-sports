import assert from 'node:assert/strict';
import test, { before, after, beforeEach } from 'node:test';
import bcrypt from 'bcrypt';
import { createHarness, validUser } from './helpers/harness.mjs';

let api;
before(async () => { api = await createHarness(); });
after(async () => { await api?.close(); });
beforeEach(async () => { await api.reset(); });
const create = (body = validUser) => api.request('/usuarios', { method: 'POST', body });

test('CRUD: cadastro grava hash bcrypt e nunca devolve a senha', async () => {
  const result = await create();
  assert.equal(result.status, 201);
  assert.equal(result.data.nome, validUser.nome);
  assert.equal(result.data.email, validUser.email);
  assert.equal(result.data.senha, undefined);
  const { rows: [stored] } = await api.db.query('SELECT * FROM usuarios');
  assert.notEqual(stored.senha, validUser.senha);
  assert.match(stored.senha, /^\$2[aby]\$10\$/);
  assert.equal(await bcrypt.compare(validUser.senha, stored.senha), true);
});

test('CRUD: login correto retorna o usuário sem senha e permite espaços em volta do e-mail', async () => {
  await create();
  const result = await api.request('/usuarios/login', { method: 'POST', body: { email: ` ${validUser.email} `, senha: validUser.senha } });
  assert.equal(result.status, 200);
  assert.equal(result.data.usuario.email, validUser.email);
  assert.equal(result.data.usuario.senha, undefined);
});

for (const [name, body] of [
  ['senha incorreta', { email: validUser.email, senha: 'errada' }],
  ['e-mail inexistente', { email: 'ninguem@example.test', senha: validUser.senha }],
  ['campos ausentes', {}], ['e-mail de tipo inválido', { email: 42, senha: validUser.senha }],
  ['senha de tipo inválido', { email: validUser.email, senha: {} }],
  ['e-mail em branco', { email: ' ', senha: validUser.senha }],
  ['senha em branco', { email: validUser.email, senha: '' }],
  ['tentativa de injeção SQL', { email: "' OR 1=1 --", senha: validUser.senha }],
]) test(`CRUD: login recusa ${name} com JSON 401`, async () => {
  await create();
  const result = await api.request('/usuarios/login', { method: 'POST', body });
  assert.equal(result.status, 401);
  assert.deepEqual(result.data, { message: 'E-mail ou senha inválidos.' });
});

test('CRUD: listagem vazia e ordenação por ID decrescente sem hashes', async () => {
  assert.deepEqual((await api.request('/usuarios')).data, []);
  await create();
  await create({ ...validUser, nome: 'Beto Silva', email: 'beto@example.test', cpf: '11144477735' });
  const result = await api.request('/usuarios');
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.map(user => user.id), [2, 1]);
  assert.ok(result.data.every(user => !('senha' in user)));
});

test('CRUD: PUT persiste nome/e-mail/UF e mantém CPF e hash', async () => {
  const { data: created } = await create();
  const previous = (await api.db.query('SELECT senha FROM usuarios WHERE id=$1', [created.id])).rows[0].senha;
  const result = await api.request(`/usuarios/${created.id}`, { method: 'PUT', body: { nome: 'Ana Atualizada', email: 'nova@example.test', uf: 'SP' } });
  assert.equal(result.status, 200);
  assert.equal(result.data.usuario.nome, 'Ana Atualizada');
  assert.equal(result.data.usuario.cpf, validUser.cpf);
  assert.equal(result.data.usuario.senha, undefined);
  const stored = (await api.db.query('SELECT * FROM usuarios WHERE id=$1', [created.id])).rows[0];
  assert.equal(stored.email, 'nova@example.test'); assert.equal(stored.uf, 'SP'); assert.equal(stored.senha, previous);
  assert.equal((await api.request('/usuarios/login', { method: 'POST', body: { email: stored.email, senha: validUser.senha } })).status, 200);
});

test('CRUD: DELETE remove, repetir dá 404 e conta removida não autentica', async () => {
  const { data: created } = await create();
  assert.equal((await api.request(`/usuarios/${created.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await api.db.query('SELECT * FROM usuarios')).rows.length, 0);
  assert.equal((await api.request(`/usuarios/${created.id}`, { method: 'DELETE' })).status, 404);
  assert.equal((await api.request('/usuarios/login', { method: 'POST', body: validUser })).status, 401);
});

test('CRUD: PUT de usuário inexistente devolve JSON 404', async () => {
  const result = await api.request('/usuarios/999', { method: 'PUT', body: validUser });
  assert.equal(result.status, 404); assert.equal(result.data.error, 'Usuário não encontrado.');
});

test('CRUD: strings com sintaxe SQL são persistidas como dados', async () => {
  const name = "Ana'); DROP TABLE usuarios; --";
  const result = await create({ ...validUser, nome: name });
  assert.equal(result.status, 201); assert.equal(result.data.nome, name);
  assert.equal((await api.db.query('SELECT count(*)::int AS total FROM usuarios')).rows[0].total, 1);
});
