import cloudinary from "../config/cloudaniay_config";
import { generateFileHash } from "./helper_functions";


export const uploadFileToCloudinary = ({ isVideo, folder, file, svga = false }: { isVideo: boolean, folder: string, file: Express.Multer.File, svga?: boolean }) => {

    const fileHash = generateFileHash(file.buffer);
    const publicId = `user_profiles/${fileHash}`;
    console.log("file", file );
    

    return new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                public_id: publicId, // Ensures hash is used
                folder: folder,
                resource_type: svga ? 'raw' : isVideo ? 'video' : 'image',
                overwrite: false, // Don't overwrite if already exists
            },
            (error, result) => {
                if (error || !result) return reject(error);
                resolve(result.secure_url);
            }

        );
        stream.end(file.buffer);
    });
}