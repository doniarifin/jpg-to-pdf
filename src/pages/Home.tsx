import { useEffect, useState } from "react";
import UploadArea from "../components/UploadArea";
import Button from "../components/Button";
import { generatePDF } from "../features/pdf/pdfService";
import PDFPreview from "../components/PDFPreview";
import ScrollArea from "../components/ScrollArea";
import PrivacyNote from "../components/PrivacyNote";
import SidePanel from "../components/SidePanel";

type Orientation = "portrait" | "landscape";
type PageSize = "a4" | "letter" | "legal";

type ImageItem = {
  id: string;
  file: File;
};

const Home = () => {
  useEffect(() => {
    document.title = "JPG to PDF | PDF Toolkit";
  }, []);

  const handleUpload = (files: File[]) => {
    const newFiles = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
    }));

    setImages((prev) => [...prev, ...newFiles]);
  };

  const [images, setImages] = useState<ImageItem[]>([]);
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [margin, setMargin] = useState(10);
  const [format, setFormat] = useState<PageSize>("a4");

  const isDisabled = images.length === 0;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden px-6 md:px-10 py-6 scroll-area">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:h-full">
        {/* Upload + Preview */}
        <div className="relative md:col-span-2 bg-white p-6 rounded-2xl shadow md:flex md:flex-col md:min-h-0">
          <h2 className="text-xl font-semibold mb-4">Images to PDF</h2>

          {images.length === 0 && <UploadArea onChange={handleUpload} />}

          {images.length > 0 && (
            <div className="absolute top-4 right-4 z-10">
              <UploadArea onChange={handleUpload} compact />
            </div>
          )}

          {/* Preview (scrolls when many images) */}
          <ScrollArea className="md:flex-1 md:min-h-0 mt-4">
            <PDFPreview
              images={images}
              setImages={setImages}
              orientation={orientation}
              margin={margin}
              format={format}
            />
          </ScrollArea>

          <PrivacyNote />
        </div>

        {/* RIGHT: Settings */}
        <SidePanel disabled={isDisabled} overlayText="Please choose file first">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>

              {/* Orientation */}
              <div className="mb-4">
                <label className="text-sm text-gray-500">Orientation</label>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setOrientation("portrait")}
                    className={`flex-1 p-2 rounded-lg border cursor-pointer ${
                      orientation === "portrait"
                        ? "bg-brand-600 text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    Portrait
                  </button>

                  <button
                    onClick={() => setOrientation("landscape")}
                    className={`flex-1 p-2 rounded-lg border cursor-pointer ${
                      orientation === "landscape"
                        ? "bg-brand-600 text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-500">Page Size</label>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  {["a4", "letter", "legal"].map((size) => (
                    <button
                      key={size}
                      onClick={() => setFormat(size as PageSize)}
                      className={`p-2 rounded-lg border text-sm capitalize cursor-pointer ${
                        format === size
                          ? "bg-brand-600 text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Margin */}
              <div className="mb-6">
                <label className="text-sm text-gray-500">
                  Margin: {margin} mm
                </label>

                <input
                  type="range"
                  min={0}
                  max={30}
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full mt-2 cursor-pointer"
                  style={{ colorScheme: "light" }}
                />
              </div>

              {/* Convert */}
              <Button
                variant="secondary"
                className="w-full cursor-pointer"
                onClick={() =>
                  generatePDF(images, { orientation, margin, format })
                }
              >
                Convert to PDF
              </Button>
        </SidePanel>
      </div>
    </div>
  );
};

export default Home;
