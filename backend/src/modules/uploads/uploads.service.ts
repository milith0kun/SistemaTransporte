import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');

  constructor() {
    // Ensure base upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Saves a file object (e.g. from Multer) to disk.
   */
  async saveFile(file: Express.Multer.File, subFolder: string = 'general'): Promise<{ url: string }> {
    try {
      const folderPath = path.join(this.uploadDir, subFolder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const fileExtension = path.extname(file.originalname) || '';
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(folderPath, fileName);

      fs.writeFileSync(filePath, file.buffer);

      // Return public URL path
      return { url: `/uploads/${subFolder}/${fileName}` };
    } catch (error) {
      console.error('Error saving file:', error);
      throw new InternalServerErrorException('No se pudo guardar el archivo');
    }
  }

  /**
   * Alias for saveFile to keep compatibility with existing code
   */
  async uploadFile(file: Express.Multer.File, subFolder: string = 'general'): Promise<{ url: string }> {
    return this.saveFile(file, subFolder);
  }

  /**
   * Uploads base64 encoded image
   */
  async uploadBase64(b64: string, subFolder: string = 'general'): Promise<{ url: string }> {
    try {
      const folderPath = path.join(this.uploadDir, subFolder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      // Format could be: "data:image/png;base64,iVBORw0KGgo..."
      const matches = b64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let extension = '.png';

      if (matches && matches.length === 3) {
        extension = `.${matches[1].split('/')[1]}`;
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(b64, 'base64');
      }

      const fileName = `${uuidv4()}${extension}`;
      const filePath = path.join(folderPath, fileName);

      fs.writeFileSync(filePath, buffer);

      return { url: `/uploads/${subFolder}/${fileName}` };
    } catch (error) {
      console.error('Error saving base64 file:', error);
      throw new InternalServerErrorException('No se pudo procesar la imagen base64');
    }
  }

  /**
   * Deletes a file given its URL path
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      if (!fileUrl.startsWith('/uploads/')) return;
      
      const relativePath = fileUrl.replace('/uploads/', '');
      const absolutePath = path.join(this.uploadDir, relativePath);
      
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
}
