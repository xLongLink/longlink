import ViewLayout from './ViewLayout';
import references from '@/lib/generated/components.json';

// Preserve LongLink's standardized calendar selection and presentation contract.
const upstream = references.find((reference) => reference.name === 'Calendar');
if (!upstream) throw new Error('Missing Calendar documentation reference');
const reference = {
    introduction:
        'Calendar selects a date or date range with standardized LongLink presentation: one month for single dates, two for ranges, Sunday-first weeks, adjacent-month days, and a fixed six-row grid without week numbers. Keep selection in View state with value and onChange. Calendar manages month navigation internally.',
    properties: upstream.properties
        .filter(
            (property) =>
                ![
                    'numberOfMonths',
                    'hasOutsideDays',
                    'hasWeekNumbers',
                    'hasVariableRowCount',
                    'weekStartsOn',
                    'handleRef',
                    'defaultValue',
                    'focusDate',
                    'onFocusDateChange',
                ].includes(property.name)
        )
        .map((property) =>
            property.name === 'onChange'
                ? {
                      ...property,
                      type: '((value: ISODateString) => void) | ((value: DateRange) => void)',
                      description:
                          'Receives only the selected ISO date string in single mode, or the start/end ISO date range in range mode. Update value with the result.',
                  }
                : property
        ),
    practices: upstream.practices.filter(
        (practice) => !practice.description.startsWith('Show two months side by side')
    ),
};

/** Documents Calendar in LongLink Views. */
export default function CalendarPage() {
    // Render the LongLink calendar contract and controlled selection example.
    return (
        <ViewLayout
            name="Calendar"
            reference={reference}
            examples={[
                {
                    title: 'Calendar',
                    code: `function Example() {
  const [value, setValue] = useState('2026-10-02');

  return <Calendar value={value} onChange={setValue} />;
}`,
                },
            ]}
        />
    );
}
