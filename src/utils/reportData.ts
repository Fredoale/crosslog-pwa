import { GoogleSheetsAPI } from './sheetsApi';
import type { AnalysisData } from './claudeAnalysis';

/**
 * Collect data for historical analysis
 * @param sheetsService - Google Sheets API instance
 * @param numMonths - Number of months to collect (3, 6, or 12)
 * @param baseMonth - Base month in format "MM-YYYY" (optional, defaults to current month)
 */
export async function collectHistoricalData(sheetsService: GoogleSheetsAPI, numMonths: number = 3, baseMonth?: string): Promise<AnalysisData> {
  console.log(`[ReportData] Collecting ${numMonths} months historical data...`);

  // Use baseMonth if provided, otherwise use current date
  let baseDate: Date;
  if (baseMonth) {
    // Support both formats: YYYY-MM and MM-YYYY
    const parts = baseMonth.split('-');
    let year: number, month: number;

    // Check if first part is year (4 digits) or month (1-2 digits)
    if (parts[0].length === 4) {
      // Format is YYYY-MM
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
    } else {
      // Format is MM-YYYY
      month = parseInt(parts[0]);
      year = parseInt(parts[1]);
    }

    baseDate = new Date(year, month - 1, 1);
  } else {
    baseDate = new Date();
  }

  const months: string[] = [];

  // Get last N months from base date in format "YYYY-MM" for sheetsApi
  for (let i = numMonths - 1; i >= 0; i--) {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    months.push(`${year}-${month}`); // Changed to YYYY-MM format
  }

  console.log('[ReportData] Months to analyze:', months);

  // Fetch data for all months
  const monthsData = await Promise.all(
    months.map(month => sheetsService.getIndicadores(month))
  );

  // Current month is the most recent (last in array)
  const currentData = monthsData[monthsData.length - 1];

  // Count LOC/INT from distribLocInt
  let locCount = 0;
  let intCount = 0;
  if (currentData.distribLocInt && Array.isArray(currentData.distribLocInt)) {
    currentData.distribLocInt.forEach((item: any) => {
      if (item.tipo === 'LOC') locCount = item.cantidad;
      if (item.tipo === 'INT') intCount = item.cantidad;
    });
  }

  // Format month names (accepts both YYYY-MM and MM-YYYY formats)
  const formatMonthName = (monthStr: string): string => {
    const parts = monthStr.split('-');
    let year: string, month: string;

    // Detect format: if first part is 4 digits, it's YYYY-MM
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1];
    } else {
      month = parts[0];
      year = parts[1];
    }

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  // Extract CROSSLOG and FLETEROS counts from crosslogVsFleteros array
  const getCrosslogFleterosCount = (data: any) => {
    let crosslog = 0;
    let fleteros = 0;

    if (data.crosslogVsFleteros && Array.isArray(data.crosslogVsFleteros)) {
      data.crosslogVsFleteros.forEach((item: any) => {
        if (item.tipo === 'CROSSLOG') crosslog = item.cantidad;
        if (item.tipo === 'FLETEROS') fleteros = item.cantidad;
      });
    }

    return { crosslog, fleteros };
  };

  // Get CROSSLOG/FLETEROS for current month
  const currentCF = getCrosslogFleterosCount(currentData);

  // Build historical data dynamically based on number of months
  const historicalMonths = monthsData.map((data, index) => {
    const cf = getCrosslogFleterosCount(data);
    return {
      month: formatMonthName(months[index]),
      totalViajes: data.totalViajes || 0,
      crosslog: cf.crosslog,
      fleteros: cf.fleteros,
      topClientes: data.topClientes || []
    };
  });

  // Create the analysis data structure (keep month1, month2, month3 for backward compatibility)
  const analysisData: AnalysisData = {
    // Current period data
    totalViajes: currentData.totalViajes || 0,
    crosslogCount: currentCF.crosslog,
    fleterosCount: currentCF.fleteros,
    locCount: locCount,
    intCount: intCount,
    topClientes: currentData.topClientes || [],

    // Historical data (using last 3 months for compatibility, rest goes in allMonths)
    historicalData: {
      month1: historicalMonths[Math.max(0, historicalMonths.length - 3)] || historicalMonths[0],
      month2: historicalMonths[Math.max(0, historicalMonths.length - 2)] || historicalMonths[0],
      month3: historicalMonths[historicalMonths.length - 1] || historicalMonths[0]
    },

    // All months data for extended reports
    allMonths: historicalMonths,
    periodType: numMonths === 12 ? 'annual' : numMonths === 6 ? '6months' : numMonths === 2 ? '2months' : '3months'
  };

  console.log('[ReportData] Data collected:', {
    currentTotal: analysisData.totalViajes,
    monthsAnalyzed: historicalMonths.length,
    periodType: analysisData.periodType
  });

  return analysisData;
}
