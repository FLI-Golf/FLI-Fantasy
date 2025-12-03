import PocketBase from 'pocketbase';
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);

// Store for current user
export const currentUser = writable(pb.authStore.model);

// Update store when auth state changes
pb.authStore.onChange((auth) => {
	console.log('🔄 Auth state changed:', auth);
	currentUser.set(pb.authStore.model);
	
	// Save auth to cookie
	if (browser) {
		document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
		console.log('🍪 Auth saved to cookie');
	}
});

// Load auth from cookie on client side
if (browser) {
	console.log('🍪 Loading auth from cookie...');
	pb.authStore.loadFromCookie(document.cookie);
	console.log('🔐 Auth loaded, isValid:', pb.authStore.isValid);
	console.log('👤 Current user:', pb.authStore.model);
	
	// Update the store with loaded auth
	currentUser.set(pb.authStore.model);
}
