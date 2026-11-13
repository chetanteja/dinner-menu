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

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  async function shot(name, { cookie, scheme = "light", action, fullPage = true, height = 844 } = {}) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
    if (cookie) {
      const [n, v] = cookie.split("=");
      await page.setCookie({ name: n, value: v, url: B });
    }
    page.on("pageerror", (e) => console.log("PAGEERROR", name, e.message));
    page.on("console", (m) => m.type() === "error" && console.log("CONSOLE", name, m.text()));
    await page.goto(B, { waitUntil: "networkidle2", timeout: 60000 });
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
