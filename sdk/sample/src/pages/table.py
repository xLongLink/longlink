from src.app import app
from longlink import Page


@app.page('/table', name='Table', icon='table')
async def table_page() -> Page:
    page = Page()

    page.hero(
        title='Table demo',
        subtitle='Sample tabular dataset rendered from the SDK page schema.',
    )

    projects_table = page.table(
        [
            {
                'id': 'p1',
                'name': 'Marketing Website',
                'owner': 'Alice',
                'status': 'In Progress',
                'budget': '$12,000',
            },
            {
                'id': 'p2',
                'name': 'Mobile App',
                'owner': 'Bruno',
                'status': 'Planning',
                'budget': '$35,000',
            },
            {
                'id': 'p3',
                'name': 'Data Migration',
                'owner': 'Carla',
                'status': 'Done',
                'budget': '$8,500',
            },
        ]
    )

    projects_table.column('name', label='Project', cell='{name}')
    projects_table.column('owner', label='Owner', cell='{owner}')
    projects_table.column('status', label='Status', cell='{status}')
    projects_table.column('budget', label='Budget', cell='{budget}', align='right')

    return page
