import { createWriteStream } from 'fs';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadDir = join(__dirname, '..', 'uploads');

if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

function guessExt(contentType, fallbackUrl = '') {
  const type = (contentType || '').toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  if (type.includes('bmp')) return 'bmp';
  const urlExt = extname(new URL(fallbackUrl).pathname).replace('.', '');
  return urlExt || 'jpg';
}

export async function cacheRemoteAvatar(remoteUrl, userId) {
  if (!remoteUrl || typeof remoteUrl !== 'string') return '';
  if (!/^https?:\/\//i.test(remoteUrl)) return remoteUrl;

  try {
    const res = await fetch(remoteUrl, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0'
      }
    });
    if (!res.ok) return remoteUrl;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return remoteUrl;

    const ext = guessExt(contentType, remoteUrl);
    const filename = `avatar-${userId}-${Date.now()}.${ext}`;
    const filePath = join(uploadDir, filename);
    const buffer = Buffer.from(await res.arrayBuffer());
    await new Promise((resolve, reject) => {
      const stream = createWriteStream(filePath);
      stream.on('error', reject);
      stream.on('finish', resolve);
      stream.end(buffer);
    });

    return `/uploads/${filename}`;
  } catch {
    return remoteUrl;
  }
}

