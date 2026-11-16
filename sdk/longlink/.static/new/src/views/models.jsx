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
    const [countryId, setCountryId] = useState();
    const [countryMap, setCountryMap] = useState(null);
    const [mapFailed, setMapFailed] = useState(false);
    const countries = analytics.countries;
    const countryIndex = Math.max(
        0,
        countries.findIndex((country) => country.id === countryId)
    );
    const selectedCountry = countries[countryIndex];
    const usage = analytics.usage.slice(-Number(period));
    const latest = usage.at(-1);
    const metricIcons = { models: 'sparkles', reviews: 'message-square', messages: 'activity', providers: 'globe' };
    const providerCount = analytics.providers.reduce((sum, provider) => sum + (provider.providerCount ?? 1), 0);
    const topShare = [...analytics.providers]
        .sort((left, right) => right.value - left.value)
        .slice(0, 3)
        .reduce((sum, provider) => sum + provider.value, 0);

    // Synchronize the external camera with ranking selection without recreating the map.
    useEffect(() => {
        if (!countryMap) return;
        countryMap.easeTo({
            center: selectedCountry?.center ?? [0, 20],
            zoom: selectedCountry?.zoom ?? 1.5,
            duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300
        });
        return () => {
            countryMap.stop();
        };
    }, [countryMap, selectedCountry]);

    // Keep map failures local so the rankings remain usable during recovery.
    useEffect(() => {
        if (!countryMap) return;
        const fail = () => setMapFailed(true);
        countryMap.on('error', fail);
        return () => {
            countryMap.off('error', fail);
        };
    }, [countryMap]);

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
                            <Card padding="none">
                                <div className="@container/country relative isolate">
                                    <div className="flex flex-col gap-4 p-4">
                                        <div className="relative z-20 flex items-start justify-between gap-3">
                                            <div>
                                                <h2 className="text-base leading-snug font-medium">
                                                    Top countries this month
                                                </h2>
                                                <p className="text-sm text-muted-foreground">Share of messages</p>
                                            </div>
                                            <Stack direction="horizontal" align="center" gap={2}>
                                                <span className="text-xs text-muted-foreground tabular-nums">
                                                    {countries.length ? countryIndex + 1 : 0} / {countries.length}
                                                </span>
                                                <Button
                                                    type="button"
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    aria-label="Previous country"
                                                    disabled={!countries.length}
                                                    onClick={() =>
                                                        setCountryId(
                                                            countries[
                                                                (countryIndex + countries.length - 1) % countries.length
                                                            ]?.id
                                                        )
                                                    }
                                                >
                                                    <Icon icon="chevron-left" size="sm" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    aria-label="Next country"
                                                    disabled={!countries.length}
                                                    onClick={() =>
                                                        setCountryId(
                                                            countries[(countryIndex + 1) % countries.length]?.id
                                                        )
                                                    }
                                                >
                                                    <Icon icon="chevron-right" size="sm" />
                                                </Button>
                                            </Stack>
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col gap-4 @min-[640px]/country:min-h-84">
                                            <div className="relative z-20 flex flex-col gap-2 @min-[640px]/country:w-[44%]">
                                                {countries.length ? (
                                                    countries.map((country) => (
                                                        <Button
                                                            key={country.id}
                                                            type="button"
                                                            size="lg"
                                                            variant={
                                                                selectedCountry?.id === country.id
                                                                    ? 'secondary'
                                                                    : 'ghost'
                                                            }
                                                            aria-pressed={selectedCountry?.id === country.id}
                                                            onPointerEnter={() => setCountryId(country.id)}
                                                            onFocus={() => setCountryId(country.id)}
                                                            onClick={() => setCountryId(country.id)}
                                                        >
                                                            <span className="flex w-full min-w-0 items-center gap-3">
                                                                <span className="text-xl" aria-hidden="true">
                                                                    {country.flag}
                                                                </span>
                                                                <span className="min-w-0 flex-1 truncate text-left">
                                                                    {country.name}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground tabular-nums">
                                                                    {country.share}%
                                                                </span>
                                                            </span>
                                                        </Button>
                                                    ))
                                                ) : (
                                                    <Empty title="No countries" />
                                                )}
                                            </div>
                                            <div
                                                role="group"
                                                aria-label="Community messages by country"
                                                className="relative h-60 overflow-hidden @min-[640px]/country:absolute @min-[640px]/country:inset-0 @min-[640px]/country:left-[28%] @min-[640px]/country:h-auto"
                                            >
                                                {mapFailed ? (
                                                    <Empty role="alert" title="Unable to load map">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setMapFailed(false)}
                                                        >
                                                            Retry
                                                        </Button>
                                                    </Empty>
                                                ) : (
                                                    <Map
                                                        ref={setCountryMap}
                                                        blank
                                                        center={selectedCountry?.center ?? [0, 20]}
                                                        zoom={selectedCountry?.zoom ?? 1.5}
                                                    >
                                                        <MapGeoJSON
                                                            data={geography}
                                                            fillPaint={{
                                                                'fill-opacity': [
                                                                    'case',
                                                                    [
                                                                        '==',
                                                                        ['to-string', ['id']],
                                                                        selectedCountry?.id ?? ''
                                                                    ],
                                                                    1,
                                                                    0.35
                                                                ]
                                                            }}
                                                            interactive={countries.length > 0}
                                                            onClick={({ feature }) => {
                                                                const country = countries.find(
                                                                    (country) => country.id === String(feature.id)
                                                                );
                                                                if (country) setCountryId(country.id);
                                                            }}
                                                        />
                                                    </Map>
                                                )}
                                            </div>
                                            <div
                                                aria-hidden="true"
                                                className="pointer-events-none absolute inset-0 z-10 hidden bg-linear-to-r from-card from-25% via-card/95 via-42% to-transparent to-70% @min-[640px]/country:block"
                                            />
                                            <div
                                                aria-hidden="true"
                                                className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-28 bg-linear-to-b from-card via-card/85 to-transparent @min-[640px]/country:block"
                                            />
                                            <div
                                                aria-hidden="true"
                                                className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden h-20 bg-linear-to-t from-card/90 to-transparent @min-[640px]/country:block"
                                            />
                                            {selectedCountry && (
                                                <div
                                                    className="relative z-20 flex max-w-full flex-col items-start gap-1 self-end bg-card/90 p-3 @min-[640px]/country:absolute @min-[640px]/country:right-4 @min-[640px]/country:bottom-4 @min-[640px]/country:max-w-[48%]"
                                                    aria-live="polite"
                                                >
                                                    <span className="text-sm font-medium">
                                                        {selectedCountry.flag} #{countryIndex + 1}{' '}
                                                        {selectedCountry.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {compactNumber.format(selectedCountry.messages)} messages ·{' '}
                                                        {selectedCountry.people.toLocaleString()} people
                                                    </span>
                                                    <Badge variant="info-light">
                                                        Most used: {selectedCountry.model}
                                                    </Badge>
                                                </div>
                                            )}
                                            <p className="relative z-20 mt-auto text-xs text-muted-foreground @min-[640px]/country:w-[48%]">
                                                {analytics.geographySummary.countries} countries ·{' '}
                                                {compactNumber.format(analytics.geographySummary.messages)} messages
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
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
