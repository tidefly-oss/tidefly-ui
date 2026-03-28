import type { Handle } from '@sveltejs/kit';

const PUBLIC_PATHS = ['/login', '/favicon'];

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
		return resolve(event);
	}

	const refreshToken = event.cookies.get('tfy_rt');
	if (!refreshToken) {
		return new Response(null, {
			status: 302,
			headers: { location: '/login' },
		});
	}

	return resolve(event);
};