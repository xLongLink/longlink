import { useState } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Avatar } from '@astryxdesign/core/Avatar';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { useToast } from '@astryxdesign/core/Toast';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { useLocation, useNavigate } from 'react-router';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { pixel, proportional } from '@astryxdesign/core/Table';
import Layout from '@/layout/Layout';
import { useTranslation } from '@/lib/i18n';
import { useDeleteDialog } from '@/lib/utils';
import { useDeleteOrganization } from '@/hooks/use-organization';
import { useUpdateUser, useUserProfile } from '@/hooks/use-user';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import CreateOrganization from '@/components/dialogs/CreateOrganization';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { LANGUAGE_OPTIONS, resolveSupportedLanguage, type Language } from '@/lib/languages';
import { ACCENT_OPTIONS, RADIUS_OPTIONS, THEME_OPTIONS, type Accent, type Radius, type Theme } from '@/lib/theme';

type SettingsSection = 'account' | 'appearance' | 'organizations';

/** Renders the authenticated settings page. */
export default function Settings() {
    const { t } = useTranslation();
    const toast = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, organizations, theme, accent, radius, language, isLoading } = useUserProfile();
    const { mutateAsync: updateUser, isPending } = useUpdateUser();
    const deleteOrganization = useDeleteOrganization();
    const [editedName, setEditedName] = useState<string | null>(null);
    const [accountError, setAccountError] = useState<string | null>(null);
    const hash = location.hash.replace(/^#/, '');
    const section: SettingsSection =
        hash === 'appearance' || hash === 'organizations' || hash === 'account' ? hash : 'account';
    const name = editedName ?? user?.name ?? '';
    const accountName = name.trim();
    const selectedLanguage = resolveSupportedLanguage(language);

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
            setEditedName(accountName);
            toast({ body: t('settings.usernameSaved') });
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
    const organizationColumns: DataTableColumn<(typeof organizations)[number]>[] = [
        {
            key: 'name',
            header: t('columns.name'),
            width: proportional(1),
            renderCell: (organization) => (
                <HStack gap={3} align="center">
                    <Avatar src={organization.avatar ?? undefined} name={organization.name} size="small" />
                    <VStack gap={1}>
                        <Link href={`/orgs/${organization.slug}`} weight="semibold">
                            {organization.name}
                        </Link>
                        <Text type="supporting">{organization.country}</Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'role',
            header: t('columns.role'),
            width: pixel(128),
            renderCell: (organization) => <Badge label={organization.role} />,
        },
        {
            key: 'actions',
            header: t('columns.actions'),
            width: pixel(96),
            align: 'end',
            renderCell: (organization) =>
                organization.role === 'owner' ? (
                    <MoreMenu
                        label={t('common.openActionsFor', { name: organization.name })}
                        size="sm"
                        items={[{ label: t('actions.delete'), onClick: () => deleteDialog.openFor(organization) }]}
                    />
                ) : null,
        },
    ];

    /** Updates the URL-backed settings section. */
    function handleSectionChange(nextSection: string): void {
        navigate(`${location.pathname}${location.search}#${nextSection}`);
    }

    return (
        <Layout
            brandOnly
            tabs={{
                [t('navigation.organizations')]: '/organizations',
                [t('navigation.settings')]: '/settings',
            }}
        >
            <VStack gap={8} width="100%" maxWidth={1000}>
                <VStack gap={1}>
                    <Heading level={1}>{t('settings.title')}</Heading>
                    <Text type="supporting">{t('settings.description')}</Text>
                </VStack>

                <TabList value={section} onChange={handleSectionChange} hasDivider>
                    <Tab value="account" label={t('settings.accountTitle')} />
                    <Tab value="appearance" label={t('settings.appearanceTitle')} />
                    <Tab value="organizations" label={t('settings.organizationsTitle')} />
                </TabList>

                {section === 'account' ? (
                    <VStack gap={4}>
                        <VStack gap={1}>
                            <Heading level={2}>{t('settings.accountTitle')}</Heading>
                            <Text type="supporting">{t('settings.accountDescription')}</Text>
                        </VStack>
                        <HStack gap={4} align="start" wrap="wrap">
                            <TextInput
                                label={t('labels.username')}
                                value={name}
                                width="100%"
                                isRequired
                                isDisabled={isLoading || !user}
                                status={accountError ? { type: 'error', message: accountError } : undefined}
                                onChange={setEditedName}
                                onBlur={() => {
                                    void saveAccountName();
                                }}
                            />
                            <TextInput
                                label={t('labels.email')}
                                type="email"
                                value={user?.email ?? ''}
                                width="100%"
                                isDisabled
                            />
                            <Selector
                                label={t('labels.language')}
                                options={LANGUAGE_OPTIONS.map((option) => ({
                                    value: option.value,
                                    label: option.nativeLabel,
                                }))}
                                value={selectedLanguage}
                                width="100%"
                                isDisabled={isLoading || isPending || !user}
                                placeholder={t('settings.placeholders.language')}
                                onChange={(value) => {
                                    void updateUser({ language: value as Language });
                                }}
                            />
                        </HStack>
                    </VStack>
                ) : null}

                {section === 'appearance' ? (
                    <VStack gap={4}>
                        <VStack gap={1}>
                            <Heading level={2}>{t('settings.appearanceTitle')}</Heading>
                            <Text type="supporting">{t('settings.appearanceDescription')}</Text>
                        </VStack>
                        <HStack gap={4} align="start" wrap="wrap">
                            <Selector
                                label={t('labels.theme')}
                                options={THEME_OPTIONS}
                                value={theme}
                                width={320}
                                isDisabled={isPending}
                                placeholder={t('settings.placeholders.theme')}
                                onChange={(value) => {
                                    void updateUser({ theme: value as Theme });
                                }}
                            />
                            <Selector
                                label={t('labels.accentColor')}
                                options={ACCENT_OPTIONS.map((option) => ({
                                    value: option.value,
                                    label: option.label,
                                    icon: (
                                        <span
                                            aria-hidden="true"
                                            style={{
                                                display: 'inline-block',
                                                width: 10,
                                                height: 10,
                                                borderRadius: 9999,
                                                backgroundColor: option.swatch,
                                            }}
                                        />
                                    ),
                                }))}
                                value={accent}
                                width={320}
                                isDisabled={isPending}
                                placeholder={t('settings.placeholders.color')}
                                onChange={(value) => {
                                    void updateUser({ accent: value as Accent });
                                }}
                            />
                            <Selector
                                label={t('labels.radius')}
                                options={RADIUS_OPTIONS}
                                value={radius}
                                width={320}
                                isDisabled={isPending}
                                placeholder={t('settings.placeholders.radius')}
                                onChange={(value) => {
                                    void updateUser({ radius: value as Radius });
                                }}
                            />
                        </HStack>
                    </VStack>
                ) : null}

                {section === 'organizations' ? (
                    <VStack gap={4}>
                        <HStack gap={4} justify="between" align="end" wrap="wrap">
                            <VStack gap={1}>
                                <Heading level={2}>{t('settings.organizationsTitle')}</Heading>
                                <Text type="supporting">{t('settings.organizationDescription')}</Text>
                            </VStack>
                            <CreateOrganization />
                        </HStack>
                        <DataTable columns={organizationColumns} data={organizations} isLoading={isLoading} />
                    </VStack>
                ) : null}

                <DeleteConfirmation {...deleteDialog.dialogProps} />
            </VStack>
        </Layout>
    );
}
