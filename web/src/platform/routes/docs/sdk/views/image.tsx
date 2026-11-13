import ViewLayout from './view-layout';
import { Image } from '@/components/custom/image';
import photo from '../../../../../../../sdk/longlink/.static/new/src/assets/skyline.jpg?inline';

/** Documents scoped images and optional framing in LongLink Views. */
export default function ImagePage() {
    // Show a bundled photo alongside the scoped asset path used by Solutions.
    return (
        <ViewLayout
            name="Image"
            properties={[
                { name: 'src', type: 'string', description: 'Scoped Solution image path, or an image data/blob URL.' },
                { name: 'alt', type: 'string', description: 'Accessible description of the photo.' },
                {
                    name: 'ratio',
                    type: 'number',
                    description: 'Optional frame ratio; omitted images retain intrinsic proportions.'
                }
            ]}
            example={{
                title: 'Card photo',
                preview: <Image src={photo} alt="Skyline office towers" ratio={16 / 9} />,
                code: `function Example() {
  return <Image src="/assets/skyline.jpg" alt="Skyline office towers" ratio={16 / 9} />;
}`
            }}
        />
    );
}
