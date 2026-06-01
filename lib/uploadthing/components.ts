import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";
import type { OraclexFileRouter } from "@/lib/uploadthing/core";

export const UploadButton = generateUploadButton<OraclexFileRouter>();
export const UploadDropzone = generateUploadDropzone<OraclexFileRouter>();
