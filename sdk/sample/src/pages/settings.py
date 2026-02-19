from src.app import app
from longlink import Page


@app.page("/settings", name="Settings", icon="settings")
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

    settings_menu = page.menu()

    account_section = settings_menu.section("Account")
    account_profile = account_section.section("Profile")
    account_profile.input(
        label="Public handle",
        placeholder="@janedoe",
        description="Displayed in mentions and activity feeds.",
    )

    account_preferences = account_section.section("Preferences")
    account_preferences.input(
        label="Language",
        placeholder="English",
        description="Set the default language for your workspace.",
    )

    team_section = settings_menu.section("Team")
    members_subsection = team_section.section("Members")
    members_subsection.input(
        label="Default role",
        placeholder="Member",
        description="Applied when inviting new team members.",
    )

    access_subsection = team_section.section("Access")
    access_subsection.input(
        label="Session timeout",
        placeholder="8 hours",
        description="Automatically sign out inactive users.",
        submit="Save team settings",
    )

    return page
