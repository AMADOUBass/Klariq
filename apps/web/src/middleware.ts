import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const publicPages = [
  '/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password'
];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Handle next-intl first to get the response and possible locale
  const response = intlMiddleware(request);

  // 2. Identify if the current path is public
  // We strip the locale prefix to compare with our publicPages list
  const pathWithoutLocale = pathname.replace(/^\/(en|fr)/, '') || '/';
  const isPublicPath = publicPages.includes(pathWithoutLocale);

  // 3. Protect non-public routes
  if (!isPublicPath) {
    // Check for session cookie
    // Better-Auth by default uses better-auth.session_token
    const sessionToken = request.cookies.get('better-auth.session_token');
    
    if (!sessionToken) {
      // Find locale to redirect correctly
      const localeMatch = pathname.match(/^\/(en|fr)/);
      const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
      
      const loginUrl = new URL(`/${locale}/sign-in`, request.url);
      // Append current path as redirect param
      loginUrl.searchParams.set('callbackURL', pathname);
      
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all pathnames except for:
    // - /_next (Next.js internals)
    // - /api (API routes)
    // - /_vercel (Vercel internals)
    // - files with extensions (.ico, .png, etc.)
    '/((?!_next|api|_vercel|[\\w-]+\\.\\w+).*)',
  ],
};
