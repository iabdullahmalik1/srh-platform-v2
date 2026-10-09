"use client";

import * as React from "react";
import { CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Route-level error boundary: a failing module never takes down the shell. */
export default function ConsoleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error("[SRH] route error", error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center py-24 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-danger-soft text-danger">
        <CircleAlert className="size-6" />
      </div>
      <h1 className="text-[18px] font-semibold">This screen hit an unexpected error</h1>
      <p className="mt-1 text-[13.5px] text-muted">The rest of the platform is unaffected. Reload the module to try again. If it keeps happening, share the reference below with support.</p>
      {error.digest && <p className="mt-2 font-mono text-[11.5px] text-subtle">Reference {error.digest}</p>}
      <Button className="mt-5" onClick={reset}>
        <RotateCcw /> Reload module
      </Button>
    </div>
  );
}
