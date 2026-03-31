// Mirrors: backend/internal/runtime/runtime.go

export interface Image {
	id: string;
	tags: string[];
	size: number;
	created: string;
}
