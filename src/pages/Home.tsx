import { useState } from "react";
import UploadArea from "../components/UploadArea";
import Button from "../components/Button";
import { generatePDF } from "../features/pdf/pdfService";
import PDFPreview from "../components/PDFPreview";

type Orientation = "portrait" | "landscape";
type PageSize = "a4" | "letter" | "legal";

type ImageItem = {
  id: string;
  file: File;
};

const Home = () => {
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
    <div className="min-h-screen bg-gray-100">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">JPG to PDF</h1>
        <p className="text-gray-500 mt-2">
          Convert JPG images to PDF instantly with adjustable orientation and
          margins.
        </p>
      </div>

      <div className="p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upload + Preview */}
          <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow">
            <h2 className="text-xl font-semibold mb-4">Upload Images</h2>

            <UploadArea onChange={handleUpload} />

            {/* Preview */}
            <PDFPreview
              images={images}
              setImages={setImages}
              orientation={orientation}
              margin={margin}
              format={format}
            />
          </div>

          {/* RIGHT: Settings */}
          <div className="relative">
            <div
              className={`
            bg-white p-6 rounded-2xl shadow transition
            ${isDisabled ? "opacity-50 pointer-events-none" : ""}
          `}
            >
              <h2 className="text-xl font-semibold mb-4">Settings</h2>

              {/* Orientation */}
              <div className="mb-4">
                <label className="text-sm text-gray-500">Orientation</label>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setOrientation("portrait")}
                    className={`flex-1 p-2 rounded-lg border cursor-pointer ${
                      orientation === "portrait"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    Portrait
                  </button>

                  <button
                    onClick={() => setOrientation("landscape")}
                    className={`flex-1 p-2 rounded-lg border cursor-pointer ${
                      orientation === "landscape"
                        ? "bg-blue-600 text-white"
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
                          ? "bg-blue-600 text-white"
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
            </div>
            {/* overlay */}
            {isDisabled && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
                <p className="text-sm text-gray-600 font-medium">
                  Please choose file first
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
