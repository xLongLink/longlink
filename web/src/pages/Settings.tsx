import { toast } from 'sonner';
import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Building2, MoreVertical, Paintbrush, Settings2, UserRound } from 'lucide-react';
import Layout from '@/layout/Layout';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Menu, MenuSection } from '@/components/ui/menu';
import { getInitials, useDeleteDialog } from '@/lib/utils';
import { useDeleteOrganization } from '@/hooks/use-organization';
import { useUpdateUser, useUserProfile } from '@/hooks/use-user';
import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import CreateOrganization from '@/components/dialogs/CreateOrganization';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LANGUAGE_OPTIONS, resolveSupportedLanguage, type Language } from '@/lib/languages';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ACCENT_OPTIONS, RADIUS_OPTIONS, THEME_OPTIONS, type Accent, type Radius, type Theme } from '@/lib/theme';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Renders the authenticated settings page. */
export default function Settings() {
    const { t } = useTranslation();
    const { user, organizations, theme, accent, radius, language, isLoading } = useUserProfile();
    const { mutateAsync: updateUser, isPending } = useUpdateUser();
    const deleteOrganization = useDeleteOrganization();
    const [name, setName] = useState(() => user?.name ?? '');
    const [accountError, setAccountError] = useState<string | null>(null);
    const [isNameFocused, setIsNameFocused] = useState(false);

    // Keep the editable fields aligned with the authenticated user record.
    useEffect(() => {
        // Wait until the profile has loaded.
        if (!user) {
            return;
        }

        // Avoid overwriting edits while the user is typing.
        if (!isNameFocused) {
            setName(user.name);
        }
    }, [user, isNameFocused]);

    const accountName = name.trim();
    const selectedLanguageValue = resolveSupportedLanguage(language);

    /** Saves the edited account name when focus leaves its input. */
    const saveAccountName = async () => {
        setAccountError(null);

        // Ignore saves when the user is not available.
        if (!user) {
            return;
        }

        // Require a non-empty account name.
        if (!accountName) {
            setAccountError(t('settings.usernameRequired'));
            return;
        }

        // Skip unchanged account names.
        if (accountName === user.name) {
            return;
        }

        // Persist the account name and surface any failure.
        try {
            await updateUser({ name: accountName });
            toast.success(t('settings.usernameSaved'));
        } catch (error) {
            setAccountError(error instanceof Error ? error.message : t('settings.failedUpdateUsername'));
        }
    };

    const deleteDialog = useDeleteDialog({
        title: t('deleteDialog.deleteOrganizationTitle'),
        mutation: deleteOrganization,
        items: organizations,
        getId: (organization) => organization.id,
        description: (organization) => t('deleteDialog.deleteOrganizationDescription', { name: organization.name }),
        errorMessage: t('deleteDialog.failedDeleteOrganization'),
        fallbackDescription: t('deleteDialog.deleteOrganizationFallback'),
    });

    const organizationColumns: Array<ColumnDef<(typeof organizations)[number]>> = [
        {
            accessorKey: 'name',
            header: t('columns.name'),
            cell: ({ row, getValue }) => (
                <div className="flex items-center gap-3">
                    <Avatar shape="squircle" className="size-8 shrink-0">
                        <AvatarImage src={row.original.avatar ?? ''} alt={row.original.name} />
                        <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <Link to={`/orgs/${row.original.slug}`} className="font-medium text-foreground hover:underline">
                            {getValue<string>()}
                        </Link>
                        <div className="truncate text-sm text-muted-foreground">
                            {row.original.country} · {row.original.location.name}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'role',
            header: t('columns.role'),
            meta: { className: 'w-32' },
        },
        {
            id: 'actions',
            header: t('columns.actions'),
            meta: { className: 'w-44 text-right' },
            cell: ({ row }) => {
                // Only owners can delete organizations from settings.
                if (row.original.role !== 'owner') {
                    return null;
                }

                return (
                    <div className="flex justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="cursor-pointer"
                                        aria-label={t('common.openActionsFor', { name: row.original.name })}
                                    />
                                }
                            >
                                <MoreVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    variant="destructive"
                                    onClick={() => {
                                        deleteDialog.openFor(row.original);
                                    }}
                                >
                                    {t('actions.delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];

    return (
        <Layout
            brandOnly
            tabs={{
                [t('navigation.organizations')]: { href: '/organizations', icon: Building2 },
                [t('navigation.settings')]: { href: '/settings', icon: Settings2 },
            }}
        >
            <section className="mx-auto w-full max-w-[1000px] space-y-8">
                <Hero icon="settings-2">
                    <div>
                        <HeroTitle>{t('settings.title')}</HeroTitle>
                        <HeroDescription>{t('settings.description')}</HeroDescription>
                    </div>
                </Hero>

                <Menu defaultValue="account" hashNavigation className="items-start">
                    <MenuSection value="account" label={t('settings.accountTitle')} icon={UserRound}>
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-lg font-medium text-foreground">{t('settings.accountTitle')}</h2>
                                <p className="text-sm text-muted-foreground">{t('settings.accountDescription')}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-[2fr_2fr_1fr]">
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-name">{t('labels.username')}</Label>
                                        <Input
                                            id="settings-name"
                                            required
                                            value={name}
                                            onChange={(event) => setName(event.target.value)}
                                            onFocus={() => setIsNameFocused(true)}
                                            onBlur={() => {
                                                setIsNameFocused(false);
                                                void saveAccountName();
                                            }}
                                            autoComplete="nickname"
                                            disabled={isLoading || !user}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="settings-email">{t('labels.email')}</Label>
                                        <Input
                                            id="settings-email"
                                            type="email"
                                            readOnly
                                            value={user?.email ?? ''}
                                            autoComplete="email"
                                            disabled={isLoading || !user}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="settings-language">{t('labels.language')}</Label>
                                        <Select
                                            value={selectedLanguageValue}
                                            disabled={isLoading || isPending || !user}
                                            onValueChange={(value) => {
                                                void updateUser({ language: value as Language });
                                            }}
                                        >
                                            <SelectTrigger id="settings-language" className="w-full">
                                                <SelectValue placeholder={t('settings.placeholders.language')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {LANGUAGE_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.nativeLabel}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {accountError ? <p className="text-sm text-destructive">{accountError}</p> : null}
                            </div>
                        </div>
                    </MenuSection>

                    <MenuSection value="appearance" label={t('settings.appearanceTitle')} icon={Paintbrush}>
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-lg font-medium text-foreground">{t('settings.appearanceTitle')}</h2>
                                <p className="text-sm text-muted-foreground">{t('settings.appearanceDescription')}</p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">{t('labels.theme')}</p>
                                    <Select
                                        value={theme}
                                        disabled={isPending}
                                        onValueChange={(value) => {
                                            void updateUser({ theme: value as Theme });
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={t('settings.placeholders.theme')} />
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
                                    <p className="text-sm font-medium text-foreground">{t('labels.accentColor')}</p>
                                    <Select
                                        value={accent}
                                        disabled={isPending}
                                        onValueChange={(value) => {
                                            void updateUser({ accent: value as Accent });
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={t('settings.placeholders.color')} />
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
                                    <p className="text-sm font-medium text-foreground">{t('labels.radius')}</p>
                                    <Select
                                        value={radius}
                                        disabled={isPending}
                                        onValueChange={(value) => {
                                            void updateUser({ radius: value as Radius });
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={t('settings.placeholders.radius')} />
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

                    <MenuSection value="organizations" label={t('settings.organizationsTitle')} icon={Building2}>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-medium text-foreground">
                                        {t('settings.organizationsTitle')}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {t('settings.organizationDescription')}
                                    </p>
                                </div>

                                <CreateOrganization />
                            </div>

                            <DataTable columns={organizationColumns} data={organizations} isLoading={isLoading} />
                        </div>
                    </MenuSection>
                </Menu>

                <DeleteConfirmation {...deleteDialog.dialogProps} />
            </section>
        </Layout>
    );
}
