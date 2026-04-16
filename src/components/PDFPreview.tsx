import React from "react";

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import SortableItem from "./SortableItem";

type PageSize = "a4" | "letter" | "legal";

interface Props {
  images: { id: string; file: File }[];
  setImages: React.Dispatch<any>;
  orientation: "portrait" | "landscape";
  margin: number;
  format: PageSize;
}

const PDFPreview: React.FC<Props> = ({
  images,
  setImages,
  orientation,
  margin,
  format,
}) => {
  // const isLandscape = orientation === "landscape";

  const sizes = {
    a4: { w: 210, h: 297 },
    letter: { w: 216, h: 279 },
    legal: { w: 216, h: 356 },
  };

  const scale = 1.2;

  const base = sizes[format];

  const width = (orientation === "landscape" ? base.h : base.w) * scale;
  const height = (orientation === "landscape" ? base.w : base.h) * scale;

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setImages((items: any) => {
        const oldIndex = items.findIndex((i: any) => i.id === active.id);
        const newIndex = items.findIndex((i: any) => i.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDelete = (id: string) => {
    setImages((prev: any) => prev.filter((item: any) => item.id !== id));
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={images} strategy={rectSortingStrategy}>
        <div className="bg-gray-200 p-6 rounded-xl mt-6 flex flex-wrap gap-6 justify-center">
          {images.map((item, index) => (
            <div key={item.id} className="flex flex-col items-center">
              {/* Page */}
              <div style={{ width, height }}>
                <SortableItem
                  id={item.id}
                  file={item.file}
                  width={width}
                  height={height}
                  margin={margin}
                  onDelete={() => handleDelete(item.id)}
                />
              </div>

              <span className="text-xs text-gray-500 mt-2">
                Page {index + 1}
              </span>
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default PDFPreview;
