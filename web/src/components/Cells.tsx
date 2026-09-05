import type { ReactNode } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Stack } from '@astryxdesign/core/Stack';

type UserCellProps = {
    user: {
        avatar: string;
        email: string;
        name: string;
    };
    endContent?: ReactNode;
};

type OrganizationCellProps = {
    organization: {
        avatar: string;
        name: string;
        slug: string;
    };
    endContent?: ReactNode;
};

/** Renders a user identity for a table cell. */
export function UserCell({ user, endContent }: UserCellProps) {
    return (
        <Stack direction="horizontal" gap={3} align="center">
            <Avatar name={user.name} src={user.avatar} />
            <Stack align="start">
                <Stack direction="horizontal" gap={1} align="center">
                    <Text weight="semibold">{user.name}</Text>
                    {endContent}
                </Stack>
                <Text type="supporting">{user.email}</Text>
            </Stack>
        </Stack>
    );
}

/** Renders an organization identity for a table cell. */
export function OrganizationCell({ organization, endContent }: OrganizationCellProps) {
    return (
        <Stack direction="horizontal" gap={3} align="center">
            <Avatar kind="organization" name={organization.name} src={organization.avatar} />
            <Stack align="start">
                <Stack direction="horizontal" gap={1} align="center">
                    <Link href={`/orgs/${organization.slug}`} weight="semibold">
                        {organization.name}
                    </Link>
                    {endContent}
                </Stack>
                <Text type="supporting">Organization</Text>
            </Stack>
        </Stack>
    );
}
