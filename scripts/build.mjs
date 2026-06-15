import { mkdir, readdir, readFile, rm, stat, writeFile, copyFile } from 'fs/promises';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import CleanCSS from 'clean-css';
import { minify as minifyHtml } from 'html-minifier-terser';
import { minify as minifyJs } from 'terser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = join(root, 'dist');

const htmlMinifyOptions = {
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeEmptyAttributes: true,
  sortAttributes: true,
  sortClassName: false,
  keepClosingSlash: true,
  minifyCSS: false,
  minifyJS: false
};

const cssMinifier = new CleanCSS({
  level: 2
});

const textExts = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.xml']);
const copyExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.jfif', '.woff', '.woff2', '.ttf', '.otf']);

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  for (const dir of ['pages', 'css', 'js', 'assets']) {
    await processEntry(join(root, dir), join(dist, dir));
  }

  for (const file of ['package.json', 'package-lock.json', 'ecosystem.config.cjs']) {
    await copyFile(join(root, file), join(dist, file));
  }

  console.log(`Built minified site in ${relative(root, dist)}`);
}

async function processEntry(srcPath, destPath) {
  const st = await stat(srcPath);
  if (st.isDirectory()) {
    await mkdir(destPath, { recursive: true });
    const entries = await readdir(srcPath, { withFileTypes: true });
    for (const entry of entries) {
      await processEntry(join(srcPath, entry.name), join(destPath, entry.name));
    }
    return;
  }

  const ext = srcPath.slice(srcPath.lastIndexOf('.')).toLowerCase();
  await mkdir(dirname(destPath), { recursive: true });

  if (ext === '.html') {
    const input = await readFile(srcPath, 'utf8');
    const output = await minifyHtml(input, htmlMinifyOptions);
    await writeFile(destPath, output, 'utf8');
    return;
  }

  if (ext === '.css') {
    const input = await readFile(srcPath, 'utf8');
    const output = cssMinifier.minify(input).styles;
    await writeFile(destPath, output, 'utf8');
    return;
  }

  if (ext === '.js' || ext === '.mjs') {
    const input = await readFile(srcPath, 'utf8');
    const output = await minifyJs(input, {
      module: true,
      compress: {
        passes: 2
      },
      mangle: true,
      format: {
        comments: false
      }
    });
    await writeFile(destPath, output.code || input, 'utf8');
    return;
  }

  if (copyExts.has(ext) || textExts.has(ext)) {
    await copyFile(srcPath, destPath);
    return;
  }

  await copyFile(srcPath, destPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
