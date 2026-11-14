import { cn } from 'cn';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';

function Slider<Value extends number | readonly number[]>({
    className,
    defaultValue,
    value,
    min = 0,
    max = 100,
    children,
    ...props
}: SliderPrimitive.Root.Props<Value>) {
    const _values = Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max];

    return (
        <SliderPrimitive.Root
            className={cn('data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full', className)}
            data-slot="slider"
            defaultValue={defaultValue}
            value={value}
            min={min}
            max={max}
            thumbAlignment="edge"
            {...props}
        >
            {children ?? (
                <SliderControl>
                    <SliderTrack>
                        <SliderRange />
                    </SliderTrack>
                    {Array.from({ length: _values.length }, (_, index) => (
                        <SliderThumb key={index} />
                    ))}
                </SliderControl>
            )}
        </SliderPrimitive.Root>
    );
}

function SliderControl({ className, ...props }: SliderPrimitive.Control.Props) {
    return (
        <SliderPrimitive.Control
            className={cn(
                'relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
                className
            )}
            {...props}
        />
    );
}

function SliderTrack({ className, ...props }: SliderPrimitive.Track.Props) {
    return (
        <SliderPrimitive.Track
            data-slot="slider-track"
            className={cn(
                'relative grow overflow-hidden rounded-full bg-muted select-none data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1',
                className
            )}
            {...props}
        />
    );
}

function SliderRange({ className, ...props }: SliderPrimitive.Indicator.Props) {
    return (
        <SliderPrimitive.Indicator
            data-slot="slider-range"
            className={cn(
                'bg-primary select-none data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full',
                className
            )}
            {...props}
        />
    );
}

function SliderThumb({ className, ...props }: SliderPrimitive.Thumb.Props) {
    return (
        <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            className={cn(
                'relative block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 transition-colors select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50',
                className
            )}
            {...props}
        />
    );
}

export { Slider, SliderControl, SliderTrack, SliderRange, SliderThumb };
