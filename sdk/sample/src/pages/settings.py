from src.app import app
from longlink import Page


@app.page("/settings", name="Settings", icon="settings")
async def settings_page() -> Page:
    page = Page()

    page.hero(
        title="Organization settings",
        subtitle="Configure identity, governance, integrations, and operational defaults for your LongLink workspace.",
    )

    general_tab, security_tab, data_tab, integrations_tab, billing_tab = page.tabs([
        "General",
        "Security & Access",
        "Data & Compliance",
        "Integrations",
        "Billing & Plans",
    ])

    # General
    general_tab.input(
        label="Organization name",
        placeholder="Acme Operations",
        description="Displayed in workspace headers, invites, and audit exports.",
        submit="Save organization profile",
    )
    general_tab.input(
        label="Workspace subdomain",
        placeholder="acme.longlink.com",
        description="Primary access URL for your isolated LongLink runtime.",
    )
    general_tab.input(
        label="Default timezone",
        placeholder="UTC",
        description="Used for schedules, jobs, and timestamp normalization across apps.",
    )
    general_tab.input(
        label="Default language",
        placeholder="English (US)",
        description="Applies to newly invited users by default.",
    )
    general_tab.button("Save general settings", variant="secondary")

    # Security & Access
    security_tab.input(
        label="SSO provider",
        placeholder="Google / Entra ID / Okta / OIDC / SAML",
        description="Identity federation is managed by LongLink and propagated to applications.",
        submit="Save identity provider",
    )
    security_tab.input(
        label="Session timeout",
        placeholder="8 hours",
        description="Automatically signs out inactive users from the organization.",
    )
    security_tab.input(
        label="MFA enforcement",
        placeholder="Required for admins",
        description="Controls mandatory multi-factor authentication policies.",
    )
    security_tab.input(
        label="Default role for new members",
        placeholder="Member",
        description="Baseline RBAC role assigned during invitation.",
    )
    security_tab.button("Apply access policy", variant="secondary")

    # Data & Compliance
    data_tab.input(
        label="Data residency region",
        placeholder="EU-West",
        description="Preferred region for managed infrastructure and storage policy constraints.",
        submit="Save data governance",
    )
    data_tab.input(
        label="Audit log retention",
        placeholder="365 days",
        description="Retention duration for access, policy, and workflow events.",
    )
    data_tab.input(
        label="Backup schedule",
        placeholder="Daily at 02:00 UTC",
        description="Defines periodic backup orchestration for organization workloads.",
    )
    data_tab.input(
        label="Backup verification",
        placeholder="Weekly restore check",
        description="Cadence for restoration tests and disaster recovery readiness.",
    )
    data_tab.button("Run backup now", variant="outline")

    # Integrations
    integrations_tab.input(
        label="Outgoing webhook endpoint",
        placeholder="https://ops.example.com/longlink/events",
        description="Receives organization-level lifecycle and governance events.",
        submit="Save webhook",
    )
    integrations_tab.input(
        label="Webhook signing secret",
        placeholder="••••••••••••••",
        description="Secret used to verify LongLink event signatures.",
    )
    integrations_tab.input(
        label="Default object storage namespace",
        placeholder="s3://acme-longlink/",
        description="Base namespace used by apps for managed file operations.",
    )
    integrations_tab.input(
        label="API access policy",
        placeholder="Read-only tokens for external systems",
        description="Global defaults for generated API credentials.",
    )
    integrations_tab.button("Rotate integration secrets", variant="destructive")

    # Billing & Plans
    billing_tab.input(
        label="Current plan",
        placeholder="Business",
        description="Determines limits for users, modules, and operational features.",
    )
    billing_tab.input(
        label="Billing contact",
        placeholder="finance@acme.com",
        description="Primary owner for invoices, receipts, and subscription notices.",
        submit="Update billing contact",
    )
    billing_tab.input(
        label="Cost center",
        placeholder="OPS-001",
        description="Default accounting reference attached to usage exports.",
    )
    billing_tab.input(
        label="Spending alert threshold",
        placeholder="$2,500 / month",
        description="Notification threshold for monthly platform consumption.",
    )
    billing_tab.button("Open usage report", variant="secondary")

    settings_menu = page.menu()

    profile_section = settings_menu.section("Organization profile", icon="building")
    details_subsection = profile_section.section("Workspace details")
    details_subsection.input(
        label="Legal entity name",
        placeholder="Acme Operations LLC",
        description="Used in contracts, invoices, and compliance exports.",
    )
    details_subsection.input(
        label="Support contact",
        placeholder="support@acme.com",
        description="Shown to users in operational and incident notifications.",
    )

    branding_subsection = profile_section.section("Branding")
    branding_subsection.input(
        label="Primary color",
        placeholder="#4F46E5",
        description="Applied to shared organization theming surfaces.",
    )
    branding_subsection.input(
        label="Logo asset path",
        placeholder="s3://acme-branding/logo.svg",
        description="Managed logo location in organization storage.",
    )

    identity_section = settings_menu.section("Identity & access", icon="shield")
    sso_subsection = identity_section.section("Single sign-on")
    sso_subsection.input(
        label="Issuer URL",
        placeholder="https://idp.example.com",
        description="OIDC/SAML metadata endpoint for enterprise identity.",
    )
    sso_subsection.input(
        label="Allowed domains",
        placeholder="acme.com, acme.org",
        description="Restrict access to approved email domains.",
    )

    rbac_subsection = identity_section.section("Role policies")
    rbac_subsection.input(
        label="Admin approval for role escalation",
        placeholder="Enabled",
        description="Requires approval workflow before elevating sensitive roles.",
    )
    rbac_subsection.input(
        label="Privileged session max duration",
        placeholder="1 hour",
        description="Limits high-privilege runtime sessions.",
    )

    operations_section = settings_menu.section("Operations", icon="server")
    runtime_subsection = operations_section.section("App runtime defaults")
    runtime_subsection.input(
        label="Default CPU limit",
        placeholder="1 vCPU",
        description="Baseline compute limit assigned to newly installed apps.",
    )
    runtime_subsection.input(
        label="Default memory limit",
        placeholder="512 MiB",
        description="Baseline memory policy assigned to newly installed apps.",
    )

    lifecycle_subsection = operations_section.section("Lifecycle automation")
    lifecycle_subsection.input(
        label="Maintenance window",
        placeholder="Sunday 01:00-03:00 UTC",
        description="Window for planned upgrades and control-plane operations.",
    )
    lifecycle_subsection.input(
        label="Deployment approval mode",
        placeholder="Manual for production modules",
        description="Defines release gates for app updates.",
    )

    compliance_section = settings_menu.section("Compliance", icon="file-text")
    audit_subsection = compliance_section.section("Audit and retention")
    audit_subsection.input(
        label="Tamper-evident log export",
        placeholder="Enabled",
        description="Exports signed log bundles for third-party compliance archives.",
    )
    audit_subsection.input(
        label="Data deletion SLA",
        placeholder="30 days",
        description="Target time to process approved erasure requests.",
    )

    incident_subsection = compliance_section.section("Incident response")
    incident_subsection.input(
        label="On-call escalation contact",
        placeholder="security-oncall@acme.com",
        description="Receives security and policy breach incidents.",
    )
    incident_subsection.input(
        label="Breach notification window",
        placeholder="24 hours",
        description="Internal target for escalation and stakeholder communication.",
        submit="Save compliance settings",
    )

    return page
