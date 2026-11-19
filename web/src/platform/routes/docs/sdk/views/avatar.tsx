import ViewLayout from './view-layout';
import { Stack, Avatar, AvatarGroup } from '@/components/longlink';

/** Documents the LongLink Avatar in Views. */
export default function AvatarPage() {
    // Present the avatar's geometry and image fallback properties.
    return (
        <ViewLayout
            name="Avatar"
            example={{
                title: 'Avatar',
                preview: <AvatarExample />,
                code: `function Example() {
  return (
    <Stack direction="horizontal" gap={6} align="center">
      <AvatarGroup>
        <Avatar name="Ada Lovelace" shape="circle" size="sm" />
        <Avatar name="Ada Lovelace" shape="circle" size="md" />
        <Avatar name="Ada Lovelace" shape="circle" size="lg" />
      </AvatarGroup>

      <AvatarGroup>
        <Avatar name="Ada Lovelace" shape="rounded" size="sm" />
        <Avatar name="Ada Lovelace" shape="rounded" size="md" />
        <Avatar name="Ada Lovelace" shape="rounded" size="lg" />
      </AvatarGroup>

      <AvatarGroup>
        <Avatar name="Ada Lovelace" shape="square" size="sm" />
        <Avatar name="Ada Lovelace" shape="square" size="md" />
        <Avatar name="Ada Lovelace" shape="square" size="lg" />
      </AvatarGroup>
    </Stack>
  );
}`
            }}
        />
    );
}

/** Renders the page's avatar example for documentation and the catalog. */
export function AvatarExample() {
    return (
        <Stack direction="horizontal" gap={6} align="center">
            <AvatarGroup>
                <Avatar name="Ada Lovelace" shape="circle" size="sm" />
                <Avatar name="Ada Lovelace" shape="circle" size="md" />
                <Avatar name="Ada Lovelace" shape="circle" size="lg" />
            </AvatarGroup>

            <AvatarGroup>
                <Avatar name="Ada Lovelace" shape="rounded" size="sm" />
                <Avatar name="Ada Lovelace" shape="rounded" size="md" />
                <Avatar name="Ada Lovelace" shape="rounded" size="lg" />
            </AvatarGroup>

            <AvatarGroup>
                <Avatar name="Ada Lovelace" shape="square" size="sm" />
                <Avatar name="Ada Lovelace" shape="square" size="md" />
                <Avatar name="Ada Lovelace" shape="square" size="lg" />
            </AvatarGroup>
        </Stack>
    );
}
