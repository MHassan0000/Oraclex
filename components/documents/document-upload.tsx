"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  validateFile,
  extractFileMetadata,
  generateFileChecksum,
  formatFileSize,
  ALLOWED_EXTENSIONS,
} from "@/lib/documents/validation";
import { createDocumentAction } from "@/lib/actions/document-actions";
import { appToast } from "@/lib/client/toast";
import { UploadDropzone } from "@/lib/uploadthing/components";

type FileUploadItem = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  progress: number;
  error?: string;
  documentId?: string;
};

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
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

export function DocumentUpload() {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

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
        // Don't throw - ingestion runs in background
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
        onUploadBegin={(fileName) => {
          const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          setFiles((prev) => [
            ...prev,
            {
              id,
              file: new File([], fileName),
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

          for (const uploadedFile of res) {
            const serverData = uploadedFile.serverData as {
              uploadedBy: string;
              fileUrl: string;
              fileName: string;
              fileSize: number;
              fileType: string;
              fileKey: string;
            };

            try {
              // Create document record
              const doc = await createDocumentAction({
                title: serverData.fileName.replace(/\.[^.]+$/, ""),
                fileName: serverData.fileName,
                fileType: serverData.fileType,
                storageUrl: serverData.fileUrl,
                fileSize: serverData.fileSize,
              });

              // Update file status
              setFiles((prev) =>
                prev.map((f) =>
                  f.status === "uploading"
                    ? { ...f, status: "processing", progress: 95, documentId: doc.id }
                    : f,
                ),
              );

              // Trigger ingestion
              await triggerIngestion(
                doc.id,
                serverData.fileUrl,
                serverData.fileName,
                serverData.fileType,
              );

              setFiles((prev) =>
                prev.map((f) =>
                  f.documentId === doc.id
                    ? { ...f, status: "complete", progress: 100 }
                    : f,
                ),
              );

              appToast.success(`"${serverData.fileName}" uploaded and processed`);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Upload failed";
              setFiles((prev) =>
                prev.map((f) =>
                  f.status === "uploading" || f.status === "processing"
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
              f.status === "uploading"
                ? { ...f, status: "error", error: error.message }
                : f,
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
            "bg-primary text-primary-foreground rounded-xl px-6 py-2",
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
                {getFileIcon(item.file.name || "file")}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.file.name || "Uploading..."}
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
