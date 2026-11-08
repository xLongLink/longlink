/** Demonstrates project settings with session-local values and side navigation. */
export default function ProjectSettings() {
    // Retain local edits when the menu unmounts an inactive settings panel.
    const [company, setCompany] = useState('Acme Ink');
    const [currency, setCurrency] = useState('CHF');
    const [approvalRequired, setApprovalRequired] = useState(true);
    const [approvalThreshold, setApprovalThreshold] = useState(1000);
    const [pendingNotifications, setPendingNotifications] = useState(true);
    const [approvedNotifications, setApprovedNotifications] = useState(false);
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

    // Present the landing-page settings layout using only shared View components.
    return (
        <Stack gap={4} paddingInline={8} paddingBlock={2}>
            <Stack gap={0}>
                <Heading level={1}>Example Settings View</Heading>
                <Text color="secondary">This can be used for organizing settings into navigable sections.</Text>
            </Stack>
            <Menu>
                <MenuSection title="Projects">
                    <MenuItem label="General">
                        <Stack gap={4} maxWidth={640}>
                            <Heading level={2}>General</Heading>
                            <Button label="Open fullscreen settings" onClick={() => setIsFullscreenOpen(true)} />
                            <TextInput label="Company name" value={company} onChange={setCompany} />
                            <Selector
                                label="Default currency"
                                value={currency}
                                onChange={setCurrency}
                                options={['CHF', 'EUR', 'USD']}
                            />
                        </Stack>
                    </MenuItem>
                    <MenuItem label="Approvals">
                        <Stack gap={4} maxWidth={640}>
                            <Heading level={2}>Approvals</Heading>
                            <Switch
                                label="Require project approval"
                                value={approvalRequired}
                                onChange={setApprovalRequired}
                            />
                            <NumberInput
                                label={`Approval threshold (${currency})`}
                                value={approvalThreshold}
                                onChange={setApprovalThreshold}
                                min={0}
                                disabled={!approvalRequired}
                            />
                        </Stack>
                    </MenuItem>
                    <MenuItem label="Notifications">
                        <Stack gap={4} maxWidth={640}>
                            <Heading level={2}>Notifications</Heading>
                            <Switch
                                label="Project awaiting approval"
                                value={pendingNotifications}
                                onChange={setPendingNotifications}
                            />
                            <Switch
                                label="Project approved"
                                value={approvedNotifications}
                                onChange={setApprovedNotifications}
                            />
                        </Stack>
                    </MenuItem>
                </MenuSection>
            </Menu>
            <Dialog
                variant="fullscreen"
                title="Fullscreen settings"
                isOpen={isFullscreenOpen}
                onOpenChange={setIsFullscreenOpen}
            >
                <Stack gap={4}>
                    <TextInput label="Company name" value={company} onChange={setCompany} />
                    <Selector
                        label="Default currency"
                        value={currency}
                        onChange={setCurrency}
                        options={['CHF', 'EUR', 'USD']}
                    />
                    <Switch label="Require project approval" value={approvalRequired} onChange={setApprovalRequired} />
                    <Button label="Done" onClick={() => setIsFullscreenOpen(false)} />
                </Stack>
            </Dialog>
        </Stack>
    );
}
