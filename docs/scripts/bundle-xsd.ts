import { cp, rm } from 'node:fs/promises';

const source = '../sdk/longlink/.static/xsd';
const target = './src/public/xsd';

await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });
