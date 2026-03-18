// Mirrors: backend/internal/services/git/types/types.go + models/git_integration.go

export type GitProvider = 'github' | 'gitlab' | 'gitea' | 'bitbucket';
export type GitAuthType = 'token' | 'oauth2';

export interface GitIntegration {
	id:          string;
	name:        string;
	provider:    GitProvider;
	base_url?:   string;
	auth_type:   GitAuthType;
	is_owner:    boolean;
	project_ids: string[];
	created_at:  string;
	updated_at:  string;
}

export interface GitRepository {
	id:             string;
	name:           string;
	full_name:      string;
	description:    string;
	clone_url:      string;
	ssh_url:        string;
	private:        boolean;
	default_branch: string;
	updated_at:     string;
}

export interface GitBranch {
	name:       string;
	commit_sha: string;
	protected:  boolean;
}

export interface CreateGitIntegrationRequest {
	name:      string;
	provider:  GitProvider;
	base_url?: string;
	token:     string;
	username?: string;
}

export interface ValidateGitIntegrationResponse {
	valid:  boolean;
	error?: string;
}

export const providerMeta: Record<GitProvider, {
	label:            string;
	color:            string;
	requiresBaseUrl:  boolean;
	requiresUsername: boolean;
}> = {
	github:    { label: 'GitHub',         color: '#ffffff', requiresBaseUrl: false, requiresUsername: false },
	gitlab:    { label: 'GitLab',         color: '#fc6d26', requiresBaseUrl: false, requiresUsername: false },
	gitea:     { label: 'Gitea/Forgejo',  color: '#609926', requiresBaseUrl: true,  requiresUsername: false },
	bitbucket: { label: 'Bitbucket',      color: '#0052cc', requiresBaseUrl: false, requiresUsername: true  },
};