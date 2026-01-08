import { PDFDocument, rgb } from 'pdf-lib';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AIAnalysisResult } from './claudeAnalysis';

// ==========================================
// TYPES FOR DELIVERY PDFs (Chofer)
// ==========================================

export interface SignatureData {
  dataUrl: string;
  nombreReceptor: string;
  timestamp?: number;
}

export interface PDFGenerationOptions {
  photoBlob: Blob;
  signature: SignatureData;
  numeroRemito: string;
  cliente: string;
  geolocalizacion?: { lat: number; lng: number };
}

// ==========================================
// TYPES FOR REPORTS PDFs (Indicadores)
// ==========================================

export interface ReportData {
  fecha: string;
  analisis: AIAnalysisResult;
  chartsElements?: {
    crosslogVsFleteros: HTMLElement;
    locVsInt: HTMLElement;
    fleteros: HTMLElement;
    topClientes: HTMLElement;
    tiposUnidad: HTMLElement;
    topInternos: HTMLElement;
    viajePorMes: HTMLElement;
  };
}

// ==========================================
// DELIVERY PDF GENERATION (Chofer)
// ==========================================

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

// ==========================================
// REPORT PDF GENERATION (Indicadores)
// ==========================================

/**
 * Generate PDF report with AI analysis and charts
 */
export async function generatePDFReport(data: ReportData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  console.log('[PDF] Starting PDF generation...');

  // ===== PAGE 1: Header and AI Analysis =====

  // Header with Crosslog branding
  pdf.setFillColor(26, 35, 50); // Dark gradient color
  pdf.rect(0, 0, pageWidth, 40, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CROSSLOG', margin, 20);

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Reporte Inteligente de Indicadores', margin, 30);

  // Date - Mejorado para mejor legibilidad
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const dateText = `Generado: ${data.fecha}`;
  const dateWidth = pdf.getTextWidth(dateText);
  pdf.text(dateText, pageWidth - margin - dateWidth, 30);

  yPosition = 50;

  // Resumen Ejecutivo
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RESUMEN EJECUTIVO', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const resumenLines = pdf.splitTextToSize(data.analisis.resumenEjecutivo, contentWidth);
  pdf.text(resumenLines, margin, yPosition);
  yPosition += resumenLines.length * 5 + 10;

  // Check if we need a new page
  if (yPosition > pageHeight - 60) {
    pdf.addPage();
    yPosition = margin;
  }

  // Analisis de Clientes Estrella
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ANALISIS DE CLIENTES ESTRELLA', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const clientesLines = pdf.splitTextToSize(data.analisis.analisisClientesEstrella, contentWidth);
  pdf.text(clientesLines, margin, yPosition);
  yPosition += clientesLines.length * 5 + 10;

  // Check if we need a new page
  if (yPosition > pageHeight - 60) {
    pdf.addPage();
    yPosition = margin;
  }

  // Analisis de Flota
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ANALISIS DE FLOTA', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const flotaLines = pdf.splitTextToSize(data.analisis.analisisFlota, contentWidth);
  pdf.text(flotaLines, margin, yPosition);
  yPosition += flotaLines.length * 5 + 10;

  // Check if we need a new page
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = margin;
  }

  // Alertas
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 38, 38); // Red color for alerts
  pdf.text('ALERTAS', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);

  data.analisis.alertas.forEach((alerta, index) => {
    const alertaLines = pdf.splitTextToSize(`${index + 1}. ${alerta}`, contentWidth - 5);
    pdf.text(alertaLines, margin + 5, yPosition);
    yPosition += alertaLines.length * 5 + 3;
  });
  yPosition += 5;

  // Check if we need a new page
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = margin;
  }

  // Recomendaciones
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(16, 185, 129); // Green color for recommendations
  pdf.text('RECOMENDACIONES ESTRATEGICAS', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);

  data.analisis.recomendaciones.forEach((rec, index) => {
    const recLines = pdf.splitTextToSize(`${index + 1}. ${rec}`, contentWidth - 5);
    pdf.text(recLines, margin + 5, yPosition);
    yPosition += recLines.length * 5 + 3;
  });

  // ===== PAGES 2+: Charts =====
  if (data.chartsElements) {
    console.log('[PDF] Capturing charts...');

    // Add new page for charts
    pdf.addPage();
    yPosition = margin;

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('GRAFICOS Y DATOS DETALLADOS', margin, yPosition);
    yPosition += 15;

    // Capture and add each chart
    const charts = [
      { element: data.chartsElements.crosslogVsFleteros, title: 'CROSSLOG vs FLETEROS' },
      { element: data.chartsElements.locVsInt, title: 'Distribucion LOC/INT' },
      { element: data.chartsElements.fleteros, title: 'Fleteros' },
      { element: data.chartsElements.topClientes, title: 'Top 10 Clientes' },
      { element: data.chartsElements.tiposUnidad, title: 'Tipos de Unidad' },
      { element: data.chartsElements.topInternos, title: 'Top 10 Internos' },
      { element: data.chartsElements.viajePorMes, title: 'Viajes por Mes' }
    ];

    for (const chart of charts) {
      try {
        if (yPosition > pageHeight - 100) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(chart.title, margin, yPosition);
        yPosition += 8;

        // Hide filters temporarily for cleaner PDF
        const filters = chart.element.querySelector('.bg-gradient-to-r.from-gray-50');
        if (filters) {
          (filters as HTMLElement).style.display = 'none';
        }

        const canvas = await html2canvas(chart.element, {
          scale: 2, // Mejor calidad de imagen
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true
        });

        // Restore filters
        if (filters) {
          (filters as HTMLElement).style.display = '';
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.9); // JPEG con 90% calidad
        const imgWidth = contentWidth * 0.85; // 85% del ancho disponible
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const xPosition = margin + (contentWidth - imgWidth) / 2; // Centrado

        pdf.addImage(imgData, 'JPEG', xPosition, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;

        console.log(`[PDF] Added chart: ${chart.title}`);
      } catch (error) {
        console.error(`[PDF] Error capturing chart ${chart.title}:`, error);
      }
    }
  }

  // Footer on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Pagina ${i} de ${totalPages} | Generado con IA - CROSSLOG (c) ${new Date().getFullYear()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `Reporte_CROSSLOG_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);

  console.log('[PDF] PDF generated successfully:', fileName);
}

/**
 * Get chart element by ID safely
 */
export function getChartElement(chartId: string): HTMLElement | undefined {
  const element = document.getElementById(chartId);
  return element || undefined;
}

/**
 * Prepare all chart elements for PDF
 */
export async function prepareChartsForPDF(): Promise<ReportData['chartsElements'] | undefined> {
  try {
    return {
      crosslogVsFleteros: getChartElement('chart-crosslog-fleteros')!,
      locVsInt: getChartElement('chart-loc-int')!,
      fleteros: getChartElement('chart-fleteros')!,
      topClientes: getChartElement('chart-top-clientes')!,
      tiposUnidad: getChartElement('chart-tipos-unidad')!,
      topInternos: getChartElement('chart-top-internos')!,
      viajePorMes: getChartElement('chart-viaje-mes')!
    };
  } catch (error) {
    console.warn('[PDF] Could not capture all charts:', error);
    return undefined;
  }
}
