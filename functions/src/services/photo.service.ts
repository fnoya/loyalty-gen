import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import { NotFoundError, ValidationError } from "../core/errors";
import * as crypto from "crypto";

/**
 * Photo Service - Manages client profile photos in Firebase Storage
 */
export class PhotoService {
  private _storage: ReturnType<typeof getStorage>;
  private _db: ReturnType<typeof getFirestore>;

  constructor(
    storage?: ReturnType<typeof getStorage>,
    db?: ReturnType<typeof getFirestore>
  ) {
    this._storage = storage || getStorage();
    this._db = db || getFirestore();
  }

  private get storage(): ReturnType<typeof getStorage> {
    return this._storage;
  }

  private get db(): ReturnType<typeof getFirestore> {
    return this._db;
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

    // Generate a download token for the emulator/public access
    const downloadToken = crypto.randomUUID();

    // Upload to Firebase Storage
    const file = this.bucket.file(filePath);
    await file.save(fileBuffer, {
      contentType: mimeType,
      metadata: {
        metadata: {
          clientId: clientId,
          uploadedAt: new Date().toISOString(),
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    // Generate URL (emulator uses public URL, production uses signed URL)
    let url: string;
    if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
      // Emulator: use public URL format
      let emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
      // Replace 127.0.0.1 with localhost to avoid mixed content/CORS issues in some browsers
      if (emulatorHost.startsWith("127.0.0.1")) {
        emulatorHost = emulatorHost.replace("127.0.0.1", "localhost");
      }
      url = `http://${emulatorHost}/v0/b/${this.bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;
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
      // console.log("deletePhotoFromStorage called with:", photoUrl);
      // Extract path from URL
      // URL format: https://storage.googleapis.com/bucket-name/path/to/file
      // or emulator: http://localhost:9199/v0/b/bucket-name/o/path%2Fto%2Ffile
      
      let filePath: string;
      
      if (photoUrl.includes("/o/")) {
        // Emulator or API URL
        const parts = photoUrl.split("/o/");
        if (parts.length < 2) return;
        const pathWithParams = parts[1];
        filePath = decodeURIComponent(pathWithParams!.split("?")[0]!);
        // console.log("Parsed filePath:", filePath);
      } else {
        // Standard URL
        // This is a simplification, robust parsing would be better
        // But for this project, we assume standard format
        // console.log("Standard URL format not supported for deletion yet");
        return; 
      }

      const file = this.bucket.file(filePath);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
      }
    } catch (error) {
      console.error("Error deleting old photo:", error);
      // Don't throw, just log
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
