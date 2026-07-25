import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';

export const metadata = {
    toc: [
        { id: 'scope-and-controller', label: '1. Scope and controller' },
        { id: 'our-roles', label: '2. Our roles' },
        { id: 'personal-data-we-process', label: '3. Personal data we process' },
        { id: 'why-we-process-personal-data', label: '4. Why we process personal data' },
        { id: 'service-providers-and-other-recipients', label: '5. Service providers and other recipients' },
        { id: 'international-transfers', label: '6. International transfers' },
        { id: 'cookies-and-similar-storage', label: '7. Cookies and similar storage' },
        { id: 'retention', label: '8. Retention' },
        { id: 'automated-operational-actions', label: '9. Automated operational actions' },
        { id: 'security-and-data-incidents', label: '10. Security and data incidents' },
        { id: 'your-rights', label: '11. Your rights' },
        { id: 'children', label: '12. Children' },
        { id: 'changes-to-this-policy', label: '13. Changes to this Policy' },
        { id: 'contact', label: '14. Contact' },
    ],
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/legal/privacy.tsx',
};

export const content = (
    <Stack gap={5}>
        <Heading id="privacy-policy" level={1}>
            Privacy Policy
        </Heading>

        <Stack as="section" gap={3}>
            <Heading id="scope-and-controller" level={2}>
                1. Scope and controller
            </Heading>
            <Text as="p">
                This Privacy Policy explains how LongLink handles personal data when you visit our website, create an
                account, join or manage an organization, add or deploy an application, connect infrastructure, use the
                platform, SDK, runtime, documentation, or support channels, or otherwise use the Service.
            </Text>
            <Text as="p">
                The controller is LongLink SAGL, UID CHE-150.642.313. Privacy enquiries and requests may be sent to{' '}
                <Link href="mailto:info@longlink.ch" hasUnderline type="inherit">
                    info@longlink.ch
                </Link>
                .
            </Text>
            <Text as="p">
                In this Policy, "Service" means the LongLink website, hosted platform, SDK, application runtime,
                deployment tooling, and related support. If a separate service agreement or data processing agreement
                applies, its definitions and data-processing terms also apply where relevant.
            </Text>
        </Stack>

        <Stack as="section" gap={3}>
            <Heading id="our-roles" level={2}>
                2. Our roles
            </Heading>
            <Text as="p">
                We act as controller for personal data used to operate accounts, authentication, organizations,
                memberships, invitations, infrastructure registries, application records, support, security, abuse
                prevention, and our business. This Policy primarily describes those activities.
            </Text>
            <Text as="p">
                When a customer places personal data in an application, database schema, storage bucket, file, log,
                uploaded object, page definition, environment value, or other content processed through LongLink, the
                customer generally decides why and how that data is processed and is the controller. LongLink generally
                acts as processor for that Customer Content when we operate the hosted Service for the customer.
            </Text>
            <Text as="p">
                If LongLink is self-hosted or operated by another organization, that operator is responsible for its own
                privacy notices, lawful basis, retention, provider choices, and user requests. Customers are responsible
                for providing notices and establishing a lawful basis for personal data they process through
                applications built or deployed with LongLink.
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
                            Account and identity data: internal account ID, OAuth provider ID, name, email address,
                            optional avatar URL, platform role, selected theme, accent, radius, language, account
                            creation, update, deletion, and sign-in session information.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Authentication data: password hashes, signed email-registration and password-reset tokens,
                            revocable session tokens, saved account identifiers, safe post-login redirect paths, and
                            profile claims returned by an optional identity provider. The LongLink Platform does not
                            store plaintext passwords, pending user accounts, or OAuth access and refresh tokens after
                            resolving the provider identity.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Organization and access data: organization name, slug, avatar, infrastructure assignments,
                            memberships, application roles, invitation email addresses, invited roles, and audit records
                            for created, updated, or deleted resources.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Application and deployment data: application name, slug, icon, image reference, image
                            digest, version, SDK version, description, selected compute, database, and storage
                            registries, environment values supplied for deployment, deployment status, operation status,
                            operation errors, runtime status, pod, service, log, and proxy information needed to
                            provision, route, monitor, and support applications.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Infrastructure registry data: compute, database, storage, Kubernetes, PostgreSQL, and
                            S3-compatible storage configuration, including endpoints, runtime endpoints, credentials,
                            kubeconfigs, proxy secrets, access keys, bucket names, database names, schema names, table
                            metadata, object metadata, usage information, and related audit records.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Connection and log data: IP address, request method and path, timestamps, response status,
                            duration, errors, session information, application or organization identifiers, security
                            events, operational diagnostics, and runtime logs exposed through connected infrastructure.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Commercial and contracting data: billing contact, plan, invoice, payment status, and
                            accounting records where we provide LongLink under a paid or managed service agreement. This
                            repository does not implement payment-card processing; full payment credentials are handled
                            by the selected payment or banking provider if a separate payment flow is used.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Communications: messages, attachments, issue reports, security reports, and related contact
                            details when you contact us, request support, report a vulnerability, or otherwise
                            communicate with us.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Customer Content: data stored or processed by applications, database schemas, storage
                            buckets, files, XML page definitions, API routes, and runtime services. We do not routinely
                            inspect Customer Content, but authorized personnel may access it where reasonably necessary
                            to provide requested support, investigate abuse or a security incident, enforce terms, or
                            comply with law.
                        </Text>
                    }
                />
            </List>
            <Text as="p">
                We receive data directly from you, from your use of the Service, from the configured identity provider,
                from organizations that invite or administer you, from connected infrastructure and registries, from
                support or security channels, and from our operational systems.
            </Text>
            <Text as="p">
                We do not sell personal data. We do not currently use third-party advertising trackers or analytics to
                build advertising profiles about visitors.
            </Text>
        </Stack>

        <Stack as="section" gap={3}>
            <Heading id="why-we-process-personal-data" level={2}>
                4. Why we process personal data
            </Heading>
            <Text as="p">We process personal data to:</Text>
            <List listStyle="disc">
                <ListItem label={<Text>create and administer accounts and authenticate users;</Text>} />
                <ListItem
                    label={
                        <Text>create organizations, manage memberships, invitations, roles, and access controls;</Text>
                    }
                />
                <ListItem
                    label={<Text>register, verify, provision, update, route, monitor, and delete applications;</Text>}
                />
                <ListItem
                    label={
                        <Text>
                            connect and operate compute, database, storage, container, and routing infrastructure;
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            sync organization users into shared application database tables where needed by the runtime;
                        </Text>
                    }
                />
                <ListItem label={<Text>send invitation, account, security, operational, and service messages;</Text>} />
                <ListItem
                    label={
                        <Text>secure accounts and infrastructure and prevent fraud, abuse, and prohibited use;</Text>
                    }
                />
                <ListItem label={<Text>diagnose errors, monitor reliability, and improve the Service;</Text>} />
                <ListItem
                    label={
                        <Text>
                            respond to support requests, complaints, security reports, and legal-rights requests;
                        </Text>
                    }
                />
                <ListItem label={<Text>establish, exercise, or defend legal claims; and</Text>} />
                <ListItem
                    label={
                        <Text>
                            comply with accounting, tax, sanctions, regulatory, security, and other legal obligations.
                        </Text>
                    }
                />
            </List>
            <Text as="p">
                Swiss data-protection law generally permits private-sector processing unless it unlawfully infringes
                personality rights. Where another law requires a legal basis, including where the EU or UK GDPR applies,
                we rely as appropriate on performance of a contract, compliance with legal obligations, our legitimate
                interests in operating and protecting the Service, or consent for an optional use that specifically
                requests it. You may withdraw consent at any time, without affecting earlier processing.
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
                            OAuth providers: optional authentication when you sign in. They receive the information
                            required for sign-in and return your provider ID, name, email, and, where available, avatar
                            and profile claims. GitHub may be configured.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Infrastructure providers and connected registries: Kubernetes, database, object-storage,
                            container registry, routing, DNS, and hosting providers receive the organization,
                            application, runtime, secret, request, and configuration data needed to provision, run,
                            route, inspect, and delete resources.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Email and communications providers: delivery of invitations, account messages, operational
                            notices, security messages, and support communications. Email delivery involves your email
                            address, name, and the content of the message.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Logging and monitoring providers: incident investigation, security, and service reliability.
                            Log data may include IP addresses, request paths, organization and application identifiers,
                            runtime identifiers, and error information.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Payment, banking, or accounting providers: only where a separate paid service agreement,
                            invoice, or payment flow is used. Those providers may act as independent controllers for
                            their own security, fraud-prevention, and legal obligations.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Professional advisers and authorities: legal, accounting, audit, insurance, security,
                            regulatory, or public-authority recipients where reasonably necessary or where disclosure is
                            required or permitted by law.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Corporate transactions: a prospective or actual buyer, investor, lender, insurer, or
                            successor in a merger, financing, reorganization, or transfer of all or part of the
                            business, subject to appropriate confidentiality and legal safeguards.
                        </Text>
                    }
                />
            </List>
            <Text as="p">
                Some recipients, particularly identity, infrastructure, payment, and communications providers, may also
                act as independent controllers for their own security, fraud-prevention, service, and legal obligations.
                Their privacy policies govern those activities.
            </Text>
        </Stack>

        <Stack as="section" gap={3}>
            <Heading id="international-transfers" level={2}>
                6. International transfers
            </Heading>
            <Text as="p">
                LongLink can be operated on customer-connected infrastructure. Personal data may therefore be processed
                in Switzerland, the European Economic Area, the United States, or other countries where we, our
                providers, a customer's providers, or their subprocessors operate.
            </Text>
            <Text as="p">
                Where required, transfers are based on a destination recognized as providing adequate protection, the
                Swiss-US Data Privacy Framework for a certified recipient, recognized standard contractual clauses
                adapted for Swiss law, or another safeguard or exception permitted by applicable law. You may contact us
                for more information about the safeguards relevant to a particular transfer.
            </Text>
        </Stack>

        <Stack as="section" gap={3}>
            <Heading id="cookies-and-similar-storage" level={2}>
                7. Cookies and similar storage
            </Heading>
            <Text as="p">
                We currently use storage needed for the Service. An HTTP-only cookie named <Code>longlink_auth</Code>{' '}
                contains an opaque revocable session token. A short-lived HTTP-only cookie named{' '}
                <Code>longlink_registration</Code> carries signed email proof while you complete account setup. A signed
                cookie named <Code>longlink_session</Code> may contain saved account identifiers used by the account
                switcher. OAuth, identity, and payment providers may set their own cookies when you visit them.
            </Text>
            <Text as="p">
                In SDK mode and local development, the embedded web runtime may use local storage to remember the
                selected local development user. Blocking or deleting cookies and local storage may prevent account
                login or local runtime user switching.
            </Text>
            <Text as="p">
                We do not currently set advertising or cross-site behavioral-tracking cookies. If that changes, we will
                update this Policy and provide any choices required by law before using them.
            </Text>
        </Stack>

        <Stack as="section" gap={3}>
            <Heading id="retention" level={2}>
                8. Retention
            </Heading>
            <Text as="p">We keep personal data only for as long as reasonably necessary for the stated purposes:</Text>
            <List listStyle="disc">
                <ListItem
                    label={
                        <Text>
                            account, profile, preference, membership, and invitation data are generally kept while the
                            account or organization is active and then deleted or anonymized when no longer required for
                            security, disputes, continuity, or legal obligations;
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            organization, application, infrastructure registry, deployment, operation, and audit records
                            are kept while needed to provide, secure, troubleshoot, and document the Service, and may be
                            retained after deletion where needed for security, abuse investigations, disputes, or legal
                            obligations;
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            application, access, proxy, runtime, and security logs are generally kept for up to 12
                            months, but may be kept longer where necessary to investigate an incident, abuse,
                            operational failure, or legal claim;
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
                            commercial, invoice, payment-reconciliation, and related accounting records, where
                            applicable, are generally kept for 10 years in accordance with Swiss record-keeping
                            requirements;
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            infrastructure credentials and runtime configuration are kept while the related registry,
                            organization, or application remains configured, and are deleted or rotated when no longer
                            needed; and
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            Customer Content may be erased without a recovery period when an application, database
                            schema, storage bucket, runtime, organization, or connected infrastructure resource is
                            deleted, reinstalled, suspended, terminated, or released. You are responsible for backups
                            and exporting Customer Content before deleting resources.
                        </Text>
                    }
                />
            </List>
            <Text as="p">
                Data may remain for a limited period in protected backups or with a provider under its own legally
                required retention schedule. When deletion is due, we delete, anonymize, or securely isolate the data
                until deletion from backups occurs in the ordinary cycle.
            </Text>
        </Stack>

        <Stack as="section" gap={3}>
            <Heading id="automated-operational-actions" level={2}>
                9. Automated operational actions
            </Heading>
            <Text as="p">
                The Service automatically performs operational actions such as authenticating sessions, checking access
                roles, routing authorized requests, creating and deleting runtime resources, verifying application
                readiness, marking applications as running or failed, retrying queued operations, and synchronizing
                organization users into shared application database tables.
            </Text>
            <Text as="p">
                These actions use account, organization, application, infrastructure, status, and operation data rather
                than behavioral profiling. Deleting or replacing applications, schemas, buckets, or organizations may
                cause loss of Customer Content. Contact{' '}
                <Link href="mailto:info@longlink.dev" hasUnderline type="inherit">
                    info@longlink.dev
                </Link>{' '}
                if you believe an automated operational action was incorrect and want human review.
            </Text>
            <Text as="p">
                We do not otherwise use personal data for automated decisions that produce legal or similarly
                significant effects.
            </Text>
        </Stack>

        <Stack as="section" gap={3}>
            <Heading id="security-and-data-incidents" level={2}>
                10. Security and data incidents
            </Heading>
            <Text as="p">
                We use technical and organizational measures appropriate to the nature and risk of the processing,
                including access controls, password hashing, optional OAuth authentication, revocable session tokens,
                signed session cookies, transport encryption, namespace, database-schema, and storage-bucket isolation,
                credential hashing or encryption where appropriate, secret management, logging, and restricted
                administrative access. No system is completely secure, and you are responsible for securing your
                accounts, applications, credentials, infrastructure, and Customer Content.
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
                11. Your rights
            </Heading>
            <Text as="p">
                Subject to applicable conditions and exceptions, you may request access to personal data we hold about
                you, correction of inaccurate data, deletion or restriction, object to processing, and receive or
                transfer certain data in a commonly used machine-readable format. You may also request account closure
                and withdraw consent where processing relies on consent.
            </Text>
            <Text as="p">
                Send requests to{' '}
                <Link href="mailto:info@longlink.ch" hasUnderline type="inherit">
                    info@longlink.ch
                </Link>
                . We may ask for information reasonably needed to verify your identity and protect the account. We
                generally respond within 30 days. Access is normally free, although the law permits a fee for manifestly
                unfounded, excessive, or disproportionately burdensome requests. We may retain or withhold information
                where permitted or required by law and will explain an applicable restriction.
            </Text>
            <Text as="p">
                You may lodge a complaint with the Federal Data Protection and Information Commissioner (FDPIC) or
                another competent data-protection authority.
            </Text>
        </Stack>

        <Stack as="section" gap={3}>
            <Heading id="children" level={2}>
                12. Children
            </Heading>
            <Text as="p">
                The Service is for users aged 18 or older. We do not knowingly collect personal data from children.
                Contact us if you believe a child has provided personal data so that we can investigate and take
                appropriate action.
            </Text>
        </Stack>

        <Stack as="section" gap={3}>
            <Heading id="changes-to-this-policy" level={2}>
                13. Changes to this Policy
            </Heading>
            <Text as="p">
                We may update this Policy as the Service, providers, deployment model, or legal requirements change. We
                will post the revised Policy with a new update date. If a change materially affects how we use existing
                account data, we will provide reasonable advance notice through email or the Service where required.
            </Text>
        </Stack>

        <Stack as="section" gap={3}>
            <Heading id="contact" level={2}>
                14. Contact
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
