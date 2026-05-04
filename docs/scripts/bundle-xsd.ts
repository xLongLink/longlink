import { $ } from 'bun';

const source = '../sdk/longlink/.static/xsd';
const target = './src/public/xsd';

await $`rm -rf ${target}`;
await $`cp -R ${source} ${target}`;
