import {api} from '$lib/api';
import type {
    CreateGitIntegrationRequest,
    GitBranch,
    GitIntegration,
    GitRepository,
    ValidateGitIntegrationResponse,
} from '$lib/api/v1/types/git.js';

export const gitApi = {
    // Integrations
    list: (fetchFn?: typeof fetch) => api.get<GitIntegration[]>('/api/v1/git/integrations', fetchFn),
    get: (id: string, fetchFn?: typeof fetch) => api.get<GitIntegration>(`/api/v1/git/integrations/${id}`, fetchFn),
    create: (req: CreateGitIntegrationRequest) => api.post<GitIntegration>('/api/v1/git/integrations', req),
    delete: (id: string) => api.delete<void>(`/api/v1/git/integrations/${id}`),
    validate: (id: string) => api.post<ValidateGitIntegrationResponse>(`/api/v1/git/integrations/${id}/validate`, {}),
    setShares: (id: string, projectIds: string[]) => api.put<GitIntegration>(`/api/v1/git/integrations/${id}/shares`, {project_ids: projectIds}),

    // Repositories & Branches
    listRepositories: (id: string) => api.get<GitRepository[]>(`/api/v1/git/integrations/${id}/repositories`),
    listBranches: (id: string, owner: string, repo: string) => api.get<GitBranch[]>(`/api/v1/git/integrations/${id}/repositories/${owner}/${repo}/branches`),
};