import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Slider } from '@/components/ui/Slider';

/** Documents Slider in LongLink Views. */
export default function SliderPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Slider"
            examples={[
                {
                    title: 'Slider',
                    preview: <SliderExample />,
                    code: `function Example() {
  const [value, setValue] = useState(60);

  return (
    <Slider
      label="Progress"
      value={value}
      onChange={setValue}
      min={0}
      max={100}
    />
  );
}`,
                },
            ]}
        />
    );
}

/** Keeps slider progress local to this example. */
export function SliderExample() {
    const [value, setValue] = useState(60);

    // Retain pointer and keyboard changes to the progress value.
    return <Slider label="Progress" value={value} width="100%" onChange={setValue} isLabelHidden />;
}
