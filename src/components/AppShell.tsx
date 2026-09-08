import Link from "next/link";

export function AppShell({
  children,
  current,
}: {
  children: React.ReactNode;
  current: "overview" | "compare";
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Kyron Eval Lab
          </Link>
          <nav aria-label="Primary" className="flex gap-4 text-sm">
            <NavLink href="/" active={current === "overview"}>
              Overview
            </NavLink>
            <NavLink href="/compare" active={current === "compare"}>
              Compare
            </NavLink>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "border-b-2 border-ink pb-0.5 font-medium"
          : "border-b-2 border-transparent pb-0.5 text-muted hover:text-ink"
      }
    >
      {children}
    </Link>
  );
}
