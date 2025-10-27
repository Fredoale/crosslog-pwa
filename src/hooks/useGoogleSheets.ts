import { useState } from 'react';
import { sheetsApi } from '../utils/sheetsApi';
import type { HDRValidationResponse } from '../types';

export function useGoogleSheets() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateHDR = async (hdr: string): Promise<HDRValidationResponse> => {
    setLoading(true);
    setError(null);

    try {
      const result = await sheetsApi.validateHDR(hdr);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error validating HDR';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const submitEntrega = async (data: any): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await sheetsApi.submitEntrega(data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error submitting entrega';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Note: updateProgress is deprecated, use sheetsApi.updateEstadoProgreso directly instead
  // const updateProgress = async (hdr: string, completed: number, total: number): Promise<boolean> => {
  //   try {
  //     return await sheetsApi.updateProgress(hdr, completed, total);
  //   } catch (err) {
  //     console.error('[useGoogleSheets] Error updating progress:', err);
  //     return false;
  //   }
  // };

  return {
    loading,
    error,
    validateHDR,
    submitEntrega,
    // updateProgress, // Deprecated
  };
}
