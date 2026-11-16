// Playwright MCP browser_run_code_unsafe(filename: absolute path), Vite :4187.
// Delays real UI save requests at the API boundary to catch stale full-config writes.
async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const equal = (actual, expected, message) => assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)}`);
  await page.unrouteAll({ behavior: "wait" });
  let server = {
    events: { ranked_secret_vote: true, quick_secret_vote: false, hidden: [], quick_event: "none", quick_detail: null, quick_preset: "default", ranked_enemy_rules: [], tool_protection: { moon_locks: [], conflicts: [] }, odds: { no_event: 0.5, events: {}, weather: {}, infestation: {} } },
    event_kinds: [], shutdown_in: null,
    stats: { online: 0, visits: 0, rooms: 0, matches: 0, ranked: { searching: 0, playing: 0 }, quick: { searching: 0 } },
  };
  const posts = [];
  let holdNext = false;
  let release = null;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/admin/events") {
      const body = request.postDataJSON();
      posts.push(body);
      if (holdNext) {
        holdNext = false;
        await new Promise((resolve) => { release = resolve; });
        release = null;
      }
      server = { ...server, events: body };
      return route.fulfill({ json: server });
    }
    if (path === "/api/admin/server") return route.fulfill({ json: server });
    if (path === "/api/admin/players") return route.fulfill({ json: { entries: [], total: 0, ranked_total: 0 } });
    if (path === "/api/ranks") return route.fulfill({ json: { ranks: [], ranked_total: 0 } });
    if (path === "/api/visit") return route.fulfill({ json: { visits: 0, counted: false } });
    return route.fulfill({ json: { online: 0, visits: 0, rooms: 0, matches: 0, ranked: { searching: 0, playing: 0 } } });
  });
  await page.addInitScript(() => sessionStorage.setItem("lcf-admin-pw", "local-mock"));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://127.0.0.1:4187/admin");
  await page.getByRole("tab", { name: "Server", exact: true }).click();
  await page.getByText("Essential Tool Protection", { exact: true }).waitFor();
  const button = (name) => page.getByRole("button", { name, exact: true });
  const select = async (label, option) => {
    await page.getByRole("combobox", { name: label, exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  };
  const waitDone = async () => {
    await page.waitForFunction(() => ![...document.querySelectorAll("button")].some((b) => b.textContent.includes("Saving…")));
  };

  await button("Add range").click();
  await page.getByRole("spinbutton", { name: "Rule 1 enemy spawn", exact: true }).fill("2.75");
  await button("Add locked tool").click();
  holdNext = true;
  await button("Save enemy rules").click();
  await button("Save tool protection").click();
  await page.waitForTimeout(200);
  const firstRoundSentWhileBlocked = posts.length;
  assert(release, "First request was not delayed");
  release();
  await waitDone();
  equal(server.events.ranked_enemy_rules, [{ min_rank: "int3", max_rank: "zed", spawn_mult: 2.75, min_inside: 0 }], "Concurrent tool save lost ranked settings");
  equal(server.events.tool_protection, { moon_locks: [{ tool: "shovel", moons: [] }], conflicts: [] }, "Concurrent rank save lost tool settings");
  equal(firstRoundSentWhileBlocked, 1, "Editor writes were not serialized");

  await button("Remove rule 1").click();
  await select("Lock 1 tool", "Keys");
  await page.getByRole("spinbutton", { name: "No event chance in percent", exact: true }).fill("75");
  await page.getByRole("spinbutton", { name: "Minimum RD", exact: true }).fill("130");
  const before = posts.length;
  holdNext = true;
  await button("Save tool protection").click();
  await button("Save enemy rules").click();
  await select("Ranked Secret Vote", "Off");
  await button("Save odds").click();
  await button("Save rating policy").click();
  await page.waitForTimeout(200);
  const secondRoundSentWhileBlocked = posts.length - before;
  assert(release, "Second request was not delayed");
  release();
  await waitDone();
  equal(secondRoundSentWhileBlocked, 1, "Simple controls/odds did not share the save queue");
  equal(server.events.ranked_enemy_rules, [], "Queued saves restored deleted rank ranges");
  equal(server.events.tool_protection, { moon_locks: [{ tool: "keys", moons: [] }], conflicts: [] }, "Queued simple control lost tool settings");
  equal(server.events.ranked_secret_vote, false, "Queued editor lost secret vote setting");
  equal(server.events.odds.no_event, 0.75, "Queued save lost submitted odds snapshot");
  equal(server.events.rating_policy, { min_rd: 130, hidden_rd: 150, loss_reduction: 0.5 }, "Queued save lost rating policy");
  equal(posts.length, 7, "Queued mutations did not all execute");
  await page.reload();
  await page.getByRole("tab", { name: "Server", exact: true }).click();
  await page.getByText("Essential Tool Protection", { exact: true }).waitFor();
  equal(await page.getByRole("button", { name: /^Remove rule / }).count(), 0, "Empty ranks did not persist after queue");
  equal(await page.getByRole("combobox", { name: "Lock 1 tool", exact: true }).innerText(), "Keys", "Tool policy did not persist after queue");
  return { passed: true, eventPosts: posts.length, checks: "delayed concurrent editor saves, queued simple controls/odds, immutable submitted values, empty-list preservation, reload" };
}
