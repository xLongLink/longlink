import { useState } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { ExternalLink, Plus } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import CreateOrganization from './CreateOrganization';
import { Table, proportional } from '@astryxdesign/core/Table';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

/** Owns membership loading and organization creation for the overview and account settings. */
export default function OrganizationManagement({ presentation }: { presentation: 'overview' | 'settings' }) {
    const [creating, setCreating] = useState(false);

    const [memberships, invalidate] = useApi('/api/v1/me/organizations', schemas.zUserOrganizationMembership.array());
    const onboarding = presentation === 'overview' && memberships.length === 0;

    // Keep overview onboarding and settings presentation around the same membership workflow.
    return (
        <>
            <Stack
                gap={onboarding ? 8 : 4}
                justify={onboarding ? 'center' : undefined}
                minHeight={
                    onboarding
                        ? 'calc(100dvh - var(--_app-shell-header-height, 0px) * 2 - var(--spacing-8))'
                        : undefined
                }
            >
                {presentation === 'settings' ? (
                    <>
                        <Stack
                            direction="horizontal"
                            justify="between"
                            align="end"
                            wrap="wrap"
                            minHeight="var(--size-element-md)"
                        >
                            <Heading level={2} hasCapsize>
                                Organizations
                            </Heading>
                            <Button label="Create Organization" onClick={() => setCreating(true)} />
                        </Stack>
                        <Divider />
                    </>
                ) : memberships.length > 0 ? (
                    <Stack direction="horizontal" justify="between" align="center" wrap="wrap" className="min-h-12">
                        <Heading level={1}>Organizations</Heading>
                        <Button label="Create Organization" onClick={() => setCreating(true)} />
                    </Stack>
                ) : null}
                {onboarding ? (
                    <Stack gap={6} align="center">
                        <img
                            src="/images/organization.png"
                            alt=""
                            className="size-20 object-contain"
                            width={1254}
                            height={1254}
                            decoding="async"
                        />
                        <Stack gap={0}>
                            <Heading level={1} justify="center">
                                Your Organizations
                            </Heading>
                            <Text as="p" color="secondary" justify="center">
                                A place for your workflows and data
                            </Text>
                        </Stack>
                        <Stack direction="horizontal" gap={3} justify="center" wrap="wrap">
                            <Button
                                label="Read the docs"
                                variant="secondary"
                                href="/docs/"
                                target="_blank"
                                rel="noopener noreferrer"
                                endContent={<ExternalLink className="size-4" aria-hidden="true" />}
                            />
                            <Button
                                label="Create organization"
                                variant="primary"
                                icon={<Plus className="size-4" aria-hidden="true" />}
                                onClick={() => setCreating(true)}
                            />
                        </Stack>
                    </Stack>
                ) : (
                    <Table
                        data={memberships}
                        idKey={(row) => row.organization.id}
                        hasHover
                        density="compact"
                        columns={[
                            {
                                key: 'organization',
                                header: 'Name',
                                width: proportional(1),
                                renderCell: (row) => (
                                    <Stack direction="horizontal" gap={3} align="center">
                                        <Avatar kind="organization" name={row.organization.name} />
                                        <Stack align="start" gap={presentation === 'overview' ? 0 : undefined}>
                                            {presentation === 'settings' ? (
                                                <Stack direction="horizontal" gap={1} align="center">
                                                    <Link href={`/orgs/${row.organization.slug}`}>
                                                        {row.organization.name}
                                                    </Link>
                                                    <Badge label={row.role} />
                                                </Stack>
                                            ) : (
                                                <Link href={`/orgs/${row.organization.slug}`}>
                                                    {row.organization.name}
                                                </Link>
                                            )}
                                            <Text type="supporting">Organization</Text>
                                        </Stack>
                                    </Stack>
                                ),
                            },
                        ]}
                    />
                )}
            </Stack>
            <CreateOrganization isOpen={creating} onOpenChange={setCreating} invalidate={invalidate} />
        </>
    );
}
