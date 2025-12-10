import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import { NotFoundError, ValidationError } from "../core/errors";
import * as crypto from "crypto";

/**
 * Photo Service - Manages client profile photos in Firebase Storage
 */
export class PhotoService {
  private get storage(): ReturnType<typeof getStorage> {
    return getStorage();
  }

  private get db(): ReturnType<typeof getFirestore> {
    return getFirestore();
  }

  private get bucket(): ReturnType<ReturnType<typeof getStorage>["bucket"]> {
    // Use default bucket or emulator bucket
    const bucketName = process.env.FIREBASE_STORAGE_EMULATOR_HOST
      ? "loyalty-gen.appspot.com" // Emulator doesn't need real bucket
      : undefined; // Use default bucket in production
    return this.storage.bucket(bucketName);
  }

  // Allowed MIME types
  private readonly ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  // Max file size: 5 MB
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;

  /**
   * Upload or update a client's profile photo
   */
  async uploadPhoto(
    clientId: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    // Validate client exists
    const clientRef = this.db.collection("clients").doc(clientId);
    const clientDoc = await clientRef.get();

    if (!clientDoc.exists) {
      throw new NotFoundError("Client", clientId);
    }

    // Validate MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new ValidationError(
        "Invalid file type. Allowed types: JPEG, PNG, WEBP"
      );
    }

    // Validate file size
    if (fileBuffer.length > this.MAX_FILE_SIZE) {
      throw new ValidationError(
        "File size exceeds maximum allowed size of 5 MB"
      );
    }

    // Delete old photo if exists
    const clientData = clientDoc.data();
    if (clientData?.photoUrl) {
      await this.deletePhotoFromStorage(clientData.photoUrl);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString("hex");
    const extension = this.getFileExtension(mimeType);
    const filename = `${timestamp}-${randomId}.${extension}`;
    const filePath = `client-photos/${clientId}/${filename}`;

    // Upload to Firebase Storage
    const file = this.bucket.file(filePath);
    await file.save(fileBuffer, {
      contentType: mimeType,
      metadata: {
        metadata: {
          clientId: clientId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Generate URL (emulator uses public URL, production uses signed URL)
    let url: string;
    if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
      // Emulator: use public URL format
      const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
      url = `http://${emulatorHost}/v0/b/${this.bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`;
    } else {
      // Production: use signed URL (valid for 50 years)
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 50 * 365 * 24 * 60 * 60 * 1000, // 50 years
      });
      url = signedUrl;
    }

    // Update client document with new photoUrl
    await clientRef.update({
      photoUrl: url,
      updated_at: new Date(),
    });

    return url;
  }

  /**
   * Delete a client's profile photo
   */
  async deletePhoto(clientId: string): Promise<void> {
    // Validate client exists
    const clientRef = this.db.collection("clients").doc(clientId);
    const clientDoc = await clientRef.get();

    if (!clientDoc.exists) {
      throw new NotFoundError("Client", clientId);
    }

    const clientData = clientDoc.data();
    if (!clientData?.photoUrl) {
      throw new NotFoundError("Photo", clientId);
    }

    // Delete from storage
    await this.deletePhotoFromStorage(clientData.photoUrl);

    // Update client document
    await clientRef.update({
      photoUrl: null,
      updated_at: new Date(),
    });
  }

  /**
   * Delete photo from Firebase Storage by URL
   */
  private async deletePhotoFromStorage(photoUrl: string): Promise<void> {
    try {
      // Extract file path from signed URL
      const urlPattern = /client-photos\/[^?]+/;
      const match = photoUrl.match(urlPattern);

      if (match) {
        const filePath = match[0];
        const file = this.bucket.file(filePath);

        // Check if file exists before attempting deletion
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
        }
      }
    } catch (error) {
      // Log error but don't throw - we don't want to fail the operation
      // if the file doesn't exist or can't be deleted
      console.error("Error deleting photo from storage:", error);
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getFileExtension(mimeType: string): string {
    switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
    }
  }
}

// Export factory function instead of singleton
let _instance: PhotoService | null = null;
export const photoService = {
  get instance(): PhotoService {
    if (!_instance) {
      _instance = new PhotoService();
    }
    return _instance;
  },
  uploadPhoto: (...args: Parameters<PhotoService["uploadPhoto"]>) =>
    photoService.instance.uploadPhoto(...args),
  deletePhoto: (...args: Parameters<PhotoService["deletePhoto"]>) =>
    photoService.instance.deletePhoto(...args),
};
