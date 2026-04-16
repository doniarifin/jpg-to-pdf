import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Props {
  id: string;
  file: File;
  width: number;
  height: number;
  margin: number;
  onDelete: () => void;
}

export default function SortableItem({
  id,
  file,
  width,
  height,
  margin,
  onDelete,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width,
    height,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white shadow-lg relative group"
    >
      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="
          absolute 
          top-1
          right-1 
          z-10
          w-6 
          h-6
          rounded-full
          bg-gray-100
          border border-gray-300
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
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Margin */}
        <div
          className="absolute inset-0 border-2 border-dashed border-gray-300"
          style={{ margin: `${margin}px` }}
        />

        {/* Image */}
        <img
          src={URL.createObjectURL(file)}
          className="absolute object-contain"
          style={{
            top: margin,
            left: margin,
            width: `calc(100% - ${margin * 2}px)`,
            height: `calc(100% - ${margin * 2}px)`,
          }}
        />
      </div>
    </div>
  );
}
