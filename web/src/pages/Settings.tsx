import CreateOrgDialog from '@/components/dialogs/CreateOrgDialog';
import { DataTable } from '@/components/DataTable';
import { useDeleteOrg } from '@/hooks/use-org';
import { useUpdateUser, useUser } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import { ACCENT_OPTIONS, RADIUS_OPTIONS, THEME_OPTIONS, type Accent, type Radius, type Theme } from '@/lib/theme';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ui/dialog';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Menu, MenuSection } from '@ui/menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Bell, Building2, Code2, Paintbrush, Settings2, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

/** Renders the authenticated settings page. */
export default function Settings() {
    const { user, organizations, theme, accent, radius, isLoading } = useUser();
    const { mutateAsync: updateUser, isPending } = useUpdateUser();
    const deleteOrg = useDeleteOrg();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [accountError, setAccountError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const deleteTargetOrg = organizations.find((organization) => organization.id === deleteTarget) ?? null;

    // Keep the editable fields aligned with the authenticated user record.
    useEffect(() => {
        if (!user) {
            return;
        }

        setName(user.name);
        setEmail(user.email);
    }, [user]);

    const accountName = name.trim();
    const accountEmail = email.trim();
    const hasAccountChanges =
        !!user &&
        (accountName !== user.name || accountEmail !== user.email) &&
        accountName.length > 0 &&
        accountEmail.length > 0;

    const organizationColumns: Array<ColumnDef<(typeof organizations)[number]>> = [
        {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ row, getValue }) => (
                <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                        <AvatarImage src={row.original.avatar ?? ''} alt={row.original.name} />
                        <AvatarFallback>{row.original.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{getValue<string>()}</span>
                </div>
            ),
        },
        {
            accessorKey: 'role',
            header: 'Role',
            meta: { className: 'w-32' },
        },
        {
            id: 'actions',
            header: 'Actions',
            meta: { className: 'w-44' },
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Link to="/organizations" className="text-sm text-accent hover:underline">
                        Manage
                    </Link>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                            setDeleteTarget(row.original.id);
                            setDeleteError(null);
                        }}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <Layout
            brandOnly
            tabs={{
                Organizations: { href: '/organizations', icon: Building2 },
                Settings: { href: '/settings', icon: Settings2 },
            }}
        >
            <section className="mx-auto w-full max-w-[1000px] space-y-8">
                <Hero icon={<Settings2 />}>
                    <div>
                        <HeroTitle>Settings</HeroTitle>
                        <HeroDescription>Manage your account, preferences, and workspace access.</HeroDescription>
                    </div>
                </Hero>

                <Menu defaultValue="account" className="items-start">
                    <MenuSection value="account" label="Account" icon={UserRound}>
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-lg font-medium text-foreground">Account</h2>
                                <p className="text-sm text-muted-foreground">Update your username and email address.</p>
                            </div>

                            <form
                                className="space-y-4"
                                onSubmit={async (event) => {
                                    event.preventDefault();
                                    setAccountError(null);

                                    if (!user) {
                                        return;
                                    }

                                    const payload: { name?: string; email?: string } = {};

                                    if (accountName !== user.name) {
                                        payload.name = accountName;
                                    }

                                    if (accountEmail !== user.email) {
                                        payload.email = accountEmail;
                                    }

                                    if (!Object.keys(payload).length) {
                                        return;
                                    }

                                    try {
                                        await updateUser(payload);
                                        toast.success('Account settings saved');
                                    } catch (error) {
                                        setAccountError(
                                            error instanceof Error ? error.message : 'Failed to update account'
                                        );
                                    }
                                }}
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-name">Username</Label>
                                        <Input
                                            id="settings-name"
                                            value={name}
                                            onChange={(event) => setName(event.target.value)}
                                            autoComplete="nickname"
                                            disabled={isLoading || isPending || !user}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="settings-email">Email</Label>
                                        <Input
                                            id="settings-email"
                                            type="email"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            autoComplete="email"
                                            disabled={isLoading || isPending || !user}
                                        />
                                    </div>
                                </div>

                                {accountError ? <p className="text-sm text-destructive">{accountError}</p> : null}

                                <div className="flex items-center justify-end gap-3">
                                    <Button type="submit" disabled={!hasAccountChanges || isLoading || isPending}>
                                        {isPending ? 'Saving...' : 'Save changes'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </MenuSection>

                    <MenuSection value="appearance" label="Appearance" icon={Paintbrush}>
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-lg font-medium text-foreground">Appearance</h2>
                                <p className="text-sm text-muted-foreground">
                                    Customize the theme, accent color, and radius for the interface.
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">Theme</p>
                                    <Select
                                        value={theme}
                                        disabled={isPending}
                                        onValueChange={(value) => {
                                            void updateUser({ theme: value as Theme });
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Choose a theme" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {THEME_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">Accent color</p>
                                    <Select
                                        value={accent}
                                        disabled={isPending}
                                        onValueChange={(value) => {
                                            void updateUser({ accent: value as Accent });
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Choose a color" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ACCENT_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    <span className="flex items-center gap-2">
                                                        <span
                                                            className="size-2.5 rounded-full"
                                                            style={{ backgroundColor: option.swatch }}
                                                        />
                                                        {option.label}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">Radius</p>
                                    <Select
                                        value={radius}
                                        disabled={isPending}
                                        onValueChange={(value) => {
                                            void updateUser({ radius: value as Radius });
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Choose a radius" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {RADIUS_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </MenuSection>

                    <MenuSection value="notifications" label="Notifications" icon={Bell}>
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-lg font-medium text-foreground">Notifications</h2>
                                <p className="text-sm text-muted-foreground">
                                    Choose which updates and alerts you want to receive.
                                </p>
                            </div>
                        </div>
                    </MenuSection>

                    <MenuSection value="organizations" label="Organizations" icon={Building2}>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-medium text-foreground">Organizations</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Review the organizations connected to your personal account.
                                    </p>
                                </div>

                                <CreateOrgDialog />
                            </div>

                            <DataTable
                                columns={organizationColumns}
                                data={organizations}
                                isLoading={isLoading}
                                loadingLabel="Loading organizations..."
                            />
                        </div>
                    </MenuSection>

                    <MenuSection value="developer-settings" label="Developer Settings" icon={Code2}>
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-lg font-medium text-foreground">Developer Settings</h2>
                                <p className="text-sm text-muted-foreground">
                                    Configure developer access, integrations, and API-related preferences.
                                </p>
                            </div>
                        </div>
                    </MenuSection>
                </Menu>

                <Dialog
                    open={deleteTarget !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeleteTarget(null);
                            setDeleteError(null);
                        }
                    }}
                >
                    <DialogContent>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <DialogTitle>Delete org</DialogTitle>
                                <DialogDescription>
                                    {deleteTargetOrg
                                        ? `Delete ${deleteTargetOrg.name} from your account?`
                                        : 'Delete this org?'}
                                </DialogDescription>
                            </div>

                            {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setDeleteTarget(null);
                                        setDeleteError(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    disabled={deleteOrg.isPending || deleteTarget === null}
                                    onClick={async () => {
                                        if (!deleteTarget) {
                                            return;
                                        }

                                        // Delete the selected org and close the dialog on success.
                                        try {
                                            await deleteOrg.mutateAsync(deleteTarget);
                                            setDeleteTarget(null);
                                            setDeleteError(null);
                                        } catch (mutationError) {
                                            setDeleteError(
                                                mutationError instanceof Error
                                                    ? mutationError.message
                                                    : 'Failed to delete org'
                                            );
                                        }
                                    }}
                                >
                                    {deleteOrg.isPending ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </section>
        </Layout>
    );
}
