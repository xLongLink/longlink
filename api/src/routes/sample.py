from src.router import router
from src.ui import Page


@router.get('/sample/page')
async def form():
    """Return a sample page schema payload with a nested menu."""
    page = Page()

    page.hero(
        title='Nested menu example',
        subtitle='Sample backend response for rendering a nested navigation menu.',
    )

    menu = page.menu()

    overview_section = menu.section('Overview', icon='layout-dashboard')
    overview_section.hero(
        title='Overview',
        subtitle='Top-level menu content.',
    )

    tools_section = menu.section('Tools', icon='wrench')
    tools_section.hero(
        title='Tools',
        subtitle='This section has nested menu items.',
    )

    crm_subsection = tools_section.section('CRM')
    crm_subsection.hero(
        title='CRM',
        subtitle='Nested submenu inside Tools.',
    )

    clients_tab, suppliers_tab = crm_subsection.tabs(['Clients', 'Suppliers'])
    clients_tab.text('Clients list and relationship notes.')
    suppliers_tab.text('Suppliers list and contract status.')

    analytics_subsection = tools_section.section('Analytics')
    analytics_subsection.hero(
        title='Analytics',
        subtitle='Another nested submenu at the same level.',
    )
    metrics_table = analytics_subsection.table(
        [
            {'id': 'm1', 'metric': 'Monthly active users', 'value': '1,240'},
            {'id': 'm2', 'metric': 'Open projects', 'value': '18'},
        ]
    )
    metrics_table.column('metric', label='Metric', cell='{metric}')
    metrics_table.column('value', label='Value', cell='{value}', align='right')

    projects_section = menu.section('Projects', icon='folder-kanban')
    projects_section.hero(
        title='Projects',
        subtitle='Sample third menu entry.',
    )

    return list(page)
