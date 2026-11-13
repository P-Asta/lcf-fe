import { CalendarClock, Download, Eye, Radio, Swords, Users, type LucideIcon } from "lucide-react";
import { DiscordIcon } from "@/components/DiscordIcon";
import { DISCORD_URL, THUNDERSTORE_URL } from "@/lib/links";
import type { ReactNode } from "react";
import { Link } from "react-router";
import BlurText from "@/components/reactbits/BlurText";
import { ChatDemo } from "@/components/landing/ChatDemo";
import { VeilBackdrop } from "@/components/landing/VeilBackdrop";
import { RankLadder } from "@/components/landing/RankLadder";
import { Container } from "@/components/layout/Container";
import { SpotlightPanel } from "@/components/motion/SpotlightPanel";
import { Panel, Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Caption, Text } from "@/components/typography/Text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveStats, useRanks } from "@/hooks/queries";
import { useVisit } from "@/hooks/useVisit";
import { fmtInt } from "@/lib/format";

function LiveStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | undefined }) {
  return (
    <div className="flex h-16 min-w-0 flex-1 items-center gap-3 rounded-card bg-surface px-4 text-fg sm:min-w-44 sm:flex-none">
      <Icon aria-hidden className="size-5 shrink-0 text-primary-300" />
      <div className="flex flex-col">
        {value === undefined ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <Text variant="stat">
            {fmtInt(value)}
          </Text>
        )}
        <Text variant="label" tone="muted">
          {label}
        </Text>
      </div>
    </div>
  );
}

/** Download (Thunderstore) with the Discord invite right next to it. */
function GetTheMod() {
  return (
    <Stack direction="row" gap={2} wrap className="*:flex-1 sm:*:flex-none">
      <Button asChild variant="primary" className="h-11 px-5">
        <a href={THUNDERSTORE_URL} target="_blank" rel="noopener noreferrer">
          <Download aria-hidden />
          Download on Thunderstore
        </a>
      </Button>
      <Button asChild className="h-11 bg-[#5865f2] px-5 text-white hover:bg-[#4752c4] active:bg-[#3c45a5]">
        <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
          <DiscordIcon aria-hidden />
          Join the Discord
        </a>
      </Button>
    </Stack>
  );
}

function Hero() {
  const stats = useLiveStats();
  const visit = useVisit();
  const visits = visit.data?.visits ?? stats.data?.visits;
  return (
    <section className="relative isolate overflow-hidden">
      <VeilBackdrop className="-z-10" />
      <Container className="flex min-h-[30rem] flex-col justify-center gap-6 py-16 sm:min-h-[36rem] sm:py-24">
        <BlurText text="LCF" animateBy="letters" trigger="load" delay={120} className="text-hero text-fg" />
        <Stack gap={2} className="max-w-xl">
          <Text variant="headline">
            Competitive Lethal Company
          </Text>
          <Text tone="muted">Ranked 1v1 on the same seed, a daily race for everyone, custom rooms for up to 28 players and spectating from inside their game.</Text>
        </Stack>
        <GetTheMod />
        <Stack direction="row" gap={2} wrap className="*:flex-1 sm:*:flex-none">
          <Button asChild variant="secondary">
            <Link to="/league">
              <Swords aria-hidden />
              View the league
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/daily">
              <CalendarClock aria-hidden />
              Today&apos;s daily race
            </Link>
          </Button>
        </Stack>
        <Stack direction="row" gap={3} wrap aria-live="polite">
          <LiveStat icon={Radio} label="Online now" value={stats.isError ? 0 : stats.data?.online} />
          <LiveStat icon={Eye} label="Total visits" value={visits} />
        </Stack>
      </Container>
    </section>
  );
}

const FEATURES: { icon: LucideIcon; title: string; body: string; to: string; cta: string }[] = [
  { icon: Swords, title: "Ranked 1v1", body: "Same moon, same seed, same scrap. Glicko-2 rating shown as TR, with ranks from Intern to Zed Dog.", to: "/league", cta: "League" },
  { icon: CalendarClock, title: "Daily race", body: "One moon, seed, event and tool bans for everyone each day. Your first run counts.", to: "/daily", cta: "Daily race" },
  { icon: Users, title: "Custom rooms", body: "Up to 28 players, free for all or teams, with presets like Monster hunter and Speedrun.", to: "/players", cta: "Players" },
  { icon: Eye, title: "Spectating", body: "Out of lives or watching a room: join the player's own game and follow them live.", to: "/moons", cta: "Moons" },
];

function Feature({ icon: Icon, title, body, to, cta }: (typeof FEATURES)[number]) {
  return (
    <SpotlightPanel className="flex flex-col gap-3 p-5 sm:p-6">
      <Icon aria-hidden className="size-6 text-primary-300" />
      <Text variant="title">{title}</Text>
      <Caption className="text-body">{body}</Caption>
      <Button asChild variant="link" className="mt-auto h-auto w-fit px-0">
        <Link to={to}>{cta}</Link>
      </Button>
    </SpotlightPanel>
  );
}

function Block({ children }: { children: ReactNode }) {
  return <Container className="flex flex-col gap-10 py-12 sm:gap-12 sm:py-16">{children}</Container>;
}

export function LandingPage() {
  const ranks = useRanks();
  const total = ranks.data?.ranked_total;
  return (
    <>
      <Hero />
      <Block>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Feature key={f.title} {...f} />
          ))}
        </div>
        <Section title="Rank ladder" aside={total != null ? `TR needed today · ${fmtInt(total)} ranked players` : "TR needed today"}>
          <Caption className="text-body">Ranks follow your place on the ladder, so the TR each one takes moves as people play.</Caption>
          <RankLadder />
        </Section>
        <Section title="Jump in" aside="Ranked, daily race and custom rooms">
          <Panel className="flex flex-col gap-4 p-4 sm:p-6">
            <Caption className="text-body">
              Install the mod from Thunderstore (BepInEx), then queue up, race the daily seed or open a room with friends. Your rank badge shows up in chat.
            </Caption>
            <ChatDemo />
            <GetTheMod />
            <Stack direction="row" gap={2} wrap className="*:flex-1 sm:*:flex-none">
              <Button asChild variant="primary">
                <Link to="/daily">
                  <CalendarClock aria-hidden />
                  Play today&apos;s race
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/league">
                  <Swords aria-hidden />
                  See the ladder
                </Link>
              </Button>
            </Stack>
          </Panel>
        </Section>
      </Block>
    </>
  );
}
