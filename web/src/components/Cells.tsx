import type { ReactNode } from 'react';
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
