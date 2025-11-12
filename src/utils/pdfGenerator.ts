import { PDFDocument, rgb } from 'pdf-lib';

export interface SignatureData {
  dataUrl: string;
  nombreReceptor: string;
}

export interface PDFGenerationOptions {
  photoBlob: Blob;
  signature: SignatureData;
  numeroRemito: string;
  cliente: string;
  geolocalizacion?: { lat: number; lng: number };
}

/**
 * Generate individual PDF for each photo with signature as last page
 */
export async function generateIndividualPDF(
  options: PDFGenerationOptions
): Promise<Blob> {
  const { photoBlob, signature, numeroRemito, cliente, geolocalizacion } = options;

  try {
    // Create new PDF document
    const pdfDoc = await PDFDocument.create();

    // Page 1: Photo
    const photoArrayBuffer = await photoBlob.arrayBuffer();
    const photoBytes = new Uint8Array(photoArrayBuffer);

    let photoImage;
    const photoType = photoBlob.type;

    if (photoType === 'image/jpeg' || photoType === 'image/jpg') {
      photoImage = await pdfDoc.embedJpg(photoBytes);
    } else if (photoType === 'image/png') {
      photoImage = await pdfDoc.embedPng(photoBytes);
    } else {
      throw new Error(`Unsupported image type: ${photoType}`);
    }

    // Add page with photo - always ensure vertical/portrait orientation
    const photoPage = pdfDoc.addPage([photoImage.width, photoImage.height]);
    photoPage.drawImage(photoImage, {
      x: 0,
      y: 0,
      width: photoImage.width,
      height: photoImage.height,
    });

    // Page 2: Signature + Metadata (Diseño mejorado)
    const signaturePage = pdfDoc.addPage([595, 842]); // A4 size
    const pageWidth = 595;
    const pageHeight = 842;

    // Background color for header - Crosslog dark blue
    signaturePage.drawRectangle({
      x: 0,
      y: pageHeight - 100,
      width: pageWidth,
      height: 100,
      color: rgb(0.102, 0.137, 0.196), // #1a2332 (Crosslog primary dark)
    });

    // Title
    signaturePage.drawText('COMPROBANTE DE ENTREGA', {
      x: 50,
      y: pageHeight - 55,
      size: 20,
      color: rgb(1, 1, 1),
    });

    // Subtitle with Crosslog green accent
    signaturePage.drawText('CROSSLOG - Sistema de Entregas', {
      x: 50,
      y: pageHeight - 78,
      size: 12,
      color: rgb(0.659, 0.878, 0.388), // #a8e063 (Crosslog green)
    });

    // Convert signature dataUrl to bytes (only if we have a valid signature image)
    let signatureImage = null;
    let sigWidth = 0;
    let sigHeight = 0;

    if (signature.dataUrl && signature.dataUrl.startsWith('data:image')) {
      try {
        const signatureBase64 = signature.dataUrl.split(',')[1];
        if (signatureBase64) {
          const signatureBytes = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
          signatureImage = await pdfDoc.embedPng(signatureBytes);

          // Calculate signature dimensions
          const maxWidth = 280;
          const maxHeight = 140;
          sigWidth = signatureImage.width;
          sigHeight = signatureImage.height;

          if (sigWidth > maxWidth) {
            const ratio = maxWidth / sigWidth;
            sigWidth = maxWidth;
            sigHeight = sigHeight * ratio;
          }

          if (sigHeight > maxHeight) {
            const ratio = maxHeight / sigHeight;
            sigHeight = maxHeight;
            sigWidth = sigWidth * ratio;
          }
        }
      } catch (signatureError) {
        console.warn('[pdfGenerator] Error loading signature image, will continue without it:', signatureError);
        signatureImage = null;
      }
    }

    // Signature box with Crosslog green border
    const boxY = pageHeight - 350;
    signaturePage.drawRectangle({
      x: 50,
      y: boxY,
      width: pageWidth - 100,
      height: 200,
      borderColor: rgb(0.659, 0.878, 0.388), // #a8e063 (Crosslog green)
      borderWidth: 2,
    });

    signaturePage.drawText('Firma del Receptor:', {
      x: 60,
      y: boxY + 175,
      size: 11,
      color: rgb(0.176, 0.243, 0.314), // #2d3e50 (Crosslog secondary dark)
    });

    // Draw signature centered in box (only if we have a signature image)
    if (signatureImage && sigWidth > 0 && sigHeight > 0) {
      const sigX = 50 + (pageWidth - 100 - sigWidth) / 2;
      const sigY = boxY + (200 - sigHeight) / 2;

      signaturePage.drawImage(signatureImage, {
        x: sigX,
        y: sigY,
        width: sigWidth,
        height: sigHeight,
      });
    } else {
      // Draw placeholder text if no signature image
      signaturePage.drawText('(Firma digital no disponible)', {
        x: 150,
        y: boxY + 90,
        size: 10,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Information section
    let infoY = boxY - 40;
    const lineHeight = 25;
    const labelX = 60;
    const valueX = 200;

    // Receptor name
    signaturePage.drawText('Receptor:', {
      x: labelX,
      y: infoY,
      size: 11,
      color: rgb(0.176, 0.243, 0.314), // #2d3e50 (Crosslog secondary dark)
    });
    signaturePage.drawText(signature.nombreReceptor, {
      x: valueX,
      y: infoY,
      size: 12,
      color: rgb(0, 0, 0),
    });

    infoY -= lineHeight;

    // Cliente/Destino
    signaturePage.drawText('Destino:', {
      x: labelX,
      y: infoY,
      size: 11,
      color: rgb(0.176, 0.243, 0.314), // #2d3e50 (Crosslog secondary dark)
    });
    // Wrap text if too long
    const maxLineLength = 45;
    if (cliente.length > maxLineLength) {
      const lines = [];
      let currentLine = '';
      const words = cliente.split(' ');
      for (const word of words) {
        if ((currentLine + ' ' + word).length <= maxLineLength) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);

      lines.forEach((line, idx) => {
        signaturePage.drawText(line, {
          x: valueX,
          y: infoY - (idx * 15),
          size: 12,
          color: rgb(0, 0, 0),
        });
      });
      infoY -= lineHeight + ((lines.length - 1) * 15);
    } else {
      signaturePage.drawText(cliente, {
        x: valueX,
        y: infoY,
        size: 12,
        color: rgb(0, 0, 0),
      });
      infoY -= lineHeight;
    }

    // Remito number
    signaturePage.drawText('N° Remito:', {
      x: labelX,
      y: infoY,
      size: 11,
      color: rgb(0.176, 0.243, 0.314), // #2d3e50 (Crosslog secondary dark)
    });
    signaturePage.drawText(numeroRemito, {
      x: valueX,
      y: infoY,
      size: 12,
      color: rgb(0, 0, 0),
    });

    infoY -= lineHeight;

    // Timestamp (only date, no time)
    const timestamp = new Date().toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
    });
    signaturePage.drawText('Fecha:', {
      x: labelX,
      y: infoY,
      size: 11,
      color: rgb(0.176, 0.243, 0.314), // #2d3e50 (Crosslog secondary dark)
    });
    signaturePage.drawText(timestamp, {
      x: valueX,
      y: infoY,
      size: 12,
      color: rgb(0, 0, 0),
    });

    if (geolocalizacion) {
      infoY -= lineHeight;
      signaturePage.drawText('Ubicación GPS:', {
        x: labelX,
        y: infoY,
        size: 11,
        color: rgb(0.176, 0.243, 0.314), // #2d3e50 (Crosslog secondary dark)
      });
      signaturePage.drawText(
        `${geolocalizacion.lat.toFixed(6)}, ${geolocalizacion.lng.toFixed(6)}`,
        {
          x: valueX,
          y: infoY,
          size: 10,
          color: rgb(0, 0, 0),
        }
      );
    }

    // Footer with Crosslog color
    signaturePage.drawText('Documento generado automáticamente por CROSSLOG', {
      x: pageWidth / 2 - 130,
      y: 30,
      size: 9,
      color: rgb(0.176, 0.243, 0.314), // #2d3e50 (Crosslog secondary dark)
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

    console.log('[PDFGenerator] PDF generated successfully');
    return pdfBlob;
  } catch (error) {
    console.error('[PDFGenerator] Error generating PDF:', error);
    throw error;
  }
}

/**
 * Generate multiple PDFs from photos array
 */
export async function generatePDFsFromPhotos(
  photos: Blob[],
  signature: SignatureData,
  numeroRemito: string,
  cliente: string,
  geolocalizacion?: { lat: number; lng: number }
): Promise<Blob[]> {
  const pdfs: Blob[] = [];

  for (let i = 0; i < photos.length; i++) {
    console.log(`[PDFGenerator] Generating PDF ${i + 1}/${photos.length}...`);

    const pdf = await generateIndividualPDF({
      photoBlob: photos[i],
      signature,
      numeroRemito,
      cliente,
      geolocalizacion,
    });

    pdfs.push(pdf);
  }

  console.log(`[PDFGenerator] Generated ${pdfs.length} PDFs`);
  return pdfs;
}
