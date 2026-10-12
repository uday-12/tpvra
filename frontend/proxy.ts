import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Routes that don't require authentication
const publicRoutes = ["/login", "/register", "/verify"];


function isPublicRoute(pathname: string): boolean {
    return publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Use better-auth's helper to read the session cookie
    const sessionToken = getSessionCookie(request, {
        cookiePrefix: "tpvra",
    });

    // --- Not logged in ---
    if (!sessionToken) {
        // Already on a public route → allow
        if (isPublicRoute(pathname)) {
            return NextResponse.next();
        }
        // Anywhere else (including /) → redirect to login
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        return NextResponse.redirect(loginUrl);
    }

    // --- Logged in → allow through ---
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico, sitemap.xml, robots.txt
         * - public assets
         */
        "/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
