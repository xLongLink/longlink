import type { z } from 'zod';
import { useState } from 'react';
import AppearanceSettings from './appearance';
import { ApiBoundary } from '@/components/api';
import { Link, useLocation } from 'react-router';
import { Input } from '@/components/shadcn/input';
import { Button } from '@/components/shadcn/button';
import { UserRound, Building2 } from 'lucide-react';
import { Avatar } from '@/components/longlink/avatar';
import { Separator } from '@/components/shadcn/separator';
import { Field, FieldLabel } from '@/components/shadcn/field';
import OrganizationManagement from './organization-management';
import { PageContainer } from '@/components/ui/page-container';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useUpdateUser, useAuthenticatedUser } from '@/lib/hooks/use-user';

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
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3">
                <Avatar name={name} src={user.avatar} />
                <div className="flex flex-col gap-0">
                    <h4 className="font-semibold tracking-tight text-xl" aria-level={1}>
                        {name}
                    </h4>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
            </div>
            <div className="grid min-w-0 grid-cols-[260px_minmax(0,1fr)] items-start max-[47.999rem]:grid-cols-[minmax(0,1fr)] max-[47.999rem]:gap-6 [&>nav]:min-w-0">
                <nav aria-label="Settings sections" className="flex min-w-0 flex-col gap-0.5 pe-4">
                    <Button
                        nativeButton={false}
                        render={<Link to={`${location.pathname}${location.search}#account`} />}
                        variant={section === 'account' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="w-full justify-start"
                        aria-current={section === 'account' ? 'location' : undefined}
                    >
                        <UserRound className="size-4" aria-hidden="true" />
                        Account
                    </Button>
                    <Button
                        nativeButton={false}
                        render={<Link to={`${location.pathname}${location.search}#organizations`} />}
                        variant={section === 'organizations' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="w-full justify-start"
                        aria-current={section === 'organizations' ? 'location' : undefined}
                    >
                        <Building2 className="size-4" aria-hidden="true" />
                        Organizations
                    </Button>
                </nav>
                <div className="flex min-w-0 flex-col gap-3">
                    {section === 'organizations' ? (
                        <ApiBoundary>
                            <OrganizationManagement presentation="settings" />
                        </ApiBoundary>
                    ) : (
                        <div className="flex flex-col gap-8">
                            <div className="flex flex-col gap-4">
                                <div className="flex min-h-8 flex-col justify-end">
                                    <h2 className="font-semibold tracking-tight text-3xl block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
                                        Account
                                    </h2>
                                </div>
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
                                        onBlur={() => void saveAccount()}
                                    />
                                </Field>
                            </div>
                            <AppearanceSettings />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
