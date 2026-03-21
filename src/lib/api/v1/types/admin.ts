// ── Users ──────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'member';

export type AdminUser = {
    id:                    string;
    email:                 string;
    name:                  string;
    role:                  'admin' | 'member';
    active:                boolean;
    force_password_change: boolean;
    created_at:            string;
    project_ids:           string[];
};


export interface CreateUserRequest {
    email: string;
    name:  string;
    role?: UserRole; // defaults to 'member' on backend
}

export interface UpdateUserRequest {
    name?:  string;
    role?:  UserRole;
}

export interface ResetPasswordResponse {
    temp_password: string;
}

export interface ProjectMemberEntry {
    project_id: string;
    role:        'admin' | 'member';
}

export interface SetProjectMembersRequest {
    projects: ProjectMemberEntry[];
}

// ── Settings ───────────────────────────────────────────────────────────────

export type RegistrationMode = 'open' | 'invite' | 'disabled';

export interface SystemSettings {
    instance_name:         string;
    instance_url:          string;
    registration_mode:     RegistrationMode;
    smtp_host:             string;
    smtp_port:             number;
    smtp_username:         string;
    smtp_from:             string;
    smtp_tls_enabled:      boolean;
    session_timeout_hours: number;
    notifications_enabled:    boolean;
    slack_webhook_url:        string;
    discord_webhook_url:      string;
    notify_on_deploy:         boolean;
    notify_on_container_down: boolean;
    notify_on_webhook_fail:   boolean;
    caddy_base_domain: string;
}

export interface UpdateSettingsRequest {
    instance_name?:         string;
    instance_url?:          string;
    registration_mode?:     RegistrationMode;
    smtp_host?:             string;
    smtp_port?:             number;
    smtp_username?:         string;
    smtp_password?:         string;
    smtp_from?:             string;
    smtp_tls_enabled?:      boolean;
    session_timeout_hours?: number;
    notifications_enabled?:    boolean;
    slack_webhook_url?:        string;
    discord_webhook_url?:      string;
    notify_on_deploy?:         boolean;
    notify_on_container_down?: boolean;
    notify_on_webhook_fail?:   boolean;
    caddy_base_domain?: string;
}

export interface User {
    id:                    string;
    email:                 string;
    name?:                 string;
    role?:                 'admin' | 'member';
    force_password_change: boolean;
    project_ids:           string[];
}

export interface LoginPayload {
    email:      string;
    password: string;
}

export interface AuthResponse {
    user: User;
}