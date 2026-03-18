import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies }) => {
  const session = cookies.get('tidefly_session');
  if (session) {
    redirect(302, '/dashboard');
  }
  // kein redirect → Login-Seite wird angezeigt
};