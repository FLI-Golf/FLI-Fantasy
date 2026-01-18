/**
 * Role-based access control utilities
 */

export type UserRole = 'free' | 'league_member' | 'league_admin' | 'admin' | 'scorekeeper';

// Routes that require authentication
export const authRequiredRoutes = ['/shop', '/seasons', '/player', '/dashboard'];

// Routes that require specific roles
export const roleProtectedRoutes: Record<string, UserRole[]> = {
	'/admin': ['admin', 'league_admin'],
	'/scorekeeper': ['scorekeeper', 'admin']
};

/**
 * Check if a route requires authentication
 */
export function requiresAuth(path: string): boolean {
	return authRequiredRoutes.some((route) => path.startsWith(route));
}

/**
 * Get required roles for a route, or null if no role restriction
 */
export function getRequiredRoles(path: string): UserRole[] | null {
	const entry = Object.entries(roleProtectedRoutes).find(([route]) => path.startsWith(route));
	return entry ? entry[1] : null;
}

/**
 * Check if a user role has access to a route
 */
export function hasRoleAccess(userRole: UserRole | null, path: string): boolean {
	const requiredRoles = getRequiredRoles(path);

	// No role restriction on this route
	if (!requiredRoles) {
		return true;
	}

	// User has no role
	if (!userRole) {
		return false;
	}

	return requiredRoles.includes(userRole);
}

/**
 * Check if user can access a route (combines auth and role checks)
 */
export function canAccessRoute(
	isAuthenticated: boolean,
	userRole: UserRole | null,
	path: string
): { allowed: boolean; reason?: 'not_authenticated' | 'insufficient_role' } {
	const needsAuth = requiresAuth(path);
	const requiredRoles = getRequiredRoles(path);

	// Route requires auth but user is not authenticated
	if ((needsAuth || requiredRoles) && !isAuthenticated) {
		return { allowed: false, reason: 'not_authenticated' };
	}

	// Route requires specific role
	if (requiredRoles && !hasRoleAccess(userRole, path)) {
		return { allowed: false, reason: 'insufficient_role' };
	}

	return { allowed: true };
}
