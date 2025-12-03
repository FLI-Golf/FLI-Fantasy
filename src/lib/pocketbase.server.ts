import PocketBase from 'pocketbase';
import { VITE_POCKETBASE_URL } from '$env/static/public';

export function createServerPocketBase() {
	const url = VITE_POCKETBASE_URL || 'https://pocketbase-production-e678.up.railway.app';
	return new PocketBase(url);
}
