import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-surface-3 text-muted">
        <Compass className="size-6" />
      </div>
      <h1 className="text-[18px] font-semibold">Page not found</h1>
      <p className="mt-1 text-[13.5px] text-muted">The record may have been archived, or the link is incorrect.</p>
      <Link href="/overview" className="mt-4 text-[13.5px] font-medium text-brand-ink hover:underline">Return to overview</Link>
    </div>
  );
}
