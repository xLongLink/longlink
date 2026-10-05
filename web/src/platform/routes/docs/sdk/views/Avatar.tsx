import ViewLayout from './ViewLayout';
import { Avatar } from '@/components/ui/Avatar';

/** Documents Avatar in LongLink Views. */
export default function AvatarPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Avatar"
            examples={[
                {
                    title: 'Avatar',
                    preview: <AvatarExample />,
                    code: `function Example() {
  return <Avatar name="Ada Lovelace" />;
}`,
                },
            ]}
        />
    );
}

/** Renders the page's avatar example for documentation and the catalog. */
export function AvatarExample() {
    // Display the sample user's generated avatar.
    return <Avatar name="Ada Lovelace" size="lg" />;
}
