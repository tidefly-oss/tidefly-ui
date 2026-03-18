// Mirrors: backend/internal/runtime/runtime.go

export interface Volume {
	name:       string;
	driver:     string;
	mountpath:  string;
	labels?:    Record<string, string>;
	created_at: string;
}