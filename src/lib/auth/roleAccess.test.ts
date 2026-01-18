import { describe, it, expect } from 'vitest';
import {
	requiresAuth,
	getRequiredRoles,
	hasRoleAccess,
	canAccessRoute,
	authRequiredRoutes,
	roleProtectedRoutes,
	type UserRole
} from './roleAccess';

describe('Role Access Control', () => {
	describe('requiresAuth', () => {
		it('should return true for auth-required routes', () => {
			expect(requiresAuth('/shop')).toBe(true);
			expect(requiresAuth('/shop/products')).toBe(true);
			expect(requiresAuth('/seasons')).toBe(true);
			expect(requiresAuth('/seasons/123')).toBe(true);
			expect(requiresAuth('/player')).toBe(true);
			expect(requiresAuth('/player/profile')).toBe(true);
			expect(requiresAuth('/dashboard')).toBe(true);
			expect(requiresAuth('/dashboard/stats')).toBe(true);
		});

		it('should return false for public routes', () => {
			expect(requiresAuth('/')).toBe(false);
			expect(requiresAuth('/about')).toBe(false);
			expect(requiresAuth('/contact')).toBe(false);
		});

		it('should return false for role-protected routes (they have separate check)', () => {
			// Admin and scorekeeper routes are role-protected, not just auth-required
			expect(requiresAuth('/admin')).toBe(false);
			expect(requiresAuth('/scorekeeper')).toBe(false);
		});
	});

	describe('getRequiredRoles', () => {
		it('should return required roles for admin routes', () => {
			const roles = getRequiredRoles('/admin');
			expect(roles).toContain('admin');
			expect(roles).toContain('league_admin');
		});

		it('should return required roles for admin sub-routes', () => {
			const roles = getRequiredRoles('/admin/courses');
			expect(roles).toContain('admin');
			expect(roles).toContain('league_admin');
		});

		it('should return required roles for scorekeeper routes', () => {
			const roles = getRequiredRoles('/scorekeeper');
			expect(roles).toContain('scorekeeper');
			expect(roles).toContain('admin');
		});

		it('should return null for routes without role restrictions', () => {
			expect(getRequiredRoles('/')).toBeNull();
			expect(getRequiredRoles('/shop')).toBeNull();
			expect(getRequiredRoles('/seasons')).toBeNull();
		});
	});

	describe('hasRoleAccess', () => {
		describe('admin routes', () => {
			it('should allow admin role to access /admin', () => {
				expect(hasRoleAccess('admin', '/admin')).toBe(true);
			});

			it('should allow league_admin role to access /admin', () => {
				expect(hasRoleAccess('league_admin', '/admin')).toBe(true);
			});

			it('should deny free role access to /admin', () => {
				expect(hasRoleAccess('free', '/admin')).toBe(false);
			});

			it('should deny league_member role access to /admin', () => {
				expect(hasRoleAccess('league_member', '/admin')).toBe(false);
			});

			it('should deny scorekeeper role access to /admin', () => {
				expect(hasRoleAccess('scorekeeper', '/admin')).toBe(false);
			});

			it('should deny null role access to /admin', () => {
				expect(hasRoleAccess(null, '/admin')).toBe(false);
			});
		});

		describe('scorekeeper routes', () => {
			it('should allow scorekeeper role to access /scorekeeper', () => {
				expect(hasRoleAccess('scorekeeper', '/scorekeeper')).toBe(true);
			});

			it('should allow admin role to access /scorekeeper', () => {
				expect(hasRoleAccess('admin', '/scorekeeper')).toBe(true);
			});

			it('should deny free role access to /scorekeeper', () => {
				expect(hasRoleAccess('free', '/scorekeeper')).toBe(false);
			});

			it('should deny league_member role access to /scorekeeper', () => {
				expect(hasRoleAccess('league_member', '/scorekeeper')).toBe(false);
			});

			it('should deny league_admin role access to /scorekeeper', () => {
				expect(hasRoleAccess('league_admin', '/scorekeeper')).toBe(false);
			});
		});

		describe('public routes', () => {
			it('should allow any role to access public routes', () => {
				const roles: (UserRole | null)[] = [
					'free',
					'league_member',
					'league_admin',
					'admin',
					'scorekeeper',
					null
				];
				roles.forEach((role) => {
					expect(hasRoleAccess(role, '/')).toBe(true);
					expect(hasRoleAccess(role, '/about')).toBe(true);
				});
			});
		});
	});

	describe('canAccessRoute', () => {
		describe('unauthenticated users', () => {
			it('should allow access to public routes', () => {
				const result = canAccessRoute(false, null, '/');
				expect(result.allowed).toBe(true);
			});

			it('should deny access to auth-required routes', () => {
				const result = canAccessRoute(false, null, '/shop');
				expect(result.allowed).toBe(false);
				expect(result.reason).toBe('not_authenticated');
			});

			it('should deny access to role-protected routes', () => {
				const result = canAccessRoute(false, null, '/admin');
				expect(result.allowed).toBe(false);
				expect(result.reason).toBe('not_authenticated');
			});
		});

		describe('authenticated users with free role', () => {
			it('should allow access to public routes', () => {
				const result = canAccessRoute(true, 'free', '/');
				expect(result.allowed).toBe(true);
			});

			it('should allow access to auth-required routes', () => {
				const result = canAccessRoute(true, 'free', '/shop');
				expect(result.allowed).toBe(true);
			});

			it('should deny access to admin routes', () => {
				const result = canAccessRoute(true, 'free', '/admin');
				expect(result.allowed).toBe(false);
				expect(result.reason).toBe('insufficient_role');
			});

			it('should deny access to scorekeeper routes', () => {
				const result = canAccessRoute(true, 'free', '/scorekeeper');
				expect(result.allowed).toBe(false);
				expect(result.reason).toBe('insufficient_role');
			});
		});

		describe('authenticated users with admin role', () => {
			it('should allow access to all routes', () => {
				expect(canAccessRoute(true, 'admin', '/').allowed).toBe(true);
				expect(canAccessRoute(true, 'admin', '/shop').allowed).toBe(true);
				expect(canAccessRoute(true, 'admin', '/admin').allowed).toBe(true);
				expect(canAccessRoute(true, 'admin', '/admin/courses').allowed).toBe(true);
				expect(canAccessRoute(true, 'admin', '/scorekeeper').allowed).toBe(true);
			});
		});

		describe('authenticated users with league_admin role', () => {
			it('should allow access to admin routes', () => {
				expect(canAccessRoute(true, 'league_admin', '/admin').allowed).toBe(true);
			});

			it('should deny access to scorekeeper routes', () => {
				const result = canAccessRoute(true, 'league_admin', '/scorekeeper');
				expect(result.allowed).toBe(false);
				expect(result.reason).toBe('insufficient_role');
			});
		});

		describe('authenticated users with scorekeeper role', () => {
			it('should allow access to scorekeeper routes', () => {
				expect(canAccessRoute(true, 'scorekeeper', '/scorekeeper').allowed).toBe(true);
			});

			it('should deny access to admin routes', () => {
				const result = canAccessRoute(true, 'scorekeeper', '/admin');
				expect(result.allowed).toBe(false);
				expect(result.reason).toBe('insufficient_role');
			});
		});
	});

	describe('configuration constants', () => {
		it('should have correct auth-required routes', () => {
			expect(authRequiredRoutes).toContain('/shop');
			expect(authRequiredRoutes).toContain('/seasons');
			expect(authRequiredRoutes).toContain('/player');
			expect(authRequiredRoutes).toContain('/dashboard');
		});

		it('should have correct role-protected routes', () => {
			expect(roleProtectedRoutes['/admin']).toEqual(['admin', 'league_admin']);
			expect(roleProtectedRoutes['/scorekeeper']).toEqual(['scorekeeper', 'admin']);
		});
	});
});
