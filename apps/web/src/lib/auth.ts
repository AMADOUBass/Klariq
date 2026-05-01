import { cookies } from 'next/headers';

/**
 * Server-side session helper.
 * Uses the request cookies to fetch the session from the API.
 * 
 * Note: This relies on the API being reachable and better-auth session cookies being present.
 */
export async function getSession() {
  // Better-Auth client usually handles this if configured correctly,
  // but for server components, we often need to pass headers.
  
  // Actually, better-auth/react's authClient can be used in server components 
  // if you pass the headers manually or use the server-side client.
  
  // For Klariq, we'll use the authClient but we need to handle the fact that
  // it might not automatically pick up cookies in RSC depending on the version.
  
  try {
    const cookieHeader = (await cookies()).toString();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/get-session`, {
      headers: {
        cookie: cookieHeader,
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return null;
  }
}
