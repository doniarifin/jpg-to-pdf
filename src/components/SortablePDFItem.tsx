import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import PDFThumbnail from "./PDFThumbnail";

interface Props {
  id: string;
  file: File;
  index: number;
  onDelete: () => void;
}

export default function SortablePDFItem({ id, file, index, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-800 shadow-lg rounded-xl relative group w-40"
    >
      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="
          absolute
          top-2
          right-2
          z-10
          w-6
          h-6
          rounded-full
          bg-gray-100 dark:bg-gray-700
          border border-gray-300 dark:border-gray-600
          flex items-center justify-center
          shadow-[0_2px_4px_rgba(0,0,0,0.1)]
          hover:bg-red-500
          hover:text-white
          cursor-pointer
          active:scale-95
          transition
        "
      >
        <FontAwesomeIcon icon={faXmark} size="sm" />
      </button>

      {/* Drag Area */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-4 flex flex-col items-center"
      >
        <div className="w-full mb-3 flex items-center justify-center h-32 overflow-hidden rounded-md bg-gray-50 dark:bg-gray-800">
          <PDFThumbnail file={file} className="h-32 w-auto object-contain" />
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-200 font-medium truncate max-w-full">
          {file.name}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {(file.size / 1024).toFixed(0)} KB
        </p>
      </div>

      {/* Index badge */}
      <span className="absolute top-2 left-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
        #{index + 1}
      </span>
    </div>
  );
}