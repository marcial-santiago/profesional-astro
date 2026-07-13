require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  await client.connect();
  const tables = ['work_types', 'visits', 'messages', 'availabilities', 'blocked_dates', 'blog_posts'];
  
  for (const table of tables) {
    try {
      const res = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [table]
      );
      console.log(`\n${table}:`);
      res.rows.forEach(r => console.log(`  - ${r.column_name}`));
    } catch (e) {
      console.log(`\n${table}: TABLE NOT FOUND`);
    }
  }
  
  await client.end();
}

checkTables();
