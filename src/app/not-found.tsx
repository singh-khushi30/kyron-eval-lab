import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function NotFound() {
  return (
    <AppShell current="overview">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">
        That run or route does not exist in this synthetic evaluation set.
      </p>
      <Link href="/" className="mt-4 inline-block underline underline-offset-2">
        Back to overview
      </Link>
    </AppShell>
  );
}
