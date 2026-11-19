import { useState } from 'react';
import ViewLayout from './view-layout';
import { Box, Card, Button, AreaChart } from '@/components/longlink';

const requests = [
    { month: 'Jan', requests: 1842 },
    { month: 'Feb', requests: 2167 },
    { month: 'Mar', requests: 1935 },
    { month: 'Apr', requests: 2841 },
    { month: 'May', requests: 2596 },
    { month: 'Jun', requests: 3284 }
];

/** Documents the standalone Card and its optional surface interactions. */
export default function CardPage() {
    return (
        <ViewLayout
            name="Card"
            example={{
                title: 'Card',
                preview: <CardExample />,
                code: `function Example() {
  const [months, setMonths] = useState(6);
  const requests = [
    { month: 'Jan', requests: 1842 },
    { month: 'Feb', requests: 2167 },
    { month: 'Mar', requests: 1935 },
    { month: 'Apr', requests: 2841 },
    { month: 'May', requests: 2596 },
    { month: 'Jun', requests: 3284 },
  ];
  const data = requests.slice(-months);
  const total = data.reduce((sum, row) => sum + row.requests, 0);

  return (
    <Box width="100%" maxWidth={560}>
      <Card
        title="API requests"
        description="Monthly request volume"
        action={
            <Button size="sm" variant="outline" onClick={() => setMonths(months === 6 ? 3 : 6)}>
              Show {months === 6 ? 3 : 6} months
            </Button>
        }
        footer={
          <>
            <span>{total.toLocaleString('en-US')} requests</span>
            <span>{data[0].month} – {data[data.length - 1].month} 2026</span>
          </>
        }
      >
        <Box height={200}>
          <AreaChart
            data={data}
            xKey="month"
            series={[{ key: 'requests', label: 'Requests' }]}
            legend={false}
            axes
            tooltip
            aria-label="Monthly API requests"
          />
        </Box>
      </Card>
    </Box>
  );
}`
            }}
        />
    );
}

/** Shows a chart card whose header action changes the range and footer summary. */
export function CardExample() {
    const [months, setMonths] = useState(6);
    const data = requests.slice(-months);
    const total = data.reduce((sum, row) => sum + row.requests, 0);

    return (
        <Box width="100%" maxWidth={560}>
            <Card
                title="API requests"
                description="Monthly request volume"
                action={
                    <Button size="sm" variant="outline" onClick={() => setMonths(months === 6 ? 3 : 6)}>
                        Show {months === 6 ? 3 : 6} months
                    </Button>
                }
                footer={
                    <>
                        <span>{total.toLocaleString('en-US')} requests</span>
                        <span>
                            {data[0].month} – {data[data.length - 1].month} 2026
                        </span>
                    </>
                }
            >
                <Box height={200}>
                    <AreaChart
                        data={data}
                        xKey="month"
                        series={[{ key: 'requests', label: 'Requests' }]}
                        legend={false}
                        axes
                        tooltip
                        aria-label="Monthly API requests"
                    />
                </Box>
            </Card>
        </Box>
    );
}
