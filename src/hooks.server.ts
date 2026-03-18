import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const PUBLIC_PATHS = ['/login', '/favicon'];

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
		return resolve(event);
	}

	const apiUrl = env.VITE_API_URL ?? 'http://localhost:8181';
	const cookieHeader = event.request.headers.get('cookie') ?? '';

	try {
		const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
			headers: { cookie: cookieHeader },
		});

		if (!res.ok) {
			return new Response(null, {
				status: 302,
				headers: { location: '/login' },
			});
		}

		const { user } = await res.json();
		event.locals.user = user;
	} catch (e) {
		return new Response(null, {
			status: 302,
			headers: { location: '/login' },
		});
	}

	return resolve(event);
};