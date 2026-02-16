from src.router import router
from src.ui import Page


# A LongLink page takes a URL, with folders and stuff. If it's not possible to show in a single
# page then the content is too complex.
@router.get('/sample/page')
async def form():
    """Return a showcase page schema payload for UI component examples."""
    page = Page()

    page.hero(
        title='UI Components Showcase',
        subtitle='A complete sample using sidebar, table, tabs, hero, columns, buttons and dialog.',
    )

    menu = page.menu()

    first_section = menu.section('1) Table Showcase', icon='table')
    first_section.hero(
        title='Customers Table',
        subtitle='The first sidebar section demonstrates table rendering.',
    )
    customers_table = first_section.table(
        [
            {
                'id': '1',
                'name': 'Acme Corp',
                'owner': 'Adriano Saurwein',
                'status': 'Active',
            },
            {
                'id': '2',
                'name': 'LongLink',
                'owner': 'Leonardo Saurwein',
                'status': 'Pilot',
            },
        ]
    )
    customers_table.column('name', label='Name', cell='{name}')
    customers_table.column('owner', label='Owner', cell='{owner}')
    customers_table.column('status', label='Status', cell='{status}', align='right')

    second_section = menu.section('2) Tabs Showcase', icon='tabs')
    second_section.hero(
        title='Tabbed navigation',
        subtitle='The second sidebar section includes two subsections with tabs and extra UI.',
    )

    hero_subsection = second_section.section('Hero subsection')
    hero_subsection.hero(
        title='Hero in subsection',
        subtitle='This subsection starts with a hero and a call to action button.',
    )
    action_button = hero_subsection.button(text='Open dialog', variant='outline')
    action_dialog = action_button.dialog(confirm='Create', cancel='Close')
    action_dialog.hero(title='Dialog example', subtitle='This is a dialog opened from a button.')

    tabs_subsection = second_section.section('Tabs subsection')
    overview_tab, details_tab = tabs_subsection.tabs(['Overview', 'Details'])

    overview_tab.hero(
        title='Overview tab content',
        subtitle='Quick project metrics and contextual information.',
    )
    overview_tab.button(text='Primary action')
    overview_tab.separator()

    detail_table = details_tab.table(
        [
            {'id': 'a1', 'metric': 'Open invoices', 'value': '12'},
            {'id': 'a2', 'metric': 'Overdue invoices', 'value': '3'},
            {'id': 'a3', 'metric': 'Total clients', 'value': '27'},
        ]
    )
    detail_table.column('metric', label='Metric', cell='{metric}')
    detail_table.column('value', label='Value', cell='{value}', align='right')

    page.separator()

    left_col, right_col = page.columns([70, 30])
    left_col.hero(title='Columns: main area', subtitle='A wider column for primary information.')
    right_col.hero(title='Columns: side area', subtitle='A narrow column for quick actions.')
    right_col.button(text='Secondary action', variant='secondary')

    return list(page)
