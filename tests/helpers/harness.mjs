import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import app from '../../src/app.js';
import pool from '../../src/db/pool.js';

export const validUser = {
  nome: 'Ana Souza', email: 'ana@example.test', senha: 'SenhaTeste123!',
  cpf: '52998224725', uf: 'RJ', aceitouTermos: true,
};

// Fixture explícita: a migração de produção NÃO cria usuarios. As restrições
// abaixo permitem testar SQL e erros PostgreSQL sem assumir o schema do Neon.
export const userFixture = `CREATE TABLE usuarios (
  id serial PRIMARY KEY, nome text NOT NULL, email text NOT NULL UNIQUE,
  senha text NOT NULL, cpf text NOT NULL UNIQUE, uf text,
  criado_em timestamptz NOT NULL DEFAULT now()
);`;

export async function createHarness({ users = true, port = 0, host = '127.0.0.1' } = {}) {
  const db = new PGlite();
  const schema = await readFile(new URL('../../src/db/schema.sql', import.meta.url), 'utf8');
  await db.exec(schema);
  if (users) await db.exec(userFixture);
  for (const [file, table] of [['organizadores', 'sports_organizers'], ['eventos', 'sports_events']]) {
    const items = JSON.parse(await readFile(new URL(`../../src/databases/${file}.json`, import.meta.url), 'utf8'));
    for (const item of items) {
      if (table === 'sports_events') {
        await db.query('INSERT INTO sports_events VALUES ($1, $2, $3::jsonb)', [item.id, item.organizadorId, JSON.stringify(item)]);
      } else await db.query('INSERT INTO sports_organizers VALUES ($1, $2::jsonb)', [item.id, JSON.stringify(item)]);
    }
  }
  const originalQuery = pool.query;
  const originalError = console.error;
  const errors = [];
  let nextError;
  pool.query = async (text, values) => {
    if (nextError) { const error = nextError; nextError = undefined; throw error; }
    return db.query(text, values);
  };
  console.error = (...args) => errors.push(args.map(String).join(' '));
  const server = app.listen(port, host);
  await once(server, 'listening');
  const base = `http://${host === '::' ? 'localhost' : host}:${server.address().port}`;
  return {
    db, base, errors, schema,
    failNext(error = new Error('Falha de banco simulada')) { nextError = error; },
    async reset() {
      nextError = undefined; errors.length = 0;
      if (users) await db.exec('TRUNCATE usuarios RESTART IDENTITY');
    },
    async request(path, { method = 'GET', body, raw, headers = {} } = {}) {
      const response = await fetch(base + path, {
        method, headers: { ...(body !== undefined || raw !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
        body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { /* HTML é uma observação válida. */ }
      return { status: response.status, headers: response.headers, data, text };
    },
    async close() {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      pool.query = originalQuery; console.error = originalError;
      await db.close();
      await pool.end();
    },
  };
}
