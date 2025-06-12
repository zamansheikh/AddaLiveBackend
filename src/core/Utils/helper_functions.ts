
import crypto from 'crypto';

export const generateFileHash = (buffer: Buffer): string => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

export function isVideoFile(filename: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm', '.mpeg', '.mp3', '.wav', '.ogg', '.aac', '.flac'];
  const ext = filename.toLowerCase().split('.').pop();
  return ext ? videoExtensions.includes(`.${ext}`) : false;
}