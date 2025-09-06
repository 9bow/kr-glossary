import { useState, useEffect, useCallback } from 'react';

export interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | null;
  subscription: NotificationSubscription | null;
  isSubscribing: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): PushNotificationState {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscription, setSubscription] = useState<NotificationSubscription | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if push notifications are supported
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  useEffect(() => {
    if (!isSupported) return;

    // Get current permission status
    setPermission(Notification.permission);

    // Get existing subscription
    getExistingSubscription();
  }, [isSupported]);

  const getExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        const subscriptionData: NotificationSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(sub.getKey('p256dh')!),
            auth: arrayBufferToBase64(sub.getKey('auth')!),
          },
        };
        setSubscription(subscriptionData);
      }
    } catch (error) {
      console.error('Failed to get existing subscription:', error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('브라우저에서 푸시 알림을 지원하지 않습니다.');
      return false;
    }

    try {
      setError(null);
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        console.log('Push notification permission granted');
        return true;
      } else if (result === 'denied') {
        setError('푸시 알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.');
        return false;
      } else {
        setError('푸시 알림 권한이 거부되었습니다.');
        return false;
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      setError('권한 요청 중 오류가 발생했습니다.');
      return false;
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<void> => {
    if (!isSupported || permission !== 'granted') {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;
    }

    setIsSubscribing(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        throw new Error('Service Worker not registered');
      }

      // VAPID 공개 키 (실제 운영에서는 환경변수로 관리)
      const vapidPublicKey = 'BNxBsIHXpKa7n5-qoG3-mq6W8MUfhzLJyQ8CqXf_4U9mjQ2O5FZQo_7Y8K4N5x7-wGxZJpL9K8H3L7C2G9F4U8A';
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subscriptionData: NotificationSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(sub.getKey('p256dh')!),
          auth: arrayBufferToBase64(sub.getKey('auth')!),
        },
      };

      setSubscription(subscriptionData);

      // 서버에 구독 정보 전송 (실제 구현에서는 API 엔드포인트 필요)
      await sendSubscriptionToServer(subscriptionData);

      console.log('Successfully subscribed to push notifications');
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      setError('구독 중 오류가 발생했습니다.');
    } finally {
      setIsSubscribing(false);
    }
  }, [isSupported, permission, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    setIsSubscribing(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const sub = await registration.pushManager.getSubscription();
      if (!sub) return;

      await sub.unsubscribe();
      setSubscription(null);

      // 서버에 구독 해제 알림
      if (subscription) {
        await removeSubscriptionFromServer(subscription);
      }

      console.log('Successfully unsubscribed from push notifications');
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      setError('구독 해제 중 오류가 발생했습니다.');
    } finally {
      setIsSubscribing(false);
    }
  }, [subscription]);

  return {
    isSupported,
    permission,
    subscription,
    isSubscribing,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}

// Utility functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Mock server functions (실제 구현에서는 실제 API로 교체)
async function sendSubscriptionToServer(subscription: NotificationSubscription): Promise<void> {
  // 실제 구현에서는 서버 API 호출
  console.log('Sending subscription to server:', subscription);
  
  // localStorage에 저장 (임시 구현)
  localStorage.setItem('push-subscription', JSON.stringify(subscription));
}

async function removeSubscriptionFromServer(subscription: NotificationSubscription): Promise<void> {
  // 실제 구현에서는 서버 API 호출
  console.log('Removing subscription from server:', subscription);
  
  // localStorage에서 제거 (임시 구현)
  localStorage.removeItem('push-subscription');
}

// 알림 테스트 함수
export function testNotification() {
  if (!('Notification' in window)) {
    alert('브라우저에서 알림을 지원하지 않습니다.');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification('AI/ML 용어집', {
      body: '푸시 알림이 정상적으로 설정되었습니다!',
      icon: '/favicon-32x32.png',
      badge: '/favicon-32x32.png',
      tag: 'test-notification',
      requireInteraction: false,
    });
  } else {
    alert('알림 권한이 필요합니다.');
  }
}