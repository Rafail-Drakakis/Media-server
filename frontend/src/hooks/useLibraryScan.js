import { useState, useCallback } from 'react';
import { api } from '../api/client';

export function useLibraryScan() {
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const scanLibrary = useCallback(async () => {
    setScanning(true);
    setScanMessage('');
    try {
      await api.scanLibrary();
      setScanMessage('Library scan complete');
      return true;
    } catch (err) {
      setScanMessage(`Scan failed: ${err.message}`);
      return false;
    } finally {
      setScanning(false);
    }
  }, []);

  return { scanning, scanMessage, scanLibrary, clearScanMessage: () => setScanMessage('') };
}
