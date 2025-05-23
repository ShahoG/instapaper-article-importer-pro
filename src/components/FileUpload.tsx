
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  accept?: string;
  error?: string;
}

const FileUpload = ({ onFileChange, accept = ".csv", error }: FileUploadProps) => {
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileChange(file);
    setFileName(file?.name || "");
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div
        className={`file-input-wrapper relative flex items-center ${
          error ? "border-destructive" : "border-input"
        }`}
      >
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="sr-only"
          aria-hidden="true"
        />

        <div
          onClick={handleButtonClick}
          className="w-full cursor-pointer overflow-hidden"
        >
          <div className="flex items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file-input-text">
            <span className="truncate">
              {fileName || "No file selected"}
            </span>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleButtonClick}
          className="ml-2"
          variant="outline"
          size="sm"
        >
          Browse
        </Button>
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}
    </div>
  );
};

export default FileUpload;
