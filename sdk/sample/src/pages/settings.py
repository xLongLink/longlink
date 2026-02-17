from longlink import Router, Page


router = Router()


@router.page("/settings", name="Settings", icon="settings")
async def settings_page() -> Page:
    page = Page()

    page.hero(
        title="Settings",
        subtitle="Manage your app preferences and account defaults.",
    )

    profile_tab, notifications_tab, security_tab = page.tabs([
        "Profile",
        "Notifications",
        "Security",
    ])

    profile_tab.input(
        label="Display name",
        placeholder="Jane Doe",
        description="This name will be visible to other users.",
        submit="Save profile",
    )
    profile_tab.input(
        label="Timezone",
        placeholder="UTC",
        description="Used for scheduling and activity timestamps.",
    )

    notifications_tab.input(
        label="Email notifications",
        placeholder="Enabled / Disabled",
        description="Choose whether updates are sent to your email.",
        submit="Save notifications",
    )

    security_tab.input(
        label="Two-factor authentication",
        placeholder="Enabled / Disabled",
        description="Add an extra layer of security to your account.",
    )
    security_tab.button("Update security settings", variant="secondary")

    return page
