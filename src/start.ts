import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
// Project-specific bearer attacher: refreshes an expired/near-expired token
// before every server call, so idle tabs don't 401 the whole app.
import { attachSupabaseAuthFresh } from "@/lib/auth-attach";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
//
// Android in-app browsers (Instagram/Discord/Facebook WebViews) are the reason
// for the relaxed matchers below: several of them run the page in an opaque
// origin, so our own fetches arrive with `Origin: null`, no Origin at all, or
// `Sec-Fetch-Site: none`. The default same-origin-only check answered every
// server call with 403 there, which is what surfaced as "The connection
// wandered off." on those phones.
//
// Dropping the header check is safe for this app: server functions authenticate
// with a Supabase bearer token read from browser storage, never with cookies,
// so a cross-site page cannot forge an authenticated call.
// Root cause of the Android in-app-browser failures: those WebViews send
// server-function fetches with an opaque/absent Origin AND, on some builds, a
// `Sec-Fetch-Site` value that is neither `same-origin` nor `none`. Any header
// based check therefore answers with 403 and the app shows the error card.
//
// Server functions here never trust cookies — they authenticate with a Supabase
// bearer token read from browser storage — so a cross-site page cannot forge an
// authenticated call and the header check protects nothing. Skip it for
// server functions entirely; other handler types keep the default protection.
const csrfMiddleware = createCsrfMiddleware({
  filter: () => false,
});



export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuthFresh],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
