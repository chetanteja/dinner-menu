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

try {
  // ---- seed a demo household
  const host = await call("/api/auth/setup", { householdName: "The Sharma Kitchen", name: "Chitra", pin: "1234" });
  const hc = host.cookie;
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
  await call("/api/pick", { category: "gravy", dishId: dish("gravy", "Paneer Butter Masala") }, hc);
  await call("/api/pick", { category: "gravy", dishId: dish("gravy", "Dal Tadka") }, amma);
  await call("/api/pick", { category: "fry", dishId: dish("fry", "Cauliflower Fry") }, hc);
  await call("/api/pick", { category: "fry", dishId: dish("fry", "Cauliflower Fry") }, amma);
  await call("/api/pick", { category: "staple", dishId: dish("staple", "Chapati") }, amma);

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
  await shot("02-today-host-light", { cookie: hc });
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
  console.log("after unlock locked?", (await call("/api/state", null, hc)).json.day.locked);
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
  const errs = log.split("\n").filter((l) => /error|⨯/i.test(l));
  if (errs.length) console.log("SERVER LOG ERRORS:\n" + errs.slice(0, 10).join("\n"));
  process.exit(0);
}
