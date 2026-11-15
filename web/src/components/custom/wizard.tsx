import { ReportedError } from '@/lib/reported';
import { isCanceledRequest } from '@/lib/errors';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/shadcn/button';
import { Alert, AlertDescription } from '@/components/reui/alert';
import {
    Stepper,
    StepperDescription,
    StepperIndicator,
    StepperItem,
    StepperNav,
    StepperSeparator,
    StepperTitle,
    StepperTrigger
} from '@/components/reui/stepper';
import {
    Children,
    cloneElement,
    createContext,
    isValidElement,
    useContext,
    useEffect,
    useEffectEvent,
    useRef,
    useState,
    type ReactElement,
    type ReactNode
} from 'react';

const ProgressContext = createContext<{ activeStep: number; onStepClick?: ProgressStepperProps['onStepClick'] }>({
    activeStep: 0
});

type StepProps = {
    /** Zero-based progress index; defaults to child order inside ProgressStepper. */
    step?: number;
    label: string;
    /** React Hook Form field paths validated before leaving this step. */
    fields?: string[];
    description?: string;
    /** Persistent panel content in wizard mode; inline content in progress mode. */
    children?: ReactNode;
};

type ProgressStepperProps = {
    children?: ReactNode;
    activeStep?: number;
    orientation?: 'horizontal' | 'vertical';
    /** Enables progress step activation. */
    onStepClick?: (index: number) => void;
};

type WizardProps = Omit<ProgressStepperProps, 'onStepClick'> & {
    /** Receives wizard selection changes. */
    onStepClick?: (index: number) => void;
    /** Bounds a wizard, keeping progress above its independently scrollable panels. */
    height?: number | string;
    /** Runs a step-specific action after validation; false prevents advancement. */
    next?: (step: number) => { label: string; action: () => void | boolean | Promise<void | boolean> } | undefined;
    onCancel?: () => void;
    finalAction?: ReactNode;
    backVariant?: 'outline' | 'ghost';
};

/** Adapts zero-based LongLink progress metadata to ReUI's compound stepper. */
export function ProgressStepper(props: ProgressStepperProps) {
    return (
        <ProgressContext value={{ activeStep: props.activeStep ?? 0, onStepClick: props.onStepClick }}>
            <Stepper
                value={(props.activeStep ?? 0) + 1}
                onValueChange={(value) => props.onStepClick?.(value - 1)}
                orientation={props.orientation}
                role="group"
                aria-orientation={undefined}
            >
                <StepperNav aria-label="Progress">
                    {Children.map(props.children, (child, index) =>
                        isValidElement<StepProps>(child) && child.type === Step
                            ? cloneElement(child, { step: child.props.step ?? index })
                            : child
                    )}
                </StepperNav>
            </Stepper>
        </ProgressContext>
    );
}

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

    // Derive panel order from direct Step children, not author-supplied progress indices.
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
        <ProgressStepper activeStep={activeStep} orientation={props.orientation ?? 'horizontal'}>
            {steps.map((child, index) => (
                <Step key={child.key} step={index} label={child.props.label} description={child.props.description} />
            ))}
        </ProgressStepper>
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
                    {progress}
                    {content}
                </div>
            ) : (
                <>
                    <div className="shrink-0 px-8 py-4">{progress}</div>
                    <div className="min-h-0 flex-1 overflow-auto px-8 pb-8">
                        <div className="mx-auto flex min-h-full w-full max-w-160 flex-col justify-center">
                            {content}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/** Defines progress metadata and, in wizard mode, one persistent content panel. */
export function Step(props: StepProps) {
    const { activeStep, onStepClick } = useContext(ProgressContext);
    const index = props.step ?? 0;
    const state = index < activeStep ? 'completed' : index === activeStep ? 'active' : 'upcoming';

    const label = (
        <>
            <span aria-hidden="true">
                <StepperIndicator>{index + 1}</StepperIndicator>
            </span>
            <span className="flex min-w-0 flex-col gap-1">
                <StepperTitle>{props.label}</StepperTitle>
                {props.description && <StepperDescription>{props.description}</StepperDescription>}
                {state === 'completed' && <span className="sr-only">completed</span>}
            </span>
        </>
    );

    return (
        <StepperItem step={index + 1} aria-current={state === 'active' ? 'step' : undefined}>
            <div className="flex min-w-0 flex-col gap-2">
                {onStepClick ? (
                    <StepperTrigger
                        type="button"
                        role="button"
                        aria-selected={undefined}
                        aria-controls={undefined}
                        tabIndex={0}
                    >
                        {label}
                    </StepperTrigger>
                ) : (
                    <div className="inline-flex items-center gap-2.5">{label}</div>
                )}
                {props.children && <div>{props.children}</div>}
            </div>
            <StepperSeparator className="group-last/step:hidden" />
        </StepperItem>
    );
}
