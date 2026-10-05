import ViewLayout from './ViewLayout';

/** Documents ProgressBar in LongLink Views. */
export default function ProgressBarPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="ProgressBar"
            examples={[
                {
                    title: 'ProgressBar',
                    code: `function Example() {
  return <ProgressBar label="Progress" value={60} max={100} hasValueLabel />;
}`,
                },
            ]}
        />
    );
}
