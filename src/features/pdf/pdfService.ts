import { jsPDF } from "jspdf";

type ImageItem = {
  id: string;
  file: File;
};

type PageSize = "a4" | "letter" | "legal";

interface PDFOptions {
  orientation: "portrait" | "landscape";
  margin: number;
  format: PageSize;
}

export const generatePDF = async (
  images: ImageItem[],
  options: PDFOptions,
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: options.orientation,
    unit: "mm",
    format: options.format,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < images.length; i++) {
    const file = images[i].file;

    const imgData = await toBase64(file);

    const img = new Image();
    img.src = imgData as string;

    await new Promise<void>((resolve) => {
      img.onload = () => {
        const maxWidth = pageWidth - options.margin * 2;
        const maxHeight = pageHeight - options.margin * 2;

        let width = maxWidth;
        let height = (img.height * width) / img.width;

        if (height > maxHeight) {
          height = maxHeight;
          width = (img.width * height) / img.height;
        }

        const x = (pageWidth - width) / 2;
        const y = (pageHeight - height) / 2;

        if (i !== 0) pdf.addPage();

        const file = images[i].file;

        const format = file.type === "image/png" ? "PNG" : "JPEG";

        pdf.addImage(img, format, x, y, width, height);
        // pdf.addImage(img, "JPEG", x, y, width, height);

        resolve();
      };
    });
  }

  const firstFileName = images[0]?.file.name || "output";
  const baseName = firstFileName.replace(/\.[^/.]+$/, "");

  pdf.save(`${baseName}.pdf`);

  // pdf.save("output.pdf");
};

const toBase64 = (file: File) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
