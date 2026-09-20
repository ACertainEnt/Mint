import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw, Trash2, Smartphone, HardDrive, Info, Camera } from 'lucide-react';
import { api } from '../lib/api';

export interface UploadedFileMeta {
  name: string;
  sizeBytes: number;
  mimeType: string;
  storageProvider?: string;
  isDecentralized?: boolean;
}

interface ImageUploaderProps {
  id: string;
  label: string;
  required?: boolean;
  value: string | null;
  onChange: (url: string | null, meta?: UploadedFileMeta) => void;
  aspectRatio?: 'square' | 'banner';
  maxSizeMB?: number;
  recommendation?: string;
  description?: string;
  onUploadingChange?: (isUploading: boolean) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  id,
  label,
  required = false,
  value,
  onChange,
  aspectRatio = 'square',
  maxSizeMB = 5,
  recommendation,
  description,
  onUploadingChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<UploadedFileMeta | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null);

  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

  const handleFile = async (file: File) => {
    setError(null);

    // 1. Format validation
    if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
      setError(`Unsupported format (${file.type || 'unknown'}). Please choose a PNG, JPG, WebP, or GIF image.`);
      return;
    }

    // 2. File size validation
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const currentMB = (file.size / (1024 * 1024)).toFixed(1);
      setError(`File size (${currentMB} MB) exceeds the maximum limit of ${maxSizeMB} MB.`);
      return;
    }

    setLastSelectedFile(file);
    setIsUploading(true);
    setUploadProgress(15);
    onUploadingChange?.(true);

    try {
      // Read file to Base64
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file from device storage.'));
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 40);
            setUploadProgress(15 + pct);
          }
        };
        reader.readAsDataURL(file);
      });

      setUploadProgress(65);

      // Perform real backend upload
      const res = await api.uploadImage({
        dataUrl,
        filename: file.name,
        mimeType: file.type
      });

      setUploadProgress(100);

      const meta: UploadedFileMeta = {
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
        storageProvider: res.storageStatus.provider,
        isDecentralized: res.storageStatus.isDecentralizedConfigured
      };

      setFileMeta(meta);
      onChange(res.url, meta);
      setError(null);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Upload failed. Please check connection and retry.');
      // Never show fake uploaded image on failure
      onChange(null);
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setFileMeta(null);
    setError(null);
    setLastSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRetry = () => {
    if (lastSelectedFile) {
      handleFile(lastSelectedFile);
    } else {
      fileInputRef.current?.click();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const hasUploadedValue = !!value && !isUploading;

  return (
    <div className="space-y-2 text-left">
      {/* Label and Guidance */}
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="block text-xs font-semibold text-[#8e97a8]">
          {label} {required && <span className="text-[#ff5500]">*</span>}
        </label>
        {recommendation && (
          <span className="text-[11px] text-[#6b7280] font-mono-code">
            {recommendation}
          </span>
        )}
      </div>

      {description && (
        <p className="text-[11px] text-[#8e97a8] leading-tight">
          {description}
        </p>
      )}

      {/* Hidden Native File Input (Storage: PNG, JPG, WebP, GIF) */}
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleInputChange}
        disabled={isUploading}
        className="hidden"
      />

      {/* Hidden Camera Capture Input */}
      <input
        ref={cameraInputRef}
        id={`${id}-camera`}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        disabled={isUploading}
        className="hidden"
      />

      {/* State 1: Upload in Progress */}
      {isUploading && (
        <div className="p-4 rounded-xl bg-[#11141b] border border-[#ff5500]/40 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-white font-medium">
              <RefreshCw size={14} className="animate-spin text-[#ff5500]" />
              <span>Uploading from device...</span>
            </div>
            <span className="text-[#ff5500] font-mono-code font-bold">{uploadProgress}%</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-[#1a202c] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#e64d00] to-[#ff5500] transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-[11px] text-[#8e97a8]">
            Validating on-chain metadata format and preparing protocol storage...
          </p>
        </div>
      )}

      {/* State 2: Uploaded & Verified Preview */}
      {hasUploadedValue && (
        <div className="p-3.5 rounded-xl bg-[#11141b] border border-[#212634] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Thumbnail Preview */}
            <div className="flex items-center gap-3">
              <div
                className={`overflow-hidden rounded-lg border border-[#2d3446] bg-[#0c0e14] shrink-0 ${
                  aspectRatio === 'banner' ? 'w-24 h-12' : 'w-16 h-16'
                }`}
              >
                <img
                  src={value}
                  alt={label}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // In case image failed to load, don't show broken placeholder
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span className="truncate">{fileMeta?.name || 'Uploaded Artwork'}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#8e97a8] font-mono-code">
                  {fileMeta?.sizeBytes && <span>{formatSize(fileMeta.sizeBytes)}</span>}
                  <span>•</span>
                  <span className="uppercase">{fileMeta?.mimeType ? fileMeta.mimeType.split('/')[1] : 'IMAGE'}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400/90 font-mono-code">
                  <HardDrive size={10} />
                  <span>Protocol Storage Verified</span>
                </div>
              </div>
            </div>

            {/* Actions: Replace / Remove */}
            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1c2230]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-[#181d28] hover:bg-[#202736] border border-[#283042] text-xs font-semibold text-white transition-colors flex items-center gap-1.5 min-h-[36px]"
              >
                <RefreshCw size={12} />
                <span>Replace</span>
              </button>

              <button
                type="button"
                onClick={handleRemove}
                className="p-2 rounded-lg bg-[#181d28] hover:bg-red-950/40 border border-[#283042] hover:border-red-800/60 text-[#8e97a8] hover:text-red-400 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Remove image"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 3: Empty Picker (Ready for Upload) */}
      {!hasUploadedValue && !isUploading && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed p-4 sm:p-5 transition-all text-center ${
            isDragOver
              ? 'border-[#ff5500] bg-[#ff5500]/5'
              : error
              ? 'border-red-700/60 bg-red-950/10'
              : 'border-[#232938] hover:border-[#384156] bg-[#0e1117]'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#161a24] border border-[#232a3b] flex items-center justify-center text-[#ff5500]">
              {aspectRatio === 'banner' ? <ImageIcon size={18} /> : <Upload size={18} />}
            </div>

            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white">
                Select {label.toLowerCase()}
              </p>
              <p className="text-[11px] text-[#8e97a8]">
                PNG, JPG, WebP, or GIF up to {maxSizeMB}MB
              </p>
            </div>

            {/* Direct Image/GIF upload and Camera capture triggers */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-lg bg-[#161b26] hover:bg-[#1f2635] active:bg-[#283144] border border-[#283042] text-xs font-bold text-white flex items-center justify-center gap-2 min-h-[42px] transition-all shadow-sm active:scale-98 cursor-pointer"
              >
                <Smartphone size={14} className="text-[#ff5500]" />
                <span>Upload Image / GIF</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-3.5 py-2 rounded-lg bg-[#161b26] hover:bg-[#1f2635] active:bg-[#283144] border border-[#283042] text-xs font-bold text-white flex items-center justify-center gap-2 min-h-[42px] transition-all shadow-sm active:scale-98 cursor-pointer"
              >
                <Camera size={14} className="text-[#ff5500]" />
                <span>Camera Capture</span>
              </button>
            </div>

            <span className="hidden sm:inline text-[10px] text-[#6b7280]">
              or drag & drop file here
            </span>
          </div>
        </div>
      )}

      {/* Upload Error Display with Retry */}
      {error && !isUploading && (
        <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-start justify-between gap-2">
          <div className="flex items-start gap-1.5 min-w-0">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
            <span className="text-[11px] leading-tight">{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="shrink-0 text-[11px] font-bold text-[#ff8c4d] hover:underline flex items-center gap-1"
          >
            <RefreshCw size={11} />
            <span>Retry</span>
          </button>
        </div>
      )}
    </div>
  );
};
