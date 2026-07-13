require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  await client.connect();
  const res = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'visits_work_type_lnk' ORDER BY ordinal_position"
  );
  console.log('visits_work_type_lnk columns:');
  res.rows.forEach(r => console.log(`  - ${r.column_name}`));
  await client.end();
}

check();
