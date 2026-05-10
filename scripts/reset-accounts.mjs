import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key, { auth: { persistSession: false } });

function genSerial() {
  const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return L[Math.floor(Math.random()*26)] + L[Math.floor(Math.random()*26)] +
    Math.floor(1000 + Math.random()*9000).toString();
}
function pwd(s){return `CEM-GM-${s.toUpperCase()}-2026!`;}

// 1) Delete all profiles + related user-owned data
const tables = ["xp_events","user_badges","notifications","favorite_tutors","direct_messages","ai_messages","ai_conversations","group_join_requests","group_announcements","messages","daily_schedules","lessons","groups","profiles"];
for (const t of tables) {
  const { error } = await admin.from(t).delete().neq("id","00000000-0000-0000-0000-000000000000");
  console.log("clear", t, error?.message || "ok");
}

// 2) Delete all auth users (paginated)
let page = 1;
while (true) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) { console.error(error); break; }
  if (!data.users.length) break;
  for (const u of data.users) {
    const { error: e } = await admin.auth.admin.deleteUser(u.id);
    console.log("del user", u.email, e?.message || "ok");
  }
  if (data.users.length < 1000) break;
  page++;
}

// 3) Create 2 tutors
const tutors = [
  { fullName: "الأستاذ محمد بن علي", email: null },
  { fullName: "الأستاذة فاطمة الزهراء", email: null },
];
const created = [];
for (const t of tutors) {
  const serial = genSerial();
  const password = pwd(serial);
  const email = `${serial.toLowerCase()}@accounts.cemgm.lovable.app`;
  const { data: au, error: ae } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: t.fullName, created_by_admin: true },
  });
  if (ae) { console.error("auth err", ae.message); continue; }
  const { error: pe } = await admin.from("profiles").insert({
    user_id: au.user.id, full_name: t.fullName, email, role: "tutor",
    serial_number: serial,
    photo_url: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(t.fullName)}`,
    approved: true,
  });
  if (pe) { console.error("profile err", pe.message); continue; }
  created.push({ name: t.fullName, serial });
}
console.log("\n=== CREATED TUTORS ===");
console.log(JSON.stringify(created, null, 2));
