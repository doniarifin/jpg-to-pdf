import React, { useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf, faPlus } from "@fortawesome/free-solid-svg-icons";

interface MergeUploadAreaProps {
  onChange: (files: File[]) => void;
  compact?: boolean;
  title?: string;
  hint?: string;
}

const MergeUploadArea: React.FC<MergeUploadAreaProps> = ({
  onChange,
  compact,
  title = "Click here to upload PDFs",
  hint = "Choose PDF files",
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    onChange(Array.from(e.target.files));
    e.target.value = "";
    if (inputRef.current) inputRef.current.value = "";
  };

  const openDialog = () => inputRef.current?.click();

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept="application/pdf"
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
          aria-label="Add more PDFs"
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
    <label className="w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition hover:border-brand-500 hover:bg-brand-50">
      <div className="text-center">
        <FontAwesomeIcon
          icon={faFilePdf}
          size="2x"
          className="text-red-500 mb-2"
        />
        <p className="text-gray-600 font-medium">{title}</p>
        <p className="text-sm text-gray-400 mt-1">{hint}</p>
      </div>

      {fileInput}
    </label>
  );
};

export default MergeUploadArea;
