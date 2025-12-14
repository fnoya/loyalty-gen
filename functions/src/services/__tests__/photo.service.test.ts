import { PhotoService } from "../photo.service";
import { NotFoundError, ValidationError } from "../../core/errors";

// Mock firebase-admin/storage
const mockSave = jest.fn();
const mockGetSignedUrl = jest.fn();
const mockDelete = jest.fn();
const mockExists = jest.fn();

const mockFile = {
  save: mockSave,
  getSignedUrl: mockGetSignedUrl,
  delete: mockDelete,
  exists: mockExists,
};

const mockBucket = {
  name: "loyalty-gen.appspot.com",
  file: jest.fn(() => mockFile),
};

jest.mock("firebase-admin/storage", () => ({
  getStorage: jest.fn(() => ({
    bucket: jest.fn(() => mockBucket),
  })),
}));

// Mock firebase-admin/firestore
const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({
  get: mockGet,
  update: mockUpdate,
}));
const mockCollection = jest.fn(() => ({
  doc: mockDoc,
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: mockCollection,
  })),
}));

describe("PhotoService", () => {
  let photoService: PhotoService;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockStorage = {
      bucket: jest.fn(() => mockBucket),
    };

    const mockFirestore = {
      collection: mockCollection,
    };

    photoService = new PhotoService(mockStorage as any, mockFirestore as any);

    // Set emulator environment
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = "localhost:9199";
  });

  afterEach(() => {
    delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  });

  describe("uploadPhoto", () => {
    it("should upload a new profile photo", async () => {
      const clientId = "client123";
      const fileBuffer = Buffer.from("fake-image-data");
      const mimeType = "image/jpeg";

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          name: "John Doe",
          photoUrl: null,
        }),
      });

      mockSave.mockResolvedValue(undefined);

      const result = await photoService.uploadPhoto(
        clientId,
        fileBuffer,
        mimeType
      );

      expect(result).toContain("client-photos%2Fclient123%2F");
      expect(result).toContain(".jpg");
      expect(mockSave).toHaveBeenCalledWith(
        fileBuffer,
        expect.objectContaining({
          contentType: mimeType,
        })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUrl: expect.any(String),
        })
      );
    });

    it("should replace existing photo", async () => {
      const clientId = "client123";
      const oldPhotoUrl =
        "http://localhost:9199/v0/b/loyalty-gen.appspot.com/o/client-photos%2Fclient123%2Fold-photo.jpg?alt=media";

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          name: "John Doe",
          photoUrl: oldPhotoUrl,
        }),
      });

      mockExists.mockResolvedValue([true]);
      mockDelete.mockResolvedValue([{}]);
      mockSave.mockResolvedValue(undefined);

      await photoService.uploadPhoto(
        clientId,
        Buffer.from("new-data"),
        "image/jpeg"
      );

      // Should check if old file was deleted
      // We can check if bucket.file was called with the old path
      expect(mockBucket.file).toHaveBeenCalledWith(
        "client-photos/client123/old-photo.jpg"
      );
      expect(mockDelete).toHaveBeenCalled();
    });

    it("should throw NotFoundError if client does not exist", async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      await expect(
        photoService.uploadPhoto(
          "nonexistent",
          Buffer.from("data"),
          "image/jpeg"
        )
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError for invalid MIME type", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({}),
      });

      await expect(
        photoService.uploadPhoto("client123", Buffer.from("data"), "image/gif")
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for file size exceeding limit", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({}),
      });

      // Create buffer larger than 5 MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);

      await expect(
        photoService.uploadPhoto("client123", largeBuffer, "image/jpeg")
      ).rejects.toThrow(ValidationError);
    });

    it("should accept JPEG files", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ photoUrl: null }),
      });

      mockSave.mockResolvedValue(undefined);

      const result = await photoService.uploadPhoto(
        "client123",
        Buffer.from("jpeg-data"),
        "image/jpeg"
      );

      expect(result).toContain(".jpg");
    });

    it("should accept PNG files", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ photoUrl: null }),
      });

      mockSave.mockResolvedValue(undefined);

      const result = await photoService.uploadPhoto(
        "client123",
        Buffer.from("png-data"),
        "image/png"
      );

      expect(result).toContain(".png");
    });

    it("should accept WebP files", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ photoUrl: null }),
      });

      mockSave.mockResolvedValue(undefined);

      const result = await photoService.uploadPhoto(
        "client123",
        Buffer.from("webp-data"),
        "image/webp"
      );

      expect(result).toContain(".webp");
    });
  });

  describe("deletePhoto", () => {
    it("should delete a client's profile photo", async () => {
      const clientId = "client123";
      const photoUrl =
        "http://localhost:9199/v0/b/loyalty-gen.appspot.com/o/client-photos%2Fclient123%2Fphoto.jpg?alt=media";

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          photoUrl: photoUrl,
        }),
      });

      mockExists.mockResolvedValue([true]);
      mockDelete.mockResolvedValue([{}]);
      mockUpdate.mockResolvedValue(undefined);

      await photoService.deletePhoto(clientId);

      expect(mockBucket.file).toHaveBeenCalledWith(
        "client-photos/client123/photo.jpg"
      );
      expect(mockDelete).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUrl: null,
        })
      );
    });

    it("should throw NotFoundError if client does not exist", async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      await expect(photoService.deletePhoto("nonexistent")).rejects.toThrow(
        NotFoundError
      );
    });

    it("should throw NotFoundError if client has no photo", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          name: "John Doe",
          photoUrl: null,
        }),
      });

      await expect(photoService.deletePhoto("client123")).rejects.toThrow(
        NotFoundError
      );
    });

    it("should handle missing file gracefully", async () => {
      const clientId = "client123";
      const photoUrl =
        "http://localhost:9199/v0/b/bucket/o/client-photos%2Fclient123%2Fmissing.jpg?alt=media";

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          photoUrl: photoUrl,
        }),
      });

      mockExists.mockResolvedValue([false]);

      await photoService.deletePhoto(clientId);

      expect(mockDelete).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUrl: null,
        })
      );
    });
  });

  describe("Branch coverage - emulator environment", () => {
    it("should use emulator URL when FIREBASE_STORAGE_EMULATOR_HOST is set", async () => {
      const originalEnv = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
      process.env.FIREBASE_STORAGE_EMULATOR_HOST = "localhost:9199";

      const clientId = "client123";
      const buffer = Buffer.from("test image data");

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          clientId,
        }),
      });

      mockSave.mockResolvedValue(undefined);
      mockGetSignedUrl.mockResolvedValue(["https://signed-url.example.com/photo"]);

      await photoService.uploadPhoto(clientId, buffer, "image/jpeg");

      expect(mockSave).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.photoUrl).toContain("http://localhost:9199");

      process.env.FIREBASE_STORAGE_EMULATOR_HOST = originalEnv;
    });

    it("should replace 127.0.0.1 with localhost in emulator host (line 113)", async () => {
      const originalEnv = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
      process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";

      const clientId = "client123";
      const buffer = Buffer.from("test image data");

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          clientId,
        }),
      });

      mockSave.mockResolvedValue(undefined);

      await photoService.uploadPhoto(clientId, buffer, "image/png");

      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.photoUrl).toContain("localhost:9199");
      expect(updateCall.photoUrl).not.toContain("127.0.0.1");

      process.env.FIREBASE_STORAGE_EMULATOR_HOST = originalEnv;
    });

    it("should use signed URL when FIREBASE_STORAGE_EMULATOR_HOST is not set", async () => {
      const originalEnv = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
      delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;

      const clientId = "client123";
      const buffer = Buffer.from("test image data");
      const signedUrl = "https://storage.googleapis.com/bucket/path?token=xyz";

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          clientId,
        }),
      });

      mockSave.mockResolvedValue(undefined);
      mockGetSignedUrl.mockResolvedValue([signedUrl]);

      await photoService.uploadPhoto(clientId, buffer, "image/webp");

      expect(mockGetSignedUrl).toHaveBeenCalledWith({
        action: "read",
        expires: expect.any(Number),
      });
      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.photoUrl).toBe(signedUrl);

      process.env.FIREBASE_STORAGE_EMULATOR_HOST = originalEnv;
    });
  });

  describe("Branch coverage - delete photo", () => {
    it("should handle standard URL format gracefully (line 194)", async () => {
      const clientId = "client123";
      const photoUrl = "https://storage.googleapis.com/bucket/path/to/file";

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          photoUrl: photoUrl,
        }),
      });

      await photoService.deletePhoto(clientId);

      // Should not crash and should update without deleting from storage
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUrl: null,
        })
      );
      // Should not call file.delete for standard URLs
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it("should handle error during deletePhotoFromStorage (line 211)", async () => {
      const clientId = "client123";
      const photoUrl = "http://localhost:9199/v0/b/bucket/o/path?alt=media";

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          photoUrl: photoUrl,
        }),
      });

      mockExists.mockRejectedValue(new Error("Storage error"));

      // Should not throw and should still update the client
      await expect(photoService.deletePhoto(clientId)).resolves.not.toThrow();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUrl: null,
        })
      );
    });
  });

  describe("Branch coverage - MIME type handling", () => {
    it("should handle image/jpeg extension (line 220-228)", async () => {
      const clientId = "client123";
      const buffer = Buffer.from("jpeg image data");

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          clientId,
        }),
      });

      mockSave.mockResolvedValue(undefined);
      mockGetSignedUrl.mockResolvedValue(["https://signed-url.example.com"]);

      await photoService.uploadPhoto(clientId, buffer, "image/jpeg");

      // mockSave is called with (buffer, options)
      // file.save was called so the operation succeeded
      expect(mockSave).toHaveBeenCalled();
      expect(mockFile.save.mock.calls[0][1].metadata.metadata.clientId).toBe(clientId);
    });

    it("should handle image/png extension", async () => {
      const clientId = "client123";
      const buffer = Buffer.from("png image data");

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          clientId,
        }),
      });

      mockSave.mockClear();
      mockSave.mockResolvedValue(undefined);
      mockGetSignedUrl.mockResolvedValue(["https://signed-url.example.com"]);

      await photoService.uploadPhoto(clientId, buffer, "image/png");

      expect(mockSave).toHaveBeenCalled();
      expect(mockFile.save.mock.calls[0][1].contentType).toBe("image/png");
    });

    it("should reject unknown MIME types", async () => {
      const clientId = "client123";
      const buffer = Buffer.from("unknown image data");

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          clientId,
        }),
      });

      await expect(
        photoService.uploadPhoto(clientId, buffer, "image/unknown")
      ).rejects.toThrow("Invalid file type");
    });
  });
});
