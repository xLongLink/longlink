import type { ReactNode } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { List, ListItem } from '@astryxdesign/core/List';
import { Heading as AstryxHeading } from '@astryxdesign/core/Heading';

/** Renders links with the external-link behavior used in legal copy. */
function A({ children, href }: { children: ReactNode; href: string }) {
    return (
        <Link href={href} isExternalLink={href.startsWith('http')} type="inherit">
            {children}
        </Link>
    );
}

/** Renders a legal heading while preserving the document's compact source notation. */
function Heading({ children, id, level }: { children: ReactNode; id: string; level: 'h1' | 'h2' }) {
    return (
        <AstryxHeading id={id} level={level === 'h1' ? 1 : 2}>
            {children}
        </AstryxHeading>
    );
}

/** Renders a bulleted legal list. */
function Ul({ children }: { children: ReactNode }) {
    return <List listStyle="disc">{children}</List>;
}

/** Renders one item in a legal list. */
function Li({ children }: { children: ReactNode }) {
    return <ListItem label={<Text>{children}</Text>} />;
}

/** Renders a consistently spaced legal section. */
function Section({ children }: { children: ReactNode }) {
    return (
        <Stack as="section" gap={3}>
            {children}
        </Stack>
    );
}

export const metadata = {
    toc: [
        { id: 'provider-acceptance-and-eligibility', label: '1. Provider, acceptance and eligibility' },
        { id: 'definitions-and-contract-documents', label: '2. Definitions and contract documents' },
        { id: 'service-and-beta-status', label: '3. Service and beta status' },
        { id: 'accounts-organizations-and-security', label: '4. Accounts, organizations and security' },
        { id: 'acceptable-use', label: '5. Acceptable use' },
        { id: 'plans-fees-and-managed-services', label: '6. Plans, fees and managed services' },
        { id: 'refunds-and-consumer-cancellation-rights', label: '7. Refunds and consumer cancellation rights' },
        { id: 'content-privacy-and-data-processing', label: '8. Content, privacy and data processing' },
        { id: 'our-technology-and-feedback', label: '9. Our technology and feedback' },
        { id: 'availability-and-third-party-services', label: '10. Availability and third-party services' },
        { id: 'warranties', label: '11. Warranties' },
        { id: 'limitation-of-liability', label: '12. Limitation of liability' },
        { id: 'indemnity-for-business-users', label: '13. Indemnity for business users' },
        { id: 'suspension-deletion-and-termination', label: '14. Suspension, deletion and termination' },
        { id: 'changes-to-these-terms', label: '15. Changes to these Terms' },
        { id: 'force-majeure', label: '16. Force majeure' },
        { id: 'general-and-governing-law', label: '17. General and governing law' },
        { id: 'contact', label: '18. Contact' },
    ],
    lastUpdated: '2026-06-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/legal/terms.tsx',
};

export const content = (
    <Stack gap={5}>
        <Heading id="terms-of-service" level="h1">
            Terms of Service
        </Heading>

        <Section>
            <Heading id="provider-acceptance-and-eligibility" level="h2">
                1. Provider, acceptance and eligibility
            </Heading>
            <p>
                LongLink is operated by LongLink SAGL ("LongLink", "we", "us" or "our"), UID CHE-150.642.313. Contact:{' '}
                <A href="mailto:info@longlink.ch">info@longlink.ch</A>.
            </p>
            <p>
                These Terms form a binding agreement between you and LongLink SAGL. You accept them when you create an
                account, create or join an organization, deploy or access an application, connect infrastructure, use
                the SDK, CLI, hosted platform, application runtime, documentation, support channels, or otherwise use
                the Service.
            </p>
            <p>
                You must be at least 18 years old and legally capable of entering into this agreement. If you use the
                Service for an organization, you confirm that you have authority to bind it. The Service is not directed
                to minors.
            </p>
            <p>
                A "consumer" is an individual using the Service mainly for personal or household purposes. A "business
                user" is anyone using it mainly for professional or commercial purposes. Provisions that expressly apply
                to business users do not apply to consumers.
            </p>
        </Section>

        <Section>
            <Heading id="definitions-and-contract-documents" level="h2">
                2. Definitions and contract documents
            </Heading>
            <p>
                "Service" means the LongLink website, hosted platform, SDK, CLI, application runtime, APIs, proxying,
                deployment tooling, documentation, templates, and related support. "Application" means a LongLink
                application or workload that is built, registered, deployed, proxied, rendered, tested, or operated
                through the Service.
            </p>
            <p>
                "Organization" means a workspace or tenant boundary in LongLink. "Connected Infrastructure" means
                compute, database, storage, identity, registry, routing, DNS, monitoring, email, or other infrastructure
                connected to or managed through LongLink. "Customer Content" means data, code, configuration,
                environment values, credentials, files, objects, database records, logs, XML page definitions, API
                responses, and other material that you or your users upload, create, connect, deploy, store, proxy, or
                process through the Service.
            </p>
            <p>
                The applicable order, pricing shown when you start a paid plan or managed service, and any written order
                form, data processing agreement, service-level agreement, security addendum, or other agreement signed
                by both parties are part of the agreement. A signed document prevails over these Terms only for a direct
                conflict. These Terms prevail over inconsistent marketing material or documentation.
            </p>
        </Section>

        <Section>
            <Heading id="service-and-beta-status" level="h2">
                3. Service and beta status
            </Heading>
            <p>
                The Service provides tools for building, deploying, routing, operating, and observing custom business
                applications. Features, APIs, SDK behavior, platform screens, XML components, templates, infrastructure
                adapters, and deployment behavior may change over time.
            </p>
            <p>
                The Service is in active development and may be provided as alpha, beta, preview, self-hosted, local, or
                managed software depending on your use. Defects, interruptions, incompatibilities, migration work, and
                data loss may occur. No service-level commitment applies unless we agree to one in writing.
            </p>
            <p>
                We may modify, replace, or discontinue features where reasonably necessary for security, legal,
                technical, product, or commercial reasons. We will provide reasonable advance notice of a material
                reduction affecting an active paid managed service where practicable.
            </p>
            <p>
                The Service is not for high-risk use. You must not use the Service for life support, emergency services,
                critical infrastructure, autonomous weapons, safety-critical control, or any activity where failure
                could reasonably cause death, personal injury, or substantial physical or environmental damage.
            </p>
        </Section>

        <Section>
            <Heading id="accounts-organizations-and-security" level="h2">
                4. Accounts, organizations and security
            </Heading>
            <p>
                You must provide accurate account and organization information and keep it current. You are responsible
                for activity through your account, organizations, applications, credentials, infrastructure registries,
                and users whom you authorize.
            </p>
            <p>
                You must protect passwords, OAuth access, API credentials, deployment secrets, kubeconfigs, database
                credentials, object-storage keys, application environment values, SSH keys, and other access materials.
                You must use reasonable access controls and notify{' '}
                <A href="mailto:info@longlink.dev">info@longlink.dev</A> promptly if you suspect compromise.
            </p>
            <p>
                You are responsible for configuring and hardening applications, applying updates, managing encryption
                and keys, restricting network access, checking software licenses, validating deployments, and
                maintaining independent backups. We may isolate an application, revoke credentials, stop proxying,
                disable access, or suspend an organization where reasonably necessary to contain a security incident or
                protect the Service.
            </p>
        </Section>

        <Section>
            <Heading id="acceptable-use" level="h2">
                5. Acceptable use
            </Heading>
            <p>
                You must use the Service lawfully and within the technical, organizational, and plan limits shown to
                you.
            </p>
            <p>You must not:</p>
            <Ul>
                <Li>
                    resell, sublicense, sublease, or provide the hosted Service to third parties without our prior
                    written approval;
                </Li>
                <Li>
                    deploy malware, botnets, phishing, spam, denial-of-service attacks, credential theft, intrusion,
                    unauthorized scanning, or other harmful or deceptive activity;
                </Li>
                <Li>
                    access or interfere with another person's systems, data, accounts, applications, or infrastructure
                    without lawful, documented authorization;
                </Li>
                <Li>
                    upload, generate, process, proxy, store, or distribute unlawful Customer Content, child sexual abuse
                    material, stolen data, or content that infringes privacy, intellectual property, or other rights;
                </Li>
                <Li>
                    bypass or interfere with authentication, authorization, organization isolation, application
                    isolation, security controls, logging, metering, rate limits, image verification, deployment checks,
                    proxy controls, or platform protections;
                </Li>
                <Li>
                    conduct destructive stress tests, sustained resource-abuse workloads, cryptocurrency mining, or
                    activity that harms shared or connected infrastructure without our prior written approval;
                </Li>
                <Li>
                    use anonymization, proxy, VPN, Tor, or similar tools to facilitate unlawful activity, evade abuse
                    controls, or conceal the source of attacks; or
                </Li>
                <Li>
                    violate applicable sanctions, export-control rules, or restrictions on prohibited users,
                    territories, or end uses.
                </Li>
            </Ul>
            <p>
                You may not reverse engineer or circumvent the Service except to the limited extent that applicable law
                expressly permits and does not allow that right to be waived. You are responsible for obtaining all
                rights and licenses required for your Customer Content, software, datasets, models, dependencies,
                container images, and integrations, and for reviewing outputs before relying on or distributing them.
            </p>
            <p>
                We have no general obligation to monitor Customer Content. We may review technical metadata and
                investigate, preserve, quarantine, restrict, disable, or remove Customer Content, applications,
                organizations, accounts, or infrastructure connections where reasonably and proportionately necessary to
                address suspected abuse, fraud, security threats, or legal violations, protect users or infrastructure,
                or comply with a binding legal request. Our handling of personal data is described in the{' '}
                <A href="/privacy">Privacy Policy</A>.
            </p>
        </Section>

        <Section>
            <Heading id="plans-fees-and-managed-services" level="h2">
                6. Plans, fees and managed services
            </Heading>
            <p>
                Some LongLink software may be available without charge, while hosted platform access, managed
                deployments, support, consulting, custom development, infrastructure operations, or other services may
                be paid. Prices are in Swiss francs (CHF) unless stated otherwise.
            </p>
            <p>
                The plan, rate, scope, resource limits, included support, and billing period displayed when you order or
                confirmed in a written order form apply to that paid service. Usage-based, seat-based, infrastructure,
                support, installation, migration, storage, database, compute, bandwidth, or other clearly identified
                charges may be charged separately if disclosed before the charge is incurred.
            </p>
            <p>
                Prices include or identify applicable taxes and mandatory charges as required by law. If a payment
                provider is used, you authorize that provider and its supported payment methods to charge the amounts
                you approve. You remain liable for valid charges incurred through your account, organization, or order.
            </p>
            <p>
                Our transaction, usage, operation, support, and account records determine charges unless there is a
                manifest error. You must report a suspected billing error within 30 days after it appears in your
                account or invoice, with enough information for us to investigate. This deadline does not limit rights
                that cannot lawfully be waived. Overdue amounts accrue default interest at 5% per year, and business
                users must reimburse reasonable recovery costs to the extent permitted by law.
            </p>
        </Section>

        <Section>
            <Heading id="refunds-and-consumer-cancellation-rights" level="h2">
                7. Refunds and consumer cancellation rights
            </Heading>
            <p>
                Except where these Terms or mandatory law provide otherwise, completed setup work, delivered support,
                consumed usage, managed-service periods already provided, and properly charged fees are non-refundable.
                We may issue service credits at our discretion, but doing so does not create a continuing obligation.
                Any refund is reduced by valid charges and amounts you owe and is normally returned to the original
                payment method.
            </p>
            <p>
                Promotional credits, discounts, trial periods, or free allowances may be subject to stated expiry dates,
                scope limits, and abuse controls, and may be withdrawn if obtained through error, fraud, or abuse.
            </p>
            <p>
                Nothing in these Terms excludes a consumer's mandatory cancellation, refund, price-reduction, or other
                statutory rights. If mandatory law gives you a withdrawal period, by requesting immediate setup,
                deployment, support, or use of a paid managed service during that period you expressly request immediate
                performance. To the extent permitted by that law, you must pay for the proportion of Service supplied
                before withdrawal and may lose the withdrawal right once the requested Service has been fully performed.
            </p>
        </Section>

        <Section>
            <Heading id="content-privacy-and-data-processing" level="h2">
                8. Content, privacy and data processing
            </Heading>
            <p>
                As between you and us, you retain your rights in Customer Content. You grant us a non-exclusive,
                worldwide, royalty-free license to host, copy, transmit, route, access, inspect, transform, deploy,
                render, back up, and otherwise process Customer Content only as needed to provide, secure, support,
                operate, improve, and enforce the Service and comply with law. You confirm that you have the rights and
                lawful basis needed for Customer Content and these instructions.
            </p>
            <p>
                For personal data contained in Customer Content, you are the controller and we act as your processor
                when we operate the hosted Service for you, unless the law assigns different roles. These Terms are your
                instruction for us to process that data to provide, secure, support, and operate the Service. The
                subject matter, data types, and data subjects are determined by Customer Content and your use. You are
                responsible for notices, legal bases, data-subject requests, retention decisions, and assessing whether
                the Service is suitable for your processing.
            </p>
            <p>
                We will require personnel with access to Customer Content to protect its confidentiality, apply
                appropriate technical and organizational security measures, notify you without undue delay after
                becoming aware of a personal-data breach affecting Customer Content, and reasonably assist with legally
                required data-subject requests, security assessments, and breach obligations. Assistance beyond standard
                Service functionality may be charged at a reasonable rate.
            </p>
            <p>
                You generally authorize the subprocessors needed to operate the Service. We remain responsible for their
                processing to the extent required by law and will impose materially equivalent data-protection duties.
                We will give reasonable notice of a material new subprocessor where required, allowing you to object on
                documented data-protection grounds. If the parties cannot resolve the objection, you may stop the
                affected use. Cross-border transfers will use safeguards required by applicable law.
            </p>
            <p>
                Do not process health data, special-category or highly sensitive personal data, regulated secrets,
                payment-card data, or data subject to sector-specific localization or retention duties unless we have
                expressly agreed in a signed data processing agreement or order. You must encrypt sensitive Customer
                Content where appropriate and must not rely on the Service as your only copy.
            </p>
            <p>
                LongLink storage, databases, deployments, local development environments, and connected infrastructure
                are not backup services unless a written agreement expressly says so. Deleting, reinstalling, replacing,
                suspending, or terminating an application, schema, bucket, organization, runtime, or infrastructure
                resource may erase Customer Content without a recovery period. You are responsible for exporting
                Customer Content and, where possible, securely deleting it before deleting or releasing resources.
            </p>
            <p>
                We act as controller for account, organization, billing, support, security, and operational data, as
                explained in our <A href="/privacy">Privacy Policy</A>.
            </p>
        </Section>

        <Section>
            <Heading id="our-technology-and-feedback" level="h2">
                9. Our technology and feedback
            </Heading>
            <p>
                We and our licensors retain all rights in the Service, documentation, branding, templates, SDK, platform
                software, application runtime, XML renderer, infrastructure adapters, and underlying technology. These
                Terms grant only the limited right to use the Service during the agreement.
            </p>
            <p>
                If you voluntarily provide feedback, we may use it without restriction or payment, provided we do not
                identify you publicly without permission. Third-party software, dependencies, images, templates, and
                services remain subject to their own licenses and terms.
            </p>
        </Section>

        <Section>
            <Heading id="availability-and-third-party-services" level="h2">
                10. Availability and third-party services
            </Heading>
            <p>
                We may perform maintenance, restart services, rotate secrets, change network routes, migrate workloads,
                stop deployments, remove stale resources, or isolate applications, organizations, or infrastructure
                connections to protect the Service, users, or connected infrastructure.
            </p>
            <p>
                Identity providers, payment providers, container registries, cloud providers, Kubernetes clusters,
                database servers, storage providers, email providers, network carriers, template publishers, package
                registries, and other third parties are outside our control and may change or discontinue their
                services. You are responsible for verifying that third-party software, templates, infrastructure, and
                providers are suitable and properly licensed for your use.
            </p>
        </Section>

        <Section>
            <Heading id="warranties" level="h2">
                11. Warranties
            </Heading>
            <p>
                To the fullest extent permitted by law, the Service is provided "as is" and "as available", especially
                where it is beta, preview, local, self-hosted, open-source, or development software. We do not warrant
                uninterrupted, error-free, or secure operation, any particular performance, compatibility, migration
                outcome, deployment result, business result, or that Customer Content will be preserved.
            </p>
            <p>
                For business users, we disclaim implied warranties of merchantability, satisfactory quality, fitness for
                purpose, and non-infringement to the fullest extent permitted by law. Mandatory consumer warranties
                remain unaffected.
            </p>
        </Section>

        <Section>
            <Heading id="limitation-of-liability" level="h2">
                12. Limitation of liability
            </Heading>
            <p>
                Nothing in these Terms excludes or limits liability for wilful misconduct or gross negligence under
                Article 100(1) of the Swiss Code of Obligations, fraud, or any liability that cannot lawfully be
                excluded or limited.
            </p>
            <p>
                For business users, to the fullest extent permitted by law: (a) we are not liable for indirect,
                incidental, special, consequential, or punitive loss, or for lost profit, revenue, business,
                opportunity, goodwill, anticipated savings, data, Customer Content, credentials, or applications; and
                (b) our total aggregate liability arising from or related to the Service is limited to the fees paid or
                payable for the affected Service in the three months immediately before the event giving rise to the
                claim, capped at CHF 1,000. Liability for auxiliaries is excluded to the extent permitted by Article
                101(2) of the Swiss Code of Obligations.
            </p>
            <p>
                For consumers, exclusions and limits apply only to the extent permitted by mandatory law and do not
                restrict mandatory remedies. In all cases, you must take reasonable steps to avoid and reduce loss,
                including maintaining backups, securing credentials, and promptly responding to security, operational,
                and billing notices.
            </p>
        </Section>

        <Section>
            <Heading id="indemnity-for-business-users" level="h2">
                13. Indemnity for business users
            </Heading>
            <p>
                If you are a business user, you will defend, indemnify, and hold harmless LongLink SAGL and its
                personnel from third-party claims, damages, penalties, and reasonable legal costs arising from Customer
                Content, your applications, your users, your connected infrastructure, your breach of these Terms, or
                your infringement of law or third-party rights. This does not apply to the extent the claim was caused
                by our wilful misconduct or gross negligence.
            </p>
            <p>
                We will notify you reasonably promptly, allow you to control the defense and settlement, and provide
                reasonable cooperation at your cost. You may not settle a claim in a way that admits liability for us or
                imposes obligations on us without our written consent.
            </p>
        </Section>

        <Section>
            <Heading id="suspension-deletion-and-termination" level="h2">
                14. Suspension, deletion and termination
            </Heading>
            <p>
                You may stop using the Service at any time and may request account closure. Deleting an application,
                organization, schema, bucket, runtime, deployment, registry, or infrastructure connection may be
                irreversible and may immediately erase Customer Content. You remain responsible for charges incurred
                before deletion or termination and any outstanding balance.
            </p>
            <p>
                We may immediately suspend access, stop proxying, disable or delete an application, remove Customer
                Content, revoke credentials, suspend an organization, or terminate the agreement if you materially
                breach these Terms, fail to pay, create a security or legal risk, use the Service fraudulently or
                abusively, or if required by law. Where the issue is reasonably capable of cure and does not require
                urgent action, we will ordinarily give notice and a reasonable opportunity to cure.
            </p>
            <p>
                We may also terminate a paid managed Service for convenience on at least 30 days' notice. If we
                terminate for convenience, we will refund prepaid unused fees after deducting valid charges. If we
                terminate for your breach, unused prepaid fees will be handled as required by mandatory law after
                deducting amounts you owe. Sections that by their nature should survive termination do so, including
                payment obligations, intellectual property, privacy and data processing, liability, indemnity, and
                governing law.
            </p>
        </Section>

        <Section>
            <Heading id="changes-to-these-terms" level="h2">
                15. Changes to these Terms
            </Heading>
            <p>
                We may update these Terms for legal, security, technical, product, or commercial reasons. We will give
                at least 30 days' notice of a material adverse change by email or through the Service where practicable.
                Changes needed urgently for law or security may take effect sooner, with notice as soon as reasonably
                practicable. Changes apply from their effective date and do not retroactively change completed usage.
            </p>
            <p>
                If you do not agree to a material change, you must stop using the Service before it takes effect and may
                request closure and a refund of prepaid unused fees after valid charges are deducted where applicable.
                Continued use after the effective date constitutes acceptance where permitted by law.
            </p>
        </Section>

        <Section>
            <Heading id="force-majeure" level="h2">
                16. Force majeure
            </Heading>
            <p>
                Neither party is liable for delay or failure caused by events beyond its reasonable control, including
                power, carrier or internet failures, supplier outages, cloud-provider outages, identity-provider
                outages, natural disasters, labor disputes, war, cyberattacks, sanctions, or government action. This
                does not excuse your obligation to pay charges already incurred. The affected party will take reasonable
                steps to reduce the impact.
            </p>
        </Section>

        <Section>
            <Heading id="general-and-governing-law" level="h2">
                17. General and governing law
            </Heading>
            <p>
                These Terms and the incorporated documents are the entire agreement about the Service and replace prior
                statements on that subject. If a provision is invalid or unenforceable, it will be enforced to the
                maximum lawful extent and the remaining provisions remain effective. A failure to enforce a right is not
                a waiver. You may not assign this agreement without our written consent. We may assign it as part of a
                merger, reorganization, financing, or transfer of the relevant business, provided this does not reduce
                mandatory consumer rights.
            </p>
            <p>
                Swiss substantive law governs, excluding its conflict-of-law rules. For business users, the competent
                Swiss courts have exclusive jurisdiction. For consumers, this choice of law and forum does not deprive
                you of mandatory protections or access to any court available under applicable consumer or jurisdiction
                law.
            </p>
        </Section>

        <Section>
            <Heading id="contact" level="h2">
                18. Contact
            </Heading>
            <p>
                Legal enquiries: <A href="mailto:info@longlink.ch">info@longlink.ch</A>. General, technical, account,
                and billing enquiries: <A href="mailto:info@longlink.dev">info@longlink.dev</A>.
            </p>
            <p>LongLink SAGL, UID CHE-150.642.313.</p>
        </Section>
    </Stack>
);
