import ViewLayout from './view-layout';
import { GeneratedAvatar } from '@/components/custom/generated-avatar';

/** Documents GeneratedAvatar in LongLink Views. */
export default function GeneratedAvatarPage() {
    // Render generated artwork with its owner-specific fallback options.
    return (
        <ViewLayout
            name="GeneratedAvatar"
            properties={[
                {
                    name: 'shape',
                    type: '"circle" | "square" | "rounded"',
                    description: 'Avatar shape: circle, rounded, or square.'
                },
                { name: 'name', type: 'string', description: 'User name for initials and alt text.' },
                {
                    name: 'seed',
                    type: 'string',
                    description: 'Stable identity for generated avatars, independent of the display name.'
                },
                {
                    name: 'kind',
                    type: '"user" | "organization"',
                    description: 'Avatar style for a user or organization.'
                },
                { name: 'src', type: 'string | null', description: 'Primary image source URL.' },
                { name: 'alt', type: 'string', description: 'Alt text (falls back to name).' },
                { name: 'size', type: '"sm" | "default" | "lg"', description: 'Avatar size.' }
            ]}
            example={{
                title: 'GeneratedAvatar',
                preview: <GeneratedAvatarExample />,
                code: `function Example() {
  return <GeneratedAvatar name="Ada Lovelace" size="lg" />;
}`
            }}
        />
    );
}

/** Renders generated artwork for documentation and the catalog. */
export function GeneratedAvatarExample() {
    return <GeneratedAvatar name="Ada Lovelace" size="lg" />;
}
