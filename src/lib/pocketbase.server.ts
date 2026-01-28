import PocketBase from 'pocketbase';
import { POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD } from '$env/static/private';

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://pocketbase-production-e678.up.railway.app';

export function createServerPocketBase() {
	return new PocketBase(POCKETBASE_URL);
}

let adminPb: PocketBase | null = null;

export async function getAdminPb(): Promise<PocketBase> {
	if (adminPb && adminPb.authStore.isValid) {
		return adminPb;
	}
	
	adminPb = new PocketBase(POCKETBASE_URL);
	
	await adminPb.admins.authWithPassword(
		POCKETBASE_ADMIN_EMAIL,
		POCKETBASE_ADMIN_PASSWORD
	);
	
	return adminPb;
}
