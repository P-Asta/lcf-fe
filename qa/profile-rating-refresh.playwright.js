// A policy change must reach an already open profile without navigation.
async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  let hidden = false;
  await page.unrouteAll({ behavior: "wait" });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/player/live-policy") return route.fulfill({ json: {
      profile: { steam_id: "live-policy", name: "Live policy", tr: 12345, glicko: 1678, rd: 120, rating_hidden: hidden, rank: "int3", games: 20, wins: 7, position: 1, worn: [] },
      avatar: null, joined: 1, peak_tr: 15678, ranked_total: 1, matches: [], badges: [], daily_wins: { first: 0, best: 0 }, death_causes: [],
    } });
    if (path === "/api/ranks") return route.fulfill({ json: { ranks: [], ranked_total: 1 } });
    if (path === "/api/badges") return route.fulfill({ json: { badges: [] } });
    return route.fulfill({ json: { online: 0, visits: 0, counted: false, rooms: 0, matches: 0, ranked: { searching: 0, playing: 0 } } });
  });
  await page.goto("http://127.0.0.1:4188/players/live-policy");
  await page.getByText("12,345", { exact: true }).waitFor();
  hidden = true;
  await page.getByRole("img", { name: "Unrated", exact: true }).waitFor({ timeout: 35000 });
  const text = await page.locator("main").innerText();
  assert(!text.includes("12,345") && !text.includes("15,678"), "Open profile must apply server visibility changes without reloading");
  return { passed: true, checks: "Open profile polls server metadata within 30 seconds; server flag overrides RD 120" };
}
