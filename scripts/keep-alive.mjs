import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function pingDatabase() {
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL or DIRECT_URL environment variable is not set.');
    process.exit(1);
  }

  console.log('🔄 Connecting to Supabase database...');

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    const startTime = Date.now();
    const result = await client.query('SELECT NOW() AS current_time, version();');
    const duration = Date.now() - startTime;

    console.log('✅ Supabase Keep-Alive Ping Successful!');
    console.log(`⏱️ Response time: ${duration}ms`);
    console.log(`🕒 Server time: ${result.rows[0].current_time.toISOString()}`);
    console.log(
      `📦 Postgres version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`,
    );
  } catch (error) {
    console.error('❌ Failed to ping Supabase database:', error.message || error);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

pingDatabase();
