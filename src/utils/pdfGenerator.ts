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

// ==========================================
// ORDEN DE TRABAJO PDF GENERATION
// ==========================================

export interface OrdenTrabajoPDFData {
  id: string;
  numeroOT: number;
  fecha: Date | any;
  unidad: { numero: string; patente: string };
  tipo: string;
  descripcion: string;
  estado: string;
  prioridad: string;
  asignadoA?: string;
  mecanico?: string;
  fechaInicio?: Date | any;
  fechaFin?: Date | any;
  horasTrabajo?: number;
  costoRepuestos?: number;
  costoManoObra?: number;
  costoReparacion?: number;
  repuestos?: { nombre: string; cantidad: number; costo: number }[];
  registrosTrabajo?: {
    fecha: any;
    descripcion: string;
    horasTrabajo: number;
    costoTotal: number;
    tecnico?: string;
    repuestos?: { nombre: string; cantidad: number; costo: number }[];
  }[];
  descripcionTrabajo?: string;
  comentarioInicio?: string;
  comentarioFin?: string;
}

/**
 * Formatear fecha para PDF
 */
function formatearFechaPDF(fecha: any): string {
  if (!fecha) return 'N/A';

  let date: Date;
  if (fecha?.toDate) {
    date = fecha.toDate();
  } else if (fecha instanceof Date) {
    date = fecha;
  } else if (typeof fecha === 'string') {
    date = new Date(fecha);
  } else {
    return 'N/A';
  }

  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export interface PDFResult {
  blob: Blob;
  url: string;
  fileName: string;
}

/**
 * Generar PDF de una Orden de Trabajo (retorna blob para previsualización)
 */
export async function generateOrdenTrabajoPDF(orden: OrdenTrabajoPDFData): Promise<PDFResult> {
  console.log('[PDF] Generando PDF para OT #' + orden.numeroOT);

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // === HEADER ===
  // Background rectangle for header
  pdf.setFillColor(26, 35, 50); // #1a2332 Crosslog dark blue
  pdf.rect(0, 0, pageWidth, 45, 'F');

  // Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ORDEN DE TRABAJO', margin, 20);

  // OT Number
  pdf.setFontSize(14);
  pdf.text(`OT #${orden.numeroOT.toString().padStart(4, '0')}`, margin, 32);

  // Estado badge
  const estadoColors: Record<string, [number, number, number]> = {
    'PENDIENTE': [245, 158, 11],   // amber
    'EN_PROCESO': [59, 130, 246],   // blue
    'ESPERANDO_REPUESTOS': [249, 115, 22], // orange
    'CERRADO': [34, 197, 94],       // green
    'COMPLETADA': [34, 197, 94]     // green
  };
  const estadoColor = estadoColors[orden.estado] || [107, 114, 128]; // gray default
  pdf.setFillColor(estadoColor[0], estadoColor[1], estadoColor[2]);
  const estadoText = orden.estado.replace('_', ' ');
  const estadoWidth = pdf.getTextWidth(estadoText) + 10;
  pdf.roundedRect(pageWidth - margin - estadoWidth - 5, 12, estadoWidth + 10, 10, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text(estadoText, pageWidth - margin - estadoWidth, 19);

  // Fecha de generación
  pdf.setFontSize(8);
  pdf.setTextColor(200, 200, 200);
  pdf.text(`Generado: ${new Date().toLocaleDateString('es-AR')}`, pageWidth - margin - 35, 38);

  yPosition = 55;
  pdf.setTextColor(0, 0, 0);

  // === INFORMACIÓN PRINCIPAL ===
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, yPosition, contentWidth, 35, 'F');

  yPosition += 8;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INFORMACIÓN DE LA UNIDAD', margin + 5, yPosition);

  yPosition += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Unidad: ${orden.unidad.numero}`, margin + 5, yPosition);
  pdf.text(`Patente: ${orden.unidad.patente}`, margin + 70, yPosition);
  pdf.text(`Tipo: ${orden.tipo}`, margin + 130, yPosition);

  yPosition += 7;
  pdf.text(`Fecha Creación: ${formatearFechaPDF(orden.fecha)}`, margin + 5, yPosition);
  pdf.text(`Prioridad: ${orden.prioridad}`, margin + 70, yPosition);
  if (orden.asignadoA || orden.mecanico) {
    pdf.text(`Técnico: ${orden.mecanico || orden.asignadoA || 'Sin asignar'}`, margin + 130, yPosition);
  }

  yPosition += 15;

  // === MOTIVO INGRESO ===
  pdf.setFillColor(26, 35, 50); // #1a2332 Crosslog dark blue (mismo que header)
  pdf.rect(margin, yPosition, contentWidth, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MOTIVO INGRESO', margin + 5, yPosition + 6);

  yPosition += 12;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const descripcionLines = pdf.splitTextToSize(orden.descripcion || 'Sin descripción', contentWidth - 10);
  pdf.text(descripcionLines, margin + 5, yPosition);
  yPosition += descripcionLines.length * 4 + 10;

  // === NOVEDADES ADICIONALES RESUELTAS ===
  // Combina descripcionTrabajo + registrosTrabajo en una sola sección
  const tieneNovedadesAdicionales = orden.descripcionTrabajo || (orden.registrosTrabajo && orden.registrosTrabajo.length > 0);

  if (tieneNovedadesAdicionales) {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFillColor(26, 35, 50); // #1a2332 Crosslog dark blue (mismo que header)
    pdf.rect(margin, yPosition, contentWidth, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NOVEDADES ADICIONALES RESUELTAS', margin + 5, yPosition + 6);

    yPosition += 12;
    pdf.setTextColor(0, 0, 0);

    // Mostrar descripcionTrabajo si existe (como primer item)
    if (orden.descripcionTrabajo) {
      pdf.setFillColor(245, 245, 245);
      const trabajoLines = pdf.splitTextToSize(orden.descripcionTrabajo, contentWidth - 15);
      const boxHeight = Math.max(20, trabajoLines.length * 4 + 12);
      pdf.rect(margin, yPosition, contentWidth, boxHeight, 'F');

      yPosition += 6;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(trabajoLines, margin + 5, yPosition);
      yPosition += trabajoLines.length * 4 + 10;
    }

    // Mostrar registros de trabajo
    if (orden.registrosTrabajo && orden.registrosTrabajo.length > 0) {
      orden.registrosTrabajo.forEach((registro, index) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFillColor(245, 245, 245);
        const regDesc = pdf.splitTextToSize(registro.descripcion || '', contentWidth - 15);
        const boxHeight = Math.max(25, regDesc.length * 3 + 18);
        pdf.rect(margin, yPosition, contentWidth, boxHeight, 'F');

        yPosition += 6;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        const itemNum = orden.descripcionTrabajo ? index + 2 : index + 1;
        pdf.text(`#${itemNum} - ${formatearFechaPDF(registro.fecha)}`, margin + 5, yPosition);
        if (registro.tecnico) {
          pdf.text(`Técnico: ${registro.tecnico}`, margin + 100, yPosition);
        }

        yPosition += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(regDesc, margin + 5, yPosition);
        yPosition += regDesc.length * 3 + 3;

        pdf.text(`Horas: ${registro.horasTrabajo || 0}h`, margin + 5, yPosition);
        pdf.text(`Costo: $${(registro.costoTotal || 0).toLocaleString('es-AR')}`, margin + 40, yPosition);

        yPosition += 10;
      });
    }

    yPosition += 5;
  }

  // === REPUESTOS UTILIZADOS ===
  if (orden.repuestos && orden.repuestos.length > 0) {
    if (yPosition > pageHeight - 50) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFillColor(249, 115, 22); // Orange
    pdf.rect(margin, yPosition, contentWidth, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('REPUESTOS UTILIZADOS', margin + 5, yPosition + 6);

    yPosition += 12;
    pdf.setTextColor(0, 0, 0);

    // Table header
    pdf.setFillColor(230, 230, 230);
    pdf.rect(margin, yPosition, contentWidth, 7, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Repuesto', margin + 5, yPosition + 5);
    pdf.text('Cant.', margin + 100, yPosition + 5);
    pdf.text('Costo Unit.', margin + 120, yPosition + 5);
    pdf.text('Subtotal', margin + 155, yPosition + 5);

    yPosition += 9;
    pdf.setFont('helvetica', 'normal');

    let totalRepuestos = 0;
    orden.repuestos.forEach((repuesto) => {
      const subtotal = repuesto.cantidad * repuesto.costo;
      totalRepuestos += subtotal;

      pdf.text(repuesto.nombre.substring(0, 40), margin + 5, yPosition);
      pdf.text(repuesto.cantidad.toString(), margin + 100, yPosition);
      pdf.text(`$${repuesto.costo.toLocaleString('es-AR')}`, margin + 120, yPosition);
      pdf.text(`$${subtotal.toLocaleString('es-AR')}`, margin + 155, yPosition);
      yPosition += 6;
    });

    // Total
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL REPUESTOS:', margin + 100, yPosition + 3);
    pdf.text(`$${totalRepuestos.toLocaleString('es-AR')}`, margin + 155, yPosition + 3);
    yPosition += 12;
  }

  // === RESUMEN DE COSTOS ===
  if (orden.costoRepuestos || orden.costoManoObra || orden.costoReparacion || orden.horasTrabajo) {
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFillColor(26, 35, 50); // #1a2332 Crosslog dark blue (mismo que header)
    pdf.rect(margin, yPosition, contentWidth, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RESUMEN DE COSTOS', margin + 5, yPosition + 6);

    yPosition += 14;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);

    if (orden.horasTrabajo) {
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Horas de Trabajo:`, margin + 5, yPosition);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${orden.horasTrabajo}h`, margin + 60, yPosition);
      yPosition += 7;
    }

    if (orden.costoRepuestos) {
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Costo Repuestos:`, margin + 5, yPosition);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`$${orden.costoRepuestos.toLocaleString('es-AR')}`, margin + 60, yPosition);
      yPosition += 7;
    }

    if (orden.costoManoObra) {
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Costo Mano de Obra:`, margin + 5, yPosition);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`$${orden.costoManoObra.toLocaleString('es-AR')}`, margin + 60, yPosition);
      yPosition += 7;
    }

    if (orden.costoReparacion) {
      pdf.setDrawColor(0, 0, 0);
      pdf.line(margin + 5, yPosition, margin + 100, yPosition);
      yPosition += 5;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`COSTO TOTAL:`, margin + 5, yPosition);
      pdf.setTextColor(34, 197, 94);
      pdf.text(`$${orden.costoReparacion.toLocaleString('es-AR')}`, margin + 60, yPosition);
    }
  }

  // === FOOTER ===
  const footerY = pageHeight - 15;
  pdf.setFillColor(26, 35, 50);
  pdf.rect(0, footerY - 5, pageWidth, 20, 'F');
  pdf.setTextColor(150, 150, 150);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Crosslog - Sistema de Gestión de Mantenimiento', margin, footerY + 3);
  pdf.text(`Página 1`, pageWidth - margin - 15, footerY + 3);

  // Generate PDF blob and filename
  const fileName = `OT_${orden.numeroOT.toString().padStart(4, '0')}_${orden.unidad.numero}_${new Date().toISOString().split('T')[0]}.pdf`;
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);

  console.log('[PDF] OT PDF generado:', fileName);

  return { blob: pdfBlob, url: pdfUrl, fileName };
}

/**
 * Descargar PDF directamente (función helper)
 */
export function downloadPDFBlob(blob: Blob, fileName: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
