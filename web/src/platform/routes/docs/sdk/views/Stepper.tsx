import ViewLayout from './ViewLayout';
import { Stack } from '@/components/ui/Stack';
import { NativeText as Text } from '@/components/ui/NativeText';
import {
    Step,
    Stepper,
    StepperContent,
    StepperDescription,
    StepperIndicator,
    StepperItem,
    StepperNav,
    StepperPanel,
    StepperSeparator,
    StepperTitle,
    StepperTrigger,
    Wizard,
} from '@/components/ui/Stepper';

/** Documents the installed ReUI Stepper and explicitly custom flow components. */
export default function StepperPage() {
    return (
        <ViewLayout
            name="Stepper"
            properties={[
                {
                    name: 'value / defaultValue',
                    type: 'number',
                    description: 'Controlled or initial step value. defaultValue defaults to 1.',
                },
                {
                    name: 'onValueChange',
                    type: '(value: number) => void',
                    description: 'Receives trigger activation. Keyboard arrows move focus without activating.',
                },
                {
                    name: 'orientation',
                    type: '"horizontal" | "vertical"',
                    description: 'Navigation direction; defaults to horizontal.',
                },
                {
                    name: 'indicators',
                    type: '{ active?: ReactNode; completed?: ReactNode; inactive?: ReactNode; loading?: ReactNode }',
                    description: 'Overrides indicator content for each step state.',
                },
                {
                    name: 'StepperItem',
                    type: 'step: number; completed?: boolean; disabled?: boolean; loading?: boolean',
                    description: 'Supplies step state to its compound children.',
                },
                {
                    name: 'StepperTrigger.render',
                    type: 'ReactElement | render function',
                    description: 'Base UI render composition for the activation control.',
                },
                {
                    name: 'StepperContent',
                    type: 'value: number; forceMount?: boolean',
                    description: 'Shows the matching value. forceMount keeps inactive content mounted and hidden.',
                },
                {
                    name: 'ProgressStepper',
                    type: 'activeStep?: number; orientation?: "horizontal" | "vertical"; onStepClick?: (index: number) => void',
                    description: 'Custom responsive progress using Step children and zero-based indices.',
                },
                {
                    name: 'Wizard',
                    type: 'activeStep?: number; onStepClick?: (index: number) => void; orientation?: "horizontal" | "vertical"; height?: number | string',
                    description:
                        'Custom persistent Step panels. Selection is internal unless activeStep is supplied; height bounds the scrollable panels.',
                },
                {
                    name: 'Wizard.next',
                    type: '(step: number) => { label: string; action: () => void | boolean | Promise<void | boolean> } | undefined',
                    description: 'Runs after validation. false or a failure prevents advancement and retains drafts.',
                },
                {
                    name: 'Wizard navigation',
                    type: 'onCancel?: () => void; finalAction?: ReactNode; backVariant?: "outline" | "ghost"',
                    description: 'Optional cancel and final controls. Back defaults to outline.',
                },
                {
                    name: 'Step',
                    type: 'label: string; description?: string; step?: number; children?: ReactNode',
                    description:
                        'Custom progress metadata or a persistent Wizard panel. Progress indices default to child order; Wizard always uses child order.',
                },
            ]}
            example={{
                title: 'Stepper',
                preview: (
                    <Stack gap={8}>
                        <StepperExample />
                        <Wizard>
                            <Step label="Details">
                                <Text>Enter your workflow details.</Text>
                            </Step>
                            <Step label="Review">
                                <Text>Review before continuing.</Text>
                            </Step>
                        </Wizard>
                    </Stack>
                ),
                code: `<Stepper defaultValue={1}>
  <StepperNav>
    <StepperItem step={1}>
      <StepperTrigger><StepperIndicator>1</StepperIndicator><StepperTitle>Details</StepperTitle></StepperTrigger>
      <StepperSeparator />
    </StepperItem>
    <StepperItem step={2}>
      <StepperTrigger><StepperIndicator>2</StepperIndicator><StepperTitle>Review</StepperTitle></StepperTrigger>
    </StepperItem>
  </StepperNav>
  <StepperPanel>
    <StepperContent value={1}>Enter details.</StepperContent>
    <StepperContent value={2}>Review details.</StepperContent>
  </StepperPanel>
</Stepper>`,
            }}
        />
    );
}

/** Renders the installed compound API for documentation and the catalog. */
export function StepperExample({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
    return (
        <Stepper defaultValue={2} orientation={orientation}>
            <StepperNav aria-label="Process">
                {['Details', 'Review', 'Complete'].map((label, index) => (
                    <StepperItem key={label} step={index + 1}>
                        <StepperTrigger>
                            <StepperIndicator>{index + 1}</StepperIndicator>
                            <span className="flex flex-col gap-1">
                                <StepperTitle>{label}</StepperTitle>
                                <StepperDescription>Step {index + 1}</StepperDescription>
                            </span>
                        </StepperTrigger>
                        {index < 2 && <StepperSeparator />}
                    </StepperItem>
                ))}
            </StepperNav>
            <StepperPanel>
                <StepperContent value={1}>Enter details.</StepperContent>
                <StepperContent value={2}>Review details.</StepperContent>
                <StepperContent value={3}>Complete the process.</StepperContent>
            </StepperPanel>
        </Stepper>
    );
}
