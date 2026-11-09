import { Compass } from "lucide-react";
import { Link } from "react-router";
import { EmptyState } from "@/components/StateBlock";
import { Button } from "@/components/ui/button";
import { Stack } from "@/components/layout/Stack";

export function NotFoundPage() {
  return (
    <Stack gap={4} align="center">
      <EmptyState icon={Compass} title="Page not found" className="w-full">
        This page does not exist.
      </EmptyState>
      <Button asChild variant="primary">
        <Link to="/">Back to the leaderboard</Link>
      </Button>
    </Stack>
  );
}
