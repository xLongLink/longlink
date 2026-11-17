import ViewLayout from './view-layout';
import { Image } from '@/components/longlink/display/image';
import photo from '../../../../../../../sdk/longlink/.static/new/src/assets/skyline.jpg?inline';

/** Documents scoped images and optional framing in LongLink Views. */
export default function ImagePage() {
    // Show a bundled photo alongside the scoped asset path used by Solutions.
    return (
        <ViewLayout
            name="Image"
            properties={[
                { name: 'src', type: 'string' },
                { name: 'alt', type: 'string' },
                { name: 'ratio', type: 'number' }
            ]}
            example={{
                title: 'Card photo',
                preview: (
                    <div className="w-4/5">
                        <Image src={photo} alt="Skyline office towers" ratio={16 / 9} />
                    </div>
                ),
                code: `function Example() {
  return (
    <div className="w-4/5">
      <Image src="/assets/skyline.jpg" alt="Skyline office towers" ratio={16 / 9} />
    </div>
  );
}`
            }}
        />
    );
}
