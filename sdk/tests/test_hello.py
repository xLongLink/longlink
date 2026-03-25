import os

os.environ['KEY'] = 'test-key'
os.environ['DATABASE_URL'] = 'sqlite:///test.db'
os.environ['STORAGE_KEY'] = 'storage-key'
os.environ['STORAGE_SECRET'] = 'storage-secret'
os.environ['STORAGE_ENDPOINT'] = 'http://localhost:9000'

from longlink.hello import hello_world


def test_hello_world() -> None:
    assert hello_world() == 'hello world'
