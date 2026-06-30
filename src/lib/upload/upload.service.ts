// ============================================================================
// ShopForge - File Upload Service
// Abstraction layer for image/file uploads
// Falls back to local storage when UploadThing is not configured
// ============================================================================

import { appConfig } from '@/lib/config'
import { apiLogger } from '@/lib/logger'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import crypto from 'crypto'

export interface UploadResult {
  url: string
  key: string
  name: string
  size: number
  type: string
}

class UploadService {
  private uploadDir: string

  constructor() {
    this.uploadDir = join(process.cwd(), 'upload')
  }

  /**
   * Upload a file (local storage for development)
   */
  async upload(file: File): Promise<UploadResult> {
    return apiLogger.measure('upload', async () => {
      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = file.name.split('.').pop() || 'bin'
      const key = `${crypto.randomUUID()}.${ext}`
      const filePath = join(this.uploadDir, key)

      // Ensure upload directory exists
      await mkdir(this.uploadDir, { recursive: true })

      // Write file
      await writeFile(filePath, buffer)

      apiLogger.info('File uploaded', { key, size: file.size, type: file.type })

      return {
        url: `/upload/${key}`,
        key,
        name: file.name,
        size: file.size,
        type: file.type,
      }
    })
  }

  /**
   * Upload multiple files
   */
  async uploadMany(files: File[]): Promise<UploadResult[]> {
    return Promise.all(files.map(file => this.upload(file)))
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, options?: { maxSize?: number; allowedTypes?: string[] }): { valid: boolean; error?: string } {
    const maxSize = options?.maxSize || 5 * 1024 * 1024 // 5MB default
    const allowedTypes = options?.allowedTypes || [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ]

    if (file.size > maxSize) {
      return { valid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` }
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `File type ${file.type} is not allowed` }
    }

    return { valid: true }
  }
}

export const uploadService = new UploadService()
