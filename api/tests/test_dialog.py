import unittest

from src.ui.button import Button


class TestDialog(unittest.TestCase):
    def test_button_dialog_serialization(self):
        button = Button(text='Open dialog')
        dialog = button.dialog(confirm='Submit', cancel='Cancel')

        dialog_table = dialog.table(data=[{'id': '1', 'name': 'Acme'}])
        dialog_table.add_column('name', label='Name', cell='{name}')

        payload = dict(button)

        self.assertEqual(payload['type'], 'button')
        self.assertEqual(payload['dialog']['type'], 'dialog')
        self.assertEqual(payload['dialog']['confirm'], 'Submit')
        self.assertEqual(payload['dialog']['cancel'], 'Cancel')
        self.assertEqual(payload['dialog']['components'][0]['type'], 'table')
        self.assertEqual(payload['dialog']['components'][0]['columns'][0]['key'], 'name')


if __name__ == '__main__':
    unittest.main()
