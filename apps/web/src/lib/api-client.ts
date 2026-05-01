// c:\Dev\Klariq\apps\web\src\lib\api-client.ts

/**
 * Base fetcher for Klariq API.
 * Automatically injects the active organization ID and session cookies.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  // Ensure the path has the /api prefix if it's a Klariq API route (not auth)
  let finalPath = path.startsWith('/') ? path : `/${path}`;
  if (!finalPath.startsWith('/api') && !finalPath.startsWith('/auth')) {
    finalPath = `/api${finalPath}`;
  }
  
  const url = `${baseUrl}${finalPath}`;

  // Get active organization ID safely from cookies if in browser
  let orgId: string | undefined;
  if (typeof document !== 'undefined') {
    // 1. Check the specific active organization cookie (better-auth typically uses better-auth.active_organization)
    const orgMatch = document.cookie.match(/better-auth\.active(?:_organization|-organization(?:-id)?)=([^;]+)/);
    if (orgMatch && orgMatch[1]) {
      orgId = decodeURIComponent(orgMatch[1]);
    } else {
      // 2. Fallback: try to see if it's in localStorage (some versions/configs)
      try {
        orgId = localStorage.getItem('better-auth.active-organization-id') || undefined;
      } catch (e) {}
    }
  }

  const headers = new Headers(options.headers);
  if (orgId && !headers.has('X-Organization-Id')) {
    headers.set('X-Organization-Id', orgId);
  }
  
  const fetchOptions: RequestInit = {
    method: typeof options.method === 'string' ? options.method.toUpperCase() : 'GET',
    headers,
    credentials: 'include',
  };

  // Only add these if defined to satisfy exactOptionalPropertyTypes: true
  if (options.body !== undefined) fetchOptions.body = options.body;
  if (options.signal !== undefined) fetchOptions.signal = options.signal;
  if (options.cache !== undefined) fetchOptions.cache = options.cache;
  if ((options as any).next) (fetchOptions as any).next = (options as any).next;

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    if (response.status === 401) {
      // Handle unauthorized (optional: redirect to sign-in)
    }
    const errorData = await response.json().catch(() => ({ message: 'API Error' }));
    throw new Error(errorData.message || 'Unknown API error');
  }

  return response.json();
}
