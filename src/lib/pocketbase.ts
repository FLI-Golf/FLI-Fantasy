import PocketBase from 'pocketbase';
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);

// Store for current user
export const currentUser = writable(pb.authStore.model);

// Update store when auth state changes
pb.authStore.onChange((auth) => {
	currentUser.set(pb.authStore.model);
});

// Load auth from cookie on client side
if (browser) {
	pb.authStore.loadFromCookie(document.cookie);
}
