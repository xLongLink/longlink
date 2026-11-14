import ViewLayout from './view-layout';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/shadcn/avatar';
import photo from '../../../../../../../sdk/longlink/.static/new/src/assets/skyline.jpg?inline';

/** Documents native Avatar composition in LongLink Views. */
export default function AvatarPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Avatar"
            properties={[
                { name: 'size', type: '"sm" | "default" | "lg"', description: 'Avatar size; defaults to default.' },
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Compose AvatarImage, AvatarFallback, and AvatarBadge.'
                },
                { name: 'AvatarImage.src', type: 'string', description: 'Image source URL.' },
                { name: 'AvatarImage.alt', type: 'string', description: 'Accessible image description.' },
                {
                    name: 'AvatarImage.onLoadingStatusChange',
                    type: '(status: "idle" | "loading" | "loaded" | "error") => void',
                    description: 'Receives image loading status changes.'
                },
                {
                    name: 'AvatarFallback.children',
                    type: 'ReactNode',
                    description: 'Content shown when the image is unavailable.'
                },
                {
                    name: 'AvatarFallback.delay',
                    type: 'number',
                    description: 'Delay in milliseconds before showing the fallback.'
                },
                {
                    name: 'AvatarGroup.children',
                    type: 'ReactNode',
                    description: 'Avatars and an optional AvatarGroupCount.'
                }
            ]}
            example={{
                title: 'Avatar',
                preview: <AvatarExample />,
                code: `function Example() {
  return (
    <Avatar size="lg">
      <AvatarImage src="/assets/skyline.jpg" alt="Skyline office towers" />
      <AvatarFallback>SL</AvatarFallback>
    </Avatar>
  );
}`
            }}
        />
    );
}

/** Renders the page's avatar example for documentation and the catalog. */
export function AvatarExample() {
    // Keep the preview self-contained while showing native image and fallback composition.
    return (
        <Avatar size="lg">
            <AvatarImage src={photo} alt="Skyline office towers" />
            <AvatarFallback>SL</AvatarFallback>
        </Avatar>
    );
}
