/** Displays model usage, geographic reach, and provider shares. */
export default function Models() {
    // Load bundled sample analytics and atlas boundaries through the scoped SDK transport.
    const [analytics] = useApi('/assets/analytics.json');
    const [geography] = useApi('/assets/world.json');
    const metricIcons = { models: 'sparkles', reviews: 'message-square', messages: 'activity', providers: 'globe' };

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
                        <ProviderChart
                            providers={analytics.providers}
                            total={analytics.geographySummary.messages}
                            title="Provider share"
                            totalLabel="Messages"
                        />
                    </Grid>
                    <UsageChart
                        data={analytics.usage}
                        config={{
                            claude: { label: 'Claude', color: 'var(--chart-1)' },
                            gpt: { label: 'GPT', color: 'var(--chart-2)' },
                            gemini: { label: 'Gemini', color: 'var(--chart-3)' }
                        }}
                        periods={[
                            { value: 7, label: 'Last 7 days' },
                            { value: 30, label: 'Last 30 days' }
                        ]}
                        title="Model usage"
                        label="Model usage over time"
                    />
                </Stack>
            </Box>
        </Stack>
    );
}
