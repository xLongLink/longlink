import { ReportedError } from '@/lib/reported';
import { isCanceledRequest } from '@/lib/errors';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/longlink/action/button';
import { Alert, AlertDescription } from '@/components/reui/alert';
import {
    Children,
    isValidElement,
    useEffect,
    useEffectEvent,
    useRef,
    useState,
    type ReactElement,
    type ReactNode
} from 'react';
import {
    Stepper,
    StepperDescription,
    StepperIndicator,
    StepperItem,
    StepperNav,
    StepperSeparator,
    StepperTitle
} from '@/components/reui/stepper';

type StepProps = {
    label: string;
    /** React Hook Form field paths validated before leaving this step. */
    fields?: string[];
    description?: string;
    /** Persistent wizard panel content. */
    children?: ReactNode;
};

type WizardProps = {
    children?: ReactNode;
    activeStep?: number;
    orientation?: 'horizontal' | 'vertical';
    /** Receives wizard selection changes. */
    onStepClick?: (index: number) => void;
    /** Bounds a wizard, keeping progress above its independently scrollable panels. */
    height?: number | string;
    showProgress?: boolean;
    /** Runs a step-specific action after validation; false prevents advancement. */
    next?: (step: number) => { label: string; action: () => void | boolean | Promise<void | boolean> } | undefined;
    onCancel?: () => void;
    finalAction?: ReactNode;
    backVariant?: 'outline' | 'ghost';
};

/** Keeps drafts mounted and validates declared step fields through React Hook Form. */
export function Wizard(props: WizardProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const pending = useRef(false);
    const navigation = useRef(0);
    const form = useFormContext();
    const invalidField = useRef<string | undefined>(undefined);
    const lastSubmit = useRef(0);
    const subscribe = form?.subscribe;
    const submitting = form?.formState.isSubmitting ?? false;
    const [selection, setSelection] = useState(0);
    const [advancing, setAdvancing] = useState(false);
    const [error, setError] = useState<string>();

    // Derive panel order from direct Step children.
    const steps = Children.toArray(props.children).filter(
        (child): child is ReactElement<StepProps> => isValidElement<StepProps>(child) && child.type === Step
    );

    const activeStep = Math.max(0, Math.min(props.activeStep ?? selection, Math.max(steps.length - 1, 0)));
    const next = activeStep < steps.length - 1 ? props.next?.(activeStep) : undefined;
    const previousStep = useRef(activeStep);

    /** Updates local navigation and notifies a controlled caller. */
    function select(index: number) {
        setSelection(index);
        props.onStepClick?.(index);
    }

    // Move keyboard focus with navigation without stealing it when a wizard first mounts.
    useEffect(() => {
        if (invalidField.current && form && !advancing && !submitting) {
            form.setFocus(invalidField.current);
            invalidField.current = undefined;
        } else if (previousStep.current !== activeStep) {
            rootRef.current?.querySelector<HTMLElement>(`[data-step-panel="${activeStep}"]`)?.focus();
        }

        previousStep.current = activeStep;
    }, [activeStep, advancing, form, submitting]);

    // Final validation can fail in a hidden step; reveal it before asking RHF to focus its registered control.
    const revealInvalid = useEffectEvent(() => {
        if (!form) return;
        const index = steps.findIndex((step) => step.props.fields?.some((name) => form.getFieldState(name).invalid));
        const name = steps[index]?.props.fields?.find((name) => form.getFieldState(name).invalid);

        if (index >= 0 && name) {
            invalidField.current = name;
            select(index);
        }
    });

    useEffect(
        () =>
            subscribe?.({
                formState: { submitCount: true },
                callback: ({ submitCount, isSubmitting }) => {
                    if (isSubmitting || submitCount === undefined || submitCount === lastSubmit.current) return;
                    lastSubmit.current = submitCount;
                    revealInvalid();
                }
            }),
        [subscribe]
    );

    /** Validates before running intermediate work, retaining drafts on failure. */
    async function advance() {
        if (pending.current || submitting || activeStep >= steps.length - 1) return;
        pending.current = true;
        const request = ++navigation.current;

        setAdvancing(true);
        setError(undefined);

        // Keep asynchronous domain checks separate from final form submission.
        try {
            const fields = steps[activeStep]?.props.fields;

            const valid = !form || !fields?.length || (await form.trigger(fields));

            if (request !== navigation.current) return;

            if (!valid && form && fields) {
                invalidField.current = fields.find((name) => form.getFieldState(name).invalid);

                return;
            }

            const result = await next?.action();

            if (request === navigation.current && result !== false) select(activeStep + 1);
        } catch (failure) {
            if (request !== navigation.current || failure instanceof ReportedError || isCanceledRequest(failure)) {
                return;
            }

            const message = failure instanceof Error ? failure.message : 'Could not continue';

            setError(message);
        } finally {
            if (request === navigation.current) {
                pending.current = false;
                setAdvancing(false);
            }
        }
    }

    // Enter advances intermediate panels; the last panel submits through React Hook Form.
    const interceptSubmit = useEffectEvent((event: SubmitEvent) => {
        if (event.defaultPrevented) return;

        if (pending.current || submitting || activeStep < steps.length - 1) {
            event.preventDefault();
            event.stopPropagation();
            void advance();
        }
    });

    const reset = useEffectEvent((event: Event) => {
        queueMicrotask(() => {
            if (!event.defaultPrevented) {
                navigation.current += 1;
                pending.current = false;
                setAdvancing(false);
                select(0);
                setError(undefined);
            }
        });
    });

    // Bind only to the owning form and panel tree, and remove every listener on unmount.
    useEffect(() => {
        const root = rootRef.current;
        const form = root?.closest('form');

        form?.addEventListener('submit', interceptSubmit, true);
        form?.addEventListener('reset', reset);

        return () => {
            navigation.current += 1;
            pending.current = false;
            form?.removeEventListener('submit', interceptSubmit, true);
            form?.removeEventListener('reset', reset);
        };
    }, []);

    // Progress never renders panel children a second time.
    const progress = (
        <Stepper value={activeStep + 1} orientation={props.orientation} role="group" aria-orientation={undefined}>
            <StepperNav aria-label="Progress">
                {steps.map((child, index) => (
                    <StepperItem
                        key={child.key}
                        step={index + 1}
                        aria-current={index === activeStep ? 'step' : undefined}
                    >
                        <div className="flex items-center gap-2.5">
                            <StepperIndicator aria-hidden="true">{index + 1}</StepperIndicator>
                            <div className="flex min-w-0 flex-col gap-1">
                                <StepperTitle>{child.props.label}</StepperTitle>
                                {child.props.description && (
                                    <StepperDescription>{child.props.description}</StepperDescription>
                                )}
                                {index < activeStep && <span className="sr-only">completed</span>}
                            </div>
                        </div>
                        {index < steps.length - 1 && <StepperSeparator />}
                    </StepperItem>
                ))}
            </StepperNav>
        </Stepper>
    );

    const content = (
        <div className="flex min-w-0 flex-col gap-4">
            {steps.map((child, index) => (
                <fieldset
                    key={child.key}
                    data-step-panel={index}
                    hidden={index !== activeStep}
                    disabled={advancing || submitting}
                    className="m-0 min-w-0 border-0 p-0"
                    aria-label={child.props.label}
                    tabIndex={-1}
                >
                    <div className="flex min-w-0 flex-col gap-3">{child.props.children}</div>
                </fieldset>
            ))}
            <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                    {props.onCancel && (
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={advancing || submitting}
                            onClick={props.onCancel}
                        >
                            Cancel
                        </Button>
                    )}
                    {(!props.onCancel || activeStep > 0) && (
                        <Button
                            variant={props.backVariant ?? 'outline'}
                            type="button"
                            disabled={advancing || submitting || activeStep === 0}
                            onClick={() => select(activeStep - 1)}
                        >
                            Back
                        </Button>
                    )}
                </div>
                {activeStep < steps.length - 1 ? (
                    <Button
                        variant="default"
                        type="button"
                        onClick={() => {
                            void advance();
                        }}
                        disabled={advancing || submitting}
                    >
                        {next?.label ?? 'Next'}
                    </Button>
                ) : (
                    props.finalAction && (
                        <fieldset disabled={submitting} className="contents">
                            {props.finalAction}
                        </fieldset>
                    )
                )}
            </div>
            <div className="contents" aria-live="assertive" aria-atomic="true">
                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );

    // Reuse the same persistent panels in inline and bounded wizard frames.
    return (
        <div
            ref={rootRef}
            style={{ height: props.height }}
            className={`flex min-h-0 min-w-0 flex-col${props.height === undefined ? '' : ' overflow-hidden'}`}
            data-stepper-wizard=""
        >
            {props.height === undefined ? (
                <div className="flex min-w-0 flex-col gap-4">
                    {props.showProgress !== false && progress}
                    {content}
                </div>
            ) : (
                <>
                    {props.showProgress !== false && <div className="shrink-0 px-8 py-4">{progress}</div>}
                    <div
                        className={`min-h-0 flex-1 overflow-auto px-8 pb-8${props.showProgress === false ? ' pt-8' : ''}`}
                    >
                        <div className="mx-auto flex min-h-full w-full max-w-160 flex-col justify-center">
                            {content}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/** Declares one persistent Wizard panel and its validation fields. */
export function Step(props: StepProps) {
    return props.children;
}
