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
                <Text className="text-muted-foreground">
                    This can be used for organizing settings into navigable sections.
                </Text>
            </Stack>
            <Menu>
                <MenuSection title="Projects">
                    <MenuItem label="General" icon="settings">
                        <Stack gap={4} maxWidth={640}>
                            <Heading level={2}>General</Heading>
                            <Button onClick={() => setIsFullscreenOpen(true)}>Open fullscreen settings</Button>
                            <Field>
                                <FieldLabel htmlFor="company-name">Company name</FieldLabel>
                                <Input
                                    id="company-name"
                                    value={company}
                                    onChange={(event) => setCompany(event.currentTarget.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="default-currency">Default currency</FieldLabel>
                                <Select
                                    value={currency}
                                    onValueChange={(value) => {
                                        if (value !== null) setCurrency(value);
                                    }}
                                >
                                    <SelectTrigger id="default-currency">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CHF">CHF</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                        </Stack>
                    </MenuItem>
                    <MenuItem label="Approvals" icon="circle-check">
                        <Stack gap={4} maxWidth={640}>
                            <Heading level={2}>Approvals</Heading>
                            <Field orientation="horizontal">
                                <Switch
                                    id="approval-required"
                                    checked={approvalRequired}
                                    onCheckedChange={setApprovalRequired}
                                />
                                <FieldLabel htmlFor="approval-required">Require project approval</FieldLabel>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="approval-threshold">Approval threshold ({currency})</FieldLabel>
                                <Input
                                    id="approval-threshold"
                                    type="number"
                                    value={approvalThreshold}
                                    onChange={(event) => setApprovalThreshold(event.currentTarget.value)}
                                    min={0}
                                    step="any"
                                    disabled={!approvalRequired}
                                />
                            </Field>
                        </Stack>
                    </MenuItem>
                    <MenuItem label="Notifications" icon="bell">
                        <Stack gap={4} maxWidth={640}>
                            <Heading level={2}>Notifications</Heading>
                            <Field orientation="horizontal">
                                <Switch
                                    id="pending-notifications"
                                    checked={pendingNotifications}
                                    onCheckedChange={setPendingNotifications}
                                />
                                <FieldLabel htmlFor="pending-notifications">Project awaiting approval</FieldLabel>
                            </Field>
                            <Field orientation="horizontal">
                                <Switch
                                    id="approved-notifications"
                                    checked={approvedNotifications}
                                    onCheckedChange={setApprovedNotifications}
                                />
                                <FieldLabel htmlFor="approved-notifications">Project approved</FieldLabel>
                            </Field>
                        </Stack>
                    </MenuItem>
                </MenuSection>
            </Menu>
            <Dialog fullscreen open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
                <DialogContent className="flex h-[95dvh] w-[95dvw] max-w-[95dvw] flex-col sm:max-w-[95dvw]">
                    <DialogHeader>
                        <DialogTitle>Fullscreen settings</DialogTitle>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 overflow-auto">
                        <Stack gap={4}>
                            <Field>
                                <FieldLabel htmlFor="fullscreen-company-name">Company name</FieldLabel>
                                <Input
                                    id="fullscreen-company-name"
                                    value={company}
                                    onChange={(event) => setCompany(event.currentTarget.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="fullscreen-default-currency">Default currency</FieldLabel>
                                <Select
                                    value={currency}
                                    onValueChange={(value) => {
                                        if (value !== null) setCurrency(value);
                                    }}
                                >
                                    <SelectTrigger id="fullscreen-default-currency">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CHF">CHF</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field orientation="horizontal">
                                <Switch
                                    id="fullscreen-approval-required"
                                    checked={approvalRequired}
                                    onCheckedChange={setApprovalRequired}
                                />
                                <FieldLabel htmlFor="fullscreen-approval-required">Require project approval</FieldLabel>
                            </Field>
                            <Button onClick={() => setIsFullscreenOpen(false)}>Done</Button>
                        </Stack>
                    </div>
                </DialogContent>
            </Dialog>
        </Stack>
    );
}
