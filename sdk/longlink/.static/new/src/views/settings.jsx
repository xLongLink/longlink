/** Demonstrates project settings with session-local values and side navigation. */
export default function ProjectSettings() {
    // Retain local edits when the menu unmounts an inactive settings panel.
    const [company, setCompany] = useState('Acme Ink');
    const [currency, setCurrency] = useState('CHF');
    const [approvalRequired, setApprovalRequired] = useState(true);
    const [approvalThreshold, setApprovalThreshold] = useState('1000');
    const [pendingNotifications, setPendingNotifications] = useState(true);
    const [approvedNotifications, setApprovedNotifications] = useState(false);
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

    // Present the landing-page settings layout using only shared View components.
    return (
        <Stack gap={4} paddingInline={8} paddingBlock={2}>
            <Stack gap={0}>
                <Heading level={1}>Example Settings View</Heading>
                <Text tone="muted">This can be used for organizing settings into navigable sections.</Text>
            </Stack>
            <Menu
                sections={[
                    {
                        title: 'Projects',
                        entries: [
                            {
                                kind: 'item',
                                label: 'General',
                                icon: 'settings',
                                content: (
                                    <Box maxWidth={640}>
                                        <Stack gap={4}>
                                            <Heading level={2}>General</Heading>
                                            <Button onClick={() => setIsFullscreenOpen(true)}>
                                                Open fullscreen settings
                                            </Button>
                                            <Input
                                                id="company-name"
                                                label="Company name"
                                                value={company}
                                                onChange={(event) => setCompany(event.currentTarget.value)}
                                            />
                                            <Select
                                                id="default-currency"
                                                label="Default currency"
                                                options={[
                                                    { value: 'CHF', label: 'CHF' },
                                                    { value: 'EUR', label: 'EUR' },
                                                    { value: 'USD', label: 'USD' }
                                                ]}
                                                value={currency}
                                                onValueChange={(value) => {
                                                    if (value !== null) setCurrency(value);
                                                }}
                                            />
                                        </Stack>
                                    </Box>
                                )
                            },
                            {
                                kind: 'item',
                                label: 'Approvals',
                                icon: 'circle-check',
                                content: (
                                    <Box maxWidth={640}>
                                        <Stack gap={4}>
                                            <Heading level={2}>Approvals</Heading>
                                            <Switch
                                                id="approval-required"
                                                label="Require project approval"
                                                checked={approvalRequired}
                                                onCheckedChange={setApprovalRequired}
                                            />
                                            <Input
                                                id="approval-threshold"
                                                label={`Approval threshold (${currency})`}
                                                type="number"
                                                value={approvalThreshold}
                                                onChange={(event) => setApprovalThreshold(event.currentTarget.value)}
                                                min={0}
                                                step="any"
                                                disabled={!approvalRequired}
                                            />
                                        </Stack>
                                    </Box>
                                )
                            },
                            {
                                kind: 'item',
                                label: 'Notifications',
                                icon: 'bell',
                                content: (
                                    <Box maxWidth={640}>
                                        <Stack gap={4}>
                                            <Heading level={2}>Notifications</Heading>
                                            <Switch
                                                id="pending-notifications"
                                                label="Project awaiting approval"
                                                checked={pendingNotifications}
                                                onCheckedChange={setPendingNotifications}
                                            />
                                            <Switch
                                                id="approved-notifications"
                                                label="Project approved"
                                                checked={approvedNotifications}
                                                onCheckedChange={setApprovedNotifications}
                                            />
                                        </Stack>
                                    </Box>
                                )
                            }
                        ]
                    }
                ]}
            />
            <Dialog
                fullscreen
                open={isFullscreenOpen}
                onOpenChange={setIsFullscreenOpen}
                title="Fullscreen settings"
                footer={
                    <Button type="button" onClick={() => setIsFullscreenOpen(false)}>
                        Done
                    </Button>
                }
            >
                <Stack gap={4}>
                    <Input
                        id="fullscreen-company-name"
                        label="Company name"
                        value={company}
                        onChange={(event) => setCompany(event.currentTarget.value)}
                    />
                    <Select
                        id="fullscreen-default-currency"
                        label="Default currency"
                        options={[
                            { value: 'CHF', label: 'CHF' },
                            { value: 'EUR', label: 'EUR' },
                            { value: 'USD', label: 'USD' }
                        ]}
                        value={currency}
                        onValueChange={(value) => {
                            if (value !== null) setCurrency(value);
                        }}
                    />
                    <Switch
                        id="fullscreen-approval-required"
                        label="Require project approval"
                        checked={approvalRequired}
                        onCheckedChange={setApprovalRequired}
                    />
                </Stack>
            </Dialog>
        </Stack>
    );
}
