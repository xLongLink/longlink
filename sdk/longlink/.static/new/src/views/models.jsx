/** Displays model usage, geographic reach, provider shares, and balanced revenue flows. */
export default function Models() {
    // Load bundled sample analytics and atlas boundaries through the scoped SDK transport.
    const [analytics] = useApi('/assets/analytics.json');
    const [geography] = useApi('/assets/world.json');

    return (
        <Stack align="center" padding={4}>
            <Stack gap={2} width="100%" maxWidth={1280}>
                <MetricGrid metrics={analytics.metrics} />
                <Grid columns={3} collapseBelow={960} gap={2}>
                    <GridSpan columns={2}>
                        <CountryChart countries={analytics.countries} geography={geography} summary={analytics.geographySummary} />
                    </GridSpan>
                    <ProviderChart providers={analytics.providers} total={analytics.geographySummary.messages} />
                </Grid>
                <UsageChart data={analytics.usage} />
                <RevenueFlow quarters={analytics.quarters} />
            </Stack>
        </Stack>
    );
}
