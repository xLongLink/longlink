import ViewLayout from './ViewLayout';
import { ProgressBar } from '@/components/ui/ProgressBar';

/** Documents ProgressBar in LongLink Views. */
export default function ProgressBarPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="ProgressBar"
            examples={[
                {
                    title: 'ProgressBar',
                    preview: <ProgressBarExample />,
                    code: `function Example() {
  return <ProgressBar label="Progress" value={60} max={100} hasValueLabel />;
}`,
                },
            ]}
        />
    );
}

/** Renders the page's progress example for documentation and the catalog. */
export function ProgressBarExample() {
    // Display sample completion progress with its value label.
    return <ProgressBar label="Progress" value={60} hasValueLabel />;
}
