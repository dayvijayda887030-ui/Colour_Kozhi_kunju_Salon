const fs = require('node:fs/promises');
const path = require('node:path');
const { Client } = require('pg');

const migrationDirectory = path.join(__dirname, '..', 'supabase', 'migrations');
const migrationLock = 2026100301;

async function migrate() {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    console.log(`Skipping database migrations for ${process.env.VERCEL_ENV} deployment.`);
    return;
  }

  const connectionString = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  if (!connectionString) {
    throw new Error('Set SUPABASE_DB_URL or POSTGRES_URL in the Vercel Production environment.');
  }

  const databaseUrl = new URL(connectionString);
  if (databaseUrl.searchParams.get('sslmode') === 'require') {
    databaseUrl.searchParams.set('uselibpqcompat', 'true');
  }

  const client = new Client({
    connectionString: databaseUrl.toString(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  });

  await client.connect();
  try {
    await client.query(`
      create table if not exists public.site_schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now()
      )
    `);
    await client.query('revoke all on table public.site_schema_migrations from public, anon, authenticated');

    const files = (await fs.readdir(migrationDirectory))
      .filter(file => /^\d+_[\w-]+\.sql$/.test(file))
      .sort();

    if (!files.length) throw new Error('No SQL migration files were found.');

    for (const version of files) {
      await client.query('begin');
      try {
        await client.query('select pg_advisory_xact_lock($1)', [migrationLock]);
        const existing = await client.query(
          'select 1 from public.site_schema_migrations where version = $1',
          [version]
        );

        if (existing.rowCount) {
          await client.query('commit');
          continue;
        }

        const sql = await fs.readFile(path.join(migrationDirectory, version), 'utf8');
        await client.query(sql);
        await client.query('insert into public.site_schema_migrations (version) values ($1)', [version]);
        await client.query('commit');
        console.log(`Applied database migration ${version}.`);
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

migrate().catch(error => {
  console.error('Database migration failed.', error.code ? `PostgreSQL error code: ${error.code}` : 'Check the database URL and migration files.');
  process.exitCode = 1;
});