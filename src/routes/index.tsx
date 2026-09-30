import { createFileRoute } from "@tanstack/react-router";
import { FadeDesk } from "@/components/fade-desk";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <FadeDesk />;
}
