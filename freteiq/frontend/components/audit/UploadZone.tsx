"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X } from "lucide-react";
import clsx from "clsx";

interface UploadZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function UploadZone({ onFile, disabled }: UploadZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) {
        setSelectedFile(accepted[0]);
        onFile(accepted[0]);
      }
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/xml": [".xml"], "application/xml": [".xml"] },
    maxFiles: 1,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={clsx(
        "relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer",
        isDragActive
          ? "border-green-500 bg-green-500/5"
          : "border-border hover:border-green-500/40 hover:bg-green-500/[0.02]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />

      {selectedFile ? (
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <FileText size={18} className="text-green-500" />
          </div>
          <div className="text-left">
            <p className="text-text-primary text-sm font-medium">
              {selectedFile.name}
            </p>
            <p className="text-text-secondary text-xs font-mono">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFile(null);
            }}
            className="ml-4 p-1 rounded hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Upload
              size={24}
              className={clsx(
                "transition-colors",
                isDragActive ? "text-green-500" : "text-text-secondary"
              )}
            />
          </div>
          <p className="text-text-primary font-medium mb-1">
            {isDragActive ? "Solte o arquivo aqui" : "Arraste o CT-e XML aqui"}
          </p>
          <p className="text-text-secondary text-sm">
            ou clique para selecionar o arquivo
          </p>
          <p className="text-text-secondary text-xs font-mono mt-2 opacity-60">
            Aceita: .xml — CT-e versão 3.00+ (SEFAZ) — Max: 5 MB
          </p>
        </>
      )}
    </div>
  );
}
