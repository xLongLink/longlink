import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { cn } from '@/lib/utils';

function Slider({
    className,
    defaultValue,
    orientation = 'horizontal',
    value,
    min = 0,
    max = 100,
    ...props
}: SliderPrimitive.Root.Props) {
    const _values = Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max];

    return (
        <SliderPrimitive.Root
            className={cn(orientation === 'vertical' ? 'h-full' : 'w-full', className)}
            data-slot="slider"
            defaultValue={defaultValue}
            value={value}
            min={min}
            max={max}
            orientation={orientation}
            thumbAlignment="edge"
            {...props}
        >
            <SliderPrimitive.Control
                className={cn(
                    'relative flex cursor-pointer touch-none items-center select-none data-disabled:cursor-not-allowed data-disabled:opacity-50',
                    orientation === 'vertical' ? 'h-full min-h-40 w-auto flex-col' : 'w-full'
                )}
            >
                <SliderPrimitive.Track
                    data-slot="slider-track"
                    className={cn(
                        'relative grow overflow-hidden rounded-full bg-muted select-none',
                        orientation === 'vertical' ? 'h-full w-1' : 'h-1 w-full'
                    )}
                >
                    <SliderPrimitive.Indicator
                        data-slot="slider-range"
                        className={cn('bg-primary select-none', orientation === 'vertical' ? 'w-full' : 'h-full')}
                    />
                </SliderPrimitive.Track>
                {Array.from({ length: _values.length }, (_, index) => (
                    <SliderPrimitive.Thumb
                        data-slot="slider-thumb"
                        key={index}
                        className="relative block size-3 shrink-0 cursor-pointer rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
                    />
                ))}
            </SliderPrimitive.Control>
        </SliderPrimitive.Root>
    );
}

export { Slider };
