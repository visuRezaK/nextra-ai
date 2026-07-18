// Demo data for the CRM — realistic Persian clients across every stage, so the
// whole panel (people, companies, deals board, activities, reports, contracts,
// campaigns) has something to show for a class/demo.
//
//   node scripts/seed-crm-demo.mjs           # insert demo data
//   node scripts/seed-crm-demo.mjs --clean   # remove everything this script made
//
// Everything is tagged so --clean is precise and idempotent:
//   people/leads email → @seed.demo · deals.owner_email/activities.created_by/
//   campaigns.created_by → seed@demo.local · companies/people/leads text → SEEDCRM
//   contract_no → NX-SEED-* · chat_sessions.external_id → seed_*
// Optional tables (contracts/campaigns) are skipped cleanly if their SQL migration
// hasn't been run yet.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SEED_OWNER = "seed@demo.local";
const SEED_TAG = "SEEDCRM";
const log = (...a) => console.log(...a);
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();
const dateAgo = (n) => daysAgo(n).slice(0, 10);
const missing = (e) => e && /does not exist|schema cache|Could not find/i.test(e.message);

// ---------- CLEAN ----------
async function clean() {
  const steps = [
    ["campaign_emails", () => sb.from("campaign_emails").delete().ilike("to_email", "%@seed.demo")],
    ["campaigns", () => sb.from("campaigns").delete().eq("created_by", SEED_OWNER)],
    ["contracts", () => sb.from("contracts").delete().ilike("contract_no", "NX-SEED-%")],
    ["activities", () => sb.from("activities").delete().eq("created_by", SEED_OWNER)],
    ["deals", () => sb.from("deals").delete().eq("owner_email", SEED_OWNER)],
    ["contacts", () => sb.from("contacts").delete().ilike("email", "%@seed.demo")],
    ["people", () => sb.from("people").delete().ilike("email", "%@seed.demo")],
    ["companies", () => sb.from("companies").delete().ilike("notes", `%${SEED_TAG}%`)],
    ["chat_sessions", () => sb.from("chat_sessions").delete().ilike("external_id", "seed_%")],
  ];
  for (const [name, run] of steps) {
    const { error } = await run();
    if (error && !missing(error)) log(`  ⚠ ${name}: ${error.message}`);
    else log(`  ✓ cleaned ${name}${missing(error) ? " (table absent — skipped)" : ""}`);
  }
  log("پاک‌سازی دادهٔ نمایشی تمام شد.");
}

// ---------- SEED ----------
const COMPANIES = [
  { name: "رستوران زعفران", industry: "رستوران", city: "Toronto" },
  { name: "آژانس مسافرتی پارسه", industry: "گردشگری", city: "Vancouver" },
  { name: "کلینیک دندان‌پزشکی لبخند", industry: "سلامت", city: "Toronto" },
  { name: "فروشگاه آنلاین بازارک", industry: "تجارت الکترونیک", city: "Montreal" },
  { name: "شرکت ساختمانی آرمان", industry: "ساخت‌وساز", city: "Calgary" },
  { name: "باشگاه ورزشی الیت", industry: "ورزش", city: "Toronto" },
  { name: "دفتر حقوقی عدالت", industry: "حقوقی", city: "Ottawa" },
  { name: "مزون لباس رها", industry: "مد و پوشاک", city: "Toronto" },
];

// stage, amount, wonMonthsAgo (for won), lostReason (for lost)
const CLIENTS = [
  { person: "علی رضایی", role: "مدیر", company: "رستوران زعفران", source: "web", amount: 6500, stage: "won", wonMonthsAgo: 1 },
  { person: "مریم حسینی", role: "بنیان‌گذار", company: "آژانس مسافرتی پارسه", source: "chatbot", amount: 9000, stage: "won", wonMonthsAgo: 2 },
  { person: "رضا محمدی", role: "مدیرعامل", company: "کلینیک دندان‌پزشکی لبخند", source: "web", amount: 4200, stage: "won", wonMonthsAgo: 3 },
  { person: "سارا کریمی", role: "مدیر بازاریابی", company: "فروشگاه آنلاین بازارک", source: "voice", amount: 12000, stage: "won", wonMonthsAgo: 4 },
  { person: "امیر تهرانی", role: "مالک", company: "شرکت ساختمانی آرمان", source: "web", amount: 15000, stage: "won", wonMonthsAgo: 6 },
  { person: "نگار احمدی", role: "مدیر", company: "باشگاه ورزشی الیت", source: "chatbot", amount: 3800, stage: "negotiation" },
  { person: "حسین موسوی", role: "شریک", company: "دفتر حقوقی عدالت", source: "web", amount: 7000, stage: "proposal" },
  { person: "لیلا صادقی", role: "طراح ارشد", company: "مزون لباس رها", source: "manual", amount: 5200, stage: "consultation" },
  { person: "کاوه نجفی", role: "مدیر فروش", company: "فروشگاه آنلاین بازارک", source: "chatbot", amount: 6800, stage: "reviewing" },
  { person: "شیرین بهرامی", role: "مدیرعامل", company: "رستوران زعفران", source: "web", amount: 4500, stage: "lost", lostReason: "بودجهٔ کافی نداشت" },
  { person: "بابک یزدانی", role: "مالک", company: "باشگاه ورزشی الیت", source: "voice", amount: 5000, stage: "lost", lostReason: "با رقیب قرارداد بست" },
];

// Fresh, un-converted leads — for the live "convert" demo.
const FRESH_LEADS = [
  { name: "فرهاد اکبری", source: "web", message: "برای رستورانم یک چت‌بات سفارش می‌خواهم که رزرو بگیرد." },
  { name: "الهام رستمی", source: "chatbot", message: "می‌خواهم بدانم هوش مصنوعی چطور به فروشگاه اینترنتی‌ام کمک می‌کند." },
  { name: "پیمان قاسمی", source: "voice", message: "دنبال یک دستیار صوتی برای پاسخ‌گویی به مشتریان کلینیک هستم." },
];

const slug = (s) => s.replace(/\s+/g, ".").replace(/[^\w.]/g, "").toLowerCase();
const email = (name) => `${slug(name)}.${Math.floor(Math.random() * 900 + 100)}@seed.demo`;
const phone = () => `+1 (437) ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`;

async function seed() {
  // Companies
  const companyId = {};
  for (const c of COMPANIES) {
    const { data, error } = await sb
      .from("companies")
      .insert({ name: c.name, industry: c.industry, city: c.city, size_label: "کوچک", notes: `مشتری نمایشی — ${SEED_TAG}` })
      .select("id")
      .single();
    if (error) { log("companies:", error.message); return; }
    companyId[c.name] = data.id;
  }
  log(`✓ ${COMPANIES.length} شرکت`);

  // Clients: lead (converted) + person + deal
  let peopleCount = 0, dealCount = 0;
  const wonPeople = [];
  const peopleIds = [];
  for (const cl of CLIENTS) {
    const em = email(cl.person);
    // originating lead (contacts), marked converted
    const { data: lead } = await sb
      .from("contacts")
      .insert({ name: cl.person, email: em, phone: phone(), message: `درخواست اولیه — ${SEED_TAG}`, source: cl.source, status: "qualified" })
      .select("id")
      .single();
    // person
    const { data: person } = await sb
      .from("people")
      .insert({ full_name: cl.person, email: em, phone: phone(), position: cl.role, company_id: companyId[cl.company], source: cl.source, lead_id: lead?.id ?? null, notes: SEED_TAG })
      .select("id")
      .single();
    peopleCount++;
    peopleIds.push(person.id);
    await sb.from("contacts").update({ converted_at: daysAgo(30), person_id: person.id }).eq("id", lead.id);

    // deal
    const isWon = cl.stage === "won";
    const isLost = cl.stage === "lost";
    const enteredDays = isWon ? cl.wonMonthsAgo * 30 : Math.floor(Math.random() * 20 + 2);
    const { data: deal } = await sb
      .from("deals")
      .insert({
        title: `همکاری با ${cl.person}`,
        person_id: person.id,
        company_id: companyId[cl.company],
        stage_key: cl.stage,
        status: isWon ? "won" : isLost ? "lost" : "open",
        amount_cad: cl.amount,
        owner_email: SEED_OWNER,
        stage_entered_at: daysAgo(enteredDays),
        won_at: isWon ? daysAgo(cl.wonMonthsAgo * 30) : null,
        lost_at: isLost ? daysAgo(10) : null,
        lost_reason: cl.lostReason ?? null,
      })
      .select("id")
      .single();
    dealCount++;
    if (isWon) wonPeople.push({ id: person.id, name: cl.person, email: em, dealId: deal.id, title: `همکاری با ${cl.person}` });

    // a couple timeline entries per client
    await sb.from("activities").insert([
      { person_id: person.id, deal_id: deal.id, type: "note", title: "چالش اولیهٔ لید", body: `${cl.company} — ${SEED_TAG}`, created_by: SEED_OWNER, created_at: daysAgo(28) },
      { person_id: person.id, deal_id: deal.id, type: "call", title: "تماس معارفه", body: "دربارهٔ نیازها صحبت شد.", created_by: SEED_OWNER, created_at: daysAgo(20) },
    ]);
  }
  log(`✓ ${peopleCount} مخاطب و ${dealCount} معامله`);

  // Tasks across the spectrum, on the first few people
  const tasks = [
    { off: -3, done: false, title: "تماس پیگیری (معوق)" },
    { off: 0, done: false, title: "ارسال پروپوزال (امروز)" },
    { off: 5, done: false, title: "جلسهٔ نمایش محصول (آینده)" },
    { off: -10, done: true, title: "ارسال قرارداد (انجام‌شده)" },
  ];
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    await sb.from("activities").insert({
      person_id: peopleIds[i % peopleIds.length],
      type: "task",
      title: t.title,
      due_at: t.off < 0 ? daysAgo(-t.off) : new Date(Date.now() + t.off * 86_400_000).toISOString(),
      done_at: t.done ? daysAgo(9) : null,
      created_by: SEED_OWNER,
    });
  }
  log(`✓ ${tasks.length} وظیفه (معوق/امروز/آینده/انجام‌شده)`);

  // Fresh un-converted leads
  for (const f of FRESH_LEADS) {
    await sb.from("contacts").insert({ name: f.name, email: email(f.name), phone: phone(), message: `${f.message} ${SEED_TAG}`, source: f.source, status: "new" });
  }
  log(`✓ ${FRESH_LEADS.length} لید تازه (برای دمو تبدیل)`);

  // One chatbot conversation linked to a person (360° "Chat" link)
  const ext = `seed_${randomUUID()}`;
  const { data: session } = await sb
    .from("chat_sessions")
    .insert({ channel: "web", external_id: ext, created_at: daysAgo(26), last_seen: daysAgo(26) })
    .select("id")
    .single();
  if (session) {
    await sb.from("chat_messages").insert([
      { session_id: session.id, role: "user", content: "سلام، برای رستورانم چت‌بات می‌خواهم.", created_at: daysAgo(26) },
      { session_id: session.id, role: "assistant", content: "سلام! خوشحالم کمک کنم. چه قابلیتی مدنظرتان است؟", created_at: daysAgo(26) },
      { session_id: session.id, role: "user", content: "رزرو میز و پاسخ به سؤالات پرتکرار.", created_at: daysAgo(26) },
    ]);
    await sb.from("people").update({ session_id: session.id }).eq("id", peopleIds[0]);
    log("✓ ۱ گفتگوی چت‌بات متصل به مخاطب");
  }

  // Contracts from won deals (optional table)
  const contractBody = (name, company, amount) =>
    `# قرارداد مشاورهٔ هوش مصنوعی\n\n## طرفین\n**مشاور:** رضا کتانچی — Nextra AI Consulting\n**کارفرما:** ${name} — ${company}\n\n## مادهٔ ۱ — موضوع\nپیاده‌سازی هوش مصنوعی و راه‌اندازی محصول.\n\n## مادهٔ ۲ — مبلغ\nمبلغ کل: CAD ${amount}.`;
  if (wonPeople.length >= 2) {
    const c0 = wonPeople[0], c1 = wonPeople[1];
    const { error: cErr } = await sb.from("contracts").insert([
      { contract_no: "NX-SEED-001", title: `قرارداد ${c0.name}`, deal_id: c0.dealId, person_id: c0.id, body_md: contractBody(c0.name, "رستوران زعفران", 6500), amount_cad: 6500, duration_label: "یک ماه", status: "accepted", share_token: randomUUID().replace(/-/g, ""), sent_at: daysAgo(20), viewed_at: daysAgo(19), accepted_at: daysAgo(18), accepted_by_name: c0.name },
      { contract_no: "NX-SEED-002", title: `قرارداد ${c1.name}`, deal_id: c1.dealId, person_id: c1.id, body_md: contractBody(c1.name, "آژانس مسافرتی پارسه", 9000), amount_cad: 9000, duration_label: "یک ماه", status: "draft" },
    ]);
    if (missing(cErr)) log("… قراردادها رد شد (admin9.sql اجرا نشده)");
    else if (cErr) log("contracts:", cErr.message);
    else log("✓ ۲ قرارداد");
  }

  // A campaign to won customers (optional table)
  if (wonPeople.length > 0) {
    const { data: camp, error: campErr } = await sb
      .from("campaigns")
      .insert({ name: "خوش‌آمدگویی به مشتریان جدید", segment_key: "won_customers", goal: "دعوت به جلسهٔ بررسی نتایج ماه اول", status: "draft", created_by: SEED_OWNER })
      .select("id")
      .single();
    if (missing(campErr)) log("… کمپین رد شد (admin10.sql اجرا نشده)");
    else if (campErr) log("campaigns:", campErr.message);
    else {
      const rows = wonPeople.slice(0, 3).map((p) => ({
        campaign_id: camp.id,
        person_id: p.id,
        to_name: p.name,
        to_email: p.email,
        context: { deal: p.title },
        subject: "دعوت به جلسهٔ بررسی نتایج",
        body_text: `سلام ${p.name} عزیز،\nیک ماه از همکاری‌مان گذشت — دوست دارم نتایج را با هم مرور کنیم.`,
        status: "ready",
      }));
      await sb.from("campaign_emails").insert(rows);
      log(`✓ ۱ کمپین با ${rows.length} ایمیل آماده`);
    }
  }

  log("\nدادهٔ نمایشی ساخته شد. پنل /admin را ببینید. برای پاک‌سازی: node scripts/seed-crm-demo.mjs --clean");
}

if (process.argv.includes("--clean")) await clean();
else await seed();
