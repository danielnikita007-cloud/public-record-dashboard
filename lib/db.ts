import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { Case } from './types';

interface DbSchema {
  cases: Case[];
}

const file = path.join(process.cwd(), 'data', 'db.json');
const adapter = new JSONFile<DbSchema>(file);
const db = new Low<DbSchema>(adapter, { cases: [] });

export async function getDb() {
  await db.read();
  db.data ||= { cases: [] };
  return db;
}

/*
  PRODUCTION NOTE:
  This file-based store is for local development and the initial pilot only.
  Once you deploy for real public traffic, swap this module for a Postgres
  client (e.g. `pg` or Supabase JS client) pointed at the schema.sql /
  legal reference tables already provided in the project docs. The shape
  of `Case` in lib/types.ts matches the `cases`, `sources`, and
  `legal_violations` tables 1:1, so the API routes in app/api do not need
  to change — only the implementation of getDb()/save.
*/
