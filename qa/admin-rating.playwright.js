// Local UI contract test; run via Playwright MCP with Vite on port 4188.
async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  let player = { steam_id: "rating-admin", name: "Rating admin", avatar: null, tr: 12345, glicko: 1678, rd: 200.12345, stored_rd: 175.54321, rating_hidden: true, rank: "int3", games: 20, wins: 7, position: 1, badges: [], worn: [], created: 1, last_login: 1, last_played: 1, last_ip: "", online: false, banned: false, banned_until: 0, ban_reason: "" };
  let server = { events: { ranked_secret_vote: true, quick_secret_vote: false, hidden: [], quick_event: "none", quick_detail: null, quick_preset: "default", odds: { no_event: 0.5, events: {}, weather: {}, infestation: {} } }, event_kinds: [], shutdown_in: null, stats: { online: 0, rooms: 0, matches: 0, ranked: { searching: 0, playing: 0 }, quick: { searching: 0 } } };
  let hidden = { id: "unknown", name: "Unrated", top: 0, icon: "/ranks/unknown.svg", png: "/api/ranks/unknown.png?v=1", custom: false, prefix: "?", color1: "", color2: "", players: 0, min_tr: null, max_tr: null };
  const posts = [];
  let reject = false;
  let rejectRd = false;
  let styleSaved = false;
  let reads = 0;
  await page.unrouteAll({ behavior: "wait" });
  await page.route("**/api/**", async (route) => {
    const req = route.request(); const path = new URL(req.url()).pathname;
    if (path === "/api/admin/events") {
      posts.push(req.postDataJSON());
      if (reject) { reject = false; return route.fulfill({ status: 400, body: "Rating save rejected" }); }
      server = { ...server, events: req.postDataJSON() }; return route.fulfill({ json: server });
    }
    if (path === "/api/admin/server") { reads++; return route.fulfill({ json: server }); }
    if (path === "/api/admin/player/rd") {
      const body = req.postDataJSON(); posts.push(body);
      assert(body.steam_id === player.steam_id && body.rd === 125.5, "RD payload must identify player and exact decimal RD");
      if (rejectRd) { rejectRd = false; return route.fulfill({ status: 400, body: "Player RD rejected" }); }
      player = { ...player, stored_rd: body.rd, rd: 140.6789, rating_hidden: false }; return route.fulfill({ json: { ok: true } });
    }
    if (path === "/api/admin/players") return route.fulfill({ json: { entries: [player], total: 1, ranked_total: 1 } });
    if (path === "/api/admin/audit") return route.fulfill({ json: { entries: [] } });
    if (path === "/api/ranks") return route.fulfill({ json: { ranks: [], hidden_rating: hidden, ranked_total: 1 } });
    if (path === "/api/admin/ranks/unknown/icon") { hidden = { ...hidden, custom: true, icon: "/ranks/unknown.svg?v=2" }; return route.fulfill({ json: { ranks: [], hidden_rating: hidden } }); }
    if (path === "/api/admin/ranks/unknown/reset") { hidden = { ...hidden, custom: false }; return route.fulfill({ json: { ranks: [], hidden_rating: hidden } }); }
    if (path === "/api/admin/ranks/unknown/style") { hidden = { ...hidden, ...req.postDataJSON() }; styleSaved = true; return route.fulfill({ json: { ranks: [], hidden_rating: hidden } }); }
    if (path === "/api/badges") return route.fulfill({ json: { badges: [] } });
    return route.fulfill({ json: { online: 0, visits: 0, counted: false, rooms: 0, matches: 0, ranked: { searching: 0, playing: 0 } } });
  });
  await page.addInitScript(() => sessionStorage.setItem("lcf-admin-pw", "local-mock"));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://127.0.0.1:4188/admin");
  await page.getByRole("tab", { name: "Server", exact: true }).click();
  const field = (name) => page.getByRole("spinbutton", { name, exact: true });
  await field("Minimum RD").waitFor({ timeout: 3000 });
  assert(await field("Minimum RD").inputValue() === "120", "Legacy RD floor must default to 120");
  assert(await field("Hidden rating RD").inputValue() === "150", "Legacy visibility threshold must default to 150");
  assert(await field("Loss reduction (%)").inputValue() === "50", "Legacy loss reduction must default to 50%");
  const save = page.getByRole("button", { name: "Save rating policy", exact: true });
  for (const value of ["", "0", "351"]) { await field("Minimum RD").fill(value); assert(await save.isDisabled(), `Invalid RD ${value} must not save`); }
  await field("Minimum RD").fill("125"); await field("Hidden rating RD").fill("100"); await field("Loss reduction (%)").fill("75");
  assert(await save.isEnabled(), "Threshold may be below RD floor");
  const before = reads; await page.waitForTimeout(5500); assert(reads > before, "Server polling must run");
  assert(await field("Minimum RD").inputValue() === "125", "Polling must keep draft");
  reject = true; await save.click(); await page.getByRole("alert").filter({ hasText: "Rating save rejected" }).waitFor();
  assert(await field("Loss reduction (%)").inputValue() === "75", "Failed save must keep draft");
  await save.click(); await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Save rating policy") && b.disabled));
  assert(JSON.stringify(posts.at(-1).rating_policy) === JSON.stringify({ min_rd: 125, hidden_rd: 100, loss_reduction: 0.75 }), "Percent must save as a ratio");
  assert(posts.at(-1).quick_event === "none" && posts.at(-1).odds.no_event === 0.5, "Full event payload must keep other settings");
  await page.getByRole("tab", { name: "Players", exact: true }).click();
  await page.getByRole("button", { name: /Rating admin/ }).click();
  assert(await field("Player RD").inputValue() === "175.54321", "Editor must use raw stored RD instead of inactivity-adjusted RD");
  await field("Player RD").fill("124.9"); assert(await page.getByRole("button", { name: "Save RD", exact: true }).isDisabled(), "Player RD must respect active floor");
  rejectRd = true;
  await field("Player RD").fill("125.5"); await page.getByRole("button", { name: "Save RD", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Player RD rejected" }).waitFor();
  assert(await field("Player RD").inputValue() === "125.5", "Rejected player RD must keep draft");
  await page.getByRole("button", { name: "Save RD", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Player RD"]')?.value === "125.5");
  await page.getByText("Stored RD: 125.5 · effective RD: 140.6789", { exact: true }).waitFor();
  assert((await page.locator("main").innerText()).includes("7 / 20"), "RD editing must retain game/win counts");
  await page.getByRole("tab", { name: "Ranks", exact: true }).click();
  await page.getByText("Unrated", { exact: true }).waitFor();
  await page.getByLabel("New icon for Unrated").setInputFiles({ name: "unknown.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') });
  await page.getByRole("button", { name: "Default", exact: true }).click();
  assert(await page.getByRole("button", { name: "Default", exact: true }).count() === 0, "Reset must restore default icon");
  await page.getByRole("textbox", { name: "Name prefix", exact: true }).fill("MYSTERY");
  await page.waitForTimeout(900);
  assert(styleSaved && hidden.prefix === "MYSTERY", "Unknown emblem must support the same prefix editor");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Server", exact: true }).click(); await field("Minimum RD").waitFor();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Mobile settings overflow");
  return { passed: true, checks: "policy defaults/validation/independent threshold/percent/draft/poll/error/full merge; decimal per-user RD; unknown icon upload/reset; mobile" };
}
