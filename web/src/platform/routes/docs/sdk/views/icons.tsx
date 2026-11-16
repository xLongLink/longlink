import ViewLayout from './view-layout';
import { Icon } from '@/components/longlink/display/icon';

/** Documents Icon in LongLink Views. */
export default function IconsPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Icon"
            properties={[
                { name: 'icon', type: 'IconName', description: 'Lucide kebab-case icon name.' },
                { name: 'size', type: '"sm" | "md" | "lg"', description: 'Glyph size and optional tile size.' },
                { name: 'tile', type: '"outline" | "elevated" | "soft" | "solid" | "frame"' },
                { name: 'variant', type: '"primary" | "secondary" | "outline" | "destructive"' }
            ]}
            example={{
                title: 'Icon',
                preview: <IconExample />,
                code: `function Example() {
  const icons = [
    'search', 'info', 'check', 'triangle-exclamation-point',
    'calendar', 'clock', 'users', 'database',
    'copy', 'upload', 'trash', 'wrench'
  ];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="grid w-full grid-cols-[repeat(2,max-content)] justify-center gap-6 p-4 sm:grid-cols-[repeat(3,max-content)] xl:grid-cols-[repeat(4,max-content)]">
        {icons.map((icon) => (
          <div key={icon} className="flex items-center justify-center gap-4">
            {['sm', 'md', 'lg'].map((size) => (
              <Icon key={size} icon={icon} size={size} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {['outline', 'elevated', 'soft', 'solid', 'frame'].map((tile) => (
          <Icon key={tile} icon="sparkles" size="lg" tile={tile} />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {['primary', 'secondary', 'outline', 'destructive'].map((variant) => (
          <Icon key={variant} icon="sparkles" size="lg" tile="soft" variant={variant} />
        ))}
      </div>
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
        'triangle-exclamation-point',
        'calendar',
        'clock',
        'users',
        'database',
        'copy',
        'upload',
        'trash',
        'wrench'
    ] as const;

    // Compare every supported size across a responsive grid of icons.
    return (
        <div className="flex flex-col items-center gap-6">
            <div className="grid w-full grid-cols-[repeat(2,max-content)] justify-center gap-6 p-4 sm:grid-cols-[repeat(3,max-content)] xl:grid-cols-[repeat(4,max-content)]">
                {icons.map((icon) => (
                    <div key={icon} className="flex items-center justify-center gap-4">
                        {(['sm', 'md', 'lg'] as const).map((size) => (
                            <Icon key={size} icon={icon} size={size} />
                        ))}
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
                {(['outline', 'elevated', 'soft', 'solid', 'frame'] as const).map((tile) => (
                    <Icon key={tile} icon="sparkles" size="lg" tile={tile} />
                ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
                {(['primary', 'secondary', 'outline', 'destructive'] as const).map((variant) => (
                    <Icon key={variant} icon="sparkles" size="lg" tile="soft" variant={variant} />
                ))}
            </div>
        </div>
    );
}
