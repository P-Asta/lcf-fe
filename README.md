# lcf-fe — LCF league website

React + Vite site for the LCF 1v1 league: TR ladder, match log and player stats.
All data comes from the `lcf-be` HTTP API.

## Pages

| Route | Content |
|---|---|
| `/` | Leaderboard: sort by TR / wins / win rate / matches, name search (`/` focuses it), paging, player hover card |
| `/matches` | Month tabs, month highlights (highest ship value, most wins, most played moon), match log grouped by day |
| `/players` | Ranked players with search |
| `/players/:steamId` | Rating cards, win rate by moon (radar + table), best records, win rate by event, achievements, recent matches |

Player statistics and achievements are computed in the browser from the player's match history (`/api/player/{steam_id}`).

## Run

```
pnpm install
pnpm dev            # http://localhost:5173, proxies /api to http://127.0.0.1:2897
LCF_API=http://host:2897 pnpm dev   # other backend
pnpm build          # static files in dist/
```

For a production build served from another origin than the API, set `VITE_API_URL` (e.g. `VITE_API_URL=https://lcf.example.com pnpm build`). The backend already sends permissive CORS headers.

Sample data for local work: start `lcf-be` once on an empty file, stop it, then

```
cargo run --example seed -- path/to/dev.sqlite
```

## Design system

- Tokens live in `src/index.css` (`@theme`): primary palette `primary-50…950`, surfaces `bg` / `surface` / `surface-2` / `surface-3`, `line`, text `fg` / `muted`, `danger`, radii `card` / `control` / `pill`, one shadow `float`, one transition default.
- Typography only through `src/components/typography/Text.tsx` (`display`, `headline`, `stat`, `title`, `body`, `label`, `caption`).
- Layers in `src/lib/layers.ts`; class merging in `src/lib/utils.ts` (`cn`, aware of the custom tokens).
- Font: Pretendard. Icons: lucide-react.
