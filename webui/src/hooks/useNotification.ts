import { useState, useCallback } from 'react';

type NoticeSeverity = 'info' | 'success' | 'error';

export function useNotification() {
  const [notice, setNotice] = useState<string | null>('欢迎使用 QQ 机器人控制台。');
  const [noticeSeverity, setNoticeSeverity] = useState<NoticeSeverity>('info');

  const showNotice = useCallback((message: string, severity: NoticeSeverity = 'info') => {
    setNotice(message);
    setNoticeSeverity(severity);
  }, []);

  const showError = useCallback((message: string) => {
    showNotice(message, 'error');
  }, [showNotice]);

  const showSuccess = useCallback((message: string) => {
    showNotice(message, 'success');
  }, [showNotice]);

  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);

  return {
    notice,
    noticeSeverity,
    showNotice,
    showError,
    showSuccess,
    clearNotice
  };
}
