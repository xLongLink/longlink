import ViewLayout from './ViewLayout';
import { ProgressBar } from '@/components/ui/ProgressBar';

/** Documents ProgressBar in LongLink Views. */
export default function ProgressBarPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="ProgressBar"
            introduction={'Displays determinate or indeterminate progress with a semantic state.'}
            properties={[
                {
                    name: 'label',
                    type: 'string',
                    description: 'Accessible label.',
                },
                {
                    name: 'value',
                    type: 'number',
                    description: 'Current value (ignored when indeterminate).',
                },
                {
                    name: 'max',
                    type: 'number',
                    description: 'Maximum value.',
                },
                {
                    name: 'hasValueLabel',
                    type: 'boolean',
                    description: 'Show formatted value text (ignored when indeterminate).',
                },
                {
                    name: 'formatValueLabel',
                    type: '(value: number, max: number) => string',
                    description: 'Formats usage counts or units instead of the default percentage.',
                },
                {
                    name: 'variant',
                    type: '"success" | "error" | "warning" | "accent" | "neutral"',
                    description: 'Semantic color variant.',
                },
                {
                    name: 'marks',
                    type: 'readonly { value: number; label: string; }[]',
                    description: 'Labeled target marks on the 0-to-max scale, hidden when indeterminate.',
                },
                {
                    name: 'isDisabled',
                    type: 'boolean',
                    description:
                        'Visually disabled state: grays out the fill and text. Use for canceled or inactive operations.',
                },
                {
                    name: 'isLabelHidden',
                    type: 'boolean',
                    description: 'Visually hide the label (remains accessible).',
                },
                {
                    name: 'isIndeterminate',
                    type: 'boolean',
                    description: 'Animated loading indicator for unknown progress.',
                },
            ]}
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
