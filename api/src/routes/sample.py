from src.ui import Layout
from src.router import router


# A LongLink page takes a URL, with filders and stuff. If is not possible to show in a single page then the content is too complex
# Each POST request from the page shall automatically re-render the page. Given that we assume new data has come
@router.get('/sample/page')
async def form():
    """Return an example page schema payload with a hero component."""
    page = Layout()
    page.hero(title='Data Table', subtitle='This is an example of a data table component.')
    primary_action = page.button(text='Primary action')
    dialog = primary_action.dialog(confirm='Submit', cancel='Cancel')

    dialog_table = dialog.table(
        [
            {
                'id': '1',
                'name': 'Acme Corp',
                'owner': 'Adriano Saurwein',
            },
            {
                'id': '2',
                'name': 'LongLink',
                'owner': 'Leonardo Saurwein',
            },
        ]
    )
    dialog_table.add_column('name', label='Name', cell='{name}')
    dialog_table.add_column('owner', label='Owner', cell='{owner}')

    table = page.table(
        [
            {
                'id': '1',
                'client': {
                    'name': 'Adriano Saurwein',
                    'email': 'adriano@email.com',
                },
                'invoiceNumber': 'INV-001',
                'issueDate': '2024-01-10',
                'dueDate': '2024-01-20',
                'status': 'Paid',
                'subtotal': 1000,
                'vat': 200,
            },
            {
                'id': '2',
                'client': {
                    'name': 'Leonardo Saurwein',
                    'email': 'leo@email.com',
                },
                'invoiceNumber': 'INV-002',
                'issueDate': '2024-01-15',
                'dueDate': '2024-01-30',
                'status': 'Pending',
                'subtotal': 450,
                'vat': 90,
            },
        ]
    )
    table.add_column("invoice", label="Invoice", cell=["{invoiceNumber}", "Issued {issueDate}", "Status: {status}"], align="left")
    table.add_column("client", label="Client", cell=["{client.name}", "{client.email}"])
    table.add_column("dueDate", label="Dates", cell=["{issueDate}", "Due date: {dueDate}"], align="left")
    table.add_column("amount", label="Amount", cell=["€{subtotal}", "VAT €{vat}"], align="right")

    
    col1, col2 = page.columns([70, 30])

    col1.hero(title="Column 1", subtitle="This is the first column")
    col2.hero(title="Column 2", subtitle="This is the second column")
    col2.button(text='Secondary action', variant='outline')
    col2.separator()
    col2.hero(title="After separator", subtitle="This section starts after a horizontal separator")


    table = col1.table(
        [
            {
                'id': '1',
                'client': {
                    'name': 'Adriano Saurwein',
                    'email': 'adriano@email.com',
                },
                'invoiceNumber': 'INV-001',
                'issueDate': '2024-01-10',
                'dueDate': '2024-01-20',
                'status': 'Paid',
                'subtotal': 1000,
                'vat': 200,
            },
            {
                'id': '2',
                'client': {
                    'name': 'Leonardo Saurwein',
                    'email': 'leo@email.com',
                },
                'invoiceNumber': 'INV-002',
                'issueDate': '2024-01-15',
                'dueDate': '2024-01-30',
                'status': 'Pending',
                'subtotal': 450,
                'vat': 90,
            },
        ]
    )
    table.add_column("invoice", label="Invoice", cell=["{invoiceNumber}", "Issued {issueDate}", "Status: {status}"], align="left")
    table.add_column("client", label="Client", cell=["{client.name}", "{client.email}"])
    table.add_column("dueDate", label="Dates", cell=["{issueDate}", "Due date: {dueDate}"], align="left")
    table.add_column("amount", label="Amount", cell=["€{subtotal}", "VAT €{vat}"], align="right")


    return list(page)
