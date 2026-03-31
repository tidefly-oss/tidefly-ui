<script lang="ts">
import {
	CircleAlert,
	FolderIcon,
	KeyRoundIcon,
	PlusIcon,
	SearchIcon,
	ShieldIcon,
	Trash2Icon,
	UserIcon,
} from "@lucide/svelte";
import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query";
import {
	type ColumnDef,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
} from "@tanstack/table-core";
import { toast } from "svelte-sonner";
import { adminApi } from "$lib/api/v1/admin";
import type { AdminUser, UserRole } from "$lib/api/v1/types";
import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
import { Badge } from "$lib/components/ui/badge/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import { createSvelteTable, FlexRender } from "$lib/components/ui/data-table/index.js";
import * as Table from "$lib/components/ui/table/index.js";
import * as Tooltip from "$lib/components/ui/tooltip/index.js";
import { auth } from "$lib/stores/auth.svelte";
import CreateUserDialog from "./CreateUserDialog.svelte";
import ResetPasswordDialog from "./ResetPasswordDialog.svelte";
import UserProjectsPopover from "./UserProjectsPopover.svelte";

const qc = useQueryClient();

const query = createQuery(() => ({
	queryKey: ["admin-users"],
	queryFn: () => adminApi.listUsers(),
}));

const users = $derived(query.data?.users ?? []);

// ── Table ─────────────────────────────────────────────────────────────────

let globalFilter = $state("");
let sorting = $state<SortingState>([]);

const columns: ColumnDef<AdminUser>[] = [
	{ accessorKey: "name", header: "Name" },
	{ accessorKey: "email", header: "Email" },
	{ accessorKey: "role", header: "Role" },
	{ id: "projects", header: "Projects" },
	{ accessorKey: "created_at", header: "Created" },
	{ id: "status", header: "Status" },
	{ id: "actions", header: "" },
];

const table = createSvelteTable({
	get data() {
		return users;
	},
	columns,
	state: {
		get globalFilter() {
			return globalFilter;
		},
		get sorting() {
			return sorting;
		},
	},
	onGlobalFilterChange: (u) => {
		globalFilter = typeof u === "function" ? u(globalFilter) : u;
	},
	onSortingChange: (u) => {
		sorting = typeof u === "function" ? u(sorting) : u;
	},
	getCoreRowModel: getCoreRowModel(),
	getFilteredRowModel: getFilteredRowModel(),
	getSortedRowModel: getSortedRowModel(),
	globalFilterFn: (row, _, value) => {
		const u = row.original;
		const v = value.toLowerCase();
		return u.name.toLowerCase().includes(v) || u.email.toLowerCase().includes(v);
	},
});

// ── Dialogs ───────────────────────────────────────────────────────────────

let showCreate = $state(false);
let resetTarget = $state<AdminUser | null>(null);

const currentUserId = $derived(auth.user?.id);

// ── Role update ───────────────────────────────────────────────────────────

const roleMut = createMutation(() => ({
	mutationFn: ({ id, role }: { id: string; role: UserRole }) => adminApi.updateUser(id, { role }),
	onSuccess: () => {
		qc.invalidateQueries({ queryKey: ["admin-users"] });
		toast.success("Role updated");
	},
	onError: () => toast.error("Failed to update role"),
}));

// ── Delete ────────────────────────────────────────────────────────────────

const deleteMut = createMutation(() => ({
	mutationFn: (id: string) => adminApi.deleteUser(id),
	onSuccess: (_, id) => {
		qc.setQueryData<{ users: AdminUser[] }>(["admin-users"], (old) =>
			old ? { users: old.users.filter((u) => u.id !== id) } : old
		);
		toast.success("User deleted");
	},
	onError: () => toast.error("Failed to delete user"),
}));

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("de-DE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}
</script>

<div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-3">
        <div class="relative max-w-xs w-full">
            <SearchIcon class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
                    type="text"
                    placeholder="Search users..."
                    bind:value={globalFilter}
                    class="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
            />
        </div>
        <Button size="sm" onclick={() => showCreate = true} class="gap-1.5 shrink-0">
            <PlusIcon class="size-3.5" />
            New User
        </Button>
    </div>

    <!-- Table -->
    <div class="bg-card border rounded-xl overflow-x-auto w-full">
        {#if query.isPending}
            {#each Array(4) as _, i (i)}
                <div class="px-4 py-3 border-b flex items-center gap-4 animate-pulse">
                    <div class="size-7 rounded-full bg-muted shrink-0"></div>
                    <div class="flex-1 space-y-1.5">
                        <div class="h-3.5 bg-muted rounded w-36"></div>
                        <div class="h-3 bg-muted rounded w-48"></div>
                    </div>
                    <div class="h-5 bg-muted rounded w-14"></div>
                    <div class="h-7 bg-muted rounded w-16"></div>
                </div>
            {/each}
        {:else if query.isError}
            <div class="px-4 py-8 text-center text-sm text-destructive">
                {query.error.message}
            </div>
        {:else}
            <Table.Root class="w-full table-auto">
                <Table.Header>
                    {#each table.getHeaderGroups() as hg (hg.id)}
                        <Table.Row class="border-b hover:bg-transparent">
                            {#each hg.headers as header (header.id)}
                                <Table.Head class="text-xs font-medium text-muted-foreground h-9 px-4">
                                    {#if !header.isPlaceholder}
                                        <FlexRender content={header.column.columnDef.header} context={header.getContext()} />
                                    {/if}
                                </Table.Head>
                            {/each}
                        </Table.Row>
                    {/each}
                </Table.Header>
                <Table.Body>
                    {#each table.getRowModel().rows as row (row.id)}
                        {@const u = row.original}
                        <Table.Row class="border-b last:border-0 hover:bg-muted/30 group">

                            <!-- Name -->
                            <Table.Cell class="px-4 py-3">
                                <div class="flex items-center gap-2.5">
                                    <div class="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-medium uppercase">
                                        {u.name?.slice(0, 1) ?? u.email.slice(0, 1)}
                                    </div>
                                    <div class="text-sm font-medium leading-tight">
                                        {u.name}
                                        {#if u.force_password_change}
                                            <Tooltip.Root>
                                                <Tooltip.Trigger>
                                                    <CircleAlert class="inline size-3 text-amber-500 ml-1 -translate-y-px" />
                                                </Tooltip.Trigger>
                                                <Tooltip.Content>Must change password on next login</Tooltip.Content>
                                            </Tooltip.Root>
                                        {/if}
                                    </div>
                                </div>
                            </Table.Cell>

                            <!-- Email -->
                            <Table.Cell class="px-4 py-3 text-sm text-muted-foreground">
                                {u.email}
                            </Table.Cell>

                            <!-- Role -->
                            <Table.Cell class="px-4 py-3">
                                <div class="flex items-center gap-1.5">
                                    {#if u.role === 'admin'}
                                        <Badge variant="secondary" class="gap-1 text-xs">
                                            <ShieldIcon class="size-3" /> Admin
                                        </Badge>
                                    {:else}
                                        <Badge variant="outline" class="gap-1 text-xs text-muted-foreground">
                                            <UserIcon class="size-3" /> Member
                                        </Badge>
                                    {/if}
                                    <Tooltip.Root>
                                        <Tooltip.Trigger>
                                            <button
                                                    onclick={() => roleMut.mutate({ id: u.id, role: u.role === 'admin' ? 'member' : 'admin' })}
                                                    disabled={roleMut.isPending}
                                                    class="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-border hover:border-muted-foreground/50"
                                            >
                                                {u.role === 'admin' ? '→ Member' : '→ Admin'}
                                            </button>
                                        </Tooltip.Trigger>
                                        <Tooltip.Content>Change role</Tooltip.Content>
                                    </Tooltip.Root>
                                </div>
                            </Table.Cell>

                            <!-- Projects — only meaningful for members -->
                            <Table.Cell class="px-4 py-3">
                                {#if u.role === 'member'}
                                    <UserProjectsPopover user={u} />
                                {:else}
                                    <span class="text-xs text-muted-foreground/40 flex items-center gap-1">
                                        <ShieldIcon class="size-3" /> All
                                    </span>
                                {/if}
                            </Table.Cell>

                            <!-- Created -->
                            <Table.Cell class="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                {formatDate(u.created_at)}
                            </Table.Cell>

                            <!-- Status -->
                            <Table.Cell class="px-4 py-3">
                                {#if u.force_password_change}
                                    <span class="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">Temp password</span>
                                {:else}
                                    <span class="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Active</span>
                                {/if}
                            </Table.Cell>

                            <!-- Actions -->
                            <Table.Cell class="px-4 py-3">
                                <div class="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Tooltip.Root>
                                        <Tooltip.Trigger>
                                            <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    class="size-7 text-muted-foreground hover:text-foreground"
                                                    onclick={() => resetTarget = u}
                                            >
                                                <KeyRoundIcon class="size-3.5" />
                                            </Button>
                                        </Tooltip.Trigger>
                                        <Tooltip.Content>Reset password</Tooltip.Content>
                                    </Tooltip.Root>

                                    {#if u.id !== currentUserId}
                                        <AlertDialog.Root>
                                            <AlertDialog.Trigger>
                                                {#snippet child({ props })}
                                                    <Button
                                                            {...props}
                                                            variant="ghost"
                                                            size="icon"
                                                            class="size-7 text-destructive hover:text-destructive"
                                                            disabled={deleteMut.isPending && deleteMut.variables === u.id}
                                                    >
                                                        <Trash2Icon class="size-3.5" />
                                                    </Button>
                                                {/snippet}
                                            </AlertDialog.Trigger>
                                            <AlertDialog.Content>
                                                <AlertDialog.Header>
                                                    <AlertDialog.Title>Delete user?</AlertDialog.Title>
                                                    <AlertDialog.Description>
                                                        This will permanently delete <span class="font-medium text-foreground">{u.name}</span> ({u.email}). This action cannot be undone.
                                                    </AlertDialog.Description>
                                                </AlertDialog.Header>
                                                <AlertDialog.Footer>
                                                    <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                                                    <AlertDialog.Action
                                                            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            onclick={() => deleteMut.mutate(u.id)}
                                                    >
                                                        Delete
                                                    </AlertDialog.Action>
                                                </AlertDialog.Footer>
                                            </AlertDialog.Content>
                                        </AlertDialog.Root>
                                    {/if}
                                </div>
                            </Table.Cell>

                        </Table.Row>
                    {:else}
                        <Table.Row>
                            <Table.Cell colspan={columns.length} class="py-12 text-center text-sm text-muted-foreground">
                                No users found
                            </Table.Cell>
                        </Table.Row>
                    {/each}
                </Table.Body>
            </Table.Root>
        {/if}
    </div>
</div>

<CreateUserDialog bind:open={showCreate} />
<ResetPasswordDialog bind:target={resetTarget} />