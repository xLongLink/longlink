import ViewLayout from './ViewLayout';
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar';

export default function AvatarPage() {
    return (
        <ViewLayout
            name="Avatar"
            properties={[
                { name: 'children', type: 'ReactNode', description: 'Compose AvatarImage and AvatarFallback.' },
                { name: 'AvatarImage.src', type: 'string', description: 'Image source URL.' },
                { name: 'AvatarImage.alt', type: 'string', description: 'Accessible image description.' },
                {
                    name: 'AvatarFallback.children',
                    type: 'ReactNode',
                    description: 'Content shown when the image is unavailable.'
                }
            ]}
            example={{
                title: 'Avatar',
                preview: <AvatarExample />,
                code: `<Avatar>
  <AvatarFallback>AC</AvatarFallback>
</Avatar>`
            }}
        />
    );
}

export function AvatarExample() {
    return (
        <Avatar>
            <AvatarFallback>AC</AvatarFallback>
        </Avatar>
    );
}
