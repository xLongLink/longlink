import ViewLayout from './view-layout';
import { Progress } from '@/components/longlink/display/progress';

/** Documents Progress in LongLink Views. */
export default function ProgressPage() {
    return (
        <ViewLayout
            name="Progress"
            properties={[
                { name: 'value', type: 'number | null', description: 'Current value; null means indeterminate.' },
                { name: 'max', type: 'number', description: 'Maximum value; defaults to 100.' },
                {
                    name: 'label',
                    type: 'ReactNode',
                    description: 'Custom text or JSX displayed on the left above the bar.'
                },
                { name: 'showValue', type: 'boolean', description: 'Shows the formatted value; defaults to false.' },
                {
                    name: 'valueText',
                    type: 'ReactNode',
                    description: 'Custom text or JSX displayed on the right instead of the percentage.'
                }
            ]}
            example={{
                title: 'Progress',
                preview: <ProgressExample />,
                code: `function Example() {
  return (
    <div className="w-full max-w-sm">
      <Progress
        value={60}
        label="Uploading files"
        valueText={<span><strong>60</strong> / 100 files</span>}
      />
    </div>
  );
}`
            }}
        />
    );
}

/** Renders labeled progress for the documentation catalog. */
export function ProgressExample() {
    return (
        <div className="w-full max-w-sm">
            <Progress
                value={60}
                label="Uploading files"
                valueText={
                    <span>
                        <strong>60</strong> / 100 files
                    </span>
                }
            />
        </div>
    );
}
