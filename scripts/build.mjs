import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { minify as minifyHtml } from 'html-minifier-terser';
import { minify as minifyCss } from 'csso';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ---- JS Bundle ----
async function bundleJs() {
  console.log('Bundling JS...');
  await esbuild.build({
    entryPoints: [join(root, 'js', 'main.js')],
    bundle: true,
    minify: true,
    outfile: join(root, 'js', 'main.min.js'),
    format: 'iife',
    sourcemap: false,
    target: ['es2020'],
  });
  const kb = (readFileSync(join(root, 'js', 'main.min.js')).length / 1024).toFixed(1);
  console.log(`  → js/main.min.js (${kb} KB)`);
}

// ---- CSS Bundle ----
function bundleCss() {
  console.log('Bundling CSS...');

  const cssDir = join(root, 'css');
  const order = [
    'variables.css',
    'animations.css',
    'base/reset.css',
    'base/typography.css',
    'layouts/page.css',
    'main.css',
  ];

  const componentDir = join(cssDir, 'components');
  const componentFiles = readdirSync(componentDir)
    .filter(f => f.endsWith('.css'))
    .sort();

  let parts = [];
  for (const file of order) {
    const path = join(cssDir, file);
    if (!existsSync(path)) {
      console.warn(`  Warning: ${file} not found, skipping`);
      continue;
    }
    let content = readFileSync(path, 'utf-8');
    content = content.replace(/@import\s+['"].+?['"]\s*;/g, '').trim();
    if (content) parts.push(content);
  }

  for (const file of componentFiles) {
    const path = join(componentDir, file);
    let content = readFileSync(path, 'utf-8');
    content = content.trim();
    if (content) parts.push(content);
  }

  const combined = parts.join('\n');

  const minified = minifyCss(combined).css;

  writeFileSync(join(root, 'css', 'styles.min.css'), minified);
  const kb = (minified.length / 1024).toFixed(1);
  console.log(`  → css/styles.min.css (${kb} KB)`);
}

// ---- HTML update & minify ----
async function processHtml() {
  console.log('Processing HTML pages...');

  const pagesDir = join(root, 'pages');
  const files = readdirSync(pagesDir).filter(f => f.endsWith('.html'));

  const localCssRe = /<link\s+[^>]*?\brel=["']stylesheet["'][^>]*?\bhref=["'](?:\/|\.\.\/)css\/[^"']+["'][^>]*?>/gi;
  const moduleScriptRe = /<script\s+type=["']module["'][^>]*?\bsrc=["']\.\.\/js\/main\.js["'][^>]*?><\/script>/gi;
  const newScript = '<script src="../js/main.min.js"></script>';

  for (const file of files) {
    const path = join(pagesDir, file);
    let html = readFileSync(path, 'utf-8');

    const is404 = file === '404.html';

    const cssBundleLink = is404
      ? '<link rel="stylesheet" href="/css/styles.min.css">'
      : '<link rel="stylesheet" href="../css/styles.min.css">';

    var resourceHints = '<link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link rel="preconnect" href="https://cdnjs.cloudflare.com">';

    let replaced = html.replace(localCssRe, '');
    const headStart = replaced.indexOf('<head') + replaced.slice(replaced.indexOf('<head')).indexOf('>') + 1;
    replaced = replaced.slice(0, headStart) + '\n  ' + cssBundleLink + '\n  ' + resourceHints + replaced.slice(headStart);

    replaced = replaced.replace(moduleScriptRe, newScript);

    const minified = await minifyHtml(replaced, {
      collapseWhitespace: true,
      conservativeCollapse: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: false,
      minifyJS: false,
      preserveLineBreaks: false,
    });

    writeFileSync(path, minified);
    const kb = (minified.length / 1024).toFixed(1);
    console.log(`  → pages/${file} (${kb} KB)`);
  }
}

// ---- Main ----
async function main() {
  console.log('Building FreeZone project...\n');
  await bundleJs();
  bundleCss();
  await processHtml();
  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
