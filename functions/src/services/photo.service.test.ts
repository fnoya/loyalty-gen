import { PhotoService } from "./photo.service";
import { NotFoundError, ValidationError } from "../core/errors";

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
    photoService = new PhotoService();
    
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
        "http://localhost:9199/v0/b/bucket/o/client-photos%2Fclient123%2Fold.jpg?alt=media";

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          name: "John Doe",
          photoUrl: oldPhotoUrl,
        }),
      });

      // First call to file() is for deleting old photo
      // Second call is for uploading new photo
      const mockOldFile = {
        save: jest.fn(),
        getSignedUrl: jest.fn(),
        exists: jest.fn().mockResolvedValue([true]),
        delete: jest.fn().mockResolvedValue(undefined),
      };
      const mockNewFile = {
        save: jest.fn().mockResolvedValue(undefined),
        getSignedUrl: jest.fn(),
        exists: jest.fn(),
        delete: jest.fn(),
      };

      mockBucket.file
        .mockReturnValueOnce(mockOldFile) // Old photo file
        .mockReturnValueOnce(mockNewFile); // New photo file

      const result = await photoService.uploadPhoto(
        clientId,
        Buffer.from("new-image"),
        "image/png"
      );

      expect(mockOldFile.delete).toHaveBeenCalled();
      expect(result).toContain(".png");
    });

    it("should throw NotFoundError if client does not exist", async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      await expect(
        photoService.uploadPhoto("nonexistent", Buffer.from("data"), "image/jpeg")
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
        "http://localhost:9199/v0/b/bucket/o/client-photos%2Fclient123%2Fphoto.jpg?alt=media";

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          name: "John Doe",
          photoUrl: photoUrl,
        }),
      });

      mockExists.mockResolvedValue([true]);
      mockDelete.mockResolvedValue(undefined);

      await photoService.deletePhoto(clientId);

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
});
