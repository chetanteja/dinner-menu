import { spawn, execSync } from "node:child_process";
import puppeteer from "puppeteer-core";

const B = "http://localhost:3123";
const OUT = new URL("../.shots", import.meta.url).pathname;

execSync("rm -rf /u/cv56729/dinner_menu/.data");
const srv = spawn("npx", ["next", "dev", "-p", "3123"], {
  cwd: "/u/cv56729/dinner_menu",
  env: { ...process.env, CRON_SECRET: "testsecret" },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
let log = "";
srv.stdout.on("data", (d) => (log += d));
srv.stderr.on("data", (d) => (log += d));
const stop = () => {
  try {
    process.kill(-srv.pid, "SIGTERM");
  } catch {}
};
process.on("exit", stop);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i++) {
  try {
    await fetch(B + "/api/auth/members");
    break;
  } catch {
    await sleep(1000);
  }
}

async function call(path, body, cookie, method) {
  const res = await fetch(B + path, {
    method: method ?? (body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get("set-cookie");
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, cookie: set ? set.split(";")[0] : null };
}

const results = [];
try {
  // ---- seed a demo household
  const host = await call("/api/auth/setup", { householdName: "The Sharma Kitchen", name: "Chitra", pin: "1234" });
  const hc = host.cookie;
  // keep the day open regardless of the wall clock (auto-lock would otherwise kick in after 6 PM)
  await call("/api/settings", { remindTime: "00:00", lockTime: "23:59" }, hc);
  const st0 = (await call("/api/state", null, hc)).json;
  const code = st0.household.joinCode;
  const amma = (await call("/api/auth/join", { code, name: "Amma", pin: "1111" })).cookie;
  const papa = (await call("/api/auth/join", { code, name: "Papa", pin: "2222" })).cookie;
  const riya = (await call("/api/auth/join", { code, name: "Riya", pin: "3333" })).cookie;
  const dish = (cat, name) => st0.dishes.find((d) => d.category === cat && d.name === name).id;

  // Riya hasn't answered yet; Papa is skipping.
  await call("/api/attendance", { attending: true }, hc);
  await call("/api/attendance", { attending: true }, amma);
  await call("/api/attendance", { attending: false }, papa);
  // Gravy: split. Fry: agreed? (3 attending would be host, amma only = 2 attending -> agreed by both). Staple: proposed by one.
  await call("/api/pick", { category: "gravy", dishId: dish("gravy", "Chicken Curry") }, hc);
  await call("/api/pick", { category: "gravy", dishId: dish("gravy", "Dal Tadka") }, amma);
  await call("/api/pick", { category: "fry", dishId: dish("fry", "Cauliflower Fry") }, hc);
  await call("/api/pick", { category: "fry", dishId: dish("fry", "Cauliflower Fry") }, amma);
  await call("/api/pick", { category: "staple", dishId: dish("staple", "Chapati") }, amma);

  // ---- API checks for the new features
  const check = (name, ok, extra) => {
    results.push(ok);
    console.log(ok ? "PASS" : "FAIL", name, ok ? "" : JSON.stringify(extra));
  };
  let r = await call("/api/attendance", { diet: "veg" }, riya);
  check("diet before answering is rejected", r.status === 400, r);
  r = await call("/api/attendance", { diet: "meat" }, hc);
  check("invalid diet is rejected", r.status === 400, r);
  await call("/api/attendance", { diet: "nonveg" }, hc);
  await call("/api/attendance", { diet: "veg" }, amma);
  let st = (await call("/api/state", null, hc)).json;
  check(
    "diet shows in state",
    st.members.find((m) => m.name === "Amma").diet === "veg" && st.members.find((m) => m.name === "Chitra").diet === "nonveg",
    st.members,
  );
  check("skipping member has no diet", st.members.find((m) => m.name === "Papa").diet === null, st.members);
  check(
    "seeded dishes carry veg flag",
    st.dishes.find((d) => d.name === "Chicken Curry").isVeg === false && st.dishes.find((d) => d.name === "Dal Tadka").isVeg === true,
  );
  r = await call("/api/dishes", { category: "fry", name: "Chicken 65", emoji: "👨‍🍳🍗", isVeg: false }, hc);
  check("multi-part emoji kept intact", r.json?.emoji === "👨‍🍳", r.json);
  r = await call("/api/dishes", { category: "staple", name: "Ragi Mudde", emoji: "🌾" }, amma);
  check("new emoji accepted, defaults to veg", r.json?.emoji === "🌾", r.json);
  r = await call("/api/dishes", { category: "fry", name: "Plain Text Dish", emoji: "abc" }, hc);
  check("non-emoji input falls back to default icon", r.json?.emoji === "🥘", r.json);
  st = (await call("/api/state", null, hc)).json;
  check("non-veg flag stored on new dish", st.dishes.find((d) => d.name === "Chicken 65")?.isVeg === false);
  check("new dish defaults to veg", st.dishes.find((d) => d.name === "Ragi Mudde")?.isVeg === true);
  r = await call("/api/ready", {}, hc);
  check("ready ping before lock is rejected", r.status === 400, r);

  // ---- garbage space: separate group, own members and invite code
  const addD = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  r = await call("/api/garbage/state", null, hc);
  check("a dinner login does not open the garbage space", r.status === 401, r);
  r = await call("/api/auth/members?space=garbage", null, hc);
  check("garbage not set up yet, dinner login offered as a shortcut", r.json?.setupNeeded === true && r.json?.linkable?.name === "Chitra", r.json);
  r = await call("/api/auth/members", null, hc);
  check("dinner member list unaffected", r.json?.setupNeeded === false && r.json?.members?.length === 4, r.json);
  r = await call("/api/auth/setup?space=garbage", { householdName: "Home", useOtherLogin: true }, riya);
  const gRiya = r.cookie;
  check("a dinner member can start the garbage group with no second PIN", r.status === 200 && gRiya?.startsWith("gb_session="), r);
  r = await call("/api/auth/setup?space=garbage", { householdName: "Other", useOtherLogin: true }, hc);
  check("only one garbage group can exist", r.status === 409, r);
  let gs = (await call("/api/garbage/state", null, gRiya)).json;
  check(
    "garbage host is the person who started it, unscheduled",
    gs.me.name === "Riya" && gs.me.isHost && gs.anchor === null && gs.todayIsPickup === false && gs.days.length === 0 && gs.members.length === 1,
    gs,
  );
  r = await call("/api/state", null, riya);
  check("dinner session still works alongside", r.status === 200, r.status);
  const gcode = gs.group.joinCode;
  r = await call("/api/auth/join?space=garbage", { code: "WRONG1", useOtherLogin: true }, amma);
  check("wrong garbage invite code is refused", r.status === 403, r);
  r = await call("/api/auth/join?space=garbage", { code: gcode, useOtherLogin: true }, amma);
  const gAmma = r.cookie;
  check("a dinner member joins garbage as herself", r.status === 200 && gAmma?.startsWith("gb_session="), r);
  r = await call("/api/auth/join?space=garbage", { code: gcode, name: "Neighbour", pin: "4444" });
  const gNeighbour = r.cookie;
  check("someone outside the family joins garbage only", r.status === 200 && gNeighbour?.startsWith("gb_session="), r);
  r = await call("/api/state", null, gNeighbour);
  check("garbage-only member cannot see dinner", r.status === 401, r.status);
  gs = (await call("/api/garbage/state", null, gRiya)).json;
  check("garbage group has its own members", gs.members.map((m) => m.name).join() === "Riya,Amma,Neighbour", gs.members);
  const gid = (n) => gs.members.find((m) => m.name === n).id;
  const today = gs.today;

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  async function shot(name, { cookie, scheme = "light", action, fullPage = true, height = 844, path = "/" } = {}) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
    // every screenshot starts signed out (the browser shares one cookie jar between pages)
    await page.deleteCookie(...(await page.cookies(B)));
    if (cookie) {
      const [n, v] = cookie.split("=");
      await page.setCookie({ name: n, value: v, url: B });
    }
    page.on("pageerror", (e) => console.log("PAGEERROR", name, e.message));
    page.on("console", (m) => m.type() === "error" && console.log("CONSOLE", name, m.text()));
    await page.goto(B + path, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForFunction(() => !document.querySelector(".skeleton"), { timeout: 60000 }).catch(() => {});
    await sleep(1500);
    if (action) await action(page);
    await sleep(900);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
    await page.close();
    console.log("shot", name);
  }

  const clickText = async (page, text) => {
    const ok = await page.evaluate((t) => {
      const els = [...document.querySelectorAll("button")];
      const el = els.find((e) => e.textContent.trim().includes(t));
      if (el) el.click();
      return !!el;
    }, text);
    if (!ok) console.log("click target not found:", text);
  };

  await shot("01-login-light", {});
  // Host proposed Chicken Curry and Cauliflower Fry first: no Agree button on their own proposals.
  await shot("02-today-host-light", {
    cookie: hc,
    action: async (p) => {
      const info = await p.evaluate(() => ({
        yourPick: document.querySelectorAll('[title="You proposed this dish"]').length,
        agreedButtons: [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Agreed").length,
        vegMarks: document.querySelectorAll('[aria-label="Non-vegetarian"]').length,
        warning: document.body.innerText.includes("is veg today") || document.body.innerText.includes("are veg today"),
      }));
      check("host sees 'Your pick' on both own proposals", info.yourPick === 2, info);
      check("host has no clickable Agreed on own proposals", info.agreedButtons === 0, info);
      check("non-veg dish is marked and warns on a veg day", info.vegMarks >= 1 && info.warning, info);
    },
  });
  // Amma proposed two dishes herself and only agreed with the host on Cauliflower Fry.
  await shot("02b-today-amma", {
    cookie: amma,
    action: async (p) => {
      const info = await p.evaluate(() => ({
        yourPick: document.querySelectorAll('[title="You proposed this dish"]').length,
        agreedButtons: [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Agreed").length,
      }));
      check("Amma sees 'Your pick' on her two proposals", info.yourPick === 2, info);
      check("Amma can still toggle Agreed on a dish she only agreed with", info.agreedButtons === 1, info);
    },
  });
  // Add-dish form with the big emoji picker and veg toggle
  await shot("02c-add-dish-form", {
    cookie: hc,
    fullPage: false,
    height: 1000,
    action: async (p) => {
      await clickText(p, "Prefer something else");
      await sleep(700);
      await clickText(p, "Add a new dish");
      await sleep(900);
      await p.evaluate(() => {
        const el = [...document.querySelectorAll("[data-vaul-no-drag]")].find((e) => e.querySelector('[aria-label="Veg or non-veg"]'));
        el?.scrollTo(0, el.scrollHeight);
      });
    },
  });

  await shot("03-today-host-dark", { cookie: hc, scheme: "dark" });
  // Riya (unanswered)
  await shot("04-today-unanswered", { cookie: riya });
  // Dish sheet
  await shot("05-dish-sheet", {
    cookie: hc,
    fullPage: false,
    action: async (p) => {
      await clickText(p, "Prefer something else");
      await sleep(900);
    },
  });
  // Lock sheet
  await shot("06-lock-sheet", {
    cookie: hc,
    fullPage: false,
    height: 900,
    action: async (p) => {
      await clickText(p, "Lock menu");
      await sleep(900);
    },
  });

  // Lock it and view the locked card
  await call("/api/lock", { action: "lock" }, hc);
  r = await call("/api/ready", {}, hc);
  check("ready ping works once locked", r.status === 200, r);
  r = await call("/api/ready", {}, amma);
  check("a second ping inside the cooldown is throttled", r.status === 429, r);
  st = (await call("/api/state", null, amma)).json;
  check("everyone sees who called dinner", st.ready?.by === "Chitra", st.ready);
  await shot("07-locked", { cookie: hc });
  await shot("08-locked-dark", { cookie: amma, scheme: "dark" });
  await shot("09-history", {
    cookie: hc,
    action: async (p) => {
      await clickText(p, "History");
    },
  });
  await shot("10-me-host", {
    cookie: hc,
    action: async (p) => {
      await clickText(p, "Me");
    },
  });

  // ---- garbage schedule, assignment, done, reminders
  const gstate = async (c = gRiya) => (await call("/api/garbage/state", null, c)).json;
  await shot("11-garbage-setup", { cookie: gRiya, path: "/garbage" });
  await shot("11b-garbage-login", { path: "/garbage" });
  await shot("11c-garbage-join-as", { cookie: hc, path: "/garbage" });

  r = await call("/api/garbage/schedule", { anchor: "2020-01-01" }, gRiya);
  check("a far-away anchor date is refused", r.status === 400, r);
  r = await call("/api/garbage/schedule", { anchor: "nonsense" }, gRiya);
  check("a malformed anchor date is refused", r.status === 400, r);
  r = await call("/api/garbage/schedule", { anchor: today }, gNeighbour);
  check("any garbage member can set the first schedule", r.status === 200, r);
  gs = await gstate();
  check(
    "anchor today: today is a pickup, then every other day",
    gs.todayIsPickup && gs.days.length === 6 && gs.days[0].date === today && gs.days[1].date === addD(today, 2) && gs.days[5].date === addD(today, 10),
    gs.days,
  );
  await call("/api/garbage/schedule", { anchor: addD(today, 1) }, gAmma);
  gs = await gstate();
  check("anchor tomorrow: no garbage today, first pickup tomorrow", !gs.todayIsPickup && gs.days[0].date === addD(today, 1), gs.days[0]);
  await call("/api/garbage/schedule", { anchor: addD(today, -2) }, gAmma);
  gs = await gstate();
  check("an anchor in the past still lines up (today is 2 days later)", gs.todayIsPickup && gs.days[0].date === today, gs.days[0]);
  await call("/api/garbage/schedule", { anchor: addD(today, 3) }, gAmma);
  gs = await gstate();
  check("anchor +3: pickups fall on odd offsets, so tomorrow is next", !gs.todayIsPickup && gs.days[0].date === addD(today, 1), gs.days[0]);
  r = await call("/api/garbage/ping", {}, gRiya);
  check("cannot ping when there is no pickup today", r.status === 400, r);
  await shot("18-garbage-no-pickup-today", { cookie: gRiya, path: "/garbage" });
  await call("/api/garbage/schedule", { anchor: today }, gRiya);

  r = await call("/api/garbage/assign", { date: addD(today, 1), memberId: gid("Amma") }, gRiya);
  check("cannot assign a day that isn't a pickup day", r.status === 400, r);
  r = await call("/api/garbage/assign", { date: today, memberId: "00000000-0000-0000-0000-000000000000" }, gRiya);
  check("cannot assign someone who isn't in the group", r.status === 400, r);
  r = await call("/api/garbage/assign", { date: addD(today, -2), memberId: gid("Amma") }, gRiya);
  check("cannot assign a day in the past", r.status === 400, r);
  r = await call("/api/garbage/assign", { date: today, memberId: gid("Amma") }, gRiya);
  check("assign today to Amma", r.status === 200, r);
  r = await call("/api/garbage/assign", { date: addD(today, 2), memberId: gid("Neighbour") }, gAmma);
  check("assign a future pickup", r.status === 200, r);
  gs = await gstate();
  check("assignments show in state", gs.days[0].assignedTo === gid("Amma") && gs.days[1].assignedTo === gid("Neighbour"), gs.days);
  r = await call("/api/garbage/ping", {}, gAmma);
  check("the person on duty can announce it too (Riya and Neighbour are notified)", r.status === 200 && r.json?.notified === 2, r);
  await shot("12-garbage-today", { cookie: gRiya, path: "/garbage" });
  await shot("12b-garbage-today-mine", { cookie: gAmma, path: "/garbage", scheme: "dark" });
  await shot("14-garbage-assign-sheet", {
    cookie: gRiya,
    path: "/garbage",
    fullPage: false,
    action: async (p) => {
      await clickText(p, "Change");
      await sleep(900);
    },
  });
  await shot("15-garbage-reset-sheet", {
    cookie: gRiya,
    path: "/garbage",
    fullPage: false,
    height: 900,
    action: async (p) => {
      await clickText(p, "Reset");
      await sleep(900);
    },
  });

  r = await call("/api/garbage/ping", {}, gRiya);
  check("pings are throttled for the whole group", r.status === 429, r);
  r = await call("/api/garbage/done", { date: addD(today, 2), done: true }, gNeighbour);
  check("cannot mark a future pickup as done", r.status === 400, r);
  r = await call("/api/garbage/done", { date: today, done: true }, gNeighbour);
  check("anyone can mark today's garbage as taken out", r.status === 200, r);
  gs = await gstate();
  check("done is recorded with who did it", gs.days[0].done?.by === gid("Neighbour"), gs.days[0]);
  r = await call("/api/garbage/assign", { date: today, memberId: gid("Riya") }, gRiya);
  check("cannot re-assign a pickup that is already done", r.status === 400, r);
  r = await call("/api/garbage/ping", {}, gRiya);
  check("no pinging once it's been taken out", r.status === 400, r);
  await shot("13-garbage-done", { cookie: gRiya, path: "/garbage" });

  // Reminder: nothing for a day that's already done; once per day otherwise; assignee only.
  await call("/api/garbage/settings", { remindTime: "00:00" }, gRiya);
  const tick = async () =>
    (await (await fetch(B + "/api/cron/tick", { headers: { Authorization: "Bearer testsecret" } })).json()).garbage;
  check("no reminder when it is already taken out", (await tick()).length === 0);
  await call("/api/garbage/done", { date: today, done: false }, gNeighbour);
  let t = await tick();
  check("reminder goes to the assignee when someone is down for it", t.length === 1 && t[0].action === "reminded assignee", t);
  check("reminder is sent only once a day", (await tick()).length === 0);
  r = await call("/api/garbage/settings", { remindTime: "19:30" }, gAmma);
  check("only the host can change the reminder time", r.status === 403, r);
  r = await call("/api/garbage/settings", { remindTime: "7pm" }, gRiya);
  check("bad reminder time is refused", r.status === 400, r);

  // Resetting the pattern drops planned names on days that stop being pickup days.
  await call("/api/garbage/schedule", { anchor: addD(today, 1) }, gRiya);
  await call("/api/garbage/schedule", { anchor: today }, gRiya);
  gs = await gstate();
  check("reset clears names planned for days that are no longer pickups", gs.days[0].assignedTo === null && gs.days[1].assignedTo === null, gs.days);

  // Push endpoints: one phone can belong to a dinner member and a garbage member at once.
  const fakeSub = (end) => ({ subscription: { endpoint: end, keys: { p256dh: "p", auth: "a" } } });
  const E = "https://push.example/endpoint-1";
  await call("/api/push/subscribe", fakeSub(E), riya);
  await call("/api/push/subscribe?space=garbage", fakeSub(E), gRiya);
  const fsMod = await import("node:fs");
  const subsOf = () =>
    JSON.parse(fsMod.readFileSync("/u/cv56729/dinner_menu/.data/db.json", "utf8")).push_subscriptions.filter((x) => x.endpoint === E);
  check("one phone can hold a dinner and a garbage subscription", subsOf().length === 2, subsOf());
  await call("/api/push/subscribe", fakeSub(E), amma);
  check(
    "another dinner member taking the phone replaces only the dinner subscription",
    subsOf().length === 2 && subsOf().some((x) => x.member_id === gs.me.id) && subsOf().filter((x) => x.member_id !== gs.me.id).length === 1,
    subsOf(),
  );

  // Sign in with PIN lands in the right space
  r = await call("/api/auth/login", { memberId: gid("Neighbour"), pin: "4444" });
  check("garbage PIN login sets the garbage cookie", r.status === 200 && r.cookie?.startsWith("gb_session="), r);
  r = await call("/api/auth/login", { memberId: st0.members[0].id, pin: "1234" });
  check("dinner PIN login sets the dinner cookie", r.status === 200 && r.cookie?.startsWith("dm_session="), r);

  await shot("16-garbage-group", {
    cookie: gRiya,
    path: "/garbage",
    action: async (p) => {
      await clickText(p, "Group");
    },
  });
  await shot("17-dinner-me-link", {
    cookie: hc,
    action: async (p) => {
      await clickText(p, "Me");
    },
  });

  await browser.close();

  // ---- lazy auto-lock check from a fresh unlocked state
  await call("/api/lock", { action: "unlock" }, hc);
  st = (await call("/api/state", null, hc)).json;
  check("reopening voting clears the ready banner", st.day.locked === false && st.ready === null, st.ready);
  // host_unlocked disables auto-lock for today, so test on a different household state: simulate by editing db
  const fs = await import("node:fs");
  const f = "/u/cv56729/dinner_menu/.data/db.json";
  const db = JSON.parse(fs.readFileSync(f, "utf8"));
  db.dinner_days = [];
  db.final_menu = [];
  fs.writeFileSync(f, JSON.stringify(db));
  await call("/api/settings", { remindTime: "00:00", lockTime: "00:01" }, hc);
  const s = (await call("/api/state", null, hc)).json;
  console.log("lazy auto-lock:", { locked: s.day.locked, auto: s.day.lockedAuto, final: s.finalMenu.length });
} catch (e) {
  console.log("TEST FAILED", e);
} finally {
  stop();
  if (results.length) console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
  const errs = log.split("\n").filter((l) => /error|⨯/i.test(l));
  if (errs.length) console.log("SERVER LOG ERRORS:\n" + errs.slice(0, 10).join("\n"));
  process.exit(0);
}
