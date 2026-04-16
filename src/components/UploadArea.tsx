import React from "react";
import { useRef } from "react";

interface UploadAreaProps {
  onChange: (files: File[]) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onChange }) => {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    onChange(Array.from(e.target.files));

    e.target.value = "";

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <label className="w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition hover:border-blue-500 hover:bg-blue-50">
      <div className="text-center">
        <p className="text-gray-600 font-medium">Click here to upload</p>
        <p className="text-sm text-gray-400 mt-1">Choose JPG/PNG files</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        // accept="image/jpeg"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFile}
      />
    </label>
  );
};

export default UploadArea;
