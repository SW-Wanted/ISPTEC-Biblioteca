type SortField = string | undefined;

type ListResult<T> = T[];

type SubscriptionEvent<T> =
	| { type: 'create'; record: T }
	| { type: 'update'; id: string; patch: Partial<T>; record: T }
	| { type: 'delete'; id: string }
	| { type: 'refetch' };

type Unsubscribe = () => void;

function nowIso(): string {
	return new Date().toISOString();
}

function ensureBrowser(): void {
	if (typeof window === 'undefined') {
		throw new Error('apiClient: browser-only client called on server');
	}
}

function safeParseJson<T>(value: string | null): T | null {
	if (!value) return null;
	try {
		return JSON.parse(value) as T;
	} catch {
		return null;
	}
}

function randomId(): string {
	// crypto.randomUUID() is available in modern browsers
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

class EntityBus {
	private listeners = new Map<string, Set<(event: SubscriptionEvent<unknown>) => void>>();

	on<T>(entity: string, cb: (event: SubscriptionEvent<T>) => void): Unsubscribe {
		const set = this.listeners.get(entity) ?? new Set();
		const wrapped = cb as unknown as (event: SubscriptionEvent<unknown>) => void;
		set.add(wrapped);
		this.listeners.set(entity, set);
		return () => {
			set.delete(wrapped);
			if (set.size === 0) this.listeners.delete(entity);
		};
	}

	emit(entity: string, event: SubscriptionEvent<unknown>): void {
		const set = this.listeners.get(entity);
		if (!set) return;
		for (const cb of set) cb(event);
	}
}

const bus = new EntityBus();

type BaseEntity = {
	id: string;
	created_date?: string;
	updated_date?: string;
	[key: string]: unknown;
};

export type Book = BaseEntity & {
	title: string;
	subtitle?: string | null;
	isbn?: string | null;
	authors?: string[];
	publisher?: string | null;
	publication_year?: number | null;
	edition?: string | null;
	language?: string | null;
	pages?: number | null;
	category?: string | null;
	description?: string | null;
	location?: string | null;
	total_copies?: number;
	available_copies?: number;
	cover_url?: string | null;
	average_rating?: number;
	total_loans?: number;
	catalog_status?: string;
	extracted_by_ocr?: boolean;
	ocr_confidence?: number | null;
};

export type Category = BaseEntity & { name?: string };
export type Copy = BaseEntity & { book_id?: string; status?: string };
export type Member = BaseEntity & { user_id?: string; status?: string; notification_preferences?: Record<string, unknown> };

export type Loan = BaseEntity & {
	status?: string;
	loan_date?: string;
	due_date?: string;
	return_date?: string | null;
	member_id?: string;
	member_name?: string;
	book_id?: string;
	book_title?: string;
	copy_id?: string;
	renewal_count?: number;
	max_renewals?: number;
};

export type Reservation = BaseEntity & {
	status?: string;
	user_id?: string;
	book_id?: string;
	book_title?: string;
	reservation_date?: string;
	queue_position?: number;
	available_date?: string | null;
	expiry_date?: string | null;
};

export type Fine = BaseEntity & { status?: string; user_id?: string; amount?: number };

export type Notification = BaseEntity & {
	user_id?: string;
	title?: string;
	message?: string;
	status?: string;
	action_type?: string;
	read_at?: string | null;
};

export type Locker = BaseEntity;
export type Computer = BaseEntity;
export type SpecialRequest = BaseEntity;
export type BookReview = BaseEntity;
export type ChatConversation = BaseEntity;

function storageKey(entity: string): string {
	return `sgbu:${entity}`;
}

function readAll<T>(entity: string): T[] {
	ensureBrowser();
	return safeParseJson<T[]>(window.localStorage.getItem(storageKey(entity))) ?? [];
}

function writeAll<T>(entity: string, records: T[]): void {
	ensureBrowser();
	window.localStorage.setItem(storageKey(entity), JSON.stringify(records));
	// Trigger storage event in other tabs
	window.localStorage.setItem(`${storageKey(entity)}:touch`, nowIso());
}

function matchesFilter(record: Record<string, unknown>, filter: Record<string, unknown>): boolean {
	for (const [key, expected] of Object.entries(filter)) {
		if (expected === undefined) continue;
		if (expected === null) {
			if (record[key] !== null && record[key] !== undefined) return false;
			continue;
		}
		if (record[key] !== expected) return false;
	}
	return true;
}

function sortRecords<T extends Record<string, unknown>>(records: T[], sort: SortField): T[] {
	if (!sort) return records;
	const desc = sort.startsWith('-');
	const field = desc ? sort.slice(1) : sort;
	return [...records].sort((a, b) => {
		const av = a[field];
		const bv = b[field];
		if (av == null && bv == null) return 0;
		if (av == null) return desc ? 1 : -1;
		if (bv == null) return desc ? -1 : 1;
		if (typeof av === 'number' && typeof bv === 'number') return desc ? bv - av : av - bv;
		const as = String(av);
		const bs = String(bv);
		return desc ? bs.localeCompare(as) : as.localeCompare(bs);
	});
}

function createEntityClient<T extends { id: string }>(entity: string) {
	return {
		list: async (sort?: SortField, take?: number): Promise<ListResult<T>> => {
			const all = sortRecords(readAll<T>(entity), sort);
			return typeof take === 'number' ? all.slice(0, take) : all;
		},
		filter: async (criteria: Record<string, unknown>): Promise<ListResult<T>> => {
			const all = readAll<T>(entity);
			return all.filter((r) => matchesFilter(r as unknown as Record<string, unknown>, criteria));
		},
		create: async (data: Omit<Partial<T>, 'id'> & Record<string, unknown>): Promise<T> => {
			const all = readAll<T>(entity);
			const dataRecord = data as Record<string, unknown>;
			const record = {
				...dataRecord,
				id: randomId(),
				created_date: (dataRecord.created_date as string | undefined) ?? nowIso(),
				updated_date: nowIso(),
			} as unknown as T;
			all.unshift(record);
			writeAll(entity, all);
			bus.emit(entity, { type: 'create', record: record as unknown });
			return record as T;
		},
		update: async (id: string, patch: Partial<T> & Record<string, unknown>): Promise<T> => {
			const all = readAll<T>(entity);
			const idx = all.findIndex((r) => r.id === id);
			if (idx < 0) throw new Error(`${entity}: registo não encontrado`);
			const updated = {
				...(all[idx] as unknown as Record<string, unknown>),
				...(patch as unknown as Record<string, unknown>),
				updated_date: nowIso(),
			} as unknown as T;
			all[idx] = updated;
			writeAll(entity, all);
			bus.emit(entity, { type: 'update', id, patch, record: updated as unknown });
			return updated as T;
		},
		delete: async (id: string): Promise<void> => {
			const all = readAll<T>(entity);
			const next = all.filter((r) => r.id !== id);
			writeAll(entity, next);
			bus.emit(entity, { type: 'delete', id });
		},
		subscribe: (cb: (event: SubscriptionEvent<T>) => void): Unsubscribe => {
			ensureBrowser();
			const offBus = bus.on<T>(entity, cb);

			const onStorage = (e: StorageEvent) => {
				if (!e.key) return;
				if (e.key === storageKey(entity) || e.key === `${storageKey(entity)}:touch`) {
					// Best-effort: just tell consumer to refetch.
					cb({ type: 'refetch' });
				}
			};
			window.addEventListener('storage', onStorage);
			return () => {
				offBus();
				window.removeEventListener('storage', onStorage);
			};
		},
	};
}

type AuthUser = { email: string; full_name?: string | null };

const AUTH_STORAGE_KEY = 'sgbu:auth:user';

export const api = {
	auth: {
		me: async (): Promise<AuthUser> => {
			ensureBrowser();
			const existing = safeParseJson<AuthUser>(window.localStorage.getItem(AUTH_STORAGE_KEY));
			if (existing?.email) return existing;
			// Default demo user (keeps UI usable without external auth)
			const demo: AuthUser = { email: 'demo@isptec.ao', full_name: 'Utilizador Demo' };
			window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(demo));
			return demo;
		},
		setUser: async (user: AuthUser): Promise<void> => {
			ensureBrowser();
			window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
		},
		logout: async (): Promise<void> => {
			ensureBrowser();
			window.localStorage.removeItem(AUTH_STORAGE_KEY);
		},
	},
	entities: {
		Book: createEntityClient<Book>('Book'),
		Category: createEntityClient<Category>('Category'),
		Copy: createEntityClient<Copy>('Copy'),
		Member: createEntityClient<Member>('Member'),
		Loan: createEntityClient<Loan>('Loan'),
		Reservation: createEntityClient<Reservation>('Reservation'),
		Fine: createEntityClient<Fine>('Fine'),
		Notification: createEntityClient<Notification>('Notification'),
		Locker: createEntityClient<Locker>('Locker'),
		Computer: createEntityClient<Computer>('Computer'),
		SpecialRequest: createEntityClient<SpecialRequest>('SpecialRequest'),
		BookReview: createEntityClient<BookReview>('BookReview'),
		ChatConversation: createEntityClient<ChatConversation>('ChatConversation'),
	},
	integrations: {
		Core: {
			UploadFile: async ({ file }: { file: File }): Promise<{ file_url: string }> => {
				ensureBrowser();
				const dataUrl: string = await new Promise((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = () => resolve(String(reader.result));
					reader.onerror = () => reject(new Error('Falha ao ler ficheiro'));
					reader.readAsDataURL(file);
				});
				return { file_url: dataUrl };
			},
			InvokeLLM: async <TResponse = unknown>({
				prompt,
			}: {
				prompt: string;
				response_json_schema?: unknown;
			} & Record<string, unknown>): Promise<TResponse> => {
				// No external provider: return a simple, deterministic response.
				// If the caller expects JSON (cataloging/recommendations), try to comply.
				const wantsJson = /\{[\s\S]*\}/.test(String(prompt)) || /json/i.test(String(prompt));
				if (wantsJson) {
					const obj = {
						title: null,
						subtitle: null,
						isbn: null,
						authors: null,
						publisher: null,
						publication_year: null,
						edition: null,
						language: 'pt',
						pages: null,
						category: null,
						description: null,
						confidence: 0,
					};
					return obj as unknown as TResponse;
				}
				return (
					'Neste momento o assistente funciona em modo offline. Posso ajudar com regras de empréstimos, renovações, reservas e horário da biblioteca.' as unknown as TResponse
				);
			},
		},
	},
};
