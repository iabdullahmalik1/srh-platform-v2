export type ApiMode = "mock" | "http";

export const apiConfig = {
  mode: (process.env.NEXT_PUBLIC_API_MODE as ApiMode | undefined) ?? "mock",
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1",
  eventsUrl: process.env.NEXT_PUBLIC_EVENTS_URL ?? "/api/v1/events/stream",
  timeoutMs: 20_000,
};

/** Runtime simulation settings for the mock adapter. Controlled from Settings > Simulation. */
export type LatencyProfile = "fast" | "realistic" | "slow";

export const simulation = {
  latency: "realistic" as LatencyProfile,
  failureRate: 0,
  ambientEvents: true,
};

export function setSimulation(next: Partial<typeof simulation>) {
  Object.assign(simulation, next);
}
