import ViewLayout from './ViewLayout';
import { Step, Stepper } from '@/components/ui/Stepper';

/** Documents Stepper in LongLink Views. */
export default function StepperPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Stepper"
            examples={[
                {
                    title: 'Stepper',
                    preview: <StepperExample />,
                    code: `function Example() {
  return (
    <Stepper activeStep={1}>
      <Step step={0} label="Details" />
      <Step step={1} label="Review" />
      <Step step={2} label="Complete" />
    </Stepper>
  );
}`,
                },
            ]}
        />
    );
}

/** Renders the page's stepper example for documentation and the catalog. */
export function StepperExample({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
    // Show the review stage in a three-step process.
    return (
        <Stepper activeStep={1} orientation={orientation}>
            <Step step={0} label="Details" />
            <Step step={1} label="Review" />
            <Step step={2} label="Complete" />
        </Stepper>
    );
}
