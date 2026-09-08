// Applies every db/migrations/*.sql that has not run yet, in filename order.
// Usage: node db/migrate.mjs   (reads DATABASE_URL from .env.local or the env)
//
// Statements are split on ";" at the end of a line, so keep migrations to plain
// DDL/DML — no function bodies or dollar-quoted blocks containing semicolons.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const here = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  const envFile = join(here, "..", ".env.local");
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) process.env[match[1]] ??= match[2].trim().replace(/^["']|["']$/g, "");
  }
}

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS _migrations (
    name       text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`;

const applied = new Set(
  (await sql`SELECT name FROM _migrations`).map((row) => row.name)
);

const dir = join(here, "migrations");
let ran = 0;

for (const name of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (applied.has(name)) {
    console.log(`- ${name} (already applied)`);
    continue;
  }
  const statements = readFileSync(join(dir, name), "utf8")
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s && !/^(--[^\n]*\n?)+$/.test(s));

  for (const statement of statements) await sql.query(statement);
  await sql`INSERT INTO _migrations (name) VALUES (${name})`;
  console.log(`+ ${name} (${statements.length} statements)`);
  ran++;
}

console.log(ran ? `\n${ran} migration(s) applied.` : "\nNothing to apply.");
