import type { z } from 'zod';
import { useState } from 'react';
import AppearanceSettings from './Appearance';
import { Avatar } from '@/components/ui/Avatar';
import { Link, useLocation } from 'react-router';
import { Divider } from '@/components/ui/Divider';
import { UserRound, Building2 } from 'lucide-react';
import { ApiBoundary } from '@/components/ApiBoundary';
import { PageContainer } from '@/components/PageContainer';
import OrganizationManagement from './OrganizationManagement';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeTextInput } from '@/components/ui/NativeTextInput';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';
import { useUpdateUser, useAuthenticatedUser } from '@/lib/hooks/use-user';
import '@/platform/components/settings-navigation.css';

/** Renders account metadata and resets drafts when the authenticated identity changes. */
export default function Settings() {
    const user = useAuthenticatedUser();

    return (
        <PageContainer padding={2}>
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
    async function saveAccount() {
        if (userUpdate.isPending || !name.trim() || name.trim() === user.name) return;

        // Cache the authoritative profile returned by a successful save.
        try {
            const updatedUser = await userUpdate.mutateAsync({ name: name.trim() });
            setName(updatedUser.name);
        } catch {
            // The mutation reports the error; keep the draft available for retry.
        }
    }

    // Keep account editing independent of organization loading and failures.
    return (
        <div className="flex flex-col gap-(--spacing-8)">
            <div className="flex items-center gap-(--spacing-3)">
                <Avatar name={name} src={user.avatar} seed={user.id} />
                <div className="flex flex-col gap-0">
                    <Heading level={4} accessibilityLevel={1}>
                        {name}
                    </Heading>
                    <Text type="supporting">{user.email}</Text>
                </div>
            </div>
            <div className="grid min-w-0 grid-cols-[260px_minmax(0,1fr)] items-start max-[47.999rem]:grid-cols-[minmax(0,1fr)] max-[47.999rem]:gap-6 [&>nav]:min-w-0">
                <nav aria-label="Settings sections" className="settings-navigation">
                    <Link
                        to={`${location.pathname}${location.search}#account`}
                        aria-current={section === 'account' ? 'location' : undefined}
                    >
                        <UserRound className="size-4" aria-hidden="true" />
                        Account
                    </Link>
                    <Link
                        to={`${location.pathname}${location.search}#organizations`}
                        aria-current={section === 'organizations' ? 'location' : undefined}
                    >
                        <Building2 className="size-4" aria-hidden="true" />
                        Organizations
                    </Link>
                </nav>
                <div className="flex min-w-0 flex-col gap-(--spacing-3)">
                    {section === 'organizations' ? (
                        <ApiBoundary>
                            <OrganizationManagement presentation="settings" />
                        </ApiBoundary>
                    ) : (
                        <div className="flex flex-col gap-(--spacing-8)">
                            <div className="flex flex-col gap-(--spacing-4)">
                                <div className="flex min-h-(--size-element-md) flex-col justify-end">
                                    <Heading level={2} hasCapsize>
                                        Account
                                    </Heading>
                                </div>
                                <Divider />
                                <NativeTextInput
                                    label="Username"
                                    value={name}
                                    required
                                    readOnly={userUpdate.isPending}
                                    onChange={(event) => setName(event.target.value)}
                                    onBlur={() => void saveAccount()}
                                />
                            </div>
                            <AppearanceSettings />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
