import React from "react";
import { useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faFileImage } from "@fortawesome/free-solid-svg-icons";

interface UploadAreaProps {
  onChange: (files: File[]) => void;
  compact?: boolean;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onChange, compact }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    onChange(Array.from(e.target.files));

    e.target.value = "";

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const openDialog = () => inputRef.current?.click();

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept="image/jpeg,image/png"
      className="hidden"
      onChange={handleFile}
    />
  );

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={openDialog}
          aria-label="Add more images"
          className="
            w-10 h-10 rounded-full bg-yellow-400 hover:bg-yellow-500
            text-white shadow-md flex items-center justify-center
            cursor-pointer transition active:scale-95
          "
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
        {fileInput}
      </>
    );
  }

  return (
    <label className="w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20">
      <div className="text-center">
        <FontAwesomeIcon
          icon={faFileImage}
          size="2x"
          className="text-brand-500 mb-2"
        />
        <p className="text-gray-600 dark:text-gray-300 font-medium">Click here to upload</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Choose JPG/PNG files</p>
      </div>

      {fileInput}
    </label>
  );
};

export default UploadArea;
