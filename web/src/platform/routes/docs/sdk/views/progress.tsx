import ViewLayout from './view-layout';
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
