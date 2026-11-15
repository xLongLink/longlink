import * as slider from '@/components/shadcn/slider';
import { viewComponent, type ViewProps } from '../props';

export const Slider: <Value extends number | readonly number[]>(
    props: ViewProps<Parameters<typeof slider.Slider<Value>>[0]>
) => ReturnType<typeof slider.Slider> = slider.Slider;

export const SliderControl = viewComponent(slider.SliderControl);

export const SliderTrack = viewComponent(slider.SliderTrack);

export const SliderRange = viewComponent(slider.SliderRange);

export const SliderThumb = viewComponent(slider.SliderThumb);
