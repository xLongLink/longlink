import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { List, ListItem } from '@astryxdesign/core/List';

const article = {
    description: 'Read the LongLink privacy policy.',
    toc: [
        { id: 'privacy-policy', label: 'Privacy Policy', level: 1 },
        { id: 'scope-and-controller', label: '1. Scope and controller', level: 2 },
        { id: 'our-roles', label: '2. Our roles', level: 2 },
        {
            id: 'personal-data-we-process',
            label: '3. Personal data we process',
            level: 2,
        },
        {
            id: 'why-we-process-personal-data',
            label: '4. Why we process personal data',
            level: 2,
        },
        {
            id: 'service-providers-and-other-recipients',
            label: '5. Service providers and other recipients',
            level: 2,
        },
        {
            id: 'international-transfers',
            label: '6. International transfers',
            level: 2,
        },
        {
            id: 'cookies-and-similar-storage',
            label: '7. Cookies and similar storage',
            level: 2,
        },
        { id: 'retention', label: '8. Retention', level: 2 },
        {
            id: 'security-and-data-incidents',
            label: '9. Security and data incidents',
            level: 2,
        },
        { id: 'your-rights', label: '10. Your rights', level: 2 },
        {
            id: 'changes-to-this-policy',
            label: '11. Changes to this Policy',
            level: 2,
        },
        { id: 'contact', label: '12. Contact', level: 2 },
    ],
    lastUpdated: '2026-09-23',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/legal/Privacy.tsx',
    title: 'Privacy Policy | LongLink',
};

/** Renders the privacy policy. */
export default function Privacy() {
    return (
        <Article page={article}>
            <PrivacyContent />
        </Article>
    );
}

/** Renders the privacy policy content. */
function PrivacyContent() {
    return (
        <Stack gap={5}>
            <Heading id="privacy-policy" level={1}>
                Privacy Policy
            </Heading>

            <Stack as="section" gap={3}>
                <Heading id="scope-and-controller" level={2}>
                    1. Scope and controller
                </Heading>
                <Text as="p">
                    This Policy explains how LongLink handles personal data when you visit our website, use our hosted
                    platform, connect infrastructure, or contact us. The hosted platform is for users aged 18 or older.
                    We do not knowingly collect children's data through the platform; contact us if you believe a child
                    has provided it.
                </Text>
                <Text as="p">
                    The controller is LongLink SAGL, UID CHE-150.642.313. Privacy enquiries and requests may be sent to{' '}
                    <Link href="mailto:info@longlink.ch" hasUnderline type="inherit">
                        info@longlink.ch
                    </Link>
                    .
                </Text>
                <Text as="p">
                    "Service" means our website, hosted platform, and related support, including the SDK and runtime
                    when connected to our platform. Separate service or data processing agreements also apply where
                    relevant.
                </Text>
            </Stack>

            <Stack as="section" gap={3}>
                <Heading id="our-roles" level={2}>
                    2. Our roles
                </Heading>
                <Text as="p">
                    We are the controller for account, organization, authentication, support, security, and other
                    operational data needed to run our Service. This Policy primarily describes those activities.
                </Text>
                <Text as="p">
                    Customers generally control the personal data they put in Solutions and connected databases or
                    storage. When we operate the hosted Service for them, we generally process that Customer Content on
                    their behalf.
                </Text>
                <Text as="p">
                    If another organization operates LongLink, that operator is responsible for its own privacy
                    practices. Customers are responsible for notices, lawful bases, retention, and user requests for
                    personal data they process through their Solutions.
                </Text>
            </Stack>

            <Stack as="section" gap={3}>
                <Heading id="personal-data-we-process" level={2}>
                    3. Personal data we process
                </Heading>
                <Text as="p">
                    Depending on how you use the Service, we may process the following categories of personal data:
                </Text>
                <List listStyle="disc">
                    <ListItem
                        label={
                            <Text>
                                Account and identity data: name, email address, optional avatar, account identifiers,
                                roles, and sign-in information.
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                Authentication data: password hashes, signed session and email-verification tokens,
                                password-reset tokens, and OAuth sign-in data. We do not store plaintext passwords.
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                Organization and access data: organization details, memberships, roles, invitations,
                                infrastructure assignments, and audit records.
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                Solution and deployment data: names, images, versions, configuration, environment
                                values, deployment status, errors, and runtime information needed to operate Solutions.
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                Connected infrastructure data: provider settings, endpoints, credentials, resource
                                identifiers, usage information, and audit records for compute, databases, and storage.
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                Connection and log data: IP addresses, request and session details, timestamps, errors,
                                security events, and operational or runtime logs.
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                Commercial data: billing contacts, invoices, payment status, and accounting records when
                                we provide a paid service. We do not process full payment-card details in the platform;
                                a payment or banking provider handles those if a separate payment flow is used.
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                Communications: messages, attachments, and contact details when you reach out to us for
                                support, security reports, or other enquiries.
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                Customer Content: data processed by Solutions, connected databases, storage, and runtime
                                services. We do not routinely inspect it, but authorized personnel may access it for
                                support, security, abuse investigations, or legal requirements.
                            </Text>
                        }
                    />
                </List>
                <Text as="p">
                    We receive data from you, organizations that invite or administer you, identity providers, connected
                    infrastructure, and your use of the Service.
                </Text>
                <Text as="p">
                    We do not sell personal data. We do not currently use third-party advertising trackers or analytics
                    to build advertising profiles about visitors.
                </Text>
            </Stack>

            <Stack as="section" gap={3}>
                <Heading id="why-we-process-personal-data" level={2}>
                    4. Why we process personal data
                </Heading>
                <Text as="p">
                    We process data to create accounts, manage organizations and access, operate Solutions and connected
                    infrastructure, deliver account and service messages, protect the Service, diagnose problems, and
                    improve reliability. This includes synchronizing organization users to Solution databases where
                    needed for access. We also respond to enquiries, handle disputes, and meet legal obligations.
                </Text>
                <Text as="p">
                    The Service automatically checks access and provisions or removes resources. These operational
                    actions are not behavioral profiling. We do not use personal data for automated decisions that have
                    legal or similarly significant effects. Contact us if an operational action appears incorrect and
                    you want human review.
                </Text>
                <Text as="p">
                    Where a legal basis is required, including under the EU or UK GDPR, we rely as appropriate on a
                    contract, legal obligation, legitimate interests in operating and protecting the Service, or consent
                    for optional uses. You may withdraw consent without affecting earlier processing.
                </Text>
            </Stack>

            <Stack as="section" gap={3}>
                <Heading id="service-providers-and-other-recipients" level={2}>
                    5. Service providers and other recipients
                </Heading>
                <Text as="p">We disclose only the data reasonably needed for the recipient's role:</Text>
                <List listStyle="disc">
                    <ListItem
                        label={
                            <Text>
                                Infrastructure providers and connected registries receive the configuration, secrets,
                                and request data needed to host and operate Solutions.
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                Email providers receive contact details and message content to deliver invitations,
                                account notices, and support messages.
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                Logging and monitoring providers receive operational data needed for reliability and
                                security.
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                Payment, banking, or accounting providers receive billing data if you use a paid service
                                or separate payment flow.
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                Advisers and authorities receive data where needed for legal, accounting, security, or
                                regulatory purposes.
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                A prospective buyer or successor may receive data in a business transaction, subject to
                                appropriate safeguards.
                            </Text>
                        }
                    />
                </List>
                <Text as="p">
                    Some providers also act as independent controllers for their own legal and security purposes. Their
                    privacy policies govern that processing.
                </Text>
            </Stack>

            <Stack as="section" gap={3}>
                <Heading id="international-transfers" level={2}>
                    6. International transfers
                </Heading>
                <Text as="p">
                    Personal data may be processed where we, our providers, or your connected infrastructure operate,
                    including Switzerland, the European Economic Area, the United States, and other countries.
                </Text>
                <Text as="p">
                    Where required, we use recognized adequacy decisions, contractual safeguards, or other lawful
                    transfer mechanisms. Contact us for information about safeguards relevant to a particular transfer.
                </Text>
            </Stack>

            <Stack as="section" gap={3}>
                <Heading id="cookies-and-similar-storage" level={2}>
                    7. Cookies and similar storage
                </Heading>
                <Text as="p">
                    We use HTTP-only cookies for signed sign-in sessions, email registration, password resets, and OAuth
                    sign-in. These are necessary for account access and security. A separate payment provider may set
                    cookies if you visit its service.
                </Text>
                <Text as="p">
                    During registration or password reset, your browser may briefly keep a verification token in session
                    storage to complete the flow. Blocking or deleting these cookies or storage may interrupt sign-in or
                    account setup.
                </Text>
                <Text as="p">
                    We do not currently set advertising or cross-site tracking cookies. If that changes, we will update
                    this Policy and provide any choices required by law.
                </Text>
            </Stack>

            <Stack as="section" gap={3}>
                <Heading id="retention" level={2}>
                    8. Retention
                </Heading>
                <Text as="p">
                    We keep data for as long as needed to provide the Service or meet legal and security obligations:
                </Text>
                <List listStyle="disc">
                    <ListItem
                        label={
                            <Text>
                                account, membership, and invitation data are generally kept while the account or
                                organization is active, then deleted or anonymized when no longer needed;
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                Solution, infrastructure, operation, and audit records are kept while needed to operate
                                or secure the Service, and longer for investigations, disputes, or legal duties;
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                access, runtime, and security logs are generally kept for up to 12 months, longer when
                                needed for an incident, dispute, or legal claim;
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                support and security communications are generally kept for up to three years after
                                resolution;
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                invoices and accounting records, where applicable, are generally kept for 10 years under
                                Swiss record-keeping requirements;
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                infrastructure credentials are kept while the related resource is configured, then
                                deleted or rotated when no longer needed; and
                            </Text>
                        }
                    />
                    <ListItem
                        label={
                            <Text>
                                Customer Content may be erased without a recovery period when a Solution, organization,
                                or connected resource is deleted. Export data and keep independent backups.
                            </Text>
                        }
                    />
                </List>
                <Text as="p">
                    Data may remain temporarily in protected backups or with providers subject to their own retention
                    obligations. We delete, anonymize, or isolate it when no longer needed until backups expire.
                </Text>
            </Stack>

            <Stack as="section" gap={3}>
                <Heading id="security-and-data-incidents" level={2}>
                    9. Security and data incidents
                </Heading>
                <Text as="p">
                    We use safeguards appropriate to the risk, including access controls, password hashing, signed
                    session cookies, transport encryption, resource isolation, secret management, and logging. No system
                    is completely secure. You are responsible for securing your accounts, Solutions, and connected
                    infrastructure.
                </Text>
                <Text as="p">
                    We assess personal-data breaches and notify the Federal Data Protection and Information Commissioner
                    (FDPIC) where a breach is likely to result in a high risk to a person's personality or fundamental
                    rights. We notify affected individuals where required by law or where notification is necessary for
                    their protection.
                </Text>
            </Stack>

            <Stack as="section" gap={3}>
                <Heading id="your-rights" level={2}>
                    10. Your rights
                </Heading>
                <Text as="p">
                    Depending on applicable law, you may request access, correction, deletion, restriction, objection,
                    or transfer of your personal data. You may request account closure and withdraw consent where we
                    rely on it.
                </Text>
                <Text as="p">
                    Send requests to{' '}
                    <Link href="mailto:info@longlink.ch" hasUnderline type="inherit">
                        info@longlink.ch
                    </Link>
                    . We may verify your identity before responding. We generally respond within 30 days. Access is
                    normally free, subject to fees or exceptions permitted by law.
                </Text>
                <Text as="p">
                    You may lodge a complaint with the Federal Data Protection and Information Commissioner (FDPIC) or
                    another competent data-protection authority.
                </Text>
            </Stack>

            <Stack as="section" gap={3}>
                <Heading id="changes-to-this-policy" level={2}>
                    11. Changes to this Policy
                </Heading>
                <Text as="p">
                    We may update this Policy as the Service, providers, deployment model, or legal requirements change.
                    We will post the revised Policy with a new update date. If a change materially affects how we use
                    existing account data, we will provide reasonable advance notice through email or the Service where
                    required.
                </Text>
            </Stack>

            <Stack as="section" gap={3}>
                <Heading id="contact" level={2}>
                    12. Contact
                </Heading>
                <Text as="p">LongLink SAGL, UID CHE-150.642.313.</Text>
                <Text as="p">
                    Privacy enquiries and data-rights requests:{' '}
                    <Link href="mailto:info@longlink.ch" hasUnderline type="inherit">
                        info@longlink.ch
                    </Link>
                    . Security, technical, and account support:{' '}
                    <Link href="mailto:info@longlink.dev" hasUnderline type="inherit">
                        info@longlink.dev
                    </Link>
                    .
                </Text>
            </Stack>
        </Stack>
    );
}
