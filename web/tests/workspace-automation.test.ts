import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const rootDirectory = join(import.meta.dir, '../..');
const makefile = readFileSync(join(rootDirectory, 'Makefile'), 'utf8');
const composeFile = readFileSync(join(rootDirectory, 'dev/compose.yml'), 'utf8');

describe('workspace automation', () => {
    it('installs, formats, and tests each workspace through dedicated targets', () => {
        expect(makefile).toContain('install: api\\:install sdk\\:install web\\:install');
        expect(makefile).toContain('api\\:install:\n\tcd api && uv sync --extra dev');
        expect(makefile).toContain('sdk\\:install:\n\tcd sdk && uv sync --extra dev');
        expect(makefile).toContain('web\\:install:\n\tbun i --cwd web');

        expect(makefile).toContain('format: api\\:format sdk\\:format web\\:format');
        expect(makefile).toContain('cd api && uv run isort .');
        expect(makefile).toContain('cd sdk && uv run isort .');
        expect(makefile).toContain('bunx prettier --log-level warn --write');

        expect(makefile).toContain('tests: api\\:tests sdk\\:tests web\\:tests');
        expect(makefile).toContain('cd api && ENVIRONMENT=testing uv run pytest --cov=src');
        expect(makefile).toContain('cd sdk && uv run pytest --cov=longlink');
        expect(makefile).toContain('bun test tests --cwd web');
        expect(makefile).toContain('bun run --cwd web typecheck');
    });

    it('defines web build, pyright, and clean targets for generated artifacts', () => {
        expect(makefile).toContain('build: web\\:install');
        expect(makefile).toContain('api\\:build: web\\:install');
        expect(makefile).toContain('sdk\\:build: web\\:install');
        expect(makefile).toContain('bun run --cwd web vite build --mode api --logLevel warn');
        expect(makefile).toContain('bun run --cwd web vite build --mode sdk --logLevel warn');

        expect(makefile).toContain('pyright: api\\:pyright sdk\\:pyright');
        expect(makefile).toContain('cd api && uv run --extra dev pyright');
        expect(makefile).toContain('cd sdk && uv run --group dev pyright');

        expect(makefile).toContain('clean: api\\:clean sdk\\:clean sdk\\:image\\:clean web\\:clean');
        expect(makefile).toContain('api/src/.static/web');
        expect(makefile).toContain('sdk/longlink/.static/web');
        expect(makefile).toContain('web/dist web/dist-ssr web/node_modules/.tmp web/node_modules/.vite');
        expect(makefile).toContain('docker image rm "$(LOCAL_SDK_IMAGE)"');
    });

    it('defines local services, cluster setup, and seed workflow', () => {
        expect(composeFile).toContain('postgres:');
        expect(composeFile).toContain('image: postgres:16-alpine');
        expect(composeFile).toContain('minio:');
        expect(composeFile).toContain('image: minio/minio:latest');
        expect(composeFile).toContain('registry:');
        expect(composeFile).toContain('image: registry:2');
        expect(composeFile).toContain('keycloak:');
        expect(composeFile).toContain('image: quay.io/keycloak/keycloak:25.0');

        expect(makefile).toContain('up: local-services');
        expect(makefile).toContain('k3d cluster create compute');
        expect(makefile).toContain('k3d kubeconfig get compute > api/kubeconfig.yaml');
        expect(makefile).toContain('http://localhost:15000/v2/');
        expect(makefile).toContain('http://localhost:18080/realms/dev/.well-known/openid-configuration');

        expect(makefile).toContain('seed: up');
        expect(makefile).toContain('uv run longlink init --folder dev');
        expect(makefile).toContain('uv run longlink build --registry localhost:15000 --push --tag dev');
        expect(makefile).toContain('DEVELOPMENT=true uv run alembic upgrade head');
        expect(makefile).toContain('DEVELOPMENT=true uv run python seed.py');
    });

    it('keeps the named SDK test coverage areas represented', () => {
        const expectedFiles = [
            'sdk/tests/test_storage.py',
            'sdk/tests/test_database.py',
            'sdk/tests/test_router.py',
            'sdk/tests/test_pages_route.py',
            'sdk/tests/test_i18n_route.py',
            'sdk/tests/test_logger.py',
            'sdk/tests/cli/test_build.py',
            'sdk/tests/cli/test_commands.py',
            'sdk/tests/cli/test_init.py',
            'sdk/tests/cli/test_translations.py',
            'sdk/tests/xml/adapters/test_action.py',
        ];

        for (const expectedFile of expectedFiles) {
            expect(existsSync(join(rootDirectory, expectedFile))).toBe(true);
        }
    });

    it('keeps the named API test coverage areas represented', () => {
        const expectedFiles = [
            'api/tests/adapters/test_compute_kubernetes.py',
            'api/tests/adapters/test_database_postgres.py',
            'api/tests/adapters/test_storage.py',
            'api/tests/db/test_applications_service.py',
            'api/tests/db/test_operation_runner.py',
            'api/tests/routes/test_applications.py',
            'api/tests/routes/test_auth.py',
            'api/tests/routes/test_icons.py',
            'api/tests/routes/test_image.py',
            'api/tests/routes/test_locations.py',
            'api/tests/routes/test_registries.py',
            'api/tests/test_mail.py',
        ];

        for (const expectedFile of expectedFiles) {
            expect(existsSync(join(rootDirectory, expectedFile))).toBe(true);
        }
    });

    it('keeps the named web test coverage areas represented', () => {
        const expectedFiles = [
            'web/tests/components/auth.test.tsx',
            'web/tests/docs/markdown-doc.test.tsx',
            'web/tests/layout/xml-layout.test.tsx',
            'web/tests/lib/api.test.ts',
            'web/tests/xml/adapters/action.test.tsx',
            'web/tests/xml/core/context.test.tsx',
            'web/tests/xml/core/parser.test.ts',
            'web/tests/xml/core/query.test.ts',
            'web/tests/xml/core/url.test.tsx',
            'web/tests/xml/expressions/evaluate.test.ts',
            'web/tests/xml/renderers.test.ts',
        ];

        for (const expectedFile of expectedFiles) {
            expect(existsSync(join(rootDirectory, expectedFile))).toBe(true);
        }
    });
});
