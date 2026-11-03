/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DevicePlatform = 'mobile' | 'desktop';
export type CrossplaySetting = 'CROSSPLAY_ENABLED' | 'SAME_PLATFORM_ONLY';

/**
 * Detects if the current user is running on a mobile device or desktop PC
 */
export function detectDevicePlatform(): DevicePlatform {
  if (typeof window === 'undefined') return 'desktop';

  // Check user agent
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  // Check touch capabilities and screen size
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;

  if (isMobileUA || (hasTouch && isSmallScreen)) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Hardware tactile haptic vibration feedback for mobile devices
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'knockout' | 'powerTick' | 'spin') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(12);
        break;
      case 'medium':
        navigator.vibrate(30);
        break;
      case 'heavy':
        navigator.vibrate([45, 30, 45]);
        break;
      case 'knockout':
        navigator.vibrate([70, 40, 110, 50, 150]);
        break;
      case 'powerTick':
        navigator.vibrate(18);
        break;
      case 'spin':
        navigator.vibrate(22);
        break;
    }
  } catch (_) {
    // Graceful no-op if vibration not permitted or supported
  }
}
