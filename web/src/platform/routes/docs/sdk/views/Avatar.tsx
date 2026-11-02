import ViewLayout from './ViewLayout';
import { Avatar } from '@/components/ui/Avatar';

/** Documents Avatar in LongLink Views. */
export default function AvatarPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Avatar"
            introduction={'Uses local Waves fallbacks for rounded organization avatars and Glyphs for users.'}
            properties={[
                {
                    name: 'shape',
                    type: '"circle" | "square" | "rounded"',
                    description: 'Avatar shape: circle, rounded, or square.',
                },
                {
                    name: 'name',
                    type: 'string',
                    description: 'User name for initials and alt text.',
                },
                {
                    name: 'seed',
                    type: 'string',
                    description: 'Stable identity for generated avatars, independent of the display name.',
                },
                {
                    name: 'kind',
                    type: '"user" | "organization"',
                    description: 'Avatar style for a user or organization.',
                },
                {
                    name: 'src',
                    type: 'string | null',
                    description: 'Primary image source URL.',
                },
                {
                    name: 'alt',
                    type: 'string',
                    description: 'Alt text (falls back to name).',
                },
                {
                    name: 'size',
                    type: '"sm" | "lg" | "md"',
                    description: 'Avatar size.',
                },
            ]}
            example={{
                title: 'Avatar',
                preview: <AvatarExample />,
                code: `function Example() {
  return <Avatar name="Ada Lovelace" />;
}`,
            }}
        />
    );
}

/** Renders the page's avatar example for documentation and the catalog. */
export function AvatarExample() {
    // Display the sample user's generated avatar.
    return <Avatar name="Ada Lovelace" size="lg" />;
}
