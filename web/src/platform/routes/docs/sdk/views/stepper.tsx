import ViewLayout from './view-layout';
import {
    Stepper,
    StepperContent,
    StepperIndicator,
    StepperItem,
    StepperNav,
    StepperPanel,
    StepperSeparator,
    StepperTrigger
} from '@/components/reui/stepper';

const steps = [1, 2, 3, 4];

export function StepperExample() {
    return (
        <Stepper defaultValue={2} className="w-full max-w-md space-y-8">
            <StepperNav>
                {steps.map((step) => (
                    <StepperItem key={step} step={step}>
                        <StepperTrigger aria-label={`Step ${step}`}>
                            <StepperIndicator>{step}</StepperIndicator>
                        </StepperTrigger>
                        {steps.length > step && (
                            <StepperSeparator className="group-data-[state=completed]/step:bg-primary" />
                        )}
                    </StepperItem>
                ))}
            </StepperNav>

            <StepperPanel className="text-sm">
                {steps.map((step) => (
                    <StepperContent key={step} value={step} className="flex items-center justify-center">
                        Step {step} content
                    </StepperContent>
                ))}
            </StepperPanel>
        </Stepper>
    );
}

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
                code: `const steps = [1, 2, 3, 4];

<Stepper defaultValue={2} className="w-full max-w-md space-y-8">
  <StepperNav>
    {steps.map((step) => (
      <StepperItem key={step} step={step}>
        <StepperTrigger aria-label={\`Step \${step}\`}>
          <StepperIndicator>{step}</StepperIndicator>
        </StepperTrigger>
        {steps.length > step && (
          <StepperSeparator className="group-data-[state=completed]/step:bg-primary" />
        )}
      </StepperItem>
    ))}
  </StepperNav>
  <StepperPanel className="text-sm">
    {steps.map((step) => (
      <StepperContent key={step} value={step} className="flex items-center justify-center">
        Step {step} content
      </StepperContent>
    ))}
  </StepperPanel>
</Stepper>`
            }}
        />
    );
}
