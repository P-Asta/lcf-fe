// Run with Playwright MCP browser_run_code_unsafe(filename: absolute path).
// Start Vite on 127.0.0.1:4187 first. Every API request is intercepted locally.
// Catches missing editors, lost drafts, incorrect payloads, failed-save resets,
// empty-list fallback regressions, and narrow-screen overflow.
async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const equal = (actual, expected, message) => assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)}`);
  await page.unrouteAll({ behavior: "wait" });
  let server = {
    events: { ranked_secret_vote: true, quick_secret_vote: false, hidden: [], quick_event: "none", quick_detail: null, quick_preset: "default", odds: { no_event: 0.5, events: {}, weather: {}, infestation: {} } },
    event_kinds: [], shutdown_in: null,
    tools: ["shovel", "cruiser", "jetpack", "flash", "keys", "beltbag", "stungrenade", "weedkiller", "tzp", "ladder", "boombox", "spray_paint"],
    moons: ["Experimentation", "Assurance", "Vow", "Offense", "March", "Adamance", "Rend", "Dine", "Titan", "Artifice", "Embrion"],
    stats: { online: 0, visits: 0, rooms: 0, matches: 0, ranked: { searching: 0, playing: 0 }, quick: { searching: 0 } },
  };
  const posts = [];
  let rejectNext = false;
  let serverReads = 0;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/admin/events") {
      posts.push(request.postDataJSON());
      if (rejectNext) {
        rejectNext = false;
        return route.fulfill({ status: 400, body: "Mock validation rejected this save" });
      }
      server = { ...server, events: request.postDataJSON() };
      return route.fulfill({ json: server });
    }
    if (path === "/api/admin/server") { serverReads++; return route.fulfill({ json: server }); }
    if (path === "/api/admin/players") return route.fulfill({ json: { entries: [], total: 0, ranked_total: 0 } });
    if (path === "/api/ranks") return route.fulfill({ json: { ranks: [], ranked_total: 0 } });
    if (path === "/api/visit") return route.fulfill({ json: { visits: 0, counted: false } });
    return route.fulfill({ json: { online: 0, visits: 0, rooms: 0, matches: 0, ranked: { searching: 0, playing: 0 } } });
  });
  await page.addInitScript(() => sessionStorage.setItem("lcf-admin-pw", "local-mock"));
  await page.setViewportSize({ width: 1280, height: 900 });
  const open = async () => {
    await page.goto("http://127.0.0.1:4187/admin");
    await page.getByRole("tab", { name: "Server", exact: true }).click();
    await page.getByText("Ranked enemy rules", { exact: true }).waitFor();
    await page.getByText("Essential Tool Protection", { exact: true }).waitFor();
  };
  const select = async (label, option) => {
    await page.getByRole("combobox", { name: label, exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  };
  const value = (label) => page.getByRole("combobox", { name: label, exact: true }).innerText();
  const number = (label) => page.getByRole("spinbutton", { name: label, exact: true });
  const saveRank = () => page.getByRole("button", { name: "Save enemy rules", exact: true });
  const saveTools = () => page.getByRole("button", { name: "Save tool protection", exact: true });
  await open();
  equal(await value("Rule 1 minimum rank"), "Intern III", "Legacy rank defaults");
  equal(await number("Rule 3 enemy spawn").count(), 1, "Spawn must allow direct numeric input");
  equal(await number("Rule 3 enemy spawn").inputValue(), "2.0", "Legacy Boss default multiplier");
  equal(await number("Rule 3 minimum inside").inputValue(), "1", "Legacy Boss default minimum");
  equal(await value("Lock 1 tool"), "Shovel", "Legacy tool defaults");
  assert(await page.getByRole("checkbox", { name: "Lock 1 Artifice", exact: true }).isChecked(), "Default shovel scope missing");

  await page.getByRole("combobox", { name: "Rule 1 minimum rank", exact: true }).click();
  equal(await page.getByRole("option").count(), 16, "Every rank must be selectable");
  await page.getByRole("option", { name: "Boss III", exact: true }).click();
  assert(await saveRank().isDisabled(), "Inverted range must not save");
  await select("Rule 1 minimum rank", "Intern I");
  for (const invalid of ["101", "0.5", "", "1e309"]) {
    await number("Rule 1 enemy spawn").fill(invalid);
    assert(await saveRank().isDisabled(), `Invalid spawn ${invalid} must not save`);
  }
  equal(await number("Rule 1 enemy spawn").inputValue(), "", "Invalid numeric text must stay empty rather than reset");
  await number("Rule 1 enemy spawn").fill("1.25");
  for (const invalid of ["101", "1.5", "-1", ""]) {
    await number("Rule 1 minimum inside").fill(invalid);
    assert(await saveRank().isDisabled(), `Invalid minimum ${invalid} must not save`);
  }
  equal(await number("Rule 1 minimum inside").inputValue(), "", "Empty minimum must not reset to zero");
  await number("Rule 1 minimum inside").fill("75");
  assert(await saveRank().isEnabled(), "Valid float spawn and minimum 75 must save");
  await page.getByRole("button", { name: "Add range", exact: true }).click();
  await select("Rule 4 minimum rank", "Boss I");
  await number("Rule 4 enemy spawn").fill("2.75");
  await number("Rule 4 minimum inside").fill("100");
  await page.getByRole("button", { name: "Remove rule 2", exact: true }).click();
  equal(posts.length, 0, "Range edits must remain unsaved");
  const readsBefore = serverReads;
  await page.waitForTimeout(5500);
  assert(serverReads > readsBefore, "Polling must run during draft test");
  equal(await number("Rule 1 enemy spawn").inputValue(), "1.25", "Polling discarded draft");
  rejectNext = true;
  await saveRank().click();
  await page.getByRole("alert").filter({ hasText: "Mock validation rejected this save" }).waitFor();
  equal(await number("Rule 1 enemy spawn").inputValue(), "1.25", "Failed save discarded draft");
  await saveRank().click();
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Save enemy rules") && b.disabled));
  const expectedRanks = [
    { min_rank: "int1", max_rank: "pt1", spawn_mult: 1.25, min_inside: 75 },
    { min_rank: "boss3", max_rank: "zed", spawn_mult: 2, min_inside: 1 },
    { min_rank: "boss1", max_rank: "zed", spawn_mult: 2.75, min_inside: 100 },
  ];
  equal(posts.at(-1).ranked_enemy_rules, expectedRanks, "Saved range payload/order");
  await open();
  equal(await number("Rule 1 enemy spawn").inputValue(), "1.25", "Saved ranks did not reload");
  equal(await number("Rule 3 minimum inside").inputValue(), "100", "Minimum 100 did not reload");

  await select("Lock 1 tool", "Keys");
  await select("Lock 1 scope", "All moons");
  await page.getByRole("button", { name: "Add locked tool", exact: true }).click();
  await select("Lock 3 tool", "Belt bag");
  await select("Lock 3 scope", "Selected moons");
  await page.getByRole("checkbox", { name: "Lock 3 Titan", exact: true }).check();
  await page.getByRole("checkbox", { name: "Lock 3 Experimentation", exact: true }).uncheck();
  await page.getByRole("button", { name: "Remove lock 2", exact: true }).click();
  await select("Conflict 1 second tool", "Keys");
  await page.getByRole("button", { name: "Add conflicting pair", exact: true }).click();
  await select("Conflict 4 first tool", "Cruiser");
  assert(await saveTools().isDisabled(), "Self-conflicts must not save");
  await select("Conflict 4 first tool", "Extension ladder");
  await select("Conflict 4 second tool", "Weed killer");
  await page.getByRole("button", { name: "Remove conflict 2", exact: true }).click();
  equal(posts.length, 2, "Tool edits must remain unsaved");
  rejectNext = true;
  await saveTools().click();
  await page.getByRole("alert").filter({ hasText: "Mock validation rejected this save" }).waitFor();
  equal(await value("Lock 1 tool"), "Keys", "Failed tool save discarded draft");
  await saveTools().click();
  await saveTools().waitFor({ state: "visible" });
  await page.waitForTimeout(300);
  const expectedTools = {
    moon_locks: [{ tool: "keys", moons: [] }, { tool: "beltbag", moons: ["Titan"] }],
    conflicts: [
      { tools: ["jetpack", "keys"], moons: ["Artifice", "Dine"] },
      { tools: ["jetpack", "ladder"], moons: ["Titan"] },
      { tools: ["ladder", "weedkiller"], moons: [] },
    ],
  };
  equal(posts.at(-1).tool_protection, expectedTools, "Saved tool payload");
  equal(posts.at(-1).ranked_enemy_rules, expectedRanks, "Tool save changed ranked rules");
  await open();
  equal(await value("Lock 1 tool"), "Keys", "Saved tools did not reload");
  equal(await value("Lock 1 scope"), "All moons", "All-moon scope did not reload");
  assert(await page.getByRole("checkbox", { name: "Lock 2 Titan", exact: true }).isChecked(), "Selected scope did not reload");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Mobile layout overflows");
  await page.getByRole("combobox", { name: "Rule 1 maximum rank", exact: true }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("option", { name: "Part-Timer I", exact: true }).waitFor();
  await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "option");
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => document.activeElement?.textContent === "Employee III");
  await page.keyboard.press("Enter");
  equal(await value("Rule 1 maximum rank"), "Employee III", "Keyboard selection failed");
  await saveRank().click();
  await page.waitForTimeout(300);
  equal(posts.at(-1).tool_protection, expectedTools, "Rank save changed tool rules");
  for (let i = 3; i > 0; i--) await page.getByRole("button", { name: `Remove rule ${i}`, exact: true }).click();
  await saveRank().click();
  await page.waitForTimeout(300);
  equal(posts.at(-1).ranked_enemy_rules, [], "Empty range list must save");
  for (let i = 2; i > 0; i--) await page.getByRole("button", { name: `Remove lock ${i}`, exact: true }).click();
  for (let i = 3; i > 0; i--) await page.getByRole("button", { name: `Remove conflict ${i}`, exact: true }).click();
  await saveTools().click();
  await page.waitForTimeout(300);
  equal(posts.at(-1).tool_protection, { moon_locks: [], conflicts: [] }, "Empty policy must save");
  await open();
  equal(await page.getByRole("button", { name: /^Remove rule / }).count(), 0, "Empty ranges incorrectly restored defaults");
  equal(await page.getByRole("button", { name: /^Remove lock / }).count(), 0, "Empty locks incorrectly restored defaults");
  equal(await page.getByRole("button", { name: /^Remove conflict / }).count(), 0, "Empty conflicts incorrectly restored defaults");
  return { passed: true, checks: "legacy defaults, free numeric input, float 1.25/2.75, integer 75/100, invalid/empty values, draft polling, add/remove, failed/successful saves, payload preservation, reload, keyboard, mobile, empty arrays", eventPosts: posts.length, serverReads };
}
