import ViewLayout from './ViewLayout';
import { Stack } from '@/components/ui/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Step, Stepper } from '@/components/ui/Stepper';

/** Documents Stepper in LongLink Views. */
export default function StepperPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Stepper"
            isLongLinkSpecific
            introduction="Displays progress by default. Set variant to wizard to show one persistent Step panel at a time with Next/Back navigation. Inside Form, Next validates the current panel and shared fields; only an explicit submit Button in the last Step submits all fields. Outside Form, wizard navigation works independently without submitting data. Set height to pin progress above centered, scrollable panels."
            properties={[
                {
                    name: 'variant',
                    type: '"progress" | "wizard"',
                    description: 'Defaults to progress. Wizard mode owns persistent panels and Next/Back navigation.',
                },
                {
                    name: 'height',
                    type: 'number | string',
                    description: 'Bounds a wizard, pinning progress above its scrollable panels.',
                },
                {
                    name: 'next',
                    type: '(step: number) => { label: string; action: () => void | boolean | Promise<void | boolean> } | undefined',
                    description: 'Runs intermediate work after validation. Returning false prevents advancement.',
                },
                {
                    name: 'onCancel',
                    type: '() => void',
                    description: 'Adds a Cancel action to wizard navigation.',
                },
                {
                    name: 'backVariant',
                    type: '"secondary" | "ghost"',
                    description: 'Wizard Back button appearance; defaults to secondary.',
                },
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Step elements to render in the stepper.',
                },
                {
                    name: 'activeStep',
                    type: 'number',
                    description: 'Zero-based active index. Wizard mode manages selection internally when omitted.',
                },
                {
                    name: 'orientation',
                    type: '"horizontal" | "vertical"',
                    description: 'Layout direction of the stepper.',
                },
                {
                    name: 'onStepClick',
                    type: '(index: number) => void',
                    description: 'Enables progress step activation, or receives wizard selection changes.',
                },
                {
                    name: 'Step.step',
                    type: 'number',
                    description: 'Optional progress index; defaults to child order. Wizards always use child order.',
                },
                {
                    name: 'Step.label',
                    type: 'string',
                    description: 'Visible label identifying the step.',
                },
                {
                    name: 'Step.description',
                    type: 'string',
                    description: 'Supporting text displayed below the step label.',
                },
                {
                    name: 'Step.children',
                    type: 'ReactNode',
                    description: 'Persistent panel content in wizard mode; inline content in progress mode.',
                },
            ]}
            example={{
                title: 'Stepper',
                preview: (
                    <Stack gap={8}>
                        <StepperExample />
                        <Stepper variant="wizard">
                            <Step label="Details">
                                <Text>Enter your workflow details.</Text>
                            </Step>
                            <Step label="Review">
                                <Text>Review before continuing.</Text>
                            </Step>
                            <Step label="Complete">
                                <Text>Your workflow is complete.</Text>
                            </Step>
                        </Stepper>
                    </Stack>
                ),
                code: `function Example() {
  return (
    <Stepper variant="wizard">
      <Step label="Details"><Text>Enter your workflow details.</Text></Step>
      <Step label="Review"><Text>Review before continuing.</Text></Step>
      <Step label="Complete"><Text>Your workflow is complete.</Text></Step>
    </Stepper>
  );
}`,
            }}
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
