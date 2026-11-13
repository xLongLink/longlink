import { useValue } from './value';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import { useDirection } from '@base-ui/react/direction-provider';
import { useEffect, useEffectEvent, useId, useRef } from 'react';
import { FieldContent, FieldDescription, FieldTitle } from '@/components/shadcn/field';
import { Slider as SliderRoot, SliderControl, SliderTrack, SliderRange, SliderThumb } from '@/components/shadcn/slider';

type SliderGesture = { pointerId: number; committed: boolean };

type SliderProps = FieldProps & {
    min?: number;
    max?: number;
    step?: number;
} & (
        | {
              value?: number;
              defaultValue?: number;
              onChange?: (value: number) => void;
              onChangeEnd?: (value: number) => void;
          }
        | {
              value?: [number, number];
              defaultValue?: [number, number];
              onChange?: (value: [number, number]) => void;
              onChangeEnd?: (value: [number, number]) => void;
              minStepsBetweenThumbs?: number;
          }
    );

/** Tuple-valued inputs select the range slider and its corresponding callbacks. */
function isRangeSlider(props: SliderProps): props is Extract<SliderProps, { value?: [number, number] }> {
    // Use the supplied value contract rather than inspecting callback signatures.
    return Array.isArray(props.value) || Array.isArray(props.defaultValue);
}

/** Edits a number or range using a standard horizontal slider. */
export function Slider(props: SliderProps) {
    // Slider carriers already preserve repeated names; local state only adapts uncontrolled editing.
    const { ref, value, onChange } = useValue<number | [number, number]>(
        props.value,
        props.defaultValue ?? props.min ?? 0,
        (value) => {
            if (isRangeSlider(props)) {
                if (Array.isArray(value)) props.onChange?.(value);
            } else if (!Array.isArray(value)) {
                props.onChange?.(value);
            }
        }
    );

    const id = useId();
    const direction = useDirection();
    const gesture = useRef<SliderGesture | null>(null);
    const min = props.min ?? 0;
    const max = props.max ?? 100;
    const step = props.step ?? 1;

    const values = (Array.isArray(value) ? value : [value])
        .map((current) => Math.min(Math.max(current, min), max))
        .sort((first, second) => first - second);

    const normalized: number | [number, number] = Array.isArray(value) ? [values[0], values[1]] : values[0];

    // Pointer completion reads the accepted render, while keyboard commits may report a proposed edit.
    function commit(next: number | [number, number] = normalized) {
        if (props.disabled || ref.current?.closest('fieldset:disabled')) return;

        if (isRangeSlider(props)) {
            if (Array.isArray(next)) props.onChangeEnd?.(next);
        } else if (!Array.isArray(next)) props.onChangeEnd?.(next);
    }

    // Base UI omits commits for unchanged gestures; finish those once after its release handler.
    const completeGesture = useEffectEvent((active: SliderGesture) => {
        if (gesture.current !== active) return;
        gesture.current = null;

        if (!active.committed) commit();
    });

    // An interrupted or unmounted control must not retain document listeners or pending completion callbacks.
    useEffect(() => {
        const document = ref.current?.ownerDocument;

        if (!document) return;

        const finish = (release: PointerEvent) => {
            const active = gesture.current;

            if (!active || release.pointerId !== active.pointerId) return;
            queueMicrotask(() => completeGesture(active));
        };

        document.addEventListener('pointerup', finish);
        document.addEventListener('pointercancel', finish);

        return () => {
            document.removeEventListener('pointerup', finish);
            document.removeEventListener('pointercancel', finish);
            gesture.current = null;
        };
    }, [ref]);

    // Keep disabled sliders discoverable; reject edits without disabling their native focus targets.
    return (
        <FormField {...props} fieldRef={ref} values={values.map(String)} serialize>
            <SliderRoot
                className="view-slider flex min-w-0 flex-col gap-1 font-sans"
                data-disabled={props.disabled || undefined}
                value={normalized}
                onValueChange={(next, details) => {
                    if (props.disabled || ref.current?.closest('fieldset:disabled')) {
                        details.cancel();

                        return;
                    }

                    onChange(next);
                }}
                onValueCommitted={(next, details) => {
                    if (details.reason === 'drag' || details.reason === 'track-press') {
                        if (gesture.current) gesture.current.committed = true;

                        commit();

                        return;
                    }

                    commit(next);
                }}
                min={min}
                max={max}
                step={step}
                largeStep={step * 10}
                minStepsBetweenValues={isRangeSlider(props) ? props.minStepsBetweenThumbs : undefined}
                thumbCollisionBehavior="none"
                thumbAlignment="edge"
                aria-labelledby={`${id}-label`}
                aria-describedby={props.description ? `${id}-description` : undefined}
                aria-disabled={props.disabled || undefined}
            >
                <FieldContent>
                    <FieldTitle id={`${id}-label`}>
                        {props.label}
                        {props.required && (
                            <span className="text-muted-foreground font-normal">
                                <span aria-hidden="true"> · </span>Required
                            </span>
                        )}
                    </FieldTitle>
                    {props.description && (
                        <FieldDescription id={`${id}-description`}>{props.description}</FieldDescription>
                    )}
                </FieldContent>
                <SliderControl
                    className="view-slider-control"
                    data-disabled={props.disabled || undefined}
                    onPointerDownCapture={(event) => {
                        if (props.disabled || event.currentTarget.closest('fieldset:disabled')) {
                            event.preventDefault();
                            event.stopPropagation();

                            return;
                        }

                        if (event.button !== 0 || gesture.current) return;
                        gesture.current = {
                            pointerId: event.pointerId,
                            committed: false,
                        };
                    }}
                >
                    <SliderTrack>
                        <SliderRange />
                    </SliderTrack>
                    {values.map((current, index) => (
                        <SliderThumb
                            key={index === 0 ? 'start' : 'end'}
                            index={index}
                            className="view-slider-thumb group"
                            aria-label={
                                Array.isArray(value) ? (index === 0 ? 'Minimum value' : 'Maximum value') : undefined
                            }
                            aria-labelledby={!Array.isArray(value) ? `${id}-label` : undefined}
                            aria-describedby={props.description ? `${id}-description` : undefined}
                            onKeyDown={(event) => {
                                if (props.disabled || event.currentTarget.closest('fieldset:disabled')) {
                                    if (event.key !== 'Tab') event.preventDefault();

                                    return;
                                }

                                if (!isRangeSlider(props) || !props.minStepsBetweenThumbs) return;
                                const gap = props.minStepsBetweenThumbs * step;
                                const towardMax = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
                                const towardMin = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
                                const increasing = [towardMax, 'ArrowUp', 'PageUp'].includes(event.key);
                                const decreasing = [towardMin, 'ArrowDown', 'PageDown'].includes(event.key);

                                if (!increasing && !decreasing) return;
                                const increment = event.shiftKey || event.key.startsWith('Page') ? step * 10 : step;
                                const snapped = min + Math.round((values[index] - min) / step) * step;

                                const proposed = Math.min(
                                    max,
                                    Math.max(min, snapped + (increasing ? increment : -increment))
                                );

                                const boundary = index === 0 ? values[1] - gap : values[0] + gap;

                                // Only intercept increments that Base UI would reject for crossing the minimum gap.
                                if (index === 0 ? proposed <= boundary : proposed >= boundary) return;
                                event.preventDefault();
                                const endpoint = Math.min(max, Math.max(min, boundary));

                                if (endpoint === values[index]) return;

                                const next: [number, number] =
                                    index === 0 ? [endpoint, values[1]] : [values[0], endpoint];

                                onChange(next);
                                commit(next);
                            }}
                        >
                            <span
                                className="view-slider-value pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap bg-foreground px-2 py-1 text-sm text-background group-hover:block group-focus-within:block group-data-dragging:block"
                                aria-hidden="true"
                            >
                                {current}
                            </span>
                        </SliderThumb>
                    ))}
                </SliderControl>
            </SliderRoot>
        </FormField>
    );
}
