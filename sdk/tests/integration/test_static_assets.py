from longlink.app import LongLink
from fastapi.testclient import TestClient


def test_sdk_serves_static_index_and_spa_fallback(tmp_path, monkeypatch):
    """Ensure the SDK app serves built .static assets and falls back to index.html."""

    static_dir = tmp_path / 'longlink' / '.static'
    static_dir.mkdir(parents=True)
    (static_dir / 'index.html').write_text('<html><body>sdk static</body></html>', encoding='utf-8')

    def fake_resolve(self):
        """Redirect the SDK app's own file lookup into the temp static directory."""

        if self.name == 'app.py':
            return static_dir.parent
        return self

    monkeypatch.setattr('longlink.app.Path.resolve', fake_resolve)

    client = TestClient(LongLink())

    index_response = client.get('/index.html')
    fallback_response = client.get('/missing-page', headers={'accept': 'text/html'})

    assert index_response.status_code == 200
    assert index_response.text == '<html><body>sdk static</body></html>'
    assert fallback_response.status_code == 200
    assert fallback_response.text == '<html><body>sdk static</body></html>'
