import { Icon } from './Icon';
import { Button } from './Button';
import { flushSync } from 'react-dom';
import { ReportedError } from '@/lib/reported';
import { FormValidationContext } from './contexts';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button as NavigationButton } from '@/components/shadcn/button';
import {
    Stepper as ReuiStepper,
    StepperDescription,
    StepperIndicator,
    StepperItem,
    StepperSeparator,
    StepperTitle,
    StepperTrigger,
} from '@/components/reui/stepper';

export {
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
} from '@/components/reui/stepper';

export type {
    StepperProps,
    StepperContentProps,
    StepperItemProps,
    StepperTriggerProps,
} from '@/components/reui/stepper';

import {
    Children,
    cloneElement,
    createContext,
    isValidElement,
    useContext,
    useEffect,
    useEffectEvent,
    useId,
    useRef,
    useState,
    type ReactElement,
    type ReactNode,
} from 'react';

const ProgressContext = createContext<{
    activeStep: number;
    compact: boolean;
    onStepClick?: ProgressStepperProps['onStepClick'];
}>({ activeStep: 0, compact: false });

type StepProps = {
    /** Zero-based progress index; defaults to child order inside ProgressStepper. */
    step?: number;
    label: string;
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

/** Displays responsive zero-based progress with optional step activation. */
export function ProgressStepper(props: ProgressStepperProps) {
    return (
        <Progress
            activeStep={props.activeStep ?? 0}
            orientation={props.orientation ?? 'horizontal'}
            onStepClick={props.onStepClick}
        >
            {Children.map(props.children, (child, index) =>
                isValidElement<StepProps>(child) && child.type === Step
                    ? cloneElement(child, { step: child.props.step ?? index })
                    : child
            )}
        </Progress>
    );
}

/** Collapses horizontal labels only when each step has less than its original 112px allocation. */
function Progress({ children, activeStep = 0, orientation = 'horizontal', onStepClick }: ProgressStepperProps) {
    const listRef = useRef<HTMLOListElement>(null);
    const [compact, setCompact] = useState(false);

    // Observe the actual list constraint rather than the viewport or an ancestor.
    useEffect(() => {
        const list = listRef.current;

        if (!list || orientation !== 'horizontal') return;

        const observer = new ResizeObserver(() => {
            const count = list.children.length;
            setCompact(list.clientWidth > 0 && list.clientWidth < count * 112);
        });

        observer.observe(list);

        return () => observer.disconnect();
    }, [orientation]);

    const collapsed = orientation === 'horizontal' && compact;

    const steps = Children.toArray(children).filter(
        (child): child is ReactElement<StepProps> => isValidElement<StepProps>(child) && child.type === Step
    );

    steps.sort((left, right) => (left.props.step ?? 0) - (right.props.step ?? 0));

    const current = steps.find((child) => child.props.step === activeStep);
    const previous = [...steps].reverse().find((child) => (child.props.step ?? 0) < activeStep)?.props.step;
    const next = steps.find((child) => (child.props.step ?? 0) > activeStep)?.props.step;

    return (
        <ProgressContext value={{ activeStep, compact: collapsed, onStepClick }}>
            <ReuiStepper
                value={activeStep + 1}
                onValueChange={(value) => onStepClick?.(value - 1)}
                orientation={orientation}
                indicators={{ completed: <Check aria-hidden="true" className="size-3.5" /> }}
                role="group"
                aria-orientation={undefined}
                className="view-stepper"
            >
                <ol ref={listRef} className="view-stepper-list" aria-label="Progress">
                    {children}
                </ol>
                {collapsed && (
                    <div className="view-stepper-summary">
                        {onStepClick && (
                            <NavigationButton
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Previous step"
                                disabled={previous === undefined}
                                onClick={() => previous !== undefined && onStepClick(previous)}
                            >
                                <ChevronLeft aria-hidden="true" size={16} />
                            </NavigationButton>
                        )}
                        <div className="view-stepper-summary-body" aria-hidden="true">
                            <span>{current?.props.label}</span>
                            {current?.props.description && (
                                <span className="view-step-description">{current.props.description}</span>
                            )}
                        </div>
                        {onStepClick && (
                            <NavigationButton
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Next step"
                                disabled={next === undefined}
                                onClick={() => next !== undefined && onStepClick(next)}
                            >
                                <ChevronRight aria-hidden="true" size={16} />
                            </NavigationButton>
                        )}
                    </div>
                )}
            </ReuiStepper>
        </ProgressContext>
    );
}

/** Keeps wizard drafts mounted and delegates field validation to an enclosing Form. */
export function Wizard(props: WizardProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const pending = useRef(false);
    const validate = useContext(FormValidationContext);
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

    // Move keyboard focus with navigation without stealing it when a wizard first mounts.
    useEffect(() => {
        if (previousStep.current !== activeStep) {
            rootRef.current?.querySelector<HTMLElement>(`[data-step-panel="${activeStep}"]`)?.focus();
            previousStep.current = activeStep;
        }
    }, [activeStep]);

    /** Updates local navigation and notifies a controlled caller. */
    function select(index: number) {
        setSelection(index);
        props.onStepClick?.(index);
    }

    /** Validates before running intermediate work, retaining drafts on failure. */
    async function advance() {
        if (pending.current || activeStep >= steps.length - 1) return;
        const panel = rootRef.current?.querySelector<HTMLElement>(`[data-step-panel="${activeStep}"]`);

        if (!panel || (validate && !validate(panel))) return;
        pending.current = true;

        // Button actions run in a transition; lock drafts before the domain action can suspend it.
        flushSync(() => {
            setAdvancing(true);
            setError(undefined);
        });

        // Keep asynchronous domain checks separate from final Form submission.
        try {
            const result = await next?.action();

            if (result !== false) select(activeStep + 1);
        } catch (failure) {
            if (failure instanceof ReportedError) return;
            const message = failure instanceof Error ? failure.message : 'Could not continue';

            setError(message);
        } finally {
            pending.current = false;
            setAdvancing(false);
        }
    }

    // Enter advances intermediate panels, while the last panel's explicit submit button belongs to Form.
    const interceptSubmit = useEffectEvent((event: SubmitEvent) => {
        if (event.defaultPrevented) return;

        if (pending.current || activeStep < steps.length - 1) {
            event.preventDefault();
            void advance();
        }
    });

    const reveal = useEffectEvent((event: Event) => {
        const panel = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-step-panel]') : null;

        if (panel && panel.closest('[data-stepper-wizard]') === rootRef.current) {
            select(Number(panel.dataset.stepPanel));
        }
    });

    const reset = useEffectEvent((event: Event) => {
        queueMicrotask(() => {
            if (!event.defaultPrevented) {
                select(0);
                setError(undefined);
            }
        });
    });

    // Bind only to the owning form and panel tree, and remove every listener on unmount.
    useEffect(() => {
        const root = rootRef.current;
        const form = root?.closest('form');

        root?.addEventListener('longlink:reveal', reveal);
        form?.addEventListener('submit', interceptSubmit, true);
        form?.addEventListener('reset', reset);

        return () => {
            root?.removeEventListener('longlink:reveal', reveal);
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
        <div className="view-wizard-content">
            {steps.map((child, index) => (
                <fieldset
                    key={child.key}
                    data-step-panel={index}
                    hidden={index !== activeStep}
                    disabled={advancing}
                    className="m-0 min-w-0 border-0 p-0"
                    aria-label={child.props.label}
                    tabIndex={-1}
                >
                    <div className="view-wizard-fields">{child.props.children}</div>
                </fieldset>
            ))}
            <div className="view-wizard-controls">
                <div className="view-wizard-back">
                    {props.onCancel && (
                        <Button variant="ghost" disabled={advancing} onClick={props.onCancel}>
                            Cancel
                        </Button>
                    )}
                    {(!props.onCancel || activeStep > 0) && (
                        <Button
                            variant={props.backVariant ?? 'outline'}
                            disabled={advancing || activeStep === 0}
                            onClick={() => select(activeStep - 1)}
                        >
                            Back
                        </Button>
                    )}
                </div>
                {activeStep < steps.length - 1 ? (
                    <Button variant="default" onClick={advance} disabled={advancing}>
                        {next?.label ?? 'Next'}
                    </Button>
                ) : (
                    props.finalAction
                )}
            </div>
            <div className="view-wizard-announcement" aria-live="assertive" aria-atomic="true">
                {error && (
                    <div className="view-wizard-error">
                        <Icon icon="error" size="md" />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </div>
    );

    // Reuse the same persistent panels in inline and bounded wizard frames.
    return (
        <div
            ref={rootRef}
            style={{ height: props.height }}
            className="view-wizard"
            data-bounded={props.height !== undefined || undefined}
            data-stepper-wizard=""
        >
            {props.height === undefined ? (
                <div className="view-wizard-content">
                    {progress}
                    {content}
                </div>
            ) : (
                <>
                    <div className="view-wizard-header">{progress}</div>
                    <div className="view-wizard-scroll">
                        <div className="view-wizard-body">{content}</div>
                    </div>
                </>
            )}
        </div>
    );
}

/** Defines progress metadata and, in wizard mode, one persistent content panel. */
export function Step(props: StepProps) {
    const { activeStep, compact, onStepClick } = useContext(ProgressContext);
    const id = useId();
    const index = props.step ?? 0;
    const state = index < activeStep ? 'completed' : index === activeStep ? 'active' : 'upcoming';

    const label = (
        <>
            <span aria-hidden="true">
                <StepperIndicator>{index + 1}</StepperIndicator>
            </span>
            <span className={compact ? 'sr-only' : 'flex min-w-0 flex-col gap-1'}>
                <StepperTitle className="break-words">{props.label}</StepperTitle>
                {props.description && <StepperDescription>{props.description}</StepperDescription>}
                {state === 'completed' && <span className="sr-only">completed</span>}
            </span>
        </>
    );

    return (
        <li className="view-step" data-state={state} aria-current={state === 'active' ? 'step' : undefined}>
            <StepperItem step={index + 1} className="relative min-w-0 flex-col items-stretch justify-start gap-2">
                {onStepClick && !compact ? (
                    <StepperTrigger
                        id={id}
                        type="button"
                        role="button"
                        aria-selected={undefined}
                        aria-controls={undefined}
                        tabIndex={0}
                        className="view-step-target"
                    >
                        {label}
                    </StepperTrigger>
                ) : (
                    <div className="view-step-target">{label}</div>
                )}
                {props.children && (
                    <div className="view-step-content" hidden={compact}>
                        {props.children}
                    </div>
                )}
                <StepperSeparator className="view-step-separator group-data-[state=completed]/step:bg-primary" />
            </StepperItem>
        </li>
    );
}
