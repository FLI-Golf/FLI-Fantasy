import { redirect, type Handle } from '@sveltejs/kit';
import PocketBase from 'pocketbase';
import { VITE_POCKETBASE_URL } from '$env/static/public';

// Routes that require authentication - redirect to home with showRegister flag
const authRequiredRoutes = ['/shop', '/seasons', '/player', '/dashboard'];

// Routes that require specific roles
const roleProtectedRoutes: Record<string, string[]> = {
	'/admin': ['admin', 'league_admin'],
	'/scorekeeper': ['scorekeeper', 'admin']
};

export const handle: Handle = async ({ event, resolve }) => {
	const pb = new PocketBase(VITE_POCKETBASE_URL);

	// Load auth from cookie
	pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

	const path = event.url.pathname;

	// Check if route requires authentication
	const requiresAuth = authRequiredRoutes.some((route) => path.startsWith(route));
	const roleRequired = Object.entries(roleProtectedRoutes).find(([route]) =>
		path.startsWith(route)
	);

	if (!pb.authStore.isValid) {
		if (requiresAuth || roleRequired) {
			// Not logged in, redirect to home with register modal flag
			throw redirect(303, '/?showRegister=true');
		}
	} else {
		// User is logged in, check role-based access
		if (roleRequired) {
			const requiredRoles = roleRequired[1];
			try {
				const profile = await pb
					.collection('user_profile')
					.getFirstListItem(`user="${pb.authStore.model?.id}"`);

				const userRole = profile.role as string;
				if (!requiredRoles.includes(userRole)) {
					console.log(`Access denied: user role '${userRole}' not in required roles [${requiredRoles.join(', ')}]`);
					throw redirect(303, '/');
				}
			} catch (err) {
				// Re-throw redirects
				if ((err as { status?: number }).status === 303) throw err;
				
				// Log the actual error
				console.error('Error checking user role:', err);
				
				// Don't redirect on profile fetch errors - let the page handle it
				// This allows the page to show appropriate error messages
			}
		}
	}

	// Make pb available to routes
	event.locals.pb = pb;
	event.locals.user = pb.authStore.model;

	const response = await resolve(event);

	// Update cookie if auth changed
	response.headers.set('set-cookie', pb.authStore.exportToCookie({ httpOnly: false }));

	return response;
};
