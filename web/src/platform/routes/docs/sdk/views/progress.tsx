import ViewLayout from './view-layout';
import { Box } from '@/components/longlink/layout/box';
import { Progress } from '@/components/longlink/display/progress';

/** Documents Progress in LongLink Views. */
export default function ProgressPage() {
    return (
        <ViewLayout
            name="Progress"
            properties={[
                { name: 'value', type: 'number | null' },
                { name: 'max', type: 'number' },
                { name: 'label', type: 'ReactNode' },
                { name: 'showValue', type: 'boolean' },
                { name: 'valueText', type: 'ReactNode' }
            ]}
            example={{
                title: 'Progress',
                preview: <ProgressExample />,
                code: `function Example() {
  return (
    <Box width="100%" maxWidth="24rem">
      <Progress
        value={60}
        label="Uploading files"
        valueText={<span><strong>60</strong> / 100 files</span>}
      />
    </Box>
  );
}`
            }}
        />
    );
}

/** Renders labeled progress for the documentation catalog. */
export function ProgressExample() {
    return (
        <Box width="100%" maxWidth="24rem">
            <Progress
                value={60}
                label="Uploading files"
                valueText={
                    <span>
                        <strong>60</strong> / 100 files
                    </span>
                }
            />
        </Box>
    );
}
