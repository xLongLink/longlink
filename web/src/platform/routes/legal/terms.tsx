import { legalPaths } from '@/platform/publications';
import { PublicArticle } from '@/components/layouts/article';
import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeStack as Stack } from '@/components/custom/native-stack';

const article = {
    description: 'Read the LongLink terms of service.',
    toc: [
        { id: 'terms-of-service', label: 'Terms of Service', level: 1 },
        { id: 'provider-acceptance-and-eligibility', label: '1. Provider, acceptance and eligibility', level: 2 },
        { id: 'definitions-and-contract-documents', label: '2. Definitions and contract documents', level: 2 },
        { id: 'service-and-beta-status', label: '3. Service and beta status', level: 2 },
        { id: 'accounts-organizations-and-security', label: '4. Accounts, organizations and security', level: 2 },
        { id: 'acceptable-use', label: '5. Acceptable use', level: 2 },
        { id: 'usage-and-payments', label: '6. Usage and payments', level: 2 },
        { id: 'content-privacy-and-data-processing', label: '7. Content and privacy', level: 2 },
        { id: 'our-technology-and-feedback', label: '8. Our technology and feedback', level: 2 },
        { id: 'warranties', label: '9. Warranties', level: 2 },
        { id: 'limitation-of-liability', label: '10. Limitation of liability', level: 2 },
        { id: 'indemnity-for-business-users', label: '11. Indemnity for business users', level: 2 },
        { id: 'suspension-deletion-and-termination', label: '12. Suspension and termination', level: 2 },
        { id: 'changes-to-these-terms', label: '13. Changes to these Terms', level: 2 },
        { id: 'force-majeure', label: '14. Force majeure', level: 2 },
        { id: 'general-and-governing-law', label: '15. General and governing law', level: 2 },
        { id: 'contact', label: '16. Contact', level: 2 }
    ],
    lastUpdated: '2026-09-23',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/legal/terms.tsx',
    title: 'Terms of Service | LongLink'
};

/** Renders the terms of service. */
export default function Terms() {
    // Keep the terms of service within the shared public shell and legal reading order.
    return (
        <PublicArticle article={article} paths={legalPaths}>
            <Stack className="[&_:is(h1,h2,h3,h4,h5,h6)]:tracking-wide" gap={5}>
                <h1 className="font-semibold tracking-tight text-4xl" id="terms-of-service">
                    Terms of Service
                </h1>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="provider-acceptance-and-eligibility">
                        1. Provider, acceptance and eligibility
                    </h2>
                    <p>
                        LongLink is operated by LongLink SAGL ("LongLink", "we", "us" or "our"), UID CHE-150.642.313.
                        Contact:{' '}
                        <Link href="mailto:info@longlink.dev" className="underline">
                            info@longlink.dev
                        </Link>
                        .
                    </p>
                    <p>
                        These Terms apply when you create an account or use our hosted platform, including connecting
                        infrastructure or deploying a Solution through it. By doing so, you agree to these Terms. They
                        do not govern independent use of open-source software or merely reading our public website.
                    </p>
                    <p>
                        You must be at least 18 and legally capable of entering this agreement. If you use the Service
                        for an organization, you confirm that you have authority to bind it.
                    </p>
                    <p>
                        A "consumer" uses the Service mainly for personal purposes; a "business user" uses it mainly for
                        professional or commercial purposes.
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="definitions-and-contract-documents">
                        2. Definitions and contract documents
                    </h2>
                    <p>
                        "Service" means the LongLink hosted platform, its APIs, deployment tooling, and related support,
                        including the SDK and runtime when connected to our platform. "Solution" means a workload
                        registered or operated through the Service. "Organization" means a workspace in LongLink.
                    </p>
                    <p>
                        "Customer Content" means data, code, configurations, credentials, and other material that you or
                        your users submit, connect, store, or process through the Service, including Solution data.
                    </p>
                    <p>
                        Any accepted order and written agreement signed by both parties also apply. A signed agreement
                        prevails over these Terms where they conflict; these Terms prevail over marketing material and
                        documentation.
                    </p>
                    <p>
                        Open-source licenses govern use, copying, modification, and distribution of the software they
                        cover. These Terms do not restrict those rights. If you operate LongLink yourself, you are
                        responsible for the service you provide to your users.
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="service-and-beta-status">
                        3. Service and beta status
                    </h2>
                    <p>
                        The Service is in beta. Features and APIs may change, and defects, interruptions, or data loss
                        may occur. No uptime or service-level commitment applies unless agreed in writing.
                    </p>
                    <p>
                        We may change or discontinue features for security, legal, technical, or product reasons. We
                        will give reasonable advance notice of a material reduction to an active paid service where
                        practicable.
                    </p>
                    <p>
                        Do not use the Service where a failure could reasonably cause death, personal injury, or
                        substantial physical or environmental damage.
                    </p>
                    <p>
                        Third-party providers and customer-connected infrastructure may change or become unavailable.
                        You are responsible for choosing and maintaining infrastructure and third-party services you
                        connect.
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="accounts-organizations-and-security">
                        4. Accounts, organizations and security
                    </h2>
                    <p>
                        Keep account and organization information accurate. You are responsible for activity by users
                        you authorize and for securing your accounts, Solutions, credentials, and connected
                        infrastructure.
                    </p>
                    <p>
                        Use reasonable access controls and notify{' '}
                        <Link href="mailto:info@longlink.dev" className="underline">
                            info@longlink.dev
                        </Link>{' '}
                        promptly if you suspect unauthorized access or a credential compromise.
                    </p>
                    <p>
                        You are responsible for configuring and updating your Solutions, protecting secrets, controlling
                        access, and maintaining independent backups. We may restrict access or isolate resources where
                        reasonably necessary to contain a security incident or protect the Service.
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="acceptable-use">
                        5. Acceptable use
                    </h2>
                    <p>Use the Service lawfully and within your configured resource limits. You must not:</p>
                    <ul className="m-0 flex list-disc flex-col gap-0.5 ps-8 [&>li]:pe-2 [&>li]:py-2">
                        <li>
                            <span>
                                resell our hosted platform without our written approval (this does not prevent you from
                                giving your users access to your Solutions);
                            </span>
                        </li>
                        <li>
                            <span>
                                use the Service for malware, phishing, spam, denial-of-service attacks, unauthorized
                                scanning, or other harmful activity;
                            </span>
                        </li>
                        <li>
                            <span>access or interfere with systems, accounts, or data without authorization;</span>
                        </li>
                        <li>
                            <span>process unlawful content or content that infringes another person's rights;</span>
                        </li>
                        <li>
                            <span>
                                bypass access controls, tenant isolation, rate limits, or other security measures;
                            </span>
                        </li>
                        <li>
                            <span>
                                run destructive tests or workloads that disrupt shared infrastructure without our
                                written approval; or
                            </span>
                        </li>
                        <li>
                            <span>violate applicable sanctions or export-control laws.</span>
                        </li>
                    </ul>
                    <p>
                        You are responsible for having the rights needed to submit Customer Content and use your
                        software, images, and integrations. Do not reverse engineer or circumvent the hosted platform
                        except as permitted by law or an applicable open-source license.
                    </p>
                    <p>
                        We do not routinely monitor Customer Content. We may investigate and restrict or remove content,
                        access, or resources where reasonably necessary to address suspected abuse, security risks, or
                        legal violations. We handle personal data as described in our{' '}
                        <Link href="/privacy/" className="underline">
                            Privacy Policy
                        </Link>
                        .
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="usage-and-payments">
                        6. Usage and payments
                    </h2>
                    <p>
                        Usage within the published free allowances has no fee. Usage above those allowances is measured
                        at month-end and charged monthly to your saved payment method at the published rates, without
                        proration. If you order another paid service, the disclosed price and limits apply. Prices are
                        in Swiss francs (CHF) unless stated otherwise, with taxes identified as required by law.
                    </p>
                    <p>
                        You owe valid charges incurred through your account or order. Contact us promptly about billing
                        errors so we can investigate. This does not limit any non-waivable rights.
                    </p>
                    <p>
                        Except where mandatory law or your order provides otherwise, fees for delivered work or service
                        periods already used are non-refundable. If we end a paid service for convenience, we will
                        refund prepaid fees for the unused period after deducting valid charges. Mandatory consumer
                        cancellation and refund rights remain unaffected.
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="content-privacy-and-data-processing">
                        7. Content and privacy
                    </h2>
                    <p>
                        You retain your rights in Customer Content. You grant us a non-exclusive, worldwide,
                        royalty-free license to host, copy, transmit, and otherwise process it only as needed to
                        provide, secure, and support the Service, enforce these Terms, and comply with law. You confirm
                        you have the rights to give us that permission.
                    </p>
                    <p>
                        When we operate the hosted Service for you, you generally control personal data in Customer
                        Content and we process it on your behalf to provide, secure, and support the Service. You are
                        responsible for the required notices, legal bases, and instructions. Any signed data processing
                        agreement also applies.
                    </p>
                    <p>
                        We will apply appropriate security measures, restrict personnel access to those who need it, and
                        notify you without undue delay after becoming aware of a personal-data breach affecting Customer
                        Content. We will reasonably assist you with legally required data-subject and breach
                        obligations.
                    </p>
                    <p>
                        We may use providers needed to operate the Service, subject to applicable data-protection law
                        and any signed data processing agreement. We remain responsible for their processing as required
                        by law. Cross-border transfers will use legally required safeguards.
                    </p>
                    <p>
                        Do not process health data, other highly sensitive personal data, or payment-card data through
                        the Service without our prior written agreement. Encrypt sensitive Customer Content where
                        appropriate.
                    </p>
                    <p>
                        The Service is not a backup service unless agreed in writing. Deleting or replacing a Solution,
                        organization, or connected resource may permanently erase Customer Content. Keep independent
                        backups and export your data before deleting resources or closing your account.
                    </p>
                    <p>
                        We act as controller for account, organization, billing, support, security, and operational
                        data, as explained in our{' '}
                        <Link href="/privacy/" className="underline">
                            Privacy Policy
                        </Link>
                        .
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="our-technology-and-feedback">
                        8. Our technology and feedback
                    </h2>
                    <p>
                        We and our licensors retain rights in the Service and our branding, subject to applicable
                        open-source licenses. You may use the hosted Service while these Terms apply. Open-source
                        licenses govern the corresponding software; third-party products remain subject to their own
                        terms.
                    </p>
                    <p>
                        We may use feedback you voluntarily provide without payment, but will not identify you publicly
                        without permission.
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="warranties">
                        9. Warranties
                    </h2>
                    <p>
                        To the fullest extent permitted by law, the Service is provided "as is" and "as available". We
                        do not guarantee uninterrupted operation, a particular result, or preservation of Customer
                        Content. Separately licensed software is subject to the warranty terms of its license.
                    </p>
                    <p>
                        For business users, implied warranties are excluded to the extent permitted by law. Mandatory
                        consumer rights remain unaffected.
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="limitation-of-liability">
                        10. Limitation of liability
                    </h2>
                    <p>
                        Nothing in these Terms excludes or limits liability for wilful misconduct or gross negligence
                        under Article 100(1) of the Swiss Code of Obligations, fraud, or any liability that cannot
                        lawfully be excluded or limited.
                    </p>
                    <p>
                        For business users, to the fullest extent permitted by law, we are not liable for indirect or
                        consequential loss, lost profits, or lost data. Our total liability related to the Service is
                        limited to the fees paid or payable for the affected Service in the three months before the
                        claim arose, capped at CHF 1,000. Liability for auxiliaries is excluded to the extent permitted
                        by Article 101(2) of the Swiss Code of Obligations.
                    </p>
                    <p>
                        For consumers, limits apply only where permitted by mandatory law. You must take reasonable
                        steps to prevent and reduce loss, including maintaining backups and securing credentials.
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="indemnity-for-business-users">
                        11. Indemnity for business users
                    </h2>
                    <p>
                        If you are a business user, you will defend and indemnify LongLink SAGL against third-party
                        claims and reasonable costs arising from your Customer Content, your breach of these Terms, or
                        your infringement of others' rights, except to the extent caused by our wilful misconduct or
                        gross negligence.
                    </p>
                    <p>
                        We will notify you reasonably promptly and let you control the defense, with our reasonable
                        cooperation at your cost. You may not agree to obligations on our behalf without our written
                        consent.
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="suspension-deletion-and-termination">
                        12. Suspension and termination
                    </h2>
                    <p>
                        You may stop using the Service or request account closure at any time. Export your Customer
                        Content first; deletion may be irreversible. You remain responsible for charges incurred before
                        closure.
                    </p>
                    <p>
                        We may suspend access or remove affected resources immediately for a material breach,
                        nonpayment, abuse, security risk, or legal requirement. We may terminate the Service for these
                        reasons. Where the issue can be fixed without urgent action, we will give notice and a
                        reasonable opportunity to remedy it.
                    </p>
                    <p>
                        We may end a paid service for convenience on at least 30 days' notice. Terms concerning payment,
                        intellectual property, privacy, liability, indemnity, and governing law survive termination
                        where relevant.
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="changes-to-these-terms">
                        13. Changes to these Terms
                    </h2>
                    <p>
                        We may update these Terms as the Service or law changes. We will give at least 30 days' notice
                        of material adverse changes by email or through the Service, except where an urgent legal or
                        security change requires earlier effect. We will notify you of urgent changes as soon as
                        practicable.
                    </p>
                    <p>
                        Changes take effect prospectively. If you disagree, stop using the Service before they take
                        effect; you may request closure and a refund of unused prepaid fees, less valid charges.
                        Continued use after the effective date constitutes acceptance where permitted by law.
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="force-majeure">
                        14. Force majeure
                    </h2>
                    <p>
                        Neither party is liable for delays caused by events beyond its reasonable control, including
                        supplier outages, natural disasters, and government action. This does not excuse payment for
                        charges already incurred. The affected party will take reasonable steps to reduce the impact.
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="general-and-governing-law">
                        15. General and governing law
                    </h2>
                    <p>
                        These Terms and any applicable signed agreement are the entire agreement about the Service. If a
                        provision is unenforceable, the rest remains effective. A failure to enforce a right is not a
                        waiver. You may not assign this agreement without our written consent; we may assign it with a
                        transfer of our business, subject to mandatory consumer rights.
                    </p>
                    <p>
                        Swiss law governs. For business users, the competent Swiss courts have exclusive jurisdiction.
                        For consumers, mandatory protections and available courts under applicable law remain
                        unaffected.
                    </p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="contact">
                        16. Contact
                    </h2>
                    <p>
                        Legal enquiries:{' '}
                        <Link href="mailto:info@longlink.dev" className="underline">
                            info@longlink.dev
                        </Link>
                        . General, technical, account, and billing enquiries:{' '}
                        <Link href="mailto:info@longlink.dev" className="underline">
                            info@longlink.dev
                        </Link>
                        .
                    </p>
                    <p>LongLink SAGL, UID CHE-150.642.313.</p>
                </Stack>
            </Stack>
        </PublicArticle>
    );
}
