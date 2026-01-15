import type { RecordModel } from 'pocketbase';

export type UserRole = 'free' | 'league_member' | 'league_admin' | 'admin' | 'scorekeeper';

export interface UserProfile {
	id: string;
	user: string;
	display_name: string;
	role: UserRole;
	created: string;
	updated: string;
}

export const mockUserProfiles: Record<UserRole, UserProfile> = {
	free: {
		id: 'profile_free_123',
		user: 'user_free_123',
		display_name: 'Free User',
		role: 'free',
		created: new Date().toISOString(),
		updated: new Date().toISOString()
	},
	league_member: {
		id: 'profile_member_123',
		user: 'user_member_123',
		display_name: 'League Member',
		role: 'league_member',
		created: new Date().toISOString(),
		updated: new Date().toISOString()
	},
	league_admin: {
		id: 'profile_league_admin_123',
		user: 'user_league_admin_123',
		display_name: 'League Admin',
		role: 'league_admin',
		created: new Date().toISOString(),
		updated: new Date().toISOString()
	},
	admin: {
		id: 'profile_admin_123',
		user: 'user_admin_123',
		display_name: 'Admin User',
		role: 'admin',
		created: new Date().toISOString(),
		updated: new Date().toISOString()
	},
	scorekeeper: {
		id: 'profile_scorekeeper_123',
		user: 'user_scorekeeper_123',
		display_name: 'Scorekeeper',
		role: 'scorekeeper',
		created: new Date().toISOString(),
		updated: new Date().toISOString()
	}
};

export function createMockUserProfile(
	role: UserRole,
	overrides?: Partial<UserProfile>
): UserProfile {
	return {
		...mockUserProfiles[role],
		...overrides
	};
}

export function createMockAuthUser(userId: string, email: string = 'test@example.com') {
	return {
		id: userId,
		email,
		verified: true,
		created: new Date().toISOString(),
		updated: new Date().toISOString()
	};
}
