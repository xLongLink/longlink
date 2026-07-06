import { DataTable } from '@/components/DataTable';
import CreateOrganizationDialog from '@/components/dialogs/CreateOrganizationDialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useDeleteOrganization } from '@/hooks/use-organization';
import { useUpdateUser, useUserProfile } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import { useTranslation } from '@/lib/i18n';
import { LANGUAGE_OPTIONS, resolveSupportedLanguage, type Language } from '@/lib/languages';
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

type AccountField = 'name' | 'email';

/** Renders the authenticated settings page. */
export default function Settings() {
    const { t } = useTranslation();
    const { user, organizations, theme, accent, radius, language, isLoading } = useUserProfile();
    const { mutateAsync: updateUser, isPending } = useUpdateUser();
    const deleteOrganization = useDeleteOrganization();
    const [name, setName] = useState(() => user?.name ?? '');
    const [email, setEmail] = useState(() => user?.email ?? '');
    const [accountError, setAccountError] = useState<string | null>(null);
    const [focusedAccountField, setFocusedAccountField] = useState<AccountField | null>(null);

    // Keep the editable fields aligned with the authenticated user record.
    useEffect(() => {
        if (!user) {
            return;
        }

        if (focusedAccountField !== 'name') {
            setName(user.name);
        }

        if (focusedAccountField !== 'email') {
            setEmail(user.email);
        }
    }, [user, focusedAccountField]);

    const accountName = name.trim();
    const accountEmail = email.trim();
    const selectedLanguageValue = resolveSupportedLanguage(language);
    const selectedLanguage =
        LANGUAGE_OPTIONS.find((option) => option.value === selectedLanguageValue) ?? LANGUAGE_OPTIONS[0];

    /** Saves one edited account field when focus leaves its input. */
    const saveAccountField = async (field: AccountField, isValid = true) => {
        setAccountError(null);

        if (!user) {
            return;
        }

        if (field === 'name') {
            if (!accountName) {
                setAccountError(t('settings.usernameRequired'));
                return;
            }

            if (accountName === user.name) {
                return;
            }

            try {
                await updateUser({ name: accountName });
                toast.success(t('settings.usernameSaved'));
            } catch (error) {
                setAccountError(error instanceof Error ? error.message : t('settings.failedUpdateUsername'));
            }
        }

        if (field === 'email') {
            if (!accountEmail) {
                setAccountError(t('settings.emailRequired'));
                return;
            }

            if (!isValid) {
                setAccountError(t('settings.validEmail'));
                return;
            }

            if (accountEmail === user.email) {
                return;
            }

            try {
                await updateUser({ email: accountEmail });
                toast.success(t('settings.emailSaved'));
            } catch (error) {
                setAccountError(error instanceof Error ? error.message : t('settings.failedUpdateEmail'));
            }
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
                            {row.original.location.country} · {row.original.location.name}
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
                                            onFocus={() => setFocusedAccountField('name')}
                                            onBlur={() => {
                                                setFocusedAccountField(null);
                                                void saveAccountField('name');
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
                                            required
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            onFocus={() => setFocusedAccountField('email')}
                                            onBlur={(event) => {
                                                setFocusedAccountField(null);
                                                void saveAccountField('email', event.currentTarget.validity.valid);
                                            }}
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
                                                <SelectValue placeholder={t('settings.placeholders.language')}>
                                                    {selectedLanguage.nativeLabel}
                                                </SelectValue>
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
