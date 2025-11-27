import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/public';

export function createServerPocketBase() {
	const url = env.VITE_POCKETBASE_URL || 'https://pocketbase-production-e678.up.railway.app';
	return new PocketBase(url);
}
