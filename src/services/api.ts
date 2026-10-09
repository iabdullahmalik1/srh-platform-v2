/**
 * Single entry point for all data access.
 *
 *   import { api } from "@/services/api";
 *   const investors = await api.identity.listInvestors({ search: "noor" });
 *
 * NEXT_PUBLIC_API_MODE=mock (default) uses the in-browser simulation.
 * NEXT_PUBLIC_API_MODE=http uses the REST adapter against NEXT_PUBLIC_API_BASE_URL.
 */
import { apiConfig } from "./config";
import type { PlatformApi } from "./contracts";
import { httpAdapter } from "./http/adapter";
import { mockAdapter } from "./mock/adapter";

export const api: PlatformApi = apiConfig.mode === "http" ? httpAdapter : mockAdapter;

export type { PlatformApi } from "./contracts";
export { ApiError, errorMessage } from "./errors";
