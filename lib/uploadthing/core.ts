import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getUser } from "@/lib/auth/session";

const f = createUploadthing();

export const uploadRouter = {
  documentUploader: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
    text: { maxFileSize: "8MB", maxFileCount: 10 },
    blob: { maxFileSize: "8MB", maxFileCount: 10 },
  })
    .middleware(async () => {
      const user = await getUser();
      if (!user) throw new Error("Unauthorized");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        fileUrl: file.ufsUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileKey: file.key,
      };
    }),
} satisfies FileRouter;

export type OraclexFileRouter = typeof uploadRouter;
