"use client";

/**
 * Root not-found page.
 *
 * On a server deployment it is a plain 404. On static hosting (GitHub Pages serves 404.html for
 * any unknown path) it also acts as the client-side fallback for detail pages of records created
 * during a session, such as a new order: it reads the URL and renders the matching view.
 */
import * as React from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { SrhSplash } from "@/components/brand/srh-logo";
import { RouteIdContext } from "@/hooks/route-id";
import { BASE_PATH } from "@/lib/assets";
import OrderView from "./(console)/orders/[id]/view";
import AssetView from "./(console)/assets/[id]/view";
import InvestorView from "./(console)/identity/investors/[id]/view";
import TokenView from "./(console)/tokens/[id]/view";

const DETAIL_ROUTES: { re: RegExp; View: React.ComponentType }[] = [
  { re: /^\/orders\/([^/]+)\/?$/, View: OrderView },
  { re: /^\/assets\/([^/]+)\/?$/, View: AssetView },
  { re: /^\/identity\/investors\/([^/]+)\/?$/, View: InvestorView },
  { re: /^\/tokens\/([^/]+)\/?$/, View: TokenView },
];

export default function NotFound() {
  const [path, setPath] = React.useState<string | null>(null);
  React.useEffect(() => {
    const p = window.location.pathname;
    setPath(BASE_PATH && p.startsWith(BASE_PATH) ? p.slice(BASE_PATH.length) || "/" : p);
  }, []);

  if (path === null) return <SrhSplash label="Loading" />;

  for (const { re, View } of DETAIL_ROUTES) {
    const m = path.match(re);
    if (m && m[1] !== "new") {
      return (
        <RouteIdContext.Provider value={decodeURIComponent(m[1])}>
          <AppShell>
            <View />
          </AppShell>
        </RouteIdContext.Provider>
      );
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-4 grid size-12 place-items-center rounded-xl bg-surface-3 text-muted">
          <Compass className="size-6" />
        </div>
        <h1 className="text-[18px] font-semibold">Page not found</h1>
        <p className="mt-1 text-[13.5px] text-muted">The link may be incorrect or the record was archived.</p>
        <Link href="/" className="mt-4 text-[13.5px] font-medium text-brand-ink hover:underline">Go to sign in</Link>
      </div>
    </div>
  );
}
