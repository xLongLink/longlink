import type { z } from 'zod';
import { useState } from 'react';
import { useLocation } from 'react-router';
import AppearanceSettings from './appearance';
import { ApiBoundary } from '@/components/api';
import { Input } from '@/components/shadcn/input';
import { UserRound, Building2 } from 'lucide-react';
import { Text } from '@/components/longlink/display/text';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Avatar } from '@/components/longlink/display/avatar';
import { Field, FieldLabel } from '@/components/shadcn/field';
import OrganizationManagement from './organization-management';
import { Heading } from '@/components/longlink/display/heading';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { PageContainer } from '@/components/layouts/page-container';
import { SettingsLayout, SettingsLink } from '@/platform/layouts/settings';
import { useUpdateUser, useAuthenticatedUser } from '@/platform/hooks/use-user';

/** Renders account metadata and resets drafts when the authenticated identity changes. */
export default function Settings() {
    const user = useAuthenticatedUser();

    return (
        <PageContainer>
            <title>Account Settings | LongLink</title>
            <SettingsPage key={user.id} user={user} />
        </PageContainer>
    );
}

/** Edits the authenticated profile and manages owned organizations. */
function SettingsPage({ user }: { user: z.output<typeof schemas.zCurrentUser> }) {
    const [name, setName] = useState(user.name);
    const userUpdate = useUpdateUser();
    const location = useLocation();

    // Unknown fragments select Account without loading organization memberships.
    const section = location.hash === '#organizations' ? 'organizations' : 'account';

    /** Saves the validated account name and refreshes the profile. */
    function saveAccount() {
        if (userUpdate.isPending || !name.trim() || name.trim() === user.name) return;

        userUpdate.mutate({ name: name.trim() }, { onSuccess: (updatedUser) => setName(updatedUser.name) });
    }

    // Keep account editing independent of organization loading and failures.
    return (
        <Stack gap={8}>
            <Stack direction="horizontal" align="center" gap={3}>
                <Avatar name={name} src={user.avatar} />
                <Stack gap={0}>
                    <Heading level={1} size={4}>
                        {name}
                    </Heading>
                    <Text size="xs" tone="muted">
                        {user.email}
                    </Text>
                </Stack>
            </Stack>
            <SettingsLayout
                navigation={
                    <>
                        <SettingsLink active={section} id="account">
                            <UserRound className="size-4" aria-hidden="true" />
                            Account
                        </SettingsLink>
                        <SettingsLink active={section} id="organizations">
                            <Building2 className="size-4" aria-hidden="true" />
                            Organizations
                        </SettingsLink>
                    </>
                }
            >
                {section === 'organizations' ? (
                    <ApiBoundary>
                        <OrganizationManagement presentation="settings" />
                    </ApiBoundary>
                ) : (
                    <Stack gap={8}>
                        <Stack gap={4}>
                            <Stack gap={0} justify="end" className="min-h-8">
                                <Heading level={2} trim>
                                    Account
                                </Heading>
                            </Stack>
                            <Separator />
                            <Field className="min-w-0">
                                <FieldLabel htmlFor="account-name">Username</FieldLabel>
                                <Input
                                    id="account-name"
                                    value={name}
                                    required
                                    aria-required
                                    readOnly={userUpdate.isPending}
                                    onChange={(event) => setName(event.target.value)}
                                    onBlur={saveAccount}
                                />
                            </Field>
                        </Stack>
                        <AppearanceSettings />
                    </Stack>
                )}
            </SettingsLayout>
        </Stack>
    );
}
