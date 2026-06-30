/**
 * @file upload/upload.service.ts
 * @description File upload service for ShopForge.
 *   Handles file validation, storage, and metadata tracking. Currently uses
 *   **local filesystem storage** — suitable for development and single-server
 *   deployments. The architecture is designed so that switching to cloud
 *   storage (S3, UploadThing, etc.) requires only swapping the `upload()`
 *   implementation without changing consumers.
 *
 * Key Responsibilities:
 *   - Validate file size and MIME type before persisting
 *   - Store uploaded files to a local directory with unique filenames
 *   - Return consistent `UploadResult` objects with URL, key, and metadata
 *   - Support batch uploads via `uploadMany()`
 */

import { appConfig } from "@/shared/lib/config"
import { apiLogger } from "@/shared/lib/logger"
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import crypto from 'crypto'

/**
 * Result of a successful file upload.
 * Contains everything needed to reference and display the uploaded file.
 */
export interface UploadResult {
  /** Relative URL path for serving the file (e.g. "/upload/abc-123.png"). */
  url: string
  /** Unique storage key / filename used on disk (e.g. "abc-123.png"). */
  key: string
  /** Original filename as provided by the client. */
  name: string
  /** File size in bytes. */
  size: number
  /** MIME type of the uploaded file (e.g. "image/png"). */
  type: string
}

/**
 * UploadService — manages file uploads with validation and local storage.
 *
 * Files are written to the `upload/` directory in the project root. The
 * directory is created automatically on first upload if it doesn't exist.
 */
class UploadService {
  /** Absolute path to the directory where uploaded files are stored. */
  private uploadDir: string

  constructor() {
    this.uploadDir = join(process.cwd(), 'upload')
  }

  /**
   * Upload a single file to local storage.
   *
   * Generates a unique filename using `crypto.randomUUID()` to prevent
   * filename collisions and path-traversal attacks. The original file
   * extension is preserved for MIME-type detection by downstream middleware.
   *
   * @param file - The browser `File` object to upload.
   * @returns An `UploadResult` with the file's URL, key, name, size, and type.
   */
  async upload(file: File): Promise<UploadResult> {
    return apiLogger.measure('upload', async () => {
      const buffer = Buffer.from(await file.arrayBuffer())
      // Preserve the original extension; default to ".bin" if none found
      const ext = file.name.split('.').pop() || 'bin'
      // Use a UUID-based filename to avoid collisions and security issues
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
   * Upload multiple files concurrently.
   *
   * Delegates to `upload()` for each file and uses `Promise.all` for
   * parallel execution. If any individual upload fails, the returned
   * promise rejects — callers who need partial success should catch
   * per-file errors themselves.
   *
   * @param files - Array of browser `File` objects to upload.
   * @returns An array of `UploadResult` objects in the same order as `files`.
   */
  async uploadMany(files: File[]): Promise<UploadResult[]> {
    return Promise.all(files.map(file => this.upload(file)))
  }

  /**
   * Validate a file before attempting to upload it.
   *
   * Checks two conditions:
   * 1. **File size** — must not exceed `maxSize` (defaults to 5 MB).
   * 2. **MIME type** — must be in the `allowedTypes` list (defaults to
   *    common image formats: JPEG, PNG, WebP, GIF).
   *
   * Call this before `upload()` to give the user immediate feedback
   * without waiting for a server round-trip.
   *
   * @param file    - The browser `File` object to validate.
   * @param options - Optional overrides for `maxSize` (bytes) and `allowedTypes` (MIME strings).
   * @returns `{ valid: true }` if the file passes all checks, or
   *          `{ valid: false, error }` with a human-readable reason.
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

/** Singleton UploadService instance used throughout the application. */
export const uploadService = new UploadService()
