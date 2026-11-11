import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import { PageShell } from "@/components/layout/PageShell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminPage } from "@/pages/AdminPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { MoonsPage } from "@/pages/MoonsPage";
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
              <Route path="/moons" element={<MoonsPage />} />
              <Route path="/players" element={<PlayersPage />} />
              <Route path="/players/:steamId" element={<PlayerPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </PageShell>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
