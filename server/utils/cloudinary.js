import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export function uploadToCloudinary(buffer, folder = 'avatars') {
  return new Promise((resolve, reject) => {
    var b64 = buffer.toString('base64');
    cloudinary.uploader.upload(
      'data:image/auto;base64,' + b64,
      { folder },
      function(error, result) {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
  });
}
