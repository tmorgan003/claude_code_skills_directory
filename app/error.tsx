"use client";

import { StateMessage } from "@/components/StateMessage";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <StateMessage
      variant="error"
      title="Something went wrong"
      description="The directory couldn't load. The most recently refreshed data will be shown once this recovers."
      action={
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-dark"
        >
          Try again
        </button>
      }
    />
  );
}
