import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const cssDir = join(root, 'css');
const componentsDir = join(cssDir, 'components');

const files = [
  'variables.css',
  join('base', 'reset.css'),
  join('base', 'typography.css'),
  join('layouts', 'page.css'),
  ...readdirSync(componentsDir).filter(f => f.endsWith('.css')).map(f => join('components', f)),
  'animations.css',
  'main.css',
];

let bundle = '';
for (const f of files) {
  const path = join(cssDir, f);
  if (existsSync(path)) {
    let content = readFileSync(path, 'utf-8');
    content = content.replace(/^@import\s+['"].+?['"]\s*;?/gm, '');
    bundle += `/* === ${f} === */\n${content}\n\n`;
  } else {
    console.warn(`Skipping ${f} (not found)`);
  }
}

writeFileSync(join(cssDir, 'bundle.css'), bundle);
console.log(`Wrote css/bundle.css (${(bundle.length / 1024).toFixed(1)} KB)`);
