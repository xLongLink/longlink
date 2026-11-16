const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const usageSeries = [
    { key: 'claude', label: 'Claude' },
    { key: 'gpt', label: 'GPT' },
    { key: 'gemini', label: 'Gemini' }
];

/** Displays model usage, geographic reach, and provider shares. */
export default function Models() {
    // Load bundled sample analytics and atlas boundaries through the scoped SDK transport.
    const [analytics] = useApi('/assets/analytics.json');
    const [geography] = useApi('/assets/world.json');
    const [period, setPeriod] = useState('30');
    const usage = analytics.usage.slice(-Number(period));
    const latest = usage.at(-1);
    const metricIcons = { models: 'sparkles', reviews: 'message-square', messages: 'activity', providers: 'globe' };
    const providerCount = analytics.providers.reduce((sum, provider) => sum + (provider.providerCount ?? 1), 0);
    const topShare = [...analytics.providers]
        .sort((left, right) => right.value - left.value)
        .slice(0, 3)
        .reduce((sum, provider) => sum + provider.value, 0);

    return (
        <Stack align="center" padding={4}>
            <Box width="100%" maxWidth={1280}>
                <Stack gap={2}>
                    <Grid columns={4} gap={2}>
                        {analytics.metrics.map((metric) => {
                            const changeVariant = metric.change.startsWith('-') ? 'destructive-light' : 'success-light';
                            return (
                                <Card key={metric.label} size="sm" padding="none">
                                    <Stack gap={3}>
                                        <Stack direction="horizontal" align="center" gap={3} padding={3}>
                                            <Icon
                                                icon={metricIcons[metric.icon]}
                                                size="lg"
                                                tile="soft"
                                                variant="primary"
                                            />
                                            <Stack gap={1}>
                                                <Text className="text-[13px] text-muted-foreground">
                                                    {metric.label}
                                                </Text>
                                                <Stack direction="horizontal" align="center" wrap="wrap" gap={2}>
                                                    <Text className="text-xl font-medium tabular-nums">
                                                        {metric.value}
                                                    </Text>
                                                    <Badge variant={changeVariant}>{metric.change}</Badge>
                                                </Stack>
                                            </Stack>
                                        </Stack>
                                        <Box height={96}>
                                            <AreaChart
                                                aria-label={`${metric.label} trend`}
                                                data={metric.trend.map((value, point) => ({ point, value }))}
                                                xKey="point"
                                                series={[{ key: 'value', label: metric.label }]}
                                                curve="linear"
                                                fill="gradient"
                                            />
                                        </Box>
                                    </Stack>
                                </Card>
                            );
                        })}
                    </Grid>
                    <Grid columns={3} gap={2}>
                        <GridItem columns={2}>
                            <CountryChart
                                countries={analytics.countries}
                                geography={geography}
                                title="Top countries this month"
                                description="Share of messages"
                                label="Community messages by country"
                                summary={`${analytics.geographySummary.countries} countries · ${new Intl.NumberFormat('en', { notation: 'compact' }).format(analytics.geographySummary.messages)} messages`}
                                renderDetails={(country) => (
                                    <>
                                        <Text className="block text-xs text-muted-foreground">
                                            {new Intl.NumberFormat('en', { notation: 'compact' }).format(
                                                country.messages
                                            )}{' '}
                                            messages · {country.people.toLocaleString()} people
                                        </Text>
                                        <Badge variant="info-light">Most used: {country.model}</Badge>
                                    </>
                                )}
                            />
                        </GridItem>
                        <Card
                            title="Provider share"
                            action={<Badge variant="secondary">{providerCount} providers</Badge>}
                            footer={<Text>{topShare.toFixed(1)}% from the top 3 providers</Text>}
                        >
                            <Box height="100%" center>
                                <Box width="100%">
                                    <Grid columns={2} align="center" gap={4}>
                                        <Box height={192}>
                                            <PieChart
                                                data={analytics.providers}
                                                nameKey="name"
                                                valueKey="value"
                                                tooltip
                                                aria-label="Provider shares"
                                                center={
                                                    <Stack align="center" gap={0}>
                                                        <Text className="text-2xl font-medium tabular-nums">
                                                            {compactNumber.format(analytics.geographySummary.messages)}
                                                        </Text>
                                                        <Text className="text-xs text-muted-foreground">Messages</Text>
                                                    </Stack>
                                                }
                                            />
                                        </Box>
                                        <ChartLegend
                                            data={analytics.providers}
                                            nameKey="name"
                                            valueKey="value"
                                            formatValue={(value) => `${value.toFixed(1)}%`}
                                            orientation="vertical"
                                        />
                                    </Grid>
                                </Box>
                            </Box>
                        </Card>
                    </Grid>
                    <Card
                        title="Model usage"
                        action={
                            <ButtonGroup aria-label="Usage period">
                                {[7, 30].map((days) => (
                                    <Button
                                        key={days}
                                        type="button"
                                        size="sm"
                                        variant={period === String(days) ? 'secondary' : 'ghost'}
                                        aria-pressed={period === String(days)}
                                        onClick={() => setPeriod(String(days))}
                                    >
                                        Last {days} days
                                    </Button>
                                ))}
                            </ButtonGroup>
                        }
                        footer={
                            <ChartLegend
                                data={usageSeries.map(({ key, label }) => ({ label, value: latest?.[key] ?? 0 }))}
                                nameKey="label"
                                valueKey="value"
                                formatValue={(value) => (latest ? compactNumber.format(value) : '—')}
                            />
                        }
                    >
                        <Box height={320}>
                            <AreaChart
                                data={usage}
                                xKey="date"
                                series={usageSeries}
                                axes
                                tooltip
                                fill="gradient"
                                xTickFormatter={(value) => String(value).slice(5)}
                                yTickFormatter={compactNumber.format}
                                aria-label="Model usage over time"
                            />
                        </Box>
                    </Card>
                </Stack>
            </Box>
        </Stack>
    );
}
