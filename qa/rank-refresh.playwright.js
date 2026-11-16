// Verify runtime icon refresh and keep the last icon through a failed refresh.
async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  await page.unrouteAll({ behavior: "wait" });
  let revision = 1;
  let fail = false;
  let failures = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/ranks") {
      if (fail) { failures++; return route.fulfill({ status: 503, body: "Transient rank refresh failure" }); }
      return route.fulfill({ json: { ranks: [], hidden_rating: { id: "unknown", name: "Unrated", icon: `/ranks/unknown.svg?revision=${revision}` }, ranked_total: 1 } });
    }
    if (path === "/api/players") return route.fulfill({ json: { total: 1, ranked_total: 1, entries: [{ steam_id: "refresh", name: "Refresh player", avatar: null, tr: 12345, rank: "int3", rating_hidden: true, position: 1, games: 20, wins: 7, badges: [], worn: [] }] } });
    if (path === "/api/badges") return route.fulfill({ json: { badges: [] } });
    return route.fulfill({ json: { online: 0, visits: 0, counted: false, rooms: 0, matches: 0, ranked: { searching: 0, playing: 0 } } });
  });
  await page.goto("http://127.0.0.1:4188/players");
  const emblem = page.getByRole("img", { name: "Unrated", exact: true });
  await emblem.waitFor();
  assert((await emblem.getAttribute("src")).endsWith("revision=1"), "Initial server icon missing");
  revision = 2;
  await page.waitForFunction(() => [...document.querySelectorAll('img[alt="Unrated"]')].some((img) => img.src.endsWith("revision=2")), null, { timeout: 35000 });
  // A focus refresh starts immediately, with the same retry path as interval refreshes.
  fail = true;
  await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
  await page.waitForTimeout(500);
  // Wait for the next interval so this does not depend on browser focus emulation.
  await page.waitForTimeout(31000);
  assert(failures > 0, "Failure scenario did not request ranks");
  assert((await emblem.getAttribute("src")).endsWith("revision=2"), "Refresh error discarded the cached custom icon");
  fail = false;
  revision = 3;
  await page.waitForFunction(() => [...document.querySelectorAll('img[alt="Unrated"]')].some((img) => img.src.endsWith("revision=3")), null, { timeout: 25000 });
  return { passed: true, checks: "30-second live icon refresh, cached icon retained after transient failure, retry recovery", failures };
}
