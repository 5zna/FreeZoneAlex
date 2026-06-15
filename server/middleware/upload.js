import multer from 'multer';
import cloudinary from '../utils/cloudinary.js';

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
}).single('avatar');

export async function uploadToCloudinary(buffer, mimetype, folder = 'avatars') {
  const base64 = buffer.toString('base64');
  const dataUri = `data:${mimetype};base64,${base64}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
    transformation: [{ width: 400, height: 400, crop: 'limit', quality: 'auto', fetch_format: 'auto' }]
  });
  return result.secure_url;
}
