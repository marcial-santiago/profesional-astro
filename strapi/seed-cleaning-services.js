/**
 * Seed: Cleaning services catalog
 * ----------------------------------------------------------------
 * Inserts 45 dynamic work_types covering:
 *   - Couch and Carpets (11 variants by seats/room)
 *   - Additional items (8 flat-price add-ons)
 *   - BBQ by Burners (5 variants)
 *   - BBQ Weber (3 size variants)
 *   - Windows 1st Floor (4 room-count variants)
 *   - Windows 2nd Floor (4 room-count variants)
 *   - Window Plus — both sizes (6 add-ons)
 *   - Pressure Cleaning (4 unit/time tiers)
 *
 * Idempotent: skips rows whose `slug` already exists. Safe to re-run.
 *
 * Run from the strapi/ directory:
 *   node seed-cleaning-services.js
 *
 * Or via docker compose:
 *   docker compose exec strapi node seed-cleaning-services.js
 */

require('dotenv').config();
const { Client } = require('pg');
const { randomUUID } = require('crypto');

const useConnectionString = !!process.env.DATABASE_URL;
const useSsl = (process.env.DATABASE_SSL || 'false').toLowerCase() === 'true';

const client = useConnectionString
  ? new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    })
  : new Client({
      host: process.env.DATABASE_HOST || 'postgres',
      port: Number(process.env.DATABASE_PORT || 5432),
      database: process.env.DATABASE_NAME || 'profesional_astro',
      user: process.env.DATABASE_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });

/**
 * Each entry maps 1:1 to a row in `work_types`.
 *  - name        : display name (Strapi UI + frontend)
 *  - slug        : kebab-case unique id; re-runs are gated on this
 *  - description : short, customer-facing copy
 *  - duration    : minutes (slot length used by /work-types/slots)
 *  - price       : base price
 *  - group       : logical bucket (used only for log output here;
 *                  the schema doesn't have a group column, so we
 *                  encode it in the name prefix instead)
 */
const CLEANING_SERVICES = [
  // ─── Couch and Carpets (1..11 seats/room) ─────────────────────
  { group: 'Couch and Carpets', name: 'Couch and Carpets - 1 seat/room',         slug: 'couch-and-carpets-1',  price: 120, duration: 60, description: 'Couch and carpet cleaning for 1 seat or 1 room.' },
  { group: 'Couch and Carpets', name: 'Couch and Carpets - 2 seats/rooms',       slug: 'couch-and-carpets-2',  price: 145, duration: 60, description: 'Couch and carpet cleaning for 2 seats or 2 rooms.' },
  { group: 'Couch and Carpets', name: 'Couch and Carpets - 3 seats/rooms',       slug: 'couch-and-carpets-3',  price: 175, duration: 60, description: 'Couch and carpet cleaning for 3 seats or 3 rooms.' },
  { group: 'Couch and Carpets', name: 'Couch and Carpets - 4 seats/rooms',       slug: 'couch-and-carpets-4',  price: 205, duration: 60, description: 'Couch and carpet cleaning for 4 seats or 4 rooms.' },
  { group: 'Couch and Carpets', name: 'Couch and Carpets - 5 seats/rooms',       slug: 'couch-and-carpets-5',  price: 235, duration: 60, description: 'Couch and carpet cleaning for 5 seats or 5 rooms.' },
  { group: 'Couch and Carpets', name: 'Couch and Carpets - 6 seats/rooms',       slug: 'couch-and-carpets-6',  price: 265, duration: 60, description: 'Couch and carpet cleaning for 6 seats or 6 rooms.' },
  { group: 'Couch and Carpets', name: 'Couch and Carpets - 7 seats/rooms',       slug: 'couch-and-carpets-7',  price: 295, duration: 60, description: 'Couch and carpet cleaning for 7 seats or 7 rooms.' },
  { group: 'Couch and Carpets', name: 'Couch and Carpets - 8 seats/rooms',       slug: 'couch-and-carpets-8',  price: 325, duration: 60, description: 'Couch and carpet cleaning for 8 seats or 8 rooms.' },
  { group: 'Couch and Carpets', name: 'Couch and Carpets - 9 seats/rooms',       slug: 'couch-and-carpets-9',  price: 355, duration: 60, description: 'Couch and carpet cleaning for 9 seats or 9 rooms.' },
  { group: 'Couch and Carpets', name: 'Couch and Carpets - 10 seats/rooms',      slug: 'couch-and-carpets-10', price: 385, duration: 60, description: 'Couch and carpet cleaning for 10 seats or 10 rooms.' },
  { group: 'Couch and Carpets', name: 'Couch and Carpets - 11 seats/rooms',      slug: 'couch-and-carpets-11', price: 415, duration: 60, description: 'Couch and carpet cleaning for 11 seats or 11 rooms.' },

  // ─── Additional items (flat price add-ons) ────────────────────
  { group: 'Additional', name: 'Armchair',           slug: 'armchair',         price: 45,  duration: 30, description: 'Single armchair deep clean.' },
  { group: 'Additional', name: 'Dining Seat',        slug: 'dining-seat',      price: 15,  duration: 30, description: 'Individual dining chair seat cleaning.' },
  { group: 'Additional', name: 'Large Rug',          slug: 'large-rug',        price: 50,  duration: 30, description: 'Large rug cleaning.' },
  { group: 'Additional', name: 'Small Rug',          slug: 'small-rug',        price: 30,  duration: 30, description: 'Small rug cleaning.' },
  { group: 'Additional', name: 'Single Mattress',    slug: 'single-mattress',  price: 90,  duration: 30, description: 'Single mattress deep clean and sanitization.' },
  { group: 'Additional', name: 'Queen Mattress',     slug: 'queen-mattress',   price: 120, duration: 30, description: 'Queen mattress deep clean and sanitization.' },
  { group: 'Additional', name: 'King Mattress',      slug: 'king-mattress',    price: 150, duration: 30, description: 'King mattress deep clean and sanitization.' },
  { group: 'Additional', name: 'Stairs',             slug: 'stairs',           price: 40,  duration: 30, description: 'Staircase cleaning (per flight).' },

  // ─── BBQ by Burners (2..6) ───────────────────────────────────
  { group: 'BBQ Burners', name: 'BBQ - 2 Burners', slug: 'bbq-2-burners', price: 145, duration: 90, description: 'BBQ cleaning — 2 burner unit.' },
  { group: 'BBQ Burners', name: 'BBQ - 3 Burners', slug: 'bbq-3-burners', price: 185, duration: 90, description: 'BBQ cleaning — 3 burner unit.' },
  { group: 'BBQ Burners', name: 'BBQ - 4 Burners', slug: 'bbq-4-burners', price: 225, duration: 90, description: 'BBQ cleaning — 4 burner unit.' },
  { group: 'BBQ Burners', name: 'BBQ - 5 Burners', slug: 'bbq-5-burners', price: 285, duration: 90, description: 'BBQ cleaning — 5 burner unit.' },
  { group: 'BBQ Burners', name: 'BBQ - 6 Burners', slug: 'bbq-6-burners', price: 325, duration: 90, description: 'BBQ cleaning — 6 burner unit.' },

  // ─── BBQ Weber (size variants) ───────────────────────────────
  { group: 'BBQ Weber', name: 'BBQ Weber - Baby',   slug: 'bbq-weber-baby',   price: 120, duration: 90, description: 'Weber BBQ cleaning — Baby size.' },
  { group: 'BBQ Weber', name: 'BBQ Weber - Medium', slug: 'bbq-weber-medium', price: 170, duration: 90, description: 'Weber BBQ cleaning — Medium size.' },
  { group: 'BBQ Weber', name: 'BBQ Weber - Family', slug: 'bbq-weber-family', price: 230, duration: 90, description: 'Weber BBQ cleaning — Family size.' },

  // ─── Windows — 1st Floor (2..5 rooms) ────────────────────────
  { group: 'Windows 1F', name: 'Windows 1st Floor - 2 rooms', slug: 'windows-1f-2-rooms', price: 250, duration: 90, description: 'Window cleaning — 1st floor, 2 rooms.' },
  { group: 'Windows 1F', name: 'Windows 1st Floor - 3 rooms', slug: 'windows-1f-3-rooms', price: 300, duration: 90, description: 'Window cleaning — 1st floor, 3 rooms.' },
  { group: 'Windows 1F', name: 'Windows 1st Floor - 4 rooms', slug: 'windows-1f-4-rooms', price: 400, duration: 90, description: 'Window cleaning — 1st floor, 4 rooms.' },
  { group: 'Windows 1F', name: 'Windows 1st Floor - 5 rooms', slug: 'windows-1f-5-rooms', price: 500, duration: 90, description: 'Window cleaning — 1st floor, 5 rooms.' },

  // ─── Windows — 2nd Floor (2..5 rooms) ────────────────────────
  { group: 'Windows 2F', name: 'Windows 2nd Floor - 2 rooms', slug: 'windows-2f-2-rooms', price: 350, duration: 120, description: 'Window cleaning — 2nd floor, 2 rooms.' },
  { group: 'Windows 2F', name: 'Windows 2nd Floor - 3 rooms', slug: 'windows-2f-3-rooms', price: 450, duration: 120, description: 'Window cleaning — 2nd floor, 3 rooms.' },
  { group: 'Windows 2F', name: 'Windows 2nd Floor - 4 rooms', slug: 'windows-2f-4-rooms', price: 550, duration: 120, description: 'Window cleaning — 2nd floor, 4 rooms.' },
  { group: 'Windows 2F', name: 'Windows 2nd Floor - 5 rooms', slug: 'windows-2f-5-rooms', price: 650, duration: 120, description: 'Window cleaning — 2nd floor, 5 rooms.' },

  // ─── Window Plus (both sizes — add-ons) ──────────────────────
  { group: 'Window Plus', name: '1 Window Both Sizes', slug: 'window-both-sizes', price: 20, duration: 30, description: 'Clean both sides of a single window.' },
  { group: 'Window Plus', name: 'Pane Small',         slug: 'pane-small',        price: 40, duration: 30, description: 'Small pane window cleaning.' },
  { group: 'Window Plus', name: 'Standard Panel',     slug: 'standard-panel',    price: 50, duration: 30, description: 'Standard panel window cleaning.' },
  { group: 'Window Plus', name: 'Sliding Door',       slug: 'sliding-door',      price: 25, duration: 30, description: 'Sliding door glass cleaning.' },
  { group: 'Window Plus', name: 'Double Door',        slug: 'double-door',       price: 40, duration: 30, description: 'Double door glass cleaning.' },
  { group: 'Window Plus', name: 'Large Panel',        slug: 'large-panel',       price: 35, duration: 30, description: 'Large panel window cleaning.' },

  // ─── Pressure Cleaning (50/100/150/200 units) ────────────────
  { group: 'Pressure Cleaning', name: 'Pressure Cleaning - 50 units (2h)',  slug: 'pressure-cleaning-50',  price: 180, duration: 120, description: 'Pressure cleaning for up to 50 units — 2 hours.' },
  { group: 'Pressure Cleaning', name: 'Pressure Cleaning - 100 units (3h)', slug: 'pressure-cleaning-100', price: 250, duration: 180, description: 'Pressure cleaning for up to 100 units — 3 hours.' },
  { group: 'Pressure Cleaning', name: 'Pressure Cleaning - 150 units (4h)', slug: 'pressure-cleaning-150', price: 350, duration: 240, description: 'Pressure cleaning for up to 150 units — 4 hours.' },
  { group: 'Pressure Cleaning', name: 'Pressure Cleaning - 200 units (5h)', slug: 'pressure-cleaning-200', price: 450, duration: 300, description: 'Pressure cleaning for up to 200 units — 5 hours.' },
];

async function seed() {
  const now = new Date();
  let inserted = 0;
  let skipped = 0;

  try {
    await client.connect();
    console.log('🔌 Connected to Strapi DB\n');

    // 1. Verify target table exists
    const tableCheck = await client.query(
      "SELECT to_regclass('public.work_types') AS exists"
    );
    if (!tableCheck.rows[0].exists) {
      throw new Error(
        "Table 'work_types' not found. Run Strapi once so it can create the schema before seeding."
      );
    }

    // 2. Fetch existing slugs in one query (cheap idempotency check)
    const existing = await client.query(
      'SELECT slug FROM work_types WHERE slug = ANY($1::text[])',
      [CLEANING_SERVICES.map((s) => s.slug)]
    );
    const existingSlugs = new Set(existing.rows.map((r) => r.slug));

    // 3. Group by logical group for nicer log output
    const grouped = CLEANING_SERVICES.reduce((acc, s) => {
      (acc[s.group] = acc[s.group] || []).push(s);
      return acc;
    }, {});

    // 4. Insert one-by-one (avoids half-failed batched inserts)
    for (const [group, services] of Object.entries(grouped)) {
      console.log(`📦 ${group} (${services.length})`);
      for (const svc of services) {
        if (existingSlugs.has(svc.slug)) {
          console.log(`   ⏭️  ${svc.slug}  (exists, skipped)`);
          skipped++;
          continue;
        }

        await client.query(
          `INSERT INTO work_types
             (document_id, name, slug, description, category, duration, price, is_active, published_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $9)`,
          [
            randomUUID(),
            svc.name,
            svc.slug,
            svc.description,
            'cleaning', // schema enum: cleaning | plumbing | construction
            svc.duration,
            svc.price,
            true,
            now,
          ]
        );
        console.log(`   ✅ ${svc.slug.padEnd(28)} $${svc.price.toString().padStart(4)}  (${svc.duration} min)`);
        inserted++;
      }
      console.log('');
    }

    // 5. Summary
    const total = await client.query('SELECT COUNT(*) as count FROM work_types');
    console.log('─'.repeat(48));
    console.log(`🎉 Cleaning services seed complete`);
    console.log(`   • inserted:  ${inserted}`);
    console.log(`   • skipped:   ${skipped}  (already existed)`);
    console.log(`   • total rows in work_types: ${total.rows[0].count}`);
    console.log('─'.repeat(48));
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
