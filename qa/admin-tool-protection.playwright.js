// Local UI contract test; run via Playwright MCP with Vite on port 4188.
async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  let server = {
    events: { ranked_secret_vote: true, quick_secret_vote: false, hidden: ["weather"], quick_event: "none", quick_detail: null, quick_preset: "default", odds: { no_event: 0.5, events: {}, weather: {}, infestation: {} }, tool_protection: {
      moon_locks: [{ tool: "shovel", moons: ["Dine"] }, { tool: "weedkiller", moons: ["Titan"] }],
      conflicts: [{ tools: ["jetpack", "cruiser"], moons: ["Artifice", "Dine"] }, { tools: ["cruiser", "jetpack"], moons: ["Titan"] }, { tools: ["jetpack", "ladder"], moons: ["Titan"] }, { tools: ["shovel", "weedkiller"], moons: ["Dine"] }, { tools: ["weedkiller", "shovel"], moons: [] }],
    } },
    event_kinds: ["weather", "world_relay"], tools: ["shovel", "cruiser", "jetpack", "weedkiller", "ladder"], moons: ["Dine", "Titan", "Artifice"], shutdown_in: null,
    stats: { online: 0, rooms: 0, matches: 0, ranked: { searching: 0, playing: 0 }, quick: { searching: 0 } },
  };
  const posts = [];
  let reject = false;
  await page.unrouteAll({ behavior: "wait" });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/admin/events") {
      posts.push(route.request().postDataJSON());
      if (reject) { reject = false; return route.fulfill({ status: 400, body: "Tool protection save rejected" }); }
      server = { ...server, events: route.request().postDataJSON() };
      return route.fulfill({ json: server });
    }
    if (path === "/api/admin/server") return route.fulfill({ json: server });
    if (path === "/api/admin/players") return route.fulfill({ json: { entries: [], total: 0, ranked_total: 0 } });
    if (path === "/api/ranks") return route.fulfill({ json: { ranks: [], ranked_total: 0 } });
    if (path === "/api/badges") return route.fulfill({ json: { badges: [] } });
    return route.fulfill({ json: { online: 0, visits: 0, counted: false, rooms: 0, matches: 0, ranked: { searching: 0, playing: 0 } } });
  });
  await page.addInitScript(() => sessionStorage.setItem("lcf-admin-pw", "local-mock"));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://127.0.0.1:4188/admin");
  await page.getByRole("tab", { name: "Server", exact: true }).click();
  const picker = page.getByRole("combobox", { name: "Protected tool", exact: true });
  assert(await picker.count() === 1, "Editor must select one tool instead of displaying all rules");
  const select = async (label, value) => {
    await page.getByRole("combobox", { name: label, exact: true }).click();
    await page.getByRole("option", { name: value, exact: true }).click();
  };
  const check = (name) => page.getByRole("checkbox", { name, exact: true });
  const save = page.getByRole("button", { name: "Save tool protection", exact: true });
  assert(await check("Protect selected tool").isChecked(), "Shovel lock should be shown");
  assert(await check("Protected tool Dine").isChecked(), "Shovel moon scope must be retained");
  assert((await page.getByRole("combobox", { name: "Shovel / Weed killer scope", exact: true }).innerText()).includes("All moons"), "An all-moon inverse rule must remain all-moon when merged");
  assert(await page.getByRole("combobox", { name: /Lock \d+ tool/ }).count() === 0, "Old full rule list should be absent");
  await select("Protected tool", "Jetpack");
  assert(!await check("Protect selected tool").isChecked(), "Selection must switch lock state");
  assert(await check("Cannot ban together with Cruiser").isChecked(), "Inverse pair must be visible");
  for (const moon of ["Dine", "Titan", "Artifice"]) assert(await check(`Jetpack / Cruiser ${moon}`).isChecked(), "Inverse duplicate scopes must be merged without losing moons");
  await check("Jetpack / Cruiser Dine").uncheck();
  await select("Protected tool", "Cruiser");
  assert(await check("Cannot ban together with Jetpack").isChecked(), "Pair must be visible from the other tool");
  assert(!await check("Cruiser / Jetpack Dine").isChecked(), "Moon edits must reflect on the reverse view");
  await check("Cannot ban together with Jetpack").uncheck();
  await select("Protected tool", "Jetpack");
  assert(!await check("Cannot ban together with Cruiser").isChecked(), "Removing from B must remove from A");
  await check("Cannot ban together with Cruiser").check();
  await select("Jetpack / Cruiser scope", "Selected moons");
  await check("Jetpack / Cruiser Artifice").check();
  await check("Jetpack / Cruiser Dine").uncheck();
  await select("Protected tool", "Cruiser");
  assert(await check("Cruiser / Jetpack Artifice").isChecked(), "Adding from A must reflect on B");
  await check("Protect selected tool").check();
  await select("Protected tool scope", "Selected moons");
  await check("Protected tool Titan").check();
  await check("Protected tool Dine").uncheck();
  reject = true;
  await save.click();
  await page.getByRole("alert").filter({ hasText: "Tool protection save rejected" }).waitFor();
  assert(await check("Protected tool Titan").isChecked(), "Failed save must retain selected tool draft");
  await save.click(); await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Save tool protection") && b.disabled));
  const policy = posts.at(-1).tool_protection;
  const pair = policy.conflicts.filter((r) => r.tools.includes("jetpack") && r.tools.includes("cruiser"));
  assert(pair.length === 1 && JSON.stringify(pair[0].tools) === '["cruiser","jetpack"]', "Saved pairs must be canonical with no inverse duplicates");
  assert(JSON.stringify(pair[0].moons) === '["Artifice"]', "Saved pair must preserve chosen moon scope");
  assert(policy.conflicts.some((r) => r.tools.includes("ladder") && r.moons[0] === "Titan"), "Unrelated conflict must remain intact");
  assert(policy.moon_locks.some((r) => r.tool === "weedkiller" && r.moons[0] === "Titan"), "Unselected locks must remain intact");
  assert(policy.conflicts.some((r) => r.tools.includes("shovel") && r.tools.includes("weedkiller") && r.moons.length === 0), "Unselected all-moon conflict must remain all-moon");
  assert(posts.at(-1).hidden[0] === "weather", "Saving protection must preserve random exclusions");
  await page.reload(); await page.getByRole("tab", { name: "Server", exact: true }).click();
  await select("Protected tool", "Jetpack");
  assert(await check("Jetpack / Cruiser Artifice").isChecked(), "Saved pair must survive reload");
  assert(!await check("Show event world_relay to everyone").isChecked(), "New event defaults to restricted");
  assert(!await check("Show preset last_survivor to everyone").isChecked(), "New preset defaults to restricted");
  const beforePublic = posts.length;
  await check("Show preset last_survivor to everyone").click();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Show preset last_survivor to everyone"]')?.checked === true);
  assert(posts.length === beforePublic + 1 && posts.at(-1).restricted_events?.length === 0 && posts.at(-1).restricted_presets?.length === 0, "Publishing Last survivor must atomically publish its World Relay event");
  assert(await check("Show event world_relay to everyone").isChecked(), "Linked event visibility must update with the preset");
  await check("Show preset last_survivor to everyone").click();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Show preset last_survivor to everyone"]')?.checked === false);
  assert(posts.at(-1).restricted_events.length === 0 && posts.at(-1).restricted_presets.includes("last_survivor"), "Hiding the preset must keep its event independently public");
  assert(await check("Show event world_relay to everyone").isChecked(), "Hiding the preset must not hide World Relay");
  await check("Show event world_relay to everyone").click();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Show event world_relay to everyone"]')?.checked === false);
  await check("Show event world_relay to everyone").click();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Show event world_relay to everyone"]')?.checked === true);
  await check("Show preset last_survivor to everyone").click();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Show preset last_survivor to everyone"]')?.checked === true);
  assert(posts.at(-1).restricted_events.length === 0 && posts.at(-1).restricted_presets.length === 0, "Visibility changes must persist independently");
  assert(posts.at(-1).hidden[0] === "weather", "Visibility must not alter random exclusions");
  await page.reload(); await page.getByRole("tab", { name: "Server", exact: true }).click();
  assert(await check("Show event world_relay to everyone").isChecked(), "Event visibility must survive reload");
  assert(await check("Show preset last_survivor to everyone").isChecked(), "Preset visibility must survive reload");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Mobile settings must not overflow");
  return { passed: true, checks: "single tool selection; symmetric add/remove; scoped inverse merge; canonical save; unrelated rules; failed save draft; reload; visibility defaults/save/reload; atomic preset and event publication; independent re-hiding; mobile" };
}
