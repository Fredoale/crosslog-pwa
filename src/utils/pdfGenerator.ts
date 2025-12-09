import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AIAnalysisResult } from './claudeAnalysis';

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
