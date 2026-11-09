import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import { PageShell } from "@/components/layout/PageShell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { MatchesPage } from "@/pages/MatchesPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlayerPage } from "@/pages/PlayerPage";
import { PlayersPage } from "@/pages/PlayersPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <PageShell>
            <Routes>
              <Route path="/" element={<LeaderboardPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/players" element={<PlayersPage />} />
              <Route path="/players/:steamId" element={<PlayerPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </PageShell>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
