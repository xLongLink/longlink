import { chromium } from 'playwright';
import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const output = new URL('./out/real-ui/', import.meta.url).pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: chromium.executablePath() });
const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    recordVideo: { dir: output, size: { width: 1440, height: 900 } },
});
const demoCompute = {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Demo compute',
    gateway_url: 'https://192.0.2.10',
    storage_endpoint: 'https://192.0.2.11',
    database_storage_class: 'standard',
};
let registered = false;

// Intercept all API traffic: the real frontend never accesses a real backend or cluster.
await context.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/v1/me') {
        await route.fulfill({
            json: {
                id: '00000000-0000-4000-8000-000000000001',
                name: 'Demo administrator',
                email: 'demo@example.com',
                avatar: '',
                administrator: true,
                theme: 'light',
                accent: 'neutral',
            },
        });
    } else if (path === '/api/v1/computes' && request.method() === 'POST') {
        registered = true;
        await route.fulfill({ status: 201, json: demoCompute });
    } else if (path === '/api/v1/computes') {
        await route.fulfill({ json: { items: registered ? [demoCompute] : [], total: registered ? 1 : 0 } });
    } else {
        await route.fulfill({ status: 404, json: { detail: 'Not available in this isolated demo' } });
    }
});

const page = await context.newPage();
page.setDefaultTimeout(20000);
const recordingStarted = Date.now();
const video = page.video();

try {
    await page.goto('http://localhost:5174/admin/compute', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Register Compute', exact: true }).waitFor({ state: 'visible' });
    await page.evaluate(async () => {
        await document.fonts.ready;
    });

    // Add only recording annotations: the Platform components and interactions remain unchanged.
    await page.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = `
      * { cursor: none !important; }
      #demo-cursor { position:fixed; top:0; left:0; width:28px; height:36px; z-index:2147483647; pointer-events:none; filter:drop-shadow(1px 2px 2px #0005); }
      #demo-caption { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#20211eee; color:white; border-radius:10px; padding:12px 22px; font:18px Arial,sans-serif; z-index:2147483645; pointer-events:none; white-space:nowrap; }
      #demo-badge { position:fixed; bottom:5px; left:50%; transform:translateX(-50%); color:#666; font:12px Arial,sans-serif; z-index:2147483645; pointer-events:none; white-space:nowrap; }
      .demo-click { position:fixed; width:44px; height:44px; border:3px solid #4d9170; border-radius:50%; pointer-events:none; z-index:2147483646; animation:demo-pulse .6s ease-out forwards; }
      @keyframes demo-pulse { from {transform:translate(-50%,-50%) scale(.4);opacity:1} to {transform:translate(-50%,-50%) scale(1.5);opacity:0} }
    `;
        document.head.append(style);
        const cursor = document.createElement('div');
        cursor.id = 'demo-cursor';
        cursor.innerHTML =
            '<svg width="28" height="36" viewBox="0 0 32 42"><path d="M2 2L3 33L11 25L17 39L23 36L17 23L29 23Z" fill="white" stroke="#202020" stroke-width="2"/></svg>';
        const caption = document.createElement('div');
        caption.id = 'demo-caption';
        caption.textContent = 'Select Register Compute';
        const badge = document.createElement('div');
        badge.id = 'demo-badge';
        badge.textContent = 'Real Platform UI · Demo data · Registration response simulated';
        document.body.append(cursor, caption, badge);
        document.addEventListener('mousemove', (event) => {
            cursor.style.transform = `translate(${event.clientX}px,${event.clientY}px)`;
        });
        document.addEventListener('mousedown', (event) => {
            const ripple = document.createElement('div');
            ripple.className = 'demo-click';
            ripple.style.left = `${event.clientX}px`;
            ripple.style.top = `${event.clientY}px`;
            document.body.append(ripple);
            ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
        });
    });
    const trimSeconds = (Date.now() - recordingStarted) / 1000;
    await page.mouse.move(900, 400);
    await page.waitForTimeout(1000);

    /** Moves the visible cursor naturally before activating a real UI control. */
    async function click(locator) {
        const box = await locator.boundingBox();
        if (!box) throw new Error('Recording target is not visible');
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 35 });
        await page.waitForTimeout(250);
        await locator.click();
        await page.waitForTimeout(600);
    }

    /** Updates the explanatory overlay without changing the Platform UI. */
    async function caption(text) {
        await page.locator('#demo-caption').evaluate((element, value) => {
            element.textContent = value;
        }, text);
    }

    await click(page.getByRole('button', { name: 'Register Compute', exact: true }));
    await caption('Enter a name and the gateway and storage HTTPS endpoints');
    for (const [name, text] of [
        ['name', 'Demo compute'],
        ['gateway_url', 'https://192.0.2.10'],
        ['storage_endpoint', 'https://192.0.2.11'],
    ]) {
        const field = page.locator(`input[name="${name}"]`);
        await click(field);
        await field.pressSequentially(text, { delay: 55 });
    }
    await page.waitForTimeout(700);
    await click(page.getByRole('button', { name: 'Next', exact: true }));
    await caption('Paste your cluster kubeconfig — demo credentials shown here');
    const kubeconfig = `apiVersion: v1
kind: Config
current-context: demo
clusters:
  - name: demo
    cluster:
      server: https://192.0.2.12:6443
      certificate-authority-data: REVNTy1PTkxZ
contexts:
  - name: demo
    context:
      cluster: demo
      user: demo
users:
  - name: demo
    user:
      token: demo-token-not-a-real-credential`;
    const kubeconfigField = page.locator('textarea');
    await click(kubeconfigField);
    await kubeconfigField.fill(kubeconfig);
    await page.waitForTimeout(1400);
    await caption('Select Register to connect compute');
    await click(page.getByRole('button', { name: 'Register', exact: true }));
    await page.getByText('Demo compute', { exact: true }).waitFor({ state: 'visible' });
    await caption('The registered compute appears in the list');
    await page.waitForTimeout(2200);
    if (!registered) throw new Error('The recording did not reach registration');
    await writeFile(new URL('./out/real-ui/recording.json', import.meta.url), JSON.stringify({ trimSeconds }, null, 2));
} finally {
    await context.close();
    if (video) await video.saveAs(new URL('./out/real-ui/capture.webm', import.meta.url).pathname);
    await browser.close();
}

console.log('Real UI recording saved to out/real-ui/capture.webm (demo API responses only).');

// Prepare the real recording and its measured duration for Remotion export.
const { trimSeconds } = JSON.parse(await readFile(new URL('./out/real-ui/recording.json', import.meta.url), 'utf8'));
const duration = Number(
    execFileSync(
        'ffprobe',
        [
            '-v',
            'error',
            '-show_entries',
            'format=duration',
            '-of',
            'default=noprint_wrappers=1:nokey=1',
            `${output}capture.webm`,
        ],
        { encoding: 'utf8' }
    )
);
const trimBefore = Math.ceil(trimSeconds * 30);
await mkdir(new URL('./public/', import.meta.url), { recursive: true });
await copyFile(`${output}capture.webm`, new URL('./public/real-ui.webm', import.meta.url));
await writeFile(
    new URL('./src/recording.json', import.meta.url),
    JSON.stringify({ trimBefore, durationInFrames: Math.floor(duration * 30) - trimBefore }, null, 2)
);
