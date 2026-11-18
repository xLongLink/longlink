import ViewLayout from './view-layout';
import { Box } from '@/components/longlink/layout/box';
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
                    <Box width="80%">
                        <Image src={photo} alt="Skyline office towers" ratio={16 / 9} />
                    </Box>
                ),
                code: `function Example() {
  return (
    <Box width="80%">
      <Image src="/assets/skyline.jpg" alt="Skyline office towers" ratio={16 / 9} />
    </Box>
  );
}`
            }}
        />
    );
}
