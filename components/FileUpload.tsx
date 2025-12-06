
import React, { useState, useCallback, useEffect } from 'react';

interface FileUploadProps {
  onFileUpload: (file: File, previewUrl: string) => void;
  label: string;
  acceptedTypes?: string;
  required?: boolean;
  initialPreviewUrl?: string;
  initialFileType?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUpload, 
  label, 
  acceptedTypes = "image/*", 
  required = false, 
  initialPreviewUrl,
  initialFileType
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);

  useEffect(() => {
    if (initialPreviewUrl) {
      setPreview(initialPreviewUrl);
      setFileName("Existing File");
      if (initialFileType) {
          setFileType(initialFileType);
      }
    }
  }, [initialPreviewUrl, initialFileType]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      setFileName(file.name);
      setFileType(file.type);
      onFileUpload(file, previewUrl);
    }
  }, [onFileUpload]);

  const isPdf = fileType === 'application/pdf';

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors">
        <div className="space-y-1 text-center w-full">
          {!preview ? (
            <>
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600 justify-center">
                <label htmlFor={`file-upload-${label}`} className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                  <span>Upload a file</span>
                  <input id={`file-upload-${label}`} name={`file-upload-${label}`} type="file" className="sr-only" onChange={handleFileChange} accept={acceptedTypes} />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
            </>
          ) : (
            <div className="flex flex-col items-center w-full">
                {isPdf ? (
                     <div className="flex flex-col items-center justify-center h-48 w-full max-w-xs bg-gray-100 rounded-md border text-gray-500">
                        <svg className="w-16 h-16 mb-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium">PDF Document</span>
                     </div>
                ) : (
                    <img src={preview} alt="File preview" className="max-h-48 rounded-md shadow-md object-contain" />
                )}
                
                <p className="text-sm font-medium text-gray-700 mt-2 truncate max-w-xs">{fileName}</p>
                <button
                    onClick={() => {
                        setPreview(null);
                        setFileName(null);
                        setFileType(null);
                        const input = document.getElementById(`file-upload-${label}`) as HTMLInputElement;
                        if(input) {
                            input.value = '';
                        }
                    }}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-500 font-medium"
                >
                    Change file
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
