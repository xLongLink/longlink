import { DataTable } from '@/components/DataTable';
import CreateOrganizationDialog from '@/components/dialogs/CreateOrganizationDialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useDeleteOrganization } from '@/hooks/use-organization';
import { useUpdateUser, useUser } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import { ACCENT_OPTIONS, RADIUS_OPTIONS, THEME_OPTIONS, type Accent, type Radius, type Theme } from '@/lib/theme';
import { getInitials, useDeleteDialog } from '@/lib/utils';
import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Menu, MenuSection } from '@ui/menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Building2, MoreVertical, Paintbrush, Settings2, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

/** Renders the authenticated settings page. */
export default function Settings() {
    const { user, organizations, theme, accent, radius, isLoading } = useUser();
    const { mutateAsync: updateUser, isPending } = useUpdateUser();
    const deleteOrganization = useDeleteOrganization();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [accountError, setAccountError] = useState<string | null>(null);

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
    const deleteDialog = useDeleteDialog({
        title: 'Delete organization',
        mutation: deleteOrganization,
        items: organizations,
        getId: (organization) => organization.id,
        description: (organization) => `Delete ${organization.name} from your account?`,
        errorMessage: 'Failed to delete organization',
        fallbackDescription: 'Delete this organization?',
    });

    const organizationColumns: Array<ColumnDef<(typeof organizations)[number]>> = [
        {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ row, getValue }) => (
                <div className="flex items-center gap-3">
                        <Avatar shape="squircle" className="size-8">
                            <AvatarImage src={row.original.avatar ?? ''} alt={row.original.name} />
                            <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
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
            meta: { className: 'w-44 text-right' },
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="cursor-pointer"
                                    aria-label={`Open actions for ${row.original.name}`}
                                />
                            }
                        >
                            <MoreVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                                render={<Link to="/organizations" className="flex w-full items-center text-inherit" />}
                                className="cursor-pointer"
                            >
                                Manage
                            </DropdownMenuItem>
                            {row.original.role === 'owner' ? (
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    variant="destructive"
                                    onClick={() => {
                                        deleteDialog.openFor(row.original);
                                    }}
                                >
                                    Delete
                                </DropdownMenuItem>
                            ) : null}
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                <Hero icon="settings-2">
                    <div>
                        <HeroTitle>Settings</HeroTitle>
                        <HeroDescription>Manage your account, preferences, and workspace access.</HeroDescription>
                    </div>
                </Hero>

                <Menu defaultValue="account" hashNavigation className="items-start">
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

                    <MenuSection value="organizations" label="Organizations" icon={Building2}>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-medium text-foreground">Organizations</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Review the organizations connected to your personal account.
                                    </p>
                                </div>

                                <CreateOrganizationDialog />
                            </div>

                            <DataTable columns={organizationColumns} data={organizations} isLoading={isLoading} />
                        </div>
                    </MenuSection>
                </Menu>

                <DeleteConfirmationDialog {...deleteDialog.dialogProps} />
            </section>
        </Layout>
    );
}
