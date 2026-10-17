import { Stack } from './Stack';
import { Children, isValidElement, type ReactNode } from 'react';
import { Stepper as AstryxStepper, Step as AstryxStep } from '@astryxdesign/core/Stepper';

/** Displays the current step using standard progress indicators. */
export function Stepper({
    activeStep = 0,
    children,
    ...props
}: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    children?: ReactNode;
    activeStep?: number;
    orientation?: 'horizontal' | 'vertical';
    /** Enables step activation and receives the clicked step's zero-based index. */
    onStepClick?: (index: number) => void;
}) {
    // Compact horizontal steppers render the active label outside the individual step's element.
    const activeStepHidden = Children.toArray(children).some(
        (child) =>
            isValidElement<Parameters<typeof Step>[0]>(child) &&
            child.type === Step &&
            child.props.step === activeStep &&
            child.props.hidden
    );

    // Vertical steps place their actions after the label and description, wrapping below them when space runs out.
    const verticalStepLayout =
        '[&>li>:last-child]:flex-row [&>li>:last-child]:flex-wrap [&>li>:last-child]:items-center [&>li>:last-child>:first-child]:grow [&>li>:last-child>:first-child]:basis-48 [&>li>:last-child>:nth-child(2)]:ms-auto';

    // Show horizontal progress unless a vertical flow is requested.
    return (
        <AstryxStepper
            {...props}
            className={
                props.hidden
                    ? 'hidden!'
                    : props.orientation === 'vertical'
                      ? verticalStepLayout
                      : activeStepHidden
                        ? '[&_.astryx-stepper-summary]:hidden!'
                        : undefined
            }
            activeStep={activeStep}
            orientation={props.orientation ?? 'horizontal'}
        >
            {children}
        </AstryxStepper>
    );
}

/** Defines the label, description, index, and actions of a step. */
export function Step({
    actions,
    ...props
}: {
    /** Hides the step indicator and label without changing its index. */
    hidden?: boolean;
    /** Zero-based index of this step in the process. */
    step: number;
    /** Visible label identifying the step. */
    label: string;
    /** Supporting text displayed below the step label. */
    description?: string;
    /** Right-aligned controls for this step in vertical steppers; using them never activates the step. Compact horizontal steppers hide them. */
    actions?: ReactNode;
}) {
    // Render actions in the content slot, which Astryx keeps outside the step's activation button.
    // Conditional actions such as `{!approved && <Button />}` leave no empty slot behind.
    return (
        <AstryxStep {...props} className={props.hidden ? 'hidden!' : undefined}>
            {actions ? (
                <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                    {actions}
                </Stack>
            ) : undefined}
        </AstryxStep>
    );
}
