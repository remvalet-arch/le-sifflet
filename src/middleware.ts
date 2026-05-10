import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on each matched request so SSR and RLS
 * always see an up-to-date JWT. See Supabase Next.js SSR guide.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // On the root landing (unauthenticated), honour the NEXT_LOCALE cookie and
  // redirect to the matching locale URL so search engines see separate pages.
  if (path === "/" && !user) {
    const localeCookie = request.cookies.get("NEXT_LOCALE")?.value;
    if (
      localeCookie === "en" ||
      localeCookie === "es" ||
      localeCookie === "de" ||
      localeCookie === "it"
    ) {
      return NextResponse.redirect(new URL(`/${localeCookie}`, request.url));
    }
  }

  const isProtected =
    path.startsWith("/lobby") ||
    path.startsWith("/match") ||
    path.startsWith("/squads") ||
    path.startsWith("/ligues") ||
    path.startsWith("/profile") ||
    path.startsWith("/leaderboard");
  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Routes /admin/* : auth + vérification du rôle admin
  if (path.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = adminProfile?.role;
    if (role !== "moderator" && role !== "founder") {
      return NextResponse.redirect(new URL("/lobby", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Skip static assets and image optimization; run on everything else
     * so auth cookies stay fresh on navigations.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
