const countries = [
    { code: '840', name: 'United States', flag: '🇺🇸', image: 'us', share: 21.6 },
    { code: '682', name: 'Saudi Arabia', flag: '🇸🇦', image: 'sa', share: 15.9 },
    { code: '276', name: 'Germany', flag: '🇩🇪', image: 'de', share: 11.4 },
    { code: '250', name: 'France', flag: '🇫🇷', image: 'fr', share: 7.7 },
    { code: '642', name: 'Romania', flag: '🇷🇴', image: 'ro', share: 6.4 },
];

const labs = [
    { name: 'Alibaba', logo: 'alibaba', share: 35.6, color: 'blue' },
    { name: 'DeepSeek', logo: 'deepseek', share: 15.5, color: 'purple' },
    { name: 'Google', logo: 'google', share: 14, color: 'green' },
    { name: 'OpenAI', logo: 'openai', share: 7.6, color: 'orange' },
    { name: 'Anthropic', logo: 'anthropic', share: 6.9, color: 'pink' },
];

const models = [
    {
        id: 'gpt-5.2-chat',
        lab: 'openai',
        name: 'GPT-5.2 Chat',
        logo: 'openai',
        usageKey: 'gpt',
        color: 'orange',
        rating: 4.2,
        recommended: 82,
        reviews: 22,
        context: '128K',
        price: '$1.75 / $14.00',
        description: 'A versatile everyday assistant for writing, coding, and working through complex questions.',
        strengths: ['Clear, well-structured answers', 'Strong coding and reasoning'],
        tradeoff: 'Can be verbose on simple questions.',
    },
    {
        id: 'qwen3-235b-a22b',
        lab: 'alibaba',
        name: 'Qwen3',
        logo: 'alibaba',
        usageKey: 'qwen',
        color: 'blue',
        rating: 4.5,
        recommended: 91,
        reviews: 38,
        context: '128K',
        price: '$0.20 / $0.60',
        description: 'An open-weight, multilingual model for reasoning, development, and everyday conversation.',
        strengths: ['Multilingual conversations', 'Flexible open-weight deployment'],
        tradeoff: 'Results depend on the serving configuration.',
    },
    {
        id: 'deepseek-v3.2',
        lab: 'deepseek',
        name: 'DeepSeek V3.2',
        logo: 'deepseek',
        usageKey: 'deepseek',
        color: 'purple',
        rating: 4.4,
        recommended: 88,
        reviews: 31,
        context: '128K',
        price: '$0.28 / $0.42',
        description: 'An efficient general-purpose model with a focus on practical reasoning and code.',
        strengths: ['Good value for long sessions', 'Practical code explanations'],
        tradeoff: 'Tool support varies by provider.',
    },
    {
        id: 'gemini-3-pro-preview',
        lab: 'google',
        name: 'Gemini 3 Pro',
        logo: 'google',
        usageKey: 'gemini',
        color: 'green',
        rating: 4.3,
        recommended: 86,
        reviews: 27,
        context: '1M',
        price: '$2.00 / $12.00',
        description: 'A multimodal assistant for large documents, visual understanding, and complex tasks.',
        strengths: ['Large-document understanding', 'Useful multimodal input'],
        tradeoff: 'Long requests can take more time.',
    },
    {
        id: 'claude-sonnet-4.5',
        lab: 'anthropic',
        name: 'Claude Sonnet 4.5',
        logo: 'anthropic',
        usageKey: 'claude',
        color: 'pink',
        rating: 4.6,
        recommended: 94,
        reviews: 42,
        context: '200K',
        price: '$3.00 / $15.00',
        description: 'A thoughtful coding and writing partner for sustained, detail-oriented work.',
        strengths: ['Careful code changes', 'Natural writing and editing'],
        tradeoff: 'Premium pricing for extended output.',
    },
];

const usage = [
    { month: 'Jan', qwen: 5, deepseek: 1, gemini: 4, gpt: 2, claude: 3 },
    { month: 'Feb', qwen: 4, deepseek: 1, gemini: 5, gpt: 2, claude: 3 },
    { month: 'Mar', qwen: 3, deepseek: 1, gemini: 5, gpt: 2, claude: 4 },
    { month: 'Apr', qwen: 2, deepseek: 1, gemini: 4, gpt: 3, claude: 5 },
    { month: 'May', qwen: 1, deepseek: 2, gemini: 4, gpt: 3, claude: 5 },
    { month: 'Jun', qwen: 1, deepseek: 3, gemini: 2, gpt: 4, claude: 5 },
    { month: 'Jul', qwen: 1, deepseek: 2, gemini: 3, gpt: 5, claude: 4 },
    { month: 'Aug', qwen: 2, deepseek: 1, gemini: 3, gpt: 4, claude: 5 },
    { month: 'Sep', qwen: 1, deepseek: 2, gemini: 4, gpt: 3, claude: 5 },
    { month: 'Oct', qwen: 1, deepseek: 2, gemini: 3, gpt: 4, claude: 5 },
    { month: 'Nov', qwen: 1, deepseek: 3, gemini: 2, gpt: 4, claude: 5 },
    { month: 'Dec', qwen: 1, deepseek: 2, gemini: 3, gpt: 4, claude: 5 },
];

const contributors = [
    {
        name: 'Alex Morgan',
        role: 'Model reviewer',
        reviews: 48,
        helpful: 216,
        focus: 'Open-weight models and local inference',
    },
    {
        name: 'Jamie Chen',
        role: 'Community contributor',
        reviews: 36,
        helpful: 184,
        focus: 'Coding assistants and developer workflows',
    },
    {
        name: 'Sam Rivera',
        role: 'Model reviewer',
        reviews: 29,
        helpful: 152,
        focus: 'Multimodal models and creative work',
    },
];

/** Recreates the Open WebUI models dashboard with an offline, explicitly illustrative snapshot. */
export default function Models() {
    // Selection drives the globe, featured carousel, and independently switchable leaderboard.
    const [countryIndex, setCountryIndex] = useState(0);
    const [modelIndex, setModelIndex] = useState(0);
    const [board, setBoard] = useState('usage');
    const [lab, setLab] = useState('');
    const [reviewsOpen, setReviewsOpen] = useState(false);
    const [contributor, setContributor] = useState(null);
    const country = countries[countryIndex];
    const featured = models[modelIndex];
    const ranked =
        board === 'usage'
            ? [models[1], models[2], models[3], models[0], models[4]]
            : [...models].sort((first, second) => second.rating - first.rating);
    const visibleRanking = lab ? ranked.filter((model) => model.lab === lab) : ranked;
    const selectedLab = labs.find((entry) => entry.name.toLowerCase() === lab);
    const leaderboardControls = (
        <SegmentedControl
            label="Leaderboard mode"
            value={board}
            onChange={setBoard}
            options={[
                { value: 'usage', label: 'Usage' },
                { value: 'reviews', label: 'Reviews' },
            ]}
        />
    );

    // Keep all statistics local; the reference values are demo data, not live model claims.
    return (
        <Stack gap={4}>
            <Text as="h1" size="xl" weight="medium">
                Models
            </Text>
            <Grid columns={9} collapseBelow={900} gap={2} align="stretch">
                <GridSpan columns={5}>
                    <Card padding={0} radius="large" variant="subtle" isClipped>
                        <Globe label={`World map · ${country.name}`} country={country.code} variant="focus">
                            <Stack gap={4} padding={5}>
                                <Stack direction="horizontal" justify="between" align="start" gap={3}>
                                    <StackItem size="fill">
                                        <Stack gap={0}>
                                            <Text as="h2" type="large" weight="medium">
                                                Top countries this month
                                            </Text>
                                            <Text type="supporting">Leaderboard · Share of messages</Text>
                                        </Stack>
                                    </StackItem>
                                    <StackItem>
                                        <Stack direction="horizontal" align="center" gap={1}>
                                            <Text type="supporting" hasTabularNumbers>
                                                {countryIndex + 1} / {countries.length}
                                            </Text>
                                            <IconButton
                                                icon="chevron-left"
                                                label="Previous country"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    setCountryIndex(
                                                        (countryIndex + countries.length - 1) % countries.length
                                                    )
                                                }
                                            />
                                            <IconButton
                                                icon="chevron-right"
                                                label="Next country"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setCountryIndex((countryIndex + 1) % countries.length)}
                                            />
                                        </Stack>
                                    </StackItem>
                                </Stack>
                                <Grid columns={9} collapseBelow={600} gap={3} align="stretch">
                                    <GridSpan columns={4}>
                                        <List label="Top countries" edge="outset">
                                            {countries.map((entry, index) => (
                                                <ListItem
                                                    key={entry.code}
                                                    align="center"
                                                    label={entry.name}
                                                    color={countryIndex === index ? 'primary' : 'secondary'}
                                                    onClick={() => setCountryIndex(index)}
                                                    isSelected={countryIndex === index}
                                                    startContent={
                                                        <Image
                                                            src={`/assets/flag-${entry.image}.png`}
                                                            alt={`${entry.name} flag`}
                                                            variant="flag"
                                                            size="sm"
                                                        />
                                                    }
                                                    endContent={
                                                        <Text
                                                            color={countryIndex === index ? 'accent' : 'secondary'}
                                                            hasTabularNumbers
                                                        >
                                                            {entry.share.toFixed(1)}%
                                                        </Text>
                                                    }
                                                />
                                            ))}
                                        </List>
                                    </GridSpan>
                                    <GridSpan columns={5}>
                                        <Stack justify="end" align="end">
                                            <Stack gap={0} padding={3} background="inset">
                                                <Text type="label">
                                                    {country.flag} #{countryIndex + 1} {country.name}
                                                </Text>
                                                <Text type="supporting">{country.share.toFixed(1)}% of messages</Text>
                                            </Stack>
                                        </Stack>
                                    </GridSpan>
                                </Grid>
                                <Stack direction="horizontal" justify="between" align="center" gap={3}>
                                    <Text type="supporting">{countries.length} countries shown</Text>
                                    <Link to="https://openwebui.com/leaderboard/countries">All countries</Link>
                                </Stack>
                            </Stack>
                        </Globe>
                    </Card>
                </GridSpan>
                <GridSpan columns={4}>
                    <Card padding={5} radius="large" variant="subtle">
                        <Stack gap={4}>
                            <Stack gap={0}>
                                <Text as="h2" type="large" weight="medium">
                                    Top labs this month
                                </Text>
                                <Text type="supporting">Share of messages to recognized models</Text>
                            </Stack>
                            <Distribution
                                label="Lab message share"
                                segments={[
                                    ...labs.map((entry) => ({
                                        label: entry.name,
                                        value: entry.share,
                                        color: entry.color,
                                    })),
                                    { label: 'Other labs', value: 20.4, color: 'neutral' },
                                ]}
                            />
                            <List label="Top labs" edge="outset">
                                {labs.map((entry) => (
                                    <ListItem
                                        key={entry.name}
                                        align="center"
                                        markerColor={entry.color}
                                        label={entry.name}
                                        color="secondary"
                                        onClick={() =>
                                            setLab(lab === entry.name.toLowerCase() ? '' : entry.name.toLowerCase())
                                        }
                                        isSelected={lab === entry.name.toLowerCase()}
                                        startContent={
                                            <Image
                                                src={`/assets/${entry.logo}.png`}
                                                alt={entry.name}
                                                variant="logo"
                                                size="sm"
                                            />
                                        }
                                        endContent={
                                            <Text
                                                color={lab === entry.name.toLowerCase() ? 'accent' : 'secondary'}
                                                hasTabularNumbers
                                            >
                                                {entry.share.toFixed(1)}%
                                            </Text>
                                        }
                                    />
                                ))}
                            </List>
                        </Stack>
                    </Card>
                </GridSpan>
                <GridSpan columns={5}>
                    <Card padding={5} radius="large" variant="subtle">
                        <Stack gap={5}>
                            <Stack gap={2}>
                                <Stack direction="horizontal" justify="between" align="start" gap={3}>
                                    <StackItem size="fill">
                                        <Stack direction="horizontal" align="center" gap={3}>
                                            <Image
                                                src={`/assets/${featured.logo}.png`}
                                                alt={featured.lab}
                                                variant="logo"
                                                size="lg"
                                            />
                                            <StackItem size="fill">
                                                <Stack gap={0}>
                                                    <Stack direction="horizontal" align="center" gap={2} wrap="wrap">
                                                        <Text
                                                            as="h2"
                                                            type="large"
                                                            weight="medium"
                                                            wordBreak="break-word"
                                                        >
                                                            {featured.name}
                                                        </Text>
                                                        <Token label="Featured" size="sm" />
                                                    </Stack>
                                                    <Text type="supporting">
                                                        {featured.lab} · {featured.context} context · {featured.price}{' '}
                                                        per 1M
                                                    </Text>
                                                </Stack>
                                            </StackItem>
                                        </Stack>
                                    </StackItem>
                                    <StackItem>
                                        <Stack direction="horizontal" align="center" gap={1}>
                                            <Text type="supporting" hasTabularNumbers>
                                                {modelIndex + 1} / {models.length}
                                            </Text>
                                            <IconButton
                                                icon="chevron-left"
                                                label="Previous featured model"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    setModelIndex((modelIndex + models.length - 1) % models.length)
                                                }
                                            />
                                            <IconButton
                                                icon="chevron-right"
                                                label="Next featured model"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setModelIndex((modelIndex + 1) % models.length)}
                                            />
                                        </Stack>
                                    </StackItem>
                                </Stack>
                            </Stack>
                            <Grid columns={{ minWidth: 210, max: 2 }} gap={6} align="start">
                                <Stack gap={4}>
                                    <Stack direction="horizontal" gap={6}>
                                        <Stack gap={1}>
                                            <Stack direction="horizontal" gap={1} align="center">
                                                <Text size="2xl" weight="semibold" hasTabularNumbers>
                                                    {featured.rating.toFixed(1)}
                                                </Text>
                                                <Icon icon="star" color="warning" size="sm" />
                                            </Stack>
                                            <Link onClick={() => setReviewsOpen(true)}>{featured.reviews} reviews</Link>
                                        </Stack>
                                        <Stack gap={1}>
                                            <Text size="2xl" weight="semibold" hasTabularNumbers>
                                                {featured.recommended}%
                                            </Text>
                                            <Text type="supporting">Recommend</Text>
                                        </Stack>
                                    </Stack>
                                    <Text as="p" color="secondary">
                                        {featured.description}
                                    </Text>
                                </Stack>
                                <Stack gap={3}>
                                    <Stack direction="horizontal" justify="between" align="center">
                                        <Text as="h3" type="label">
                                            Reviews
                                        </Text>
                                        <Link onClick={() => setReviewsOpen(true)}>See all</Link>
                                    </Stack>
                                    {[...featured.strengths, featured.tradeoff].map((review, index) => (
                                        <Stack key={review} gap={2}>
                                            <Stack direction="horizontal" gap={2} align="center">
                                                <Avatar name={contributors[index].name} size="sm" />
                                                <Text type="label">{contributors[index].name}</Text>
                                                <Icon
                                                    icon={
                                                        index < featured.strengths.length
                                                            ? 'thumbs-up'
                                                            : 'message-circle'
                                                    }
                                                    size="sm"
                                                    color={index < featured.strengths.length ? 'success' : 'secondary'}
                                                />
                                            </Stack>
                                            <Text as="p" color="secondary">
                                                “{review}”
                                            </Text>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Grid>
                            <Stack gap={4}>
                                <Divider />
                                <Stack direction="horizontal" gap={2} wrap="wrap">
                                    <Button
                                        label="View in Open WebUI"
                                        icon="external-link"
                                        size="sm"
                                        variant="primary"
                                        href={`https://openwebui.com/models/${featured.lab}/${featured.id}`}
                                    />
                                    <Button
                                        label="Read reviews"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setReviewsOpen(true)}
                                    />
                                </Stack>
                            </Stack>
                        </Stack>
                    </Card>
                </GridSpan>
                <GridSpan columns={4}>
                    <Card padding={5} radius="large" variant="subtle">
                        <Stack gap={3}>
                            {board === 'usage' ? (
                                <Plot
                                    label="Leaderboard"
                                    controls={leaderboardControls}
                                    description={`${selectedLab ? `${selectedLab.name} · ` : 'Top 5 by usage · '}Rank per month · Illustrative series`}
                                    height={180}
                                    data={usage}
                                    xKey="month"
                                    curve="monotone"
                                    hasDots={false}
                                    hasLegend={false}
                                    yDomain={[5.5, 0.5]}
                                    series={visibleRanking.map((model) => ({
                                        key: model.usageKey,
                                        label: model.name,
                                        color: model.color,
                                    }))}
                                />
                            ) : (
                                <Plot
                                    label="Leaderboard"
                                    controls={leaderboardControls}
                                    description={`${selectedLab ? `${selectedLab.name} · ` : ''}Highest rated by the community · Illustrative ratings`}
                                    type="bar"
                                    height={180}
                                    data={visibleRanking.map((model) => ({
                                        rank: String(ranked.indexOf(model) + 1).padStart(2, '0'),
                                        rating: model.rating,
                                    }))}
                                    xKey="rank"
                                    series={[{ key: 'rating', label: 'Rating out of 5', color: 'blue' }]}
                                    yDomain={[0, 5]}
                                    hasLegend={false}
                                />
                            )}
                            {lab && (
                                <Stack direction="horizontal" justify="between" align="center">
                                    <Text type="supporting">{selectedLab.name}</Text>
                                    <Button
                                        label="Clear lab filter"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setLab('')}
                                    />
                                </Stack>
                            )}
                            <List
                                label={`${board === 'usage' ? 'Usage' : 'Review'} leaderboard`}
                                density="compact"
                                edge="outset"
                            >
                                {visibleRanking.map((model) => (
                                    <ListItem
                                        key={model.id}
                                        align="center"
                                        markerColor={model.color}
                                        label={model.name}
                                        color="secondary"
                                        onClick={() => setModelIndex(models.indexOf(model))}
                                        isSelected={featured.id === model.id}
                                        startContent={
                                            <Stack direction="horizontal" gap={2} align="center">
                                                <Text color="secondary" hasTabularNumbers>
                                                    {String(ranked.indexOf(model) + 1).padStart(2, '0')}
                                                </Text>
                                                <Image
                                                    src={`/assets/${model.logo}.png`}
                                                    alt={model.lab}
                                                    variant="logo"
                                                    size="sm"
                                                />
                                            </Stack>
                                        }
                                        endContent={
                                            <Stack direction="horizontal" align="center" gap={1}>
                                                <Text color="secondary" hasTabularNumbers>
                                                    {board === 'usage'
                                                        ? `${[35.6, 15.5, 14, 7.6, 6.9][ranked.indexOf(model)].toFixed(1)}%`
                                                        : model.rating.toFixed(1)}
                                                </Text>
                                                {board === 'reviews' && <Icon icon="star" size="sm" color="warning" />}
                                            </Stack>
                                        }
                                    />
                                ))}
                            </List>
                        </Stack>
                    </Card>
                </GridSpan>
                <GridSpan columns="full">
                    <Card padding={5} radius="large" variant="subtle">
                        <Stack gap={4}>
                            <Stack gap={0}>
                                <Text as="h2" type="large" weight="medium">
                                    Top contributors
                                </Text>
                                <Text type="supporting">This month · Illustrative community profiles</Text>
                            </Stack>
                            <Grid columns={{ minWidth: 240, max: 3 }} gap={6}>
                                {contributors.map((person) => (
                                    <Stack key={person.name} direction="horizontal" gap={3} align="center">
                                        <Avatar name={person.name} seed={person.name} size="md" />
                                        <StackItem size="fill">
                                            <Stack gap={0}>
                                                <Link onClick={() => setContributor(person)}>{person.name}</Link>
                                                <Text type="supporting">{person.role}</Text>
                                                <Text color="secondary">
                                                    {person.reviews} reviews · {person.helpful} helpful votes
                                                </Text>
                                            </Stack>
                                        </StackItem>
                                    </Stack>
                                ))}
                            </Grid>
                        </Stack>
                    </Card>
                </GridSpan>
            </Grid>
            <Dialog
                title={`${featured.name} · Illustrative reviews`}
                isOpen={reviewsOpen}
                onOpenChange={setReviewsOpen}
            >
                <Text>
                    {featured.rating.toFixed(1)} / 5 · {featured.reviews} reviews · {featured.recommended}% recommend
                </Text>
                <List label="Illustrative reviews">
                    {featured.strengths.map((strength, index) => (
                        <ListItem
                            key={strength}
                            label={strength}
                            description={`${contributors[index].name} · Illustrative review`}
                            startContent={<Avatar name={contributors[index].name} size="sm" />}
                        />
                    ))}
                    <ListItem label={featured.tradeoff} description="Illustrative community feedback" />
                </List>
                <Button
                    label="Read live reviews on Open WebUI"
                    href={`https://openwebui.com/models/${featured.lab}/${featured.id}`}
                />
            </Dialog>
            <Dialog
                title={contributor?.name}
                isOpen={contributor !== null}
                onOpenChange={(open) => {
                    if (!open) setContributor(null);
                }}
            >
                {contributor && (
                    <Stack gap={3}>
                        <Avatar name={contributor.name} seed={contributor.name} size="lg" />
                        <Text type="label">{contributor.role}</Text>
                        <Text>{contributor.focus}</Text>
                        <Text>
                            {contributor.reviews} reviews · {contributor.helpful} helpful votes
                        </Text>
                        <Text type="supporting">Illustrative profile, not a live Open WebUI account.</Text>
                    </Stack>
                )}
            </Dialog>
        </Stack>
    );
}
