import { A } from '@/components/ui/a';
import { Li } from '@/components/ui/li';
import { Ul } from '@/components/ui/ul';
import { Heading } from '@/components/ui/heading';

export const metadata = {
    lastUpdated: '2026-06-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/legal/privacy.tsx',
};

export const content = (
    <>
        <Heading id="privacy-policy" level="h1">
            Privacy Policy
        </Heading>

        <section className="space-y-3">
            <Heading id="scope-and-controller" level="h2">
                1. Scope and controller
            </Heading>
            <p>
                This Privacy Policy explains how LongLink handles personal data when you visit our website, create an
                account, join or manage an organization, add or deploy an application, connect infrastructure, use the
                platform, SDK, runtime, documentation, or support channels, or otherwise use the Service.
            </p>
            <p>
                The controller is LongLink SAGL, UID CHE-150.642.313. Privacy enquiries and requests may be sent to{' '}
                <A href="mailto:info@longlink.ch">info@longlink.ch</A>.
            </p>
            <p>
                In this Policy, "Service" means the LongLink website, hosted platform, SDK, application runtime,
                deployment tooling, and related support. If a separate service agreement or data processing agreement
                applies, its definitions and data-processing terms also apply where relevant.
            </p>
        </section>

        <section className="space-y-3">
            <Heading id="our-roles" level="h2">
                2. Our roles
            </Heading>
            <p>
                We act as controller for personal data used to operate accounts, authentication, organizations,
                memberships, invitations, infrastructure registries, application records, support, security, abuse
                prevention, and our business. This Policy primarily describes those activities.
            </p>
            <p>
                When a customer places personal data in an application, database schema, storage bucket, file, log,
                uploaded object, page definition, environment value, or other content processed through LongLink, the
                customer generally decides why and how that data is processed and is the controller. LongLink generally
                acts as processor for that Customer Content when we operate the hosted Service for the customer.
            </p>
            <p>
                If LongLink is self-hosted or operated by another organization, that operator is responsible for its own
                privacy notices, lawful basis, retention, provider choices, and user requests. Customers are responsible
                for providing notices and establishing a lawful basis for personal data they process through
                applications built or deployed with LongLink.
            </p>
        </section>

        <section className="space-y-3">
            <Heading id="personal-data-we-process" level="h2">
                3. Personal data we process
            </Heading>
            <p>Depending on how you use the Service, we may process the following categories of personal data:</p>
            <Ul>
                <Li>
                    Account and identity data: internal account ID, OIDC subject or provider ID, name, email address,
                    optional avatar URL, platform role, account status, selected theme, accent, radius, language,
                    account creation, update, deletion, and sign-in session information.
                </Li>
                <Li>
                    Authentication data: profile claims returned by the identity provider you choose, session account
                    identifiers, safe post-login redirect paths, and OIDC tokens used during sign-in. Passwords are
                    handled by the configured identity provider; the LongLink Platform database does not intentionally
                    store account passwords or OAuth access tokens.
                </Li>
                <Li>
                    Organization and access data: organization name, slug, avatar, infrastructure assignments,
                    memberships, application roles, invitation email addresses, invited roles, and audit records for
                    created, updated, or deleted resources.
                </Li>
                <Li>
                    Application and deployment data: application name, slug, icon, image reference, image digest,
                    version, SDK version, description, selected compute, database, and storage registries, environment
                    values supplied for deployment, deployment status, operation status, operation errors, runtime
                    status, pod, service, log, and proxy information needed to provision, route, monitor, and support
                    applications.
                </Li>
                <Li>
                    Infrastructure registry data: compute, database, storage, Kubernetes, PostgreSQL, and S3-compatible
                    storage configuration, including endpoints, runtime endpoints, credentials, kubeconfigs, proxy
                    secrets, access keys, bucket names, database names, schema names, table metadata, object metadata,
                    usage information, and related audit records.
                </Li>
                <Li>
                    Connection and log data: IP address, request method and path, timestamps, response status, duration,
                    errors, session information, application or organization identifiers, security events, operational
                    diagnostics, and runtime logs exposed through connected infrastructure.
                </Li>
                <Li>
                    Commercial and contracting data: billing contact, plan, invoice, payment status, and accounting
                    records where we provide LongLink under a paid or managed service agreement. This repository does
                    not implement payment-card processing; full payment credentials are handled by the selected payment
                    or banking provider if a separate payment flow is used.
                </Li>
                <Li>
                    Communications: messages, attachments, issue reports, security reports, and related contact details
                    when you contact us, request support, report a vulnerability, or otherwise communicate with us.
                </Li>
                <Li>
                    Customer Content: data stored or processed by applications, database schemas, storage buckets,
                    files, XML page definitions, API routes, and runtime services. We do not routinely inspect Customer
                    Content, but authorized personnel may access it where reasonably necessary to provide requested
                    support, investigate abuse or a security incident, enforce terms, or comply with law.
                </Li>
            </Ul>
            <p>
                We receive data directly from you, from your use of the Service, from the configured identity provider,
                from organizations that invite or administer you, from connected infrastructure and registries, from
                support or security channels, and from our operational systems.
            </p>
            <p>
                We do not sell personal data. We do not currently use third-party advertising trackers or analytics to
                build advertising profiles about visitors.
            </p>
        </section>

        <section className="space-y-3">
            <Heading id="why-we-process-personal-data" level="h2">
                4. Why we process personal data
            </Heading>
            <p>We process personal data to:</p>
            <Ul>
                <Li>create and administer accounts and authenticate users;</Li>
                <Li>create organizations, manage memberships, invitations, roles, and access controls;</Li>
                <Li>register, verify, provision, update, route, monitor, and delete applications;</Li>
                <Li>connect and operate compute, database, storage, container, and routing infrastructure;</Li>
                <Li>sync organization users into shared application database tables where needed by the runtime;</Li>
                <Li>send invitation, account, security, operational, and service messages;</Li>
                <Li>secure accounts and infrastructure and prevent fraud, abuse, and prohibited use;</Li>
                <Li>diagnose errors, monitor reliability, and improve the Service;</Li>
                <Li>respond to support requests, complaints, security reports, and legal-rights requests;</Li>
                <Li>establish, exercise, or defend legal claims; and</Li>
                <Li>comply with accounting, tax, sanctions, regulatory, security, and other legal obligations.</Li>
            </Ul>
            <p>
                Swiss data-protection law generally permits private-sector processing unless it unlawfully infringes
                personality rights. Where another law requires a legal basis, including where the EU or UK GDPR applies,
                we rely as appropriate on performance of a contract, compliance with legal obligations, our legitimate
                interests in operating and protecting the Service, or consent for an optional use that specifically
                requests it. You may withdraw consent at any time, without affecting earlier processing.
            </p>
        </section>

        <section className="space-y-3">
            <Heading id="service-providers-and-other-recipients" level="h2">
                5. Service providers and other recipients
            </Heading>
            <p>We disclose only the data reasonably needed for the recipient's role:</p>
            <Ul>
                <Li>
                    Identity and OIDC providers: authentication when you sign in. They receive the information required
                    for sign-in and return your provider ID, name, email, and, where available, avatar and profile
                    claims. Provider hints may be used for GitHub or Google sign-in where configured.
                </Li>
                <Li>
                    Infrastructure providers and connected registries: Kubernetes, database, object-storage, container
                    registry, routing, DNS, and hosting providers receive the organization, application, runtime,
                    secret, request, and configuration data needed to provision, run, route, inspect, and delete
                    resources.
                </Li>
                <Li>
                    Email and communications providers: delivery of invitations, account messages, operational notices,
                    security messages, and support communications. Email delivery involves your email address, name, and
                    the content of the message.
                </Li>
                <Li>
                    Logging and monitoring providers: incident investigation, security, and service reliability. Log
                    data may include IP addresses, request paths, organization and application identifiers, runtime
                    identifiers, and error information.
                </Li>
                <Li>
                    Payment, banking, or accounting providers: only where a separate paid service agreement, invoice, or
                    payment flow is used. Those providers may act as independent controllers for their own security,
                    fraud-prevention, and legal obligations.
                </Li>
                <Li>
                    Professional advisers and authorities: legal, accounting, audit, insurance, security, regulatory, or
                    public-authority recipients where reasonably necessary or where disclosure is required or permitted
                    by law.
                </Li>
                <Li>
                    Corporate transactions: a prospective or actual buyer, investor, lender, insurer, or successor in a
                    merger, financing, reorganization, or transfer of all or part of the business, subject to
                    appropriate confidentiality and legal safeguards.
                </Li>
            </Ul>
            <p>
                Some recipients, particularly identity, infrastructure, payment, and communications providers, may also
                act as independent controllers for their own security, fraud-prevention, service, and legal obligations.
                Their privacy policies govern those activities.
            </p>
        </section>

        <section className="space-y-3">
            <Heading id="international-transfers" level="h2">
                6. International transfers
            </Heading>
            <p>
                LongLink can be operated on customer-connected infrastructure. Personal data may therefore be processed
                in Switzerland, the European Economic Area, the United States, or other countries where we, our
                providers, a customer's providers, or their subprocessors operate.
            </p>
            <p>
                Where required, transfers are based on a destination recognized as providing adequate protection, the
                Swiss-US Data Privacy Framework for a certified recipient, recognized standard contractual clauses
                adapted for Swiss law, or another safeguard or exception permitted by applicable law. You may contact us
                for more information about the safeguards relevant to a particular transfer.
            </p>
        </section>

        <section className="space-y-3">
            <Heading id="cookies-and-similar-storage" level="h2">
                7. Cookies and similar storage
            </Heading>
            <p>
                We currently use storage needed for the Service. A signed session cookie named{' '}
                <span className="font-mono text-xs text-foreground">longlink_session</span> keeps you authenticated and
                may contain active and saved account identifiers, sign-in state, and a safe post-login redirect path.
                OAuth providers, identity providers, and payment providers may set their own cookies when you visit
                them.
            </p>
            <p>
                In SDK mode and local development, the embedded web runtime may use local storage to remember the
                selected local development user. Blocking or deleting cookies and local storage may prevent account
                login or local runtime user switching.
            </p>
            <p>
                We do not currently set advertising or cross-site behavioral-tracking cookies. If that changes, we will
                update this Policy and provide any choices required by law before using them.
            </p>
        </section>

        <section className="space-y-3">
            <Heading id="retention" level="h2">
                8. Retention
            </Heading>
            <p>We keep personal data only for as long as reasonably necessary for the stated purposes:</p>
            <Ul>
                <Li>
                    account, profile, preference, membership, and invitation data are generally kept while the account
                    or organization is active and then deleted or anonymized when no longer required for security,
                    disputes, continuity, or legal obligations;
                </Li>
                <Li>
                    organization, application, infrastructure registry, deployment, operation, and audit records are
                    kept while needed to provide, secure, troubleshoot, and document the Service, and may be retained
                    after deletion where needed for security, abuse investigations, disputes, or legal obligations;
                </Li>
                <Li>
                    application, access, proxy, runtime, and security logs are generally kept for up to 12 months, but
                    may be kept longer where necessary to investigate an incident, abuse, operational failure, or legal
                    claim;
                </Li>
                <Li>support and security communications are generally kept for up to three years after resolution;</Li>
                <Li>
                    commercial, invoice, payment-reconciliation, and related accounting records, where applicable, are
                    generally kept for 10 years in accordance with Swiss record-keeping requirements;
                </Li>
                <Li>
                    infrastructure credentials and runtime configuration are kept while the related registry,
                    organization, or application remains configured, and are deleted or rotated when no longer needed;
                    and
                </Li>
                <Li>
                    Customer Content may be erased without a recovery period when an application, database schema,
                    storage bucket, runtime, organization, or connected infrastructure resource is deleted, reinstalled,
                    suspended, terminated, or released. You are responsible for backups and exporting Customer Content
                    before deleting resources.
                </Li>
            </Ul>
            <p>
                Data may remain for a limited period in protected backups or with a provider under its own legally
                required retention schedule. When deletion is due, we delete, anonymize, or securely isolate the data
                until deletion from backups occurs in the ordinary cycle.
            </p>
        </section>

        <section className="space-y-3">
            <Heading id="automated-operational-actions" level="h2">
                9. Automated operational actions
            </Heading>
            <p>
                The Service automatically performs operational actions such as authenticating sessions, checking access
                roles, routing authorized requests, creating and deleting runtime resources, verifying application
                readiness, marking applications as running or failed, retrying queued operations, and synchronizing
                organization users into shared application database tables.
            </p>
            <p>
                These actions use account, organization, application, infrastructure, status, and operation data rather
                than behavioral profiling. Deleting or replacing applications, schemas, buckets, or organizations may
                cause loss of Customer Content. Contact <A href="mailto:info@longlink.dev">info@longlink.dev</A> if you
                believe an automated operational action was incorrect and want human review.
            </p>
            <p>
                We do not otherwise use personal data for automated decisions that produce legal or similarly
                significant effects.
            </p>
        </section>

        <section className="space-y-3">
            <Heading id="security-and-data-incidents" level="h2">
                10. Security and data incidents
            </Heading>
            <p>
                We use technical and organizational measures appropriate to the nature and risk of the processing,
                including access controls, OIDC authentication, signed session cookies, transport encryption, namespace,
                database-schema, and storage-bucket isolation, credential hashing or encryption where appropriate,
                secret management, logging, and restricted administrative access. No system is completely secure, and
                you are responsible for securing your accounts, applications, credentials, infrastructure, and Customer
                Content.
            </p>
            <p>
                We assess personal-data breaches and notify the Federal Data Protection and Information Commissioner
                (FDPIC) where a breach is likely to result in a high risk to a person's personality or fundamental
                rights. We notify affected individuals where required by law or where notification is necessary for
                their protection.
            </p>
        </section>

        <section className="space-y-3">
            <Heading id="your-rights" level="h2">
                11. Your rights
            </Heading>
            <p>
                Subject to applicable conditions and exceptions, you may request access to personal data we hold about
                you, correction of inaccurate data, deletion or restriction, object to processing, and receive or
                transfer certain data in a commonly used machine-readable format. You may also request account closure
                and withdraw consent where processing relies on consent.
            </p>
            <p>
                Send requests to <A href="mailto:info@longlink.ch">info@longlink.ch</A>. We may ask for information
                reasonably needed to verify your identity and protect the account. We generally respond within 30 days.
                Access is normally free, although the law permits a fee for manifestly unfounded, excessive, or
                disproportionately burdensome requests. We may retain or withhold information where permitted or
                required by law and will explain an applicable restriction.
            </p>
            <p>
                You may lodge a complaint with the Federal Data Protection and Information Commissioner (FDPIC) or
                another competent data-protection authority.
            </p>
        </section>

        <section className="space-y-3">
            <Heading id="children" level="h2">
                12. Children
            </Heading>
            <p>
                The Service is for users aged 18 or older. We do not knowingly collect personal data from children.
                Contact us if you believe a child has provided personal data so that we can investigate and take
                appropriate action.
            </p>
        </section>

        <section className="space-y-3">
            <Heading id="changes-to-this-policy" level="h2">
                13. Changes to this Policy
            </Heading>
            <p>
                We may update this Policy as the Service, providers, deployment model, or legal requirements change. We
                will post the revised Policy with a new update date. If a change materially affects how we use existing
                account data, we will provide reasonable advance notice through email or the Service where required.
            </p>
        </section>

        <section className="space-y-3">
            <Heading id="contact" level="h2">
                14. Contact
            </Heading>
            <p>LongLink SAGL, UID CHE-150.642.313.</p>
            <p>
                Privacy enquiries and data-rights requests: <A href="mailto:info@longlink.ch">info@longlink.ch</A>.
                Security, technical, and account support: <A href="mailto:info@longlink.dev">info@longlink.dev</A>.
            </p>
        </section>
    </>
);
