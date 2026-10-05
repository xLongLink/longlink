import ViewLayout from './ViewLayout';

/** Documents Stepper in LongLink Views. */
export default function StepperPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Stepper"
            examples={[
                {
                    title: 'Stepper',
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
