import ViewLayout from './ViewLayout';
import { GeneratedAvatar } from '@/components/custom/GeneratedAvatar';

/** Documents GeneratedAvatar in LongLink Views. */
export default function GeneratedAvatarPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="GeneratedAvatar"
            properties={[
                {
                    name: 'shape',
                    type: '"circle" | "square" | "rounded"',
                    description: 'GeneratedAvatar shape: circle, rounded, or square.'
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
                    description: 'GeneratedAvatar style for a user or organization.'
                },
                { name: 'src', type: 'string | null', description: 'Primary image source URL.' },
                { name: 'alt', type: 'string', description: 'Alt text (falls back to name).' },
                { name: 'size', type: '"sm" | "lg" | "md"', description: 'GeneratedAvatar size.' }
            ]}
            example={{
                title: 'GeneratedAvatar',
                preview: <GeneratedAvatarExample />,
                code: `function Example() {
  return <GeneratedAvatar name="Ada Lovelace" />;
}`
            }}
        />
    );
}

/** Renders the page's avatar example for documentation and the catalog. */
export function GeneratedAvatarExample() {
    // Display the sample user's generated avatar.
    return <GeneratedAvatar name="Ada Lovelace" size="lg" />;
}
