import { useCanGoBack, useRouter, type LinkOptions } from "@tanstack/react-router";

/**
 * Path-aware back control: steps back through real history when there is one,
 * otherwise walks up to the logical parent of the current path.
 */
export function BackButton({
  fallback = "/",
  label,
  className = "rounded-xl border-2 border-border bg-card px-3 py-2 font-display font-bold shadow-card transition-transform active:translate-y-0.5",
}: {
  fallback?: LinkOptions["to"];
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  const parent = (() => {
    const path = router.state.location.pathname.replace(/\/+$/, "");
    const up = path.slice(0, path.lastIndexOf("/"));
    return up || "/";
  })();

  return (
    <button
      type="button"
      aria-label={label ? `Back to ${label}` : "Go back"}
      onClick={() => {
        if (canGoBack) router.history.back();
        else void router.navigate({ to: (fallback ?? parent) as string });
      }}
      className={className}
    >
      ← {label ?? "Back"}
    </button>
  );
}
