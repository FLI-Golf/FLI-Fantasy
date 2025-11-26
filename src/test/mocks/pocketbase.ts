import { vi } from 'vitest';
import type { Mock } from 'vitest';

export interface MockPocketBaseCollection {
	create: Mock;
	getOne: Mock;
	getFullList: Mock;
	update: Mock;
	delete: Mock;
}

export interface MockPocketBase {
	collection: Mock<[string], MockPocketBaseCollection>;
	authStore: {
		model: any;
		token: string;
		isValid: boolean;
		onChange: Mock;
		clear: Mock;
	};
}

export function createMockPocketBase(): MockPocketBase {
	const mockCollection: MockPocketBaseCollection = {
		create: vi.fn(),
		getOne: vi.fn(),
		getFullList: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	};

	return {
		collection: vi.fn(() => mockCollection),
		authStore: {
			model: null,
			token: '',
			isValid: false,
			onChange: vi.fn(),
			clear: vi.fn()
		}
	};
}

export function createMockRecord<T extends Record<string, any>>(
	data: T,
	id: string = 'test_id_123'
): T & { id: string; created: string; updated: string } {
	return {
		id,
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		...data
	};
}
