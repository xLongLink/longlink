import ViewLayout from './ViewLayout';
import { Image } from '@/components/ui/Image';
import photo from '../../../../../../../sdk/longlink/.static/new/src/assets/skyline.jpg?inline';

/** Documents landscape photos in LongLink Views. */
export default function ImagePage() {
    // Show a bundled photo alongside the scoped asset path used by Solutions.
    return (
        <ViewLayout
            name="Image"
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
