import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Snappier UX: serve cached data instantly, refetch quietly in the background.
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        // Auth hiccups (expired token mid-flight) get one extra attempt, since
        // the bearer attacher refreshes the session before the retry.
        retry: (count, error) =>
          count < (String((error as Error)?.message ?? "").includes("Unauthorized") ? 2 : 1),
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
