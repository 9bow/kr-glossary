import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  effectiveType: string;
  downlink: number;
  saveData: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => {
    // Initial state
    const navigator = window.navigator as any;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    return {
      isOnline: navigator.onLine,
      isSlowConnection: connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      saveData: connection?.saveData || false,
    };
  });

  useEffect(() => {
    const handleOnlineStatusChange = () => {
      const navigator = window.navigator as any;
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        isSlowConnection: connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g',
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        saveData: connection?.saveData || false,
      }));
    };

    const handleConnectionChange = () => {
      const navigator = window.navigator as any;
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        setNetworkStatus(prev => ({
          ...prev,
          isSlowConnection: connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g',
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          saveData: connection.saveData || false,
        }));
      }
    };

    // Add event listeners
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    // Listen for connection changes (if supported)
    const navigator = window.navigator as any;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkStatus;
}

// Utility function to check if data usage should be minimized
export function shouldMinimizeDataUsage(networkStatus: NetworkStatus): boolean {
  return (
    !networkStatus.isOnline ||
    networkStatus.saveData ||
    networkStatus.isSlowConnection ||
    networkStatus.downlink < 1.5 // Less than 1.5 Mbps
  );
}

// Utility function to get connection quality description
export function getConnectionQuality(networkStatus: NetworkStatus): {
  level: 'excellent' | 'good' | 'poor' | 'offline';
  description: string;
} {
  if (!networkStatus.isOnline) {
    return {
      level: 'offline',
      description: '오프라인'
    };
  }

  if (networkStatus.isSlowConnection || networkStatus.downlink < 1) {
    return {
      level: 'poor',
      description: '연결 상태가 불안정합니다'
    };
  }

  if (networkStatus.downlink < 5) {
    return {
      level: 'good',
      description: '연결 상태가 양호합니다'
    };
  }

  return {
    level: 'excellent',
    description: '연결 상태가 우수합니다'
  };
}