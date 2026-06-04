"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ALLOWED_EXTENSIONS,
  resolveDocumentFileType,
  validateFile,
} from "@/lib/documents/validation";
import { createDocumentAction } from "@/lib/actions/document-actions";
import { appToast } from "@/lib/client/toast";
import { UploadDropzone } from "@/lib/uploadthing/components";

type FileUploadItem = {
  id: string;
  fileName: string;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  progress: number;
  error?: string;
  documentId?: string;
};

type UploadThingServerData = {
  uploadedBy?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileKey?: string;
  checksum?: string;
};

type UploadThingFileResponse = {
  name?: string;
  size?: number;
  type?: string;
  key?: string;
  url?: string;
  appUrl?: string;
  ufsUrl?: string;
  fileHash?: string;
  serverData?: UploadThingServerData | null;
};

type UploadedDocumentFile = {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileKey?: string;
  checksum?: string;
};

function normalizeUploadedFile(uploadedFile: UploadThingFileResponse): UploadedDocumentFile {
  const serverData = uploadedFile.serverData ?? {};
  const fileName = serverData.fileName ?? uploadedFile.name;
  const fileUrl = serverData.fileUrl ?? uploadedFile.ufsUrl ?? uploadedFile.url ?? uploadedFile.appUrl;
  const fileSize = serverData.fileSize ?? uploadedFile.size;

  if (!fileName || !fileUrl || !fileSize) {
    throw new Error("Upload completed, but file metadata was incomplete. Please try again.");
  }

  return {
    fileUrl,
    fileName,
    fileSize,
    fileType: resolveDocumentFileType(serverData.fileType ?? uploadedFile.type, fileName),
    fileKey: serverData.fileKey ?? uploadedFile.key,
    checksum: serverData.checksum ?? uploadedFile.fileHash,
  };
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return <FileText className="h-5 w-5 text-red-400" />;
    case "csv":
      return <FileSpreadsheet className="h-5 w-5 text-green-400" />;
    case "md":
      return <FileText className="h-5 w-5 text-blue-400" />;
    default:
      return <FileIcon className="h-5 w-5 text-muted-foreground" />;
  }
}

function matchesUploadItem(item: FileUploadItem, uploadId: string | undefined, fileName: string) {
  if (uploadId) return item.id === uploadId;
  return (
    item.fileName === fileName && (item.status === "uploading" || item.status === "processing")
  );
}

export function DocumentUpload() {
  const router = useRouter();
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const uploadIdsByNameRef = useRef<Map<string, string[]>>(new Map());

  const rememberUpload = useCallback((fileName: string, id: string) => {
    const existing = uploadIdsByNameRef.current.get(fileName) ?? [];
    uploadIdsByNameRef.current.set(fileName, [...existing, id]);
  }, []);

  const takeUploadId = useCallback((fileName: string) => {
    const existing = uploadIdsByNameRef.current.get(fileName) ?? [];
    const [id, ...remaining] = existing;
    if (remaining.length > 0) {
      uploadIdsByNameRef.current.set(fileName, remaining);
    } else {
      uploadIdsByNameRef.current.delete(fileName);
    }
    return id;
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const triggerIngestion = useCallback(
    async (documentId: string, fileUrl: string, fileName: string, fileType: string) => {
      try {
        const response = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId, fileUrl, fileName, fileType }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Ingestion failed");
        }
      } catch (error) {
        console.error("Ingestion error:", error);
        throw error;
      }
    },
    [],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Image
            src="/images/oraclex-logo.png"
            alt="Oraclex"
            width={28}
            height={28}
            className="rounded-lg"
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Upload Documents</h2>
          <p className="text-sm text-muted-foreground">
            Add files to your knowledge base for RAG retrieval
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <UploadDropzone
        endpoint="documentUploader"
        onBeforeUploadBegin={(selectedFiles) => {
          return selectedFiles.filter((file) => {
            const validation = validateFile(file);
            if (!validation.valid) {
              appToast.error(`${file.name}: ${validation.error ?? "Invalid file"}`);
              return false;
            }
            return true;
          });
        }}
        onUploadBegin={(fileName) => {
          const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          rememberUpload(fileName, id);
          setFiles((prev) => [
            ...prev,
            {
              id,
              fileName,
              status: "uploading",
              progress: 10,
            },
          ]);
        }}
        onUploadProgress={(progress) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.status === "uploading" ? { ...f, progress: Math.min(progress, 90) } : f,
            ),
          );
        }}
        onClientUploadComplete={async (res) => {
          if (!res?.length) return;

          for (const uploadResult of res) {
            const uploadedFile = normalizeUploadedFile(uploadResult as UploadThingFileResponse);
            const uploadId = takeUploadId(uploadedFile.fileName);

            try {
              setFiles((prev) =>
                prev.map((f) =>
                  matchesUploadItem(f, uploadId, uploadedFile.fileName)
                    ? { ...f, status: "processing", progress: 95 }
                    : f,
                ),
              );

              // Create document record
              const doc = await createDocumentAction({
                title: uploadedFile.fileName.replace(/\.[^.]+$/, ""),
                fileName: uploadedFile.fileName,
                fileType: uploadedFile.fileType,
                storageUrl: uploadedFile.fileUrl,
                fileSize: uploadedFile.fileSize,
                checksum: uploadedFile.checksum,
              });

              setFiles((prev) =>
                prev.map((f) =>
                  matchesUploadItem(f, uploadId, uploadedFile.fileName)
                    ? { ...f, documentId: doc.id }
                    : f,
                ),
              );

              // Trigger ingestion
              await triggerIngestion(
                doc.id,
                uploadedFile.fileUrl,
                uploadedFile.fileName,
                uploadedFile.fileType,
              );

              setFiles((prev) =>
                prev.map((f) =>
                  f.documentId === doc.id ? { ...f, status: "complete", progress: 100 } : f,
                ),
              );

              appToast.success(`"${uploadedFile.fileName}" uploaded and processed`);
              router.refresh();
            } catch (error) {
              const message = error instanceof Error ? error.message : "Upload failed";
              setFiles((prev) =>
                prev.map((f) =>
                  matchesUploadItem(f, uploadId, uploadedFile.fileName)
                    ? { ...f, status: "error", error: message }
                    : f,
                ),
              );
              appToast.error(message);
            }
          }
        }}
        onUploadError={(error) => {
          appToast.error(error.message);
          setFiles((prev) =>
            prev.map((f) =>
              f.status === "uploading" ? { ...f, status: "error", error: error.message } : f,
            ),
          );
        }}
        config={{ mode: "auto" }}
        appearance={{
          container: cn(
            "rounded-3xl border-2 border-dashed border-border/60 bg-card/50 p-8",
            "transition-all duration-300 hover:border-primary/40 hover:bg-card/80",
            "cursor-pointer group",
          ),
          label: "text-sm font-medium text-foreground",
          allowedContent: "text-xs text-muted-foreground mt-2",
          button: cn(
            "bg-primary text-primary-foreground cursor-pointer rounded-xl px-6 py-2",
            "hover:bg-primary/90 transition-colors",
          ),
          uploadIcon: "text-muted-foreground group-hover:text-primary transition-colors",
        }}
        content={{
          label: "Drop files here or click to browse",
          allowedContent: `Supported: ${ALLOWED_EXTENSIONS.join(", ")} • Max 16MB per file`,
        }}
      />

      {/* File List */}
      <AnimatePresence mode="popLayout">
        {files.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {files.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-border/60 bg-card/80 px-4 py-3",
                  item.status === "error" && "border-destructive/40 bg-destructive/5",
                  item.status === "complete" && "border-green-500/30 bg-green-500/5",
                )}
              >
                {getFileIcon(item.fileName || "file")}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.fileName || "Uploading..."}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.status === "uploading" ? (
                      <>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${item.progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{item.progress}%</span>
                      </>
                    ) : item.status === "processing" ? (
                      <span className="flex items-center gap-1.5 text-xs text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing & embedding...
                      </span>
                    ) : item.status === "complete" ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-500">
                        <CheckCircle2 className="h-3 w-3" />
                        Ready for retrieval
                      </span>
                    ) : item.status === "error" ? (
                      <span className="flex items-center gap-1.5 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {item.error}
                      </span>
                    ) : null}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => removeFile(item.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
