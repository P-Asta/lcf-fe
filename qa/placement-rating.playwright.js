// Run through Playwright MCP with Vite at 127.0.0.1:4188. API stays local.
// Catches RD boundary/rounding regressions, leaked match deltas, and lost stats.
async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const cases = [
    { key: "below", rd: 149.9, games: 0, hidden: false },
    { key: "boundary", rd: 150, glicko: 50, games: 0, hidden: true },
    { key: "above", rd: 150.1, games: 20, hidden: true },
    { key: "rounded", rd: 150, games: 4, hidden: false, rating_hidden: false },
    { key: "authoritative", rd: 149.9, games: 50, hidden: true, rating_hidden: true },
  ];
  const entries = cases.map(({ key, rd, glicko = 1678, games, rating_hidden }, i) => ({
    steam_id: `rating-${key}`, name: `Rating ${key}`, avatar: null,
    games, wins: 2, position: i + 1, tr: 12345, peak_tr: 15678,
    glicko, rd, rating_hidden, rank: "int3", worn: [], badges: [],
  }));
  const unknown = { id: "unknown", name: "Unrated", icon: "/ranks/unknown.svg?custom=1" };
  const side = { steam_id: "opponent", name: "Opponent", avatar: null, score: 400, deaths: 1, tr_before: 9000, tr_after: 8000 };
  const matches = (profile) => Array.from({ length: Math.max(profile.games, 1) }, (_, i) => ({
    id: `match-${i}`, kind: "ranked", created: 1700000000 - i * 1000, moon: "Experimentation", weather: "None", events: [],
    p1: { ...side, steam_id: profile.steam_id, name: profile.name, score: 500, tr_before: 12000, tr_after: 12345 },
    p2: side, winner: 1, reason: "score", rated: profile.games > 0,
  }));
  await page.unrouteAll({ behavior: "wait" });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/player/")) {
      const profile = entries.find((entry) => path.endsWith(entry.steam_id));
      assert(profile, `Unexpected player: ${path}`);
      return route.fulfill({ json: { profile, avatar: null, joined: 1690000000, peak_tr: profile.peak_tr, ranked_total: 3,
        matches: matches(profile), badges: [], daily_wins: { first: 7, best: 8 }, death_causes: [] } });
    }
    if (path === "/api/leaderboard") return route.fulfill({ json: { total: 5, ranked_total: 5, entries } });
    if (path === "/api/players") {
      // The real player directory returns the flag without RD.
      const directory = entries.map(({ rd, ...entry }, i) => ({ ...entry, rating_hidden: cases[i].hidden }));
      return route.fulfill({ json: { total: 5, ranked_total: 5, entries: directory } });
    }
    if (path === "/api/badges") return route.fulfill({ json: { badges: [] } });
    if (path === "/api/ranks") return route.fulfill({ json: { ranks: [], hidden_rating: unknown, ranked_total: 3 } });
    return route.fulfill({ json: { online: 0, visits: 0, counted: false, rooms: 0, matches: 0, ranked: { searching: 0, playing: 0 } } });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  const open = async (path, ready) => {
    await page.goto(`http://127.0.0.1:4188${path}`);
    await page.getByText(ready, { exact: true }).first().waitFor();
  };
  for (const { key, hidden } of cases) {
    await open(`/players/rating-${key}`, `Rating ${key}`);
    const main = await page.locator("main").innerText();
    if (hidden) {
      for (const number of ["12,345", "15,678", "1,678", "±150", "+345"]) assert(!main.includes(number), `${key} leaked ${number}`);
      assert(main.includes("?"), `${key} needs masked rating`);
    } else {
      for (const number of ["12,345", "15,678", "1,678", "±150", "+345"]) assert(main.includes(number), `${key} must reveal ${number}`);
    }
    assert(await page.getByRole("img", { name: hidden ? "Unrated" : "Intern III", exact: true }).count() > 0, "Hidden ratings use the unknown rank emblem");
    if (hidden) assert((await page.getByRole("img", { name: "Unrated", exact: true }).first().getAttribute("src")).endsWith("?custom=1"), "Hidden emblem must use server customized icon");
    assert(main.includes("DAILY WINS - FIRST PLAY") && main.includes("Days won on the best-run board"), "Daily stats must remain visible");
    assert(main.includes("500") && main.includes("MATCHES"), "Game stats must remain visible");
  }
  await open("/league", "League");
  for (const { key, hidden } of cases) {
    const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: `Rating ${key}`, exact: true }) });
    const text = await row.innerText();
    assert(text.includes("12,345") === !hidden, `Leaderboard current TR: ${key}`);
    assert(text.includes("15,678") === !hidden, `Leaderboard peak: ${key}`);
    assert(await row.getByRole("img", { name: hidden ? "Unrated" : "Intern III", exact: true }).count() === 1, `Leaderboard emblem: ${key}`);
    await row.getByRole("link", { name: `Rating ${key}`, exact: true }).hover();
    const hover = page.locator('div[data-state="open"]');
    await hover.waitFor({ state: "visible" });
    assert((await hover.innerText()).includes("12,345") === !hidden, `Hover TR: ${key}`);
    assert(await hover.getByRole("img", { name: hidden ? "Unrated" : "Intern III", exact: true }).count() === 1, `Hover emblem: ${key}`);
    await page.getByRole("heading", { name: "League", exact: true }).first().hover();
    await hover.waitFor({ state: "hidden" });
  }
  await open("/players", "Players");
  for (const { key, hidden } of cases) {
    const card = page.getByRole("link").filter({ hasText: `Rating ${key}` });
    assert((await card.innerText()).includes("12,345") === !hidden, `Player search TR: ${key}`);
    assert(await card.getByRole("img", { name: hidden ? "Unrated" : "Intern III", exact: true }).count() === 1, `Directory emblem: ${key}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await open("/players/rating-boundary", "Rating boundary");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Mobile profile overflow");
  const partial = await page.evaluate(async () => {
    const { fmtRating } = await import("/src/lib/format.ts");
    return [
      fmtRating(12345, { tr: 12345 }),
      fmtRating(-1, { tr: -1, rd: 1000, rating_hidden: true }),
      fmtRating(12345, { tr: 12345, rating_hidden: true }),
      fmtRating(12345, { tr: 12345, rd: 150, rating_hidden: false }),
    ];
  });
  assert(JSON.stringify(partial) === JSON.stringify(["12,345", "-1", "?", "12,345"]), `Partial metadata and bot policy: ${partial}`);
  return { passed: true, checks: "RD 149.9/150/150.1 and authoritative flags, games independent: current/peak/Glicko/RD/delta/leaderboard/search/hover; rank and stats kept; mobile" };
}
