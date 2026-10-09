"use client";

import * as React from "react";
import { useParams } from "next/navigation";

/**
 * Detail views read their record id through this hook rather than useParams directly,
 * so the static-hosting fallback (app/not-found.tsx) can render any detail view for ids
 * created during a session, which have no pre-built page.
 */
export const RouteIdContext = React.createContext<string | null>(null);

export function useRouteId(): string {
  const fromContext = React.useContext(RouteIdContext);
  const params = useParams<{ id?: string }>();
  return fromContext ?? (params?.id ? decodeURIComponent(params.id) : "");
}
