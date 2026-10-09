import View from "./view";
import seed from "@/mocks/data/orders.json";

/** Pre-render every seeded record for static hosting; new records fall back to app/not-found.tsx. */
export function generateStaticParams() {
  return (seed as { id: string }[]).map((r) => ({ id: r.id }));
}

export default function Page() {
  return <View />;
}
