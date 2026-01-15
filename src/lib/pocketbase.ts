import PocketBase from 'pocketbase';
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);

// Store for current user (auth record)
export const currentAuthUser = writable(pb.authStore.model);

// Store for user profile (includes role)
export const userProfile = writable<{
	id: string;
	user: string;
	display_name: string;
	role: 'free' | 'league_member' | 'league_admin' | 'admin' | 'scorekeeper';
	[key: string]: unknown;
} | null>(null);

// Combined store for convenience - merges auth user with profile role
export const currentUser = derived(
	[currentAuthUser, userProfile],
	([$authUser, $profile]) => {
		if (!$authUser) return null;
		return {
			...$authUser,
			role: $profile?.role || null
		};
	}
);

// Fetch user profile for the authenticated user
async function fetchUserProfile(userId: string) {
	try {
		const profile = await pb.collection('user_profile').getFirstListItem(`user="${userId}"`);
		userProfile.set(profile as typeof profile & { role: 'free' | 'league_member' | 'league_admin' | 'admin' | 'scorekeeper' });
		console.log('👤 User profile loaded, role:', profile.role);
	} catch (err) {
		console.warn('⚠️ Could not fetch user profile:', err);
		userProfile.set(null);
	}
}

// Update store when auth state changes
pb.authStore.onChange((auth) => {
	console.log('🔄 Auth state changed:', auth);
	currentAuthUser.set(pb.authStore.model);
	
	// Save auth to cookie
	if (browser) {
		document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
		console.log('🍪 Auth saved to cookie');
		
		// Fetch profile if user is authenticated
		if (pb.authStore.model?.id) {
			fetchUserProfile(pb.authStore.model.id);
		} else {
			userProfile.set(null);
		}
	}
});

// Load auth from cookie on client side
if (browser) {
	console.log('🍪 Loading auth from cookie...');
	pb.authStore.loadFromCookie(document.cookie);
	console.log('🔐 Auth loaded, isValid:', pb.authStore.isValid);
	console.log('👤 Current user:', pb.authStore.model);
	
	// Update the store with loaded auth
	currentAuthUser.set(pb.authStore.model);
	
	// Fetch profile if user is authenticated
	if (pb.authStore.model?.id) {
		fetchUserProfile(pb.authStore.model.id);
	}
}

// Export helper to manually refresh profile
export async function refreshUserProfile() {
	if (pb.authStore.model?.id) {
		await fetchUserProfile(pb.authStore.model.id);
	}
}
