/**
 * Seed script for Strapi — realistic production-like data
 *
 * Usage:
 *   npx tsx scripts/seed-strapi.ts
 *
 * Prerequisites:
 *   - Strapi running (npm run develop)
 *   - STRAPI_API_TOKEN set in .env
 *
 * Note: Visits are created without workType relations due to Strapi v5
 * relation format requiring documentId. Assign workTypes manually in admin.
 */

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!STRAPI_API_TOKEN) {
  console.error("ERROR: STRAPI_API_TOKEN not set in .env");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${STRAPI_API_TOKEN}`,
};

async function fetchAll(endpoint: string) {
  const res = await fetch(`${STRAPI_URL}/api/${endpoint}`, { headers });
  const data = await res.json();
  return data.data || [];
}

async function deleteAll(endpoint: string, items: any[]) {
  for (const item of items) {
    const id = item.documentId || item.id;
    await fetch(`${STRAPI_URL}/api/${endpoint}/${id}`, {
      method: "DELETE",
      headers,
    });
  }
}

async function create(endpoint: string, data: any) {
  const res = await fetch(`${STRAPI_URL}/api/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`  ❌ Failed to create ${endpoint}:`, err);
    return null;
  }
  return (await res.json()).data;
}

// ─── Work Types ──────────────────────────────────────────────────────────────

const WORK_TYPES = [
  // Cleaning
  { name: "Standard Home Cleaning", slug: "standard-home-cleaning", description: "Regular cleaning service for your home. Includes dusting, vacuuming, mopping, bathroom and kitchen sanitization.", category: "cleaning", duration: 90, price: 85, isActive: true },
  { name: "Deep Clean", slug: "deep-clean", description: "Thorough top-to-bottom cleaning. Perfect for homes that haven't been professionally cleaned in 3+ months. Includes inside cabinets, behind appliances, and detailed scrubbing.", category: "cleaning", duration: 180, price: 180, isActive: true },
  { name: "End of Lease Cleaning", slug: "end-of-lease-cleaning", description: "Bond-back guaranteed cleaning. We follow the real estate checklist to ensure you get your full bond back.", category: "cleaning", duration: 240, price: 250, isActive: true },
  { name: "Office & Commercial Cleaning", slug: "office-commercial-cleaning", description: "Daily, weekly, or monthly office cleaning. Desks, floors, restrooms, kitchenettes, and common areas.", category: "cleaning", duration: 120, price: 150, isActive: true },
  { name: "Carpet & Upholstery Cleaning", slug: "carpet-upholstery-cleaning", description: "Hot water extraction method for carpets, rugs, and upholstered furniture. Removes stains, allergens, and odours.", category: "cleaning", duration: 60, price: 120, isActive: true },
  { name: "Window Cleaning", slug: "window-cleaning", description: "Interior and exterior window cleaning. Includes frames, sills, and tracks. Up to 3 stories.", category: "cleaning", duration: 60, price: 95, isActive: true },

  // Plumbing
  { name: "Leak Detection & Repair", slug: "leak-detection-repair", description: "Professional leak detection using thermal imaging. Repair of burst pipes, dripping taps, and hidden leaks.", category: "plumbing", duration: 90, price: 130, isActive: true },
  { name: "Drain Unblocking", slug: "drain-unblocking", description: "High-pressure jet blasting to clear blocked drains, sinks, toilets, and sewer lines.", category: "plumbing", duration: 60, price: 110, isActive: true },
  { name: "Hot Water System Installation", slug: "hot-water-system-installation", description: "Supply and install electric, gas, or solar hot water systems. Includes removal of old unit.", category: "plumbing", duration: 180, price: 350, isActive: true },
  { name: "Bathroom Renovation Plumbing", slug: "bathroom-renovation-plumbing", description: "Complete plumbing rough-in and fit-off for bathroom renovations. Includes pipework, fixtures, and compliance certificates.", category: "plumbing", duration: 480, price: 800, isActive: true },
  { name: "Gas Fitting & Installation", slug: "gas-fitting-installation", description: "Licensed gas fitter for cooktops, heaters, and bayonets. Includes leak testing and compliance.", category: "plumbing", duration: 120, price: 200, isActive: true },
  { name: "Emergency Plumbing (24/7)", slug: "emergency-plumbing", description: "After-hours emergency callout. Burst pipes, gas leaks, sewage overflow, and flooding. Response within 60 minutes.", category: "plumbing", duration: 60, price: 250, isActive: true },

  // Construction
  { name: "Kitchen Renovation", slug: "kitchen-renovation", description: "Full kitchen makeover including demolition, cabinetry, benchtops, splashbacks, and finishing. Project managed from start to finish.", category: "construction", duration: 1440, price: 15000, isActive: true },
  { name: "Bathroom Renovation", slug: "bathroom-renovation", description: "Complete bathroom renovation. Waterproofing, tiling, plumbing, electrical, fixtures, and vanity installation.", category: "construction", duration: 960, price: 12000, isActive: true },
  { name: "Deck & Pergola Building", slug: "deck-pergola-building", description: "Custom timber or composite decks and pergolas. Includes design, council approval assistance, and construction.", category: "construction", duration: 720, price: 5000, isActive: true },
  { name: "Internal Wall Removal", slug: "internal-wall-removal", description: "Structural wall removal to create open-plan living. Includes engineering assessment, steel beam installation, and making good.", category: "construction", duration: 480, price: 4500, isActive: true },
  { name: "Painting (Interior)", slug: "painting-interior", description: "Professional interior painting. Includes prep work, filling, sanding, primer, and two coats of premium paint.", category: "construction", duration: 240, price: 600, isActive: true },
  { name: "Tiling & Re-tiling", slug: "tiling-re-tiling", description: "Floor and wall tiling for bathrooms, kitchens, laundries, and outdoor areas. Includes waterproofing.", category: "construction", duration: 360, price: 900, isActive: true },
];

// ─── Blog Posts ──────────────────────────────────────────────────────────────

const BLOG_POSTS = [
  {
    title: "How Often Should You Deep Clean Your Home?",
    slug: "how-often-deep-clean-home",
    description: "A comprehensive guide to maintaining a healthy living environment through regular deep cleaning.",
    content: `<h2>Why Deep Cleaning Matters</h2><p>While regular weekly cleaning keeps your home tidy, deep cleaning targets the hidden dirt, allergens, and bacteria that accumulate over time. Here's what you need to know.</p><h2>Recommended Frequency</h2><p>For most households, we recommend a professional deep clean every <strong>3-6 months</strong>. Homes with pets, children, or allergy sufferers may benefit from more frequent service.</p><h2>What's Included</h2><ul><li>Inside cabinet and drawer cleaning</li><li>Behind and under appliances</li><li>Baseboard and crown moulding dusting</li><li>Light fixture and ceiling fan cleaning</li><li>Window track and sill scrubbing</li><li>Grout and tile deep cleaning</li></ul><h2>Signs You Need a Deep Clean</h2><p>If you notice persistent odours, visible dust on surfaces shortly after cleaning, or increased allergy symptoms, it's time to book a deep clean.</p>`,
    pubDate: "2026-04-15T09:00:00.000Z",
    updatedDate: "2026-04-20T14:00:00.000Z",
  },
  {
    title: "5 Signs You Need a Plumber ASAP",
    slug: "5-signs-need-plumber-asap",
    description: "Don't ignore these warning signs — they could save you thousands in water damage repairs.",
    content: `<h2>1. Low Water Pressure</h2><p>Suddenly low water pressure can indicate a burst pipe, corrosion, or a serious blockage in your main line.</p><h2>2. Discoloured Water</h2><p>Yellow, brown, or rusty water means your pipes are corroding or there's sediment buildup. This can affect your health.</p><h2>3. Foul Odours from Drains</h2><p>Sewer gas smells are not just unpleasant — they can be dangerous. A dry P-trap or cracked vent pipe could be letting gas into your home.</p><h2>4. Water Stains on Walls or Ceilings</h2><p>These indicate a hidden leak that's been going on for some time. The longer you wait, the more structural damage occurs.</p><h2>5. Gurgling Sounds</h2><p>Bubbling or gurgling from toilets, sinks, or drains usually means there's a blockage in your main sewer line.</p><blockquote>If you experience any of these, call us immediately. Early intervention saves money.</blockquote>`,
    pubDate: "2026-04-28T10:00:00.000Z",
    updatedDate: null,
  },
  {
    title: "The Complete Guide to Bathroom Renovations in Brisbane",
    slug: "bathroom-renovations-guide-brisbane",
    description: "Everything you need to know about planning, budgeting, and executing a bathroom renovation.",
    content: `<h2>Planning Your Renovation</h2><p>A successful bathroom renovation starts with a clear plan. Consider your budget, timeline, and must-have features before any work begins.</p><h2>Budget Breakdown</h2><p>Typical bathroom renovations in Brisbane range from <strong>$10,000 to $25,000</strong>. Here's where the money goes:</p><ul><li>Demolition and disposal: 10%</li><li>Plumbing and electrical: 20%</li><li>Waterproofing and tiling: 25%</li><li>Fixtures and fittings: 25%</li><li>Cabinetry and vanity: 15%</li><li>Labour and project management: 5%</li></ul><h2>Timeline</h2><p>Expect <strong>2-4 weeks</strong> from start to finish. This includes demolition, rough-in, waterproofing (which requires 48-hour cure time), tiling, and fit-off.</p><h2>Popular Trends in 2026</h2><ul><li>Walk-in showers with frameless glass</li><li>Freestanding bathtubs</li><li>Wall-hung vanities and toilets</li><li>Natural stone or large-format tiles</li><li>Heated towel rails and underfloor heating</li></ul><p>Ready to start? Contact us for a free consultation and quote.</p>`,
    pubDate: "2026-05-05T08:00:00.000Z",
    updatedDate: "2026-05-06T12:00:00.000Z",
  },
];

// ─── Messages ────────────────────────────────────────────────────────────────

const MESSAGES = [
  { nombre: "Sarah Mitchell", telefono: "+61 412 345 678", servicio: "reparacion", mensaje: "Hi, I have a leaking tap in my kitchen that's been dripping for a week. Would love a quote for repair. Available most weekdays after 2pm." },
  { nombre: "James O'Brien", telefono: "+61 433 567 890", servicio: "instalacion", mensaje: "Looking to get a new dishwasher installed. Already purchased the unit, just need someone to connect it to existing plumbing and power. Address is in New Farm." },
  { nombre: "Emma Thompson", telefono: "+61 455 123 456", servicio: "mantenimiento", mensaje: "We need regular office cleaning for our small business (approx 80sqm). Looking for weekly service, Monday mornings preferred. Can you provide a monthly quote?" },
  { nombre: "David Chen", telefono: "+61 477 890 123", servicio: "reparacion", mensaje: "Our hot water system stopped working this morning. It's a Rheem electric unit, about 8 years old. Need someone ASAP as we have young kids. Happy to pay the emergency callout fee." },
  { nombre: "Lisa Patel", telefono: "+61 488 234 567", servicio: "instalacion", mensaje: "Hi there! We're renovating our bathroom and need a quote for full plumbing rough-in and fit-off. Plans are ready, just need pricing for the plumbing portion. Can I email the plans?" },
];

// ─── Blocked Dates ───────────────────────────────────────────────────────────

const BLOCKED_DATES = [
  { date: "2026-12-25", reason: "Christmas Day" },
  { date: "2026-12-26", reason: "Boxing Day" },
  { date: "2027-01-01", reason: "New Year's Day" },
  { date: "2027-01-26", reason: "Australia Day" },
  { date: "2026-06-08", reason: "Queen's Birthday (QLD)" },
  { date: "2026-10-05", reason: "Labour Day (QLD)" },
];

// ─── Availability (Business Hours) ───────────────────────────────────────────

const AVAILABILITY = [
  { dayOfWeek: 1, startTime: "07:00:00", endTime: "18:00:00" }, // Monday
  { dayOfWeek: 2, startTime: "07:00:00", endTime: "18:00:00" }, // Tuesday
  { dayOfWeek: 3, startTime: "07:00:00", endTime: "18:00:00" }, // Wednesday
  { dayOfWeek: 4, startTime: "07:00:00", endTime: "18:00:00" }, // Thursday
  { dayOfWeek: 5, startTime: "07:00:00", endTime: "18:00:00" }, // Friday
  { dayOfWeek: 6, startTime: "08:00:00", endTime: "14:00:00" }, // Saturday
];

// ─── Visits ──────────────────────────────────────────────────────────────────

// We'll create visits after work types exist, so this runs in a second pass
const VISIT_TEMPLATES = [
  { nombre: "Sarah Mitchell", telefono: "+61 412 345 678", email: "sarah.m@email.com", date: "2026-05-12T09:00:00.000Z", mensaje: "Standard home clean — 3 bed, 2 bath house in Paddington.", status: "confirmed" },
  { nombre: "James O'Brien", telefono: "+61 433 567 890", email: "james.ob@email.com", date: "2026-05-12T11:00:00.000Z", mensaje: "Leak under kitchen sink. Water pooling in the cabinet.", status: "pending" },
  { nombre: "Michael Torres", telefono: "+61 422 111 222", email: "m.torres@email.com", date: "2026-05-13T08:00:00.000Z", mensaje: "Deck construction consultation — approx 20sqm, timber.", status: "confirmed" },
  { nombre: "Rebecca Walsh", telefono: "+61 444 333 555", email: "rebecca.w@email.com", date: "2026-05-13T14:00:00.000Z", mensaje: "End of lease clean for 2-bed apartment in South Brisbane.", status: "pending" },
  { nombre: "Andrew Kim", telefono: "+61 455 666 777", email: "andrew.k@email.com", date: "2026-05-14T10:00:00.000Z", mensaje: "Hot water system replacement — gas, 200L unit.", status: "confirmed" },
  { nombre: "Sophie Laurent", telefono: "+61 466 888 999", email: "sophie.l@email.com", date: "2026-05-14T15:00:00.000Z", mensaje: "Interior painting — 3 rooms, walls only. Colour: Dulux Lexicon Quarter.", status: "pending" },
  { nombre: "Tom Bradley", telefono: "+61 477 000 111", email: "tom.b@email.com", date: "2026-05-15T07:30:00.000Z", mensaje: "Drain unblocking — main sewer line, slow drainage throughout house.", status: "confirmed" },
  { nombre: "Nina Petrov", telefono: "+61 488 222 333", email: "nina.p@email.com", date: "2026-05-15T13:00:00.000Z", mensaje: "Bathroom renovation quote — full gut and rebuild, approx 4sqm.", status: "pending" },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding Strapi with production-like data...\n");

  // 1. Clean existing data
  console.log("── Cleaning existing data ──");
  const existingWorkTypes = await fetchAll("work-types");
  const existingMessages = await fetchAll("messages");
  const existingVisits = await fetchAll("visits");
  const existingBlogPosts = await fetchAll("blog-posts");
  const existingBlockedDates = await fetchAll("blocked-dates");
  const existingAvailability = await fetchAll("availabilities");

  await deleteAll("work-types", existingWorkTypes);
  await deleteAll("messages", existingMessages);
  await deleteAll("visits", existingVisits);
  await deleteAll("blog-posts", existingBlogPosts);
  await deleteAll("blocked-dates", existingBlockedDates);
  await deleteAll("availabilities", existingAvailability);
  console.log(`  Deleted: ${existingWorkTypes.length} work types, ${existingMessages.length} messages, ${existingVisits.length} visits, ${existingBlogPosts.length} blog posts, ${existingBlockedDates.length} blocked dates, ${existingAvailability.length} availability entries\n`);

  // 2. Create Work Types
  console.log("── Creating Work Types ──");
  const createdWorkTypes: any[] = [];
  for (const wt of WORK_TYPES) {
    const created = await create("work-types", wt);
    if (created) {
      createdWorkTypes.push(created);
      console.log(`  ✅ ${wt.name} ($${wt.price}, ${wt.duration}min)`);
    }
  }
  console.log(`  Created ${createdWorkTypes.length} work types\n`);

  // 3. Create Messages
  console.log("── Creating Messages ──");
  for (const msg of MESSAGES) {
    const created = await create("messages", msg);
    if (created) console.log(`  ✅ ${msg.nombre}`);
  }
  console.log("");

  // 4. Create Blog Posts
  console.log("── Creating Blog Posts ──");
  for (const post of BLOG_POSTS) {
    const created = await create("blog-posts", post);
    if (created) console.log(`  ✅ ${post.title}`);
  }
  console.log("");

  // 5. Create Blocked Dates
  console.log("── Creating Blocked Dates ──");
  for (const bd of BLOCKED_DATES) {
    const created = await create("blocked-dates", bd);
    if (created) console.log(`  ✅ ${bd.date} — ${bd.reason}`);
  }
  console.log("");

  // 6. Create Availability
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  console.log("── Creating Availability (Business Hours) ──");
  for (const avail of AVAILABILITY) {
    const created = await create("availabilities", avail);
    if (created) console.log(`  ✅ ${dayNames[avail.dayOfWeek]}: ${avail.startTime.substring(0, 5)} - ${avail.endTime.substring(0, 5)}`);
  }
  console.log("");

  // 7. Create Visits (assign to random work types)
  console.log("── Creating Visits ──");
  for (const vt of VISIT_TEMPLATES) {
    const randomWorkType = createdWorkTypes[Math.floor(Math.random() * createdWorkTypes.length)];
    const visitData = {
      ...vt,
      workType: randomWorkType.id,
    };
    const created = await create("visits", visitData);
    if (created) console.log(`  ✅ ${vt.nombre} → ${randomWorkType.name} (${vt.date.substring(0, 10)})`);
  }
  console.log("");

  // Summary
  console.log("── Seed Summary ──");
  console.log(`  📋 Work Types:    ${createdWorkTypes.length}`);
  console.log(`  💬 Messages:      ${MESSAGES.length}`);
  console.log(`  📝 Blog Posts:    ${BLOG_POSTS.length}`);
  console.log(`  🚫 Blocked Dates: ${BLOCKED_DATES.length}`);
  console.log(`  🕐 Availability:  ${AVAILABILITY.length}`);
  console.log(`  📅 Visits:        ${VISIT_TEMPLATES.length}`);
  console.log("\n✅ Seeding complete!");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
