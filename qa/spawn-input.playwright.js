// Run through Playwright MCP with Vite at 127.0.0.1:4187. API calls stay local.
// Catches integer display normalization, fractional truncation and draft resets.
async (page) => {
  const equal = (actual, expected, message) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message}: ${JSON.stringify(actual)}`);
  };
  await page.unrouteAll({ behavior: "wait" });
  let server = {
    events: { ranked_secret_vote: true, quick_secret_vote: false, hidden: [], quick_event: "none", quick_detail: null, quick_preset: "default", ranked_enemy_rules: [{ min_rank: "int3", max_rank: "zed", spawn_mult: 2, min_inside: 0 }], tool_protection: { moon_locks: [], conflicts: [] }, odds: { no_event: 0.5, events: {}, weather: {}, infestation: {} } },
    event_kinds: [], shutdown_in: null,
    tools: ["shovel"], moons: ["Experimentation"],
    stats: { online: 0, visits: 0, rooms: 0, matches: 0, ranked: { searching: 0, playing: 0 }, quick: { searching: 0 } },
  };
  const posts = [];
  let rejectNext = false;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/admin/events") {
      posts.push(route.request().postDataJSON());
      if (rejectNext) { rejectNext = false; return route.fulfill({ status: 400, body: "Expected local rejection" }); }
      server = { ...server, events: route.request().postDataJSON() };
      return route.fulfill({ json: server });
    }
    if (path === "/api/admin/server") return route.fulfill({ json: server });
    if (path === "/api/admin/players") return route.fulfill({ json: { entries: [], total: 0, ranked_total: 0 } });
    if (path === "/api/ranks") return route.fulfill({ json: { ranks: [], ranked_total: 0 } });
    return route.fulfill({ json: server.stats });
  });
  await page.addInitScript(() => sessionStorage.setItem("lcf-admin-pw", "local-mock"));
  await page.setViewportSize({ width: 1280, height: 900 });
  const open = async () => {
    await page.goto("http://127.0.0.1:4187/admin");
    await page.getByRole("tab", { name: "Server", exact: true }).click();
  };
  const spawn = () => page.getByRole("spinbutton", { name: "Rule 1 enemy spawn", exact: true });
  const save = () => page.getByRole("button", { name: "Save enemy rules", exact: true });
  const blur = () => page.getByRole("spinbutton", { name: "Rule 1 minimum inside", exact: true }).focus();
  await open();
  equal(await spawn().inputValue(), "2.0", "Saved integer uses decimal display");
  for (const [input, display] of [["1", "1.0"], ["1.2", "1.2"], ["1.25", "1.25"], ["2.75", "2.75"], ["1.23456789", "1.23456789"]]) {
    await spawn().fill(input);
    equal(await spawn().inputValue(), input, "Editing keeps raw input");
    await blur();
    equal(await spawn().inputValue(), display, `Blur preserves ${input}`);
    await save().click();
    await save().waitFor({ state: "visible" });
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Save enemy rules") && b.disabled));
    equal(posts.at(-1).ranked_enemy_rules[0].spawn_mult, Number(input), "Saved payload preserves multiplier");
    await open();
    equal(await spawn().inputValue(), display, "Reload keeps acknowledged multiplier");
  }
  await spawn().fill("1.2"); await blur(); rejectNext = true; await save().click();
  await page.getByRole("alert").filter({ hasText: "Expected local rejection" }).waitFor();
  equal(await spawn().inputValue(), "1.2", "Rejected save keeps fractional draft");
  for (const invalid of ["", "0", "101"]) {
    await spawn().fill(invalid); await blur();
    equal(await spawn().inputValue(), invalid, "Blur keeps invalid raw draft");
    equal(await save().isDisabled(), true, "Invalid draft cannot save");
  }
  return { passed: true, posts: posts.length, checks: "integer decimal display, raw editing, 1.2/1.25/2.75/long fraction, save/ack/reload, rejected and invalid drafts" };
}
