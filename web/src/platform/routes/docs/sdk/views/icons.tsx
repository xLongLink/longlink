import ViewLayout from './view-layout';
import { Icon } from '@/components/custom/icon';

/** Documents Icon in LongLink Views. */
export default function IconsPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Icon"
            properties={[
                {
                    name: 'icon',
                    type: 'StoneIconName',
                    description: 'Lucide icon name or LongLink alias; prefix with lucide: to bypass aliases.'
                },
                {
                    name: 'size',
                    type: '"sm" | "md" | "lg"',
                    description: 'Icon size; inherits the parent default or falls back to md.'
                }
            ]}
            example={{
                title: 'Icon',
                preview: <IconExample />,
                code: `function Example() {
  const icons = [
    'search', 'info', 'check', 'warning',
    'calendar', 'clock', 'users', 'database',
    'copy', 'upload', 'trash', 'wrench'
  ];

  return (
    <div className="grid w-full grid-cols-[repeat(2,max-content)] justify-center gap-6 p-4 sm:grid-cols-[repeat(3,max-content)] xl:grid-cols-[repeat(4,max-content)]">
      {icons.map((icon) => (
        <div key={icon} className="flex items-center justify-center gap-4">
          {['sm', 'md', 'lg'].map((size) => (
            <Icon key={size} icon={icon} size={size} />
          ))}
        </div>
      ))}
    </div>
  );
}`
            }}
        />
    );
}

/** Renders the page's icon example for documentation and the catalog. */
export function IconExample() {
    const icons = [
        'search',
        'info',
        'check',
        'warning',
        'calendar',
        'clock',
        'users',
        'database',
        'copy',
        'upload',
        'trash',
        'wrench'
    ] as const;

    // Compare every supported size across a responsive grid of bundled icons.
    return (
        <div className="grid w-full grid-cols-[repeat(2,max-content)] justify-center gap-6 p-4 sm:grid-cols-[repeat(3,max-content)] xl:grid-cols-[repeat(4,max-content)]">
            {icons.map((icon) => (
                <div key={icon} className="flex items-center justify-center gap-4">
                    {(['sm', 'md', 'lg'] as const).map((size) => (
                        <Icon key={size} icon={icon} size={size} />
                    ))}
                </div>
            ))}
        </div>
    );
}
