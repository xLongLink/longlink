import ViewLayout from './ViewLayout';
import { Image } from '@/components/ui/Image';
import photo from '../../../../../../../sdk/longlink/.static/new/src/assets/skyline.jpg?inline';

/** Documents landscape photos in LongLink Views. */
export default function ImagePage() {
    // Show a bundled photo alongside the scoped asset path used by Solutions.
    return (
        <ViewLayout
            name="Image"
            introduction="Displays scoped Solution images. Photos keep a full-width landscape frame; logos use compact square tiles and contain the full artwork. Both use the host's scoped preview capability and release object URLs when unmounted."
            properties={[
                {
                    name: 'src',
                    type: 'string',
                    description: 'Scoped Solution image path, or an image data/blob URL.',
                },
                {
                    name: 'alt',
                    type: 'string',
                    description: 'Accessible description of the photo.',
                },
                {
                    name: 'variant',
                    type: '"photo" | "logo" | "flag"',
                    description:
                        'Full-width landscape photo, contained square logo, or padded waving flag tile. Flags preserve their proportions and remain still when reduced motion is preferred. Defaults to photo.',
                },
                {
                    name: 'size',
                    type: '"sm" | "md" | "lg"',
                    description: 'Logo or flag tile size. Defaults to md; ignored for photos.',
                },
            ]}
            example={{
                title: 'Card photo',
                preview: <Image src={photo} alt="Skyline office towers" />,
                code: `function Example() {
  return <Image src="/assets/skyline.jpg" alt="Skyline office towers" />;
}`,
            }}
        />
    );
}
