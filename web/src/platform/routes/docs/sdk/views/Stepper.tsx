import ViewLayout from './ViewLayout';
import {
    Stepper,
    StepperContent,
    StepperIndicator,
    StepperItem,
    StepperNav,
    StepperPanel,
    StepperSeparator,
    StepperTitle,
    StepperTrigger
} from '@/components/ui/Stepper';

/** Documents the installed ReUI Stepper composition. */
export default function StepperPage() {
    return (
        <ViewLayout
            name="Stepper"
            properties={[
                {
                    name: 'value / defaultValue',
                    type: 'number',
                    description: 'Controlled or initial step value. defaultValue defaults to 1.'
                },
                {
                    name: 'onValueChange',
                    type: '(value: number) => void',
                    description: 'Receives trigger activation. Keyboard arrows move focus without activating.'
                },
                {
                    name: 'orientation',
                    type: '"horizontal" | "vertical"',
                    description: 'Navigation direction; defaults to horizontal.'
                },
                {
                    name: 'indicators',
                    type: '{ active?: ReactNode; completed?: ReactNode; inactive?: ReactNode; loading?: ReactNode }',
                    description: 'Overrides indicator content for each step state.'
                },
                {
                    name: 'StepperItem',
                    type: 'step: number; completed?: boolean; disabled?: boolean; loading?: boolean',
                    description: 'Supplies step state to its compound children.'
                },
                {
                    name: 'StepperTrigger.render',
                    type: 'ReactElement | render function',
                    description: 'Base UI render composition for the activation control.'
                },
                {
                    name: 'StepperContent',
                    type: 'value: number; forceMount?: boolean',
                    description: 'Shows the matching value. forceMount keeps inactive content mounted and hidden.'
                }
            ]}
            example={{
                title: 'Stepper',
                preview: <StepperExample />,
                code: `<Stepper defaultValue={1} className="flex max-w-md flex-col gap-8">
  <StepperNav aria-label="Process">
    <StepperItem step={1}>
      <StepperTrigger><StepperIndicator>1</StepperIndicator><StepperTitle>Details</StepperTitle></StepperTrigger>
      <StepperSeparator />
    </StepperItem>
    <StepperItem step={2}>
      <StepperTrigger><StepperIndicator>2</StepperIndicator><StepperTitle>Review</StepperTitle></StepperTrigger>
      <StepperSeparator />
    </StepperItem>
    <StepperItem step={3}>
      <StepperTrigger><StepperIndicator>3</StepperIndicator><StepperTitle>Complete</StepperTitle></StepperTrigger>
    </StepperItem>
  </StepperNav>
  <StepperPanel className="text-sm">
    <StepperContent value={1}>Enter details.</StepperContent>
    <StepperContent value={2}>Review details.</StepperContent>
    <StepperContent value={3}>Complete the process.</StepperContent>
  </StepperPanel>
</Stepper>`
            }}
        />
    );
}

/** Renders the installed compound API for documentation and the catalog. */
export function StepperExample({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
    return (
        <Stepper defaultValue={1} orientation={orientation} className="flex max-w-md flex-col gap-8">
            <StepperNav aria-label="Process">
                {['Details', 'Review', 'Complete'].map((label, index) => (
                    <StepperItem key={label} step={index + 1}>
                        <StepperTrigger>
                            <StepperIndicator>{index + 1}</StepperIndicator>
                            <StepperTitle>{label}</StepperTitle>
                        </StepperTrigger>
                        {index < 2 && <StepperSeparator />}
                    </StepperItem>
                ))}
            </StepperNav>
            <StepperPanel className="text-sm">
                <StepperContent value={1}>Enter details.</StepperContent>
                <StepperContent value={2}>Review details.</StepperContent>
                <StepperContent value={3}>Complete the process.</StepperContent>
            </StepperPanel>
        </Stepper>
    );
}
