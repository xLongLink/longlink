/** Displays model usage, geographic reach, and provider shares. */
export default function Models() {
    // Load bundled sample analytics and atlas boundaries through the scoped SDK transport.
    const [analytics] = useApi('/assets/analytics.json');
    const [geography] = useApi('/assets/world.json');
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
                                                            {new Intl.NumberFormat('en', {
                                                                notation: 'compact',
                                                                maximumFractionDigits: 1
                                                            }).format(analytics.geographySummary.messages)}
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
