import { authApi } from '$lib/api/auth';
import type { LoginPayload, User } from '$lib/api/v1/types';

function createAuthStore() {
    let user        = $state<User | null>(null);
    let loading     = $state(false);
    let initialized = $state(false);

    return {
        get user()               { return user; },
        get loading()            { return loading; },
        get mustChangePassword() { return user?.force_password_change === true; },
        get isAdmin()            { return user?.role === 'admin'; },
        get projectIds(): string[] { return user?.project_ids ?? []; },

        hasProjectAccess(projectId: string): boolean {
            if (!user) return false;
            if (user.role === 'admin') return true;
            return (user.project_ids ?? []).includes(projectId);
        },

        setUser(u: User) {
            user        = u;
            initialized = true;
        },

        async init() {
            if (initialized) return;
            loading = true;
            try {
                const res = await authApi.me();
                user = res.user;
            } catch {
                user = null;
            } finally {
                loading     = false;
                initialized = true;
            }
        },

        async refresh() {
            loading = true;
            try {
                const res = await authApi.me();
                user = res.user;
            } catch {
                user = null;
            } finally {
                loading = false;
            }
        },

        async login(payload: LoginPayload) {
            loading = true;
            try {
                await authApi.login(payload);
                window.location.assign('/dashboard');
            } finally {
                loading = false;
            }
        },

        async logout() {
            loading = true;
            try {
                await authApi.logout();
            } finally {
                user        = null;
                loading     = false;
                initialized = false;
                window.location.href = '/login';
            }
        },
    };
}

export const auth = createAuthStore();