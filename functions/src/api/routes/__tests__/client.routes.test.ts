import request from "supertest";
import express from "express";
import app from "../../../app";
import { clientService } from "../../../services/client.service";
import { photoService } from "../../../services/photo.service";
import { ValidationError, AppError } from "../../../core/errors";
import clientRoutes from "../client.routes";

// Mock Firebase Admin
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: "test-user" }),
  }),
}));

// Mock Services
jest.mock("../../../services/client.service");
jest.mock("../../../services/photo.service");

// Mock Auth Middleware
jest.mock("../../middleware/auth.middleware", () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { uid: "test-user" };
    next();
  },
}));

describe("Client Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return 200 and status ok", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  describe("POST /v1/clients", () => {
    it("should create a client", async () => {
      const mockClient = {
        id: "client-123",
        name: { firstName: "John", firstLastName: "Doe" },
        email: "john@example.com",
      };
      (clientService.createClient as jest.Mock).mockResolvedValue(mockClient);

      const res = await request(app)
        .post("/v1/clients")
        .send({
          name: { firstName: "John", firstLastName: "Doe" },
          email: "john@example.com",
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockClient);
      expect(clientService.createClient).toHaveBeenCalledWith(
        expect.any(Object),
        { uid: "test-user", email: null }
      );
    });

    it("should handle validation errors", async () => {
      const error = new ValidationError("Validation failed");
      (clientService.createClient as jest.Mock).mockRejectedValue(error);

      const res = await request(app).post("/v1/clients").send({});

      expect(res.status).toBe(400);
    });

    it("should handle duplicate email", async () => {
      const conflictError = new AppError(
        "Email already exists",
        409,
        "CONFLICT"
      );
      (clientService.createClient as jest.Mock).mockRejectedValue(
        conflictError
      );

      const res = await request(app)
        .post("/v1/clients")
        .send({ email: "duplicate@example.com" });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /v1/clients", () => {
    it("should list clients", async () => {
      const mockResult = {
        clients: [{ id: "1", name: "Test" }],
        nextCursor: "next-page",
      };
      (clientService.listClients as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app).get("/v1/clients?limit=10");

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockResult.clients);
      expect(res.body.paging.next_cursor).toBe("next-page");
      expect(clientService.listClients).toHaveBeenCalledWith(10, undefined);
    });

    it("should return 400 for invalid limit", async () => {
      const res = await request(app).get("/v1/clients?limit=-1");
      expect(res.status).toBe(400);
    });
  });

  describe("GET /v1/clients/search", () => {
    it("should search clients", async () => {
      const mockClients = [{ id: "1", name: "John" }];
      (clientService.searchClients as jest.Mock).mockResolvedValue(mockClients);

      const res = await request(app).get("/v1/clients/search?q=John");

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockClients);
      expect(res.body.metadata.query).toBe("John");
      // Expect 31 because we fetch limit + 1 to check for next page
      expect(clientService.searchClients).toHaveBeenCalledWith("John", 31);
    });

    it("should return 400 if query is missing", async () => {
      const res = await request(app).get("/v1/clients/search");
      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid limit", async () => {
      const res = await request(app).get("/v1/clients/search?q=John&limit=101");
      expect(res.status).toBe(400);
    });
  });

  describe("GET /v1/clients/:id", () => {
    it("should get a client by ID", async () => {
      const mockClient = { id: "123", name: "John" };
      (clientService.getClient as jest.Mock).mockResolvedValue(mockClient);

      const res = await request(app).get("/v1/clients/123");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockClient);
      expect(clientService.getClient).toHaveBeenCalledWith("123");
    });

    it("should return 404 when client is not found", async () => {
      (clientService.getClient as jest.Mock).mockRejectedValue(
        new AppError("Not found", 404, "NOT_FOUND")
      );

      const res = await request(app).get("/v1/clients/missing");

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /v1/clients/:id", () => {
    it("should update a client", async () => {
      const mockClient = { id: "123", name: "Updated" };
      (clientService.updateClient as jest.Mock).mockResolvedValue(mockClient);

      const res = await request(app)
        .put("/v1/clients/123")
        .send({ name: { firstName: "Updated" } });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockClient);
      expect(clientService.updateClient).toHaveBeenCalledWith(
        "123",
        expect.any(Object),
        { uid: "test-user", email: null }
      );
    });
  });

  describe("DELETE /v1/clients/:id", () => {
    it("should delete a client", async () => {
      (clientService.deleteClient as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).delete("/v1/clients/123");

      expect(res.status).toBe(202);
      expect(clientService.deleteClient).toHaveBeenCalledWith("123", {
        uid: "test-user",
        email: null,
      });
    });
  });

  describe("POST /v1/clients/:id/photo", () => {
    it("should upload a photo", async () => {
      const mockClient = {
        id: "123",
        photoUrl: "http://example.com/photo.jpg",
      };
      (photoService.uploadPhoto as jest.Mock).mockResolvedValue(
        "http://example.com/photo.jpg"
      );
      (clientService.getClient as jest.Mock).mockResolvedValue(mockClient);

      const buffer = Buffer.from("fake-image-data");

      const res = await request(app)
        .post("/v1/clients/123/photo")
        .attach("photo", buffer, "test.png");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockClient);
      expect(photoService.uploadPhoto).toHaveBeenCalled();
    });

    it("should upload via rawBody path", async () => {
      const mockClient = { id: "raw-1", photoUrl: "http://example.com/p.jpg" };
      (photoService.uploadPhoto as jest.Mock).mockResolvedValue("ok");
      (clientService.getClient as jest.Mock).mockResolvedValue(mockClient);

      const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
      const multipartBody =
        `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="photo"; filename="test.png"\r\n' +
        "Content-Type: image/png\r\n\r\n" +
        "fake-image-data" +
        `\r\n--${boundary}--\r\n`;

      const rawApp = express();
      rawApp.use((req, _res, next) => {
        (req as any).rawBody = Buffer.from(multipartBody, "utf8");
        next();
      });
      rawApp.use((req, _res, next) => {
        req.headers["content-type"] = `multipart/form-data; boundary=${boundary}`;
        next();
      });
      rawApp.use((req: any, _res: any, next) => {
        req.user = { uid: "test-user" } as any;
        next();
      });
      rawApp.use("/v1/clients", clientRoutes);
      rawApp.use((err: any, _req: any, res: any, _next: any) => {
        res.status(err.statusCode || 500).json({
          error: { code: err.code || "INTERNAL_ERROR", message: err.message },
        });
      });

      const res = await request(rawApp)
        .post("/v1/clients/raw-1/photo")
        .set("Content-Type", `multipart/form-data; boundary=${boundary}`)
        .send(multipartBody);

      expect(res.status).toBe(200);
      expect(photoService.uploadPhoto).toHaveBeenCalledWith(
        "raw-1",
        expect.any(Buffer),
        "image/png"
      );
    });

    it("should handle missing file", async () => {
      const res = await request(app)
        .post("/v1/clients/123/photo")
        .set(
          "Content-Type",
          "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW"
        )
        .send(
          '------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="other"\r\n\r\ndata\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--'
        );

      // Busboy might hang if no file is sent and we don't handle 'finish' correctly for empty streams?
      // Actually, if no file is sent, 'file' event won't fire. 'finish' will fire.
      // In our code:
      // busboy.on("finish", async () => { if (!fileBuffer) throw ... })
      // So it should return 400 (ValidationError)

      expect(res.status).toBe(400);
    });

    it("should handle invalid file type", async () => {
      const error = new ValidationError("Invalid file type");
      (photoService.uploadPhoto as jest.Mock).mockRejectedValue(error);

      const buffer = Buffer.from("fake-text-data");

      const res = await request(app)
        .post("/v1/clients/123/photo")
        .attach("photo", buffer, "test.txt");

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /v1/clients/:id/photo", () => {
    it("should delete a photo", async () => {
      (photoService.deletePhoto as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).delete("/v1/clients/123/photo");

      expect(res.status).toBe(200);
      expect(photoService.deletePhoto).toHaveBeenCalledWith("123");
    });

    it("should handle errors when deleting a photo", async () => {
      (photoService.deletePhoto as jest.Mock).mockRejectedValue(
        new AppError("Delete failed", 500, "INTERNAL_ERROR")
      );

      const res = await request(app).delete("/v1/clients/err/photo");

      expect(res.status).toBe(500);
    });
  });
});
