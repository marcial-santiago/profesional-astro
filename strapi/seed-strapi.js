require('dotenv').config();
const { Client } = require('pg');
const { randomUUID } = require('crypto');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  try {
    await client.connect();
    console.log('🔌 Connected to Strapi DB\n');

    const now = new Date();

    // 1. Work Types
    console.log('📦 Seeding Work Types...');
    const wtCount = await client.query('SELECT COUNT(*) as count FROM work_types');
    if (parseInt(wtCount.rows[0].count) === 0) {
      const workTypes = [
        {
          document_id: randomUUID(),
          name: 'Limpieza General',
          slug: 'limpieza-general',
          description: 'Servicio completo de limpieza para hogares y oficinas.',
          category: 'cleaning',
          duration: 60,
          price: 25.00,
          is_active: true,
          published_at: now,
        },
        {
          document_id: randomUUID(),
          name: 'Plomería Básica',
          slug: 'plomeria-basica',
          description: 'Reparación de cañerías, griferías y destapes.',
          category: 'plumbing',
          duration: 90,
          price: 40.00,
          is_active: true,
          published_at: now,
        },
        {
          document_id: randomUUID(),
          name: 'Construcción Menor',
          slug: 'construccion-menor',
          description: 'Trabajos de albañilería, pintura y remodelaciones.',
          category: 'construction',
          duration: 120,
          price: 60.00,
          is_active: true,
          published_at: now,
        },
      ];

      for (const wt of workTypes) {
        await client.query(
          `INSERT INTO work_types (document_id, name, slug, description, category, duration, price, is_active, published_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
          [wt.document_id, wt.name, wt.slug, wt.description, wt.category, wt.duration, wt.price, wt.is_active, wt.published_at, now]
        );
      }
      console.log('   ✅ 3 Work Types inserted\n');
    } else {
      console.log('   ⏭️  Work Types already exist, skipping\n');
    }

    // 2. Availabilities
    console.log(' Seeding Availabilities...');
    const avCount = await client.query('SELECT COUNT(*) as count FROM availabilities');
    if (parseInt(avCount.rows[0].count) === 0) {
      const availabilities = [
        { day_of_week: 1, start_time: '08:00:00', end_time: '18:00:00' },
        { day_of_week: 2, start_time: '08:00:00', end_time: '18:00:00' },
        { day_of_week: 3, start_time: '08:00:00', end_time: '18:00:00' },
        { day_of_week: 4, start_time: '08:00:00', end_time: '18:00:00' },
        { day_of_week: 5, start_time: '08:00:00', end_time: '18:00:00' },
      ];

      for (const av of availabilities) {
        await client.query(
          `INSERT INTO availabilities (document_id, day_of_week, start_time, end_time, published_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5, $5)`,
          [randomUUID(), av.day_of_week, av.start_time, av.end_time, now]
        );
      }
      console.log('   ✅ 5 Availability slots inserted\n');
    } else {
      console.log('   ⏭️  Availabilities already exist, skipping\n');
    }

    // 3. Blocked Date
    console.log('🚫 Seeding Blocked Dates...');
    const bdCount = await client.query('SELECT COUNT(*) as count FROM blocked_dates');
    if (parseInt(bdCount.rows[0].count) === 0) {
      await client.query(
        `INSERT INTO blocked_dates (document_id, date, reason, published_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4, $4)`,
        [randomUUID(), '2026-12-25', 'Christmas Day', now]
      );
      console.log('   ✅ 1 Blocked Date inserted\n');
    } else {
      console.log('   ⏭️  Blocked Dates already exist, skipping\n');
    }

    // 4. Blog Post
    console.log(' Seeding Blog Post...');
    const bpCount = await client.query('SELECT COUNT(*) as count FROM blog_posts');
    if (parseInt(bpCount.rows[0].count) === 0) {
      await client.query(
        `INSERT INTO blog_posts (document_id, title, slug, content, description, pub_date, updated_date, published_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $8)`,
        [
          randomUUID(),
          'Cómo mantener tu hogar limpio',
          'como-mantener-tu-hogar-limpio',
          '# Tips de limpieza\n\nMantener tu hogar limpio no tiene que ser complicado...',
          'Guía práctica para mantener tu hogar siempre impecable.',
          '2026-05-01',
          '2026-05-01',
          now,
        ]
      );
      console.log('   ✅ 1 Blog Post inserted\n');
    } else {
      console.log('   ⏭️  Blog Posts already exist, skipping\n');
    }

    // 5. Contact Messages
    console.log(' Seeding Messages...');
    const msgCount = await client.query('SELECT COUNT(*) as count FROM messages');
    if (parseInt(msgCount.rows[0].count) === 0) {
      await client.query(
        `INSERT INTO messages (document_id, nombre, telefono, servicio, mensaje, published_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6, $6)`,
        [randomUUID(), 'Juan Pérez', '+54 11 1234-5678', 'reparacion', 'Hola, necesito reparar una canilla que gotea en la cocina.', now]
      );
      await client.query(
        `INSERT INTO messages (document_id, nombre, telefono, servicio, mensaje, published_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6, $6)`,
        [randomUUID(), 'María García', '+54 11 8765-4321', 'instalacion', 'Quiero instalar un nuevo lavarropas, ¿tienen disponibilidad?', now]
      );
      console.log('   ✅ 2 Messages inserted\n');
    } else {
      console.log('   ⏭️  Messages already exist, skipping\n');
    }

    // 6. Visits
    console.log('️ Seeding Visits...');
    const visitCount = await client.query('SELECT COUNT(*) as count FROM visits');
    if (parseInt(visitCount.rows[0].count) === 0) {
      const wtResult = await client.query('SELECT id, document_id FROM work_types WHERE slug = $1 LIMIT 1', ['limpieza-general']);
      if (wtResult.rows.length > 0) {
        const workTypeId = wtResult.rows[0].id;
        const visitDocId = randomUUID();
        
        await client.query(
          `INSERT INTO visits (document_id, nombre, telefono, email, date, mensaje, status, published_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $8)`,
          [
            visitDocId,
            'Carlos López',
            '+54 11 5555-1234',
            'carlos@email.com',
            '2026-05-10T10:00:00.000Z',
            'Limpieza general de departamento 2 ambientes',
            'confirmed',
            now,
          ]
        );

        // Strapi v5 relations
        const linksCheck = await client.query(
          "SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%visit%work%' OR table_name LIKE '%work%visit%'"
        );
        
        if (linksCheck.rows.length > 0) {
          const linkTable = linksCheck.rows[0].table_name;
          await client.query(
            `INSERT INTO ${linkTable} (visit_id, work_type_id) VALUES ($1, $2)`,
            [visitDocId, workTypeId]
          );
        }
        
        console.log('   ✅ 1 Visit inserted\n');
      } else {
        console.log('   ⚠️  No work type found, skipping visit\n');
      }
    } else {
      console.log('   ⏭️  Visits already exist, skipping\n');
    }

    console.log('🎉 Seed completed successfully!');
  } catch (err) {
    console.error(' Seed failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
