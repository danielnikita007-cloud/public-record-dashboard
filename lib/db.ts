import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { Case, StatEntry } from './types';

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

interface StatsSchema {
  stats: StatEntry[];
}

const statsFile = path.join(process.cwd(), 'data', 'stats.json');
const statsAdapter = new JSONFile<StatsSchema>(statsFile);
const statsDb = new Low<StatsSchema>(statsAdapter, { stats: [] });

export async function getStatsDb() {
  await statsDb.read();
  statsDb.data ||= { stats: [] };
  return statsDb;
}
