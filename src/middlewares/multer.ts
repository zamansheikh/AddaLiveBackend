import multer from 'multer';

export const upload = multer({ storage: multer.memoryStorage() }); // buffer instead of disk
