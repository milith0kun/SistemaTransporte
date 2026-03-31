import { Injectable } from '@nestjs/common';
@Injectable()
export class UploadsService { async saveFile(file: any, path: string): Promise<{url: string}> { return {url: 'dummy_url'}; } async uploadFile(file: any, path: string): Promise<{url: string}> { return {url: 'dummy_url'}; } async uploadBase64(b64: string, path: string): Promise<{url: string}> { return {url: 'dummy_url'}; } async deleteFile(path: string): Promise<void> {} }
