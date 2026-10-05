import ViewLayout, { type ViewReference } from './ViewLayout';

// Describe all three card behaviors using the shared public props.
const reference: ViewReference = {
    introduction:
        'Card has one shared set of props. onChange makes it selectable, onClick or href makes it clickable, and otherwise it is a plain content card. Selection takes priority when both kinds of interaction props are supplied.',
    properties: [
        { name: 'children', type: 'ViewNode', description: 'Content rendered inside the card.' },
        {
            name: 'label',
            type: 'string',
            description: 'Accessible label for interactive cards. Supply a descriptive label; defaults to Card.',
        },
        {
            name: 'onClick',
            type: '(event: ViewMouseEvent) => void',
            description:
                'Makes the card clickable. Runs when the card surface is activated; nested controls act independently.',
        },
        { name: 'href', type: 'string', description: 'Makes the card a navigation target when onChange is absent.' },
        { name: 'target', type: 'string', description: 'Link target, such as _blank.' },
        {
            name: 'isSelected',
            type: 'boolean',
            description: 'Selection state, defaulting to false. Supply onChange to let users toggle it.',
        },
        {
            name: 'onChange',
            type: '(isSelected: boolean) => void',
            description:
                'Makes the card selectable and receives its next selection state. Takes priority over onClick and href.',
        },
        { name: 'isDisabled', type: 'boolean', description: 'Disables activation of an interactive card.' },
        { name: 'padding', type: 'Spacing', description: 'Inner spacing using the theme spacing scale.' },
        {
            name: 'variant',
            type: "'default' | 'transparent' | 'muted' | 'blue' | 'cyan' | 'gray' | 'green' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow'",
            description: 'Background color variant, independent of the interaction mode.',
        },
        { name: 'width', type: 'number | string', description: 'Card width.' },
        { name: 'height', type: 'number | string', description: 'Card height.' },
        { name: 'maxWidth', type: 'number | string', description: 'Maximum card width.' },
        { name: 'minHeight', type: 'number | string', description: 'Minimum card height.' },
    ],
    practices: [
        {
            guidance: true,
            description:
                'Use plain cards for independent content, clickable cards for actions or navigation, and selectable cards for choices.',
        },
        {
            guidance: true,
            description:
                'Give interactive cards a descriptive label and keep selectable state in the parent component.',
        },
        {
            guidance: false,
            description: 'Use onClick to toggle selection, or mix navigation and selection on the same card.',
        },
    ],
};

/** Documents plain, clickable, and selectable cards. */
export default function CardPage() {
    // Render the card contract alongside each supported interaction mode.
    return (
        <ViewLayout
            name="Card"
            reference={reference}
            examples={[
                {
                    title: 'Plain card',
                    code: `function Example() {
  return (
    <Card padding={3}>
      <Text>Order details</Text>
    </Card>
  );
}`,
                },
                {
                    title: 'Clickable card',
                    code: `function Example() {
  return (
    <Card label="View order" href="/orders/123">
      <Text>View order</Text>
    </Card>
  );
}`,
                },
                {
                    title: 'Selectable card',
                    code: `function Example() {
  const [selected, setSelected] = useState(false);

  return (
    <Card label="Team plan" isSelected={selected} onChange={setSelected}>
      <Text>Team plan</Text>
    </Card>
  );
}`,
                },
            ]}
        />
    );
}
