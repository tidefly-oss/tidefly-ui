// Mirrors: backend/internal/api/v1/handlers/projects/handler.go

export interface Project {
	id:           string;
	name:         string;
	description:  string;
	color:        string;
	network_name: string;
	created_at:   string;
	updated_at:   string;
}

export interface CreateProjectRequest {
	name:         string;
	description?: string;
	color?:       string;
}

export interface UpdateProjectRequest {
	name?:        string;
	description?: string;
	color?:       string;
}