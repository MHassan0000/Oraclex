import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getUser } from "@/lib/auth/session";
import { resolveDocumentFileType } from "@/lib/documents/validation";
import { validateFileSecure } from "@/lib/security/file-validation";

const f = createUploadthing();

export const uploadRouter = {
  documentUploader: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
    text: { maxFileSize: "8MB", maxFileCount: 10 },
    blob: { maxFileSize: "8MB", maxFileCount: 10 },
  })
    .middleware(async ({ files }) => {
      const user = await getUser();
      if (!user) throw new Error("Unauthorized");

      for (const file of files) {
        const fileType = resolveDocumentFileType(file.type, file.name);
        const validation = validateFileSecure(file.name, fileType, file.size);
        if (!validation.valid) {
          throw new Error(validation.error ?? "Invalid upload");
        }
      }

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const fileType = resolveDocumentFileType(file.type, file.name);

      return {
        uploadedBy: metadata.userId,
        fileUrl: file.ufsUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType,
        fileKey: file.key,
      };
    }),
} satisfies FileRouter;

export type OraclexFileRouter = typeof uploadRouter;
