import UAParser from 'ua-parser-js';

// 인앱브라우저 이름 목록
const IN_APP_BROWSERS = [
  'kakaotalk', // 카카오톡
  'instagram', // 인스타그램
  'facebook', // 페이스북
  'naver', // 네이버
  'line', // 라인
  'twitter', // 트위터/X
  'daum', // 다음
  'snapchat', // 스냅챗
  'wechat', // 위챗
];

export const isInAppBrowser = (): boolean => {
  // 오탐지 해제 플래그 확인
  if (localStorage.getItem('bypass-inapp-check') === 'true') {
    return false;
  }

  const parser = new UAParser();
  const browserName = parser.getBrowser().name?.toLowerCase() || '';

  // ua-parser-js가 감지한 브라우저 이름이 인앱브라우저 목록에 있는지 확인
  if (IN_APP_BROWSERS.some((inAppBrowser) => browserName.includes(inAppBrowser))) {
    return true;
  }

  // ua-parser-js가 감지하지 못하는 경우를 위한 추가 User-Agent 체크
  const ua = navigator.userAgent.toLowerCase();
  const additionalPatterns = ['kakaotalk', 'fban', 'fbav', 'instagram', 'naver', 'line/', 'daumapps'];

  return additionalPatterns.some((pattern) => ua.includes(pattern));
};

export const getExternalBrowserUrl = (): string => {
  const currentUrl = window.location.href;
  const parser = new UAParser();
  const osName = parser.getOS().name?.toLowerCase() || '';

  if (osName === 'android') {
    // Android: intent 스킴으로 기본 브라우저에서 열기 (Chrome, Samsung Browser 등)
    // package 지정하지 않으면 시스템 기본 브라우저로 열림
    return `intent://${currentUrl.replace(
      /https?:\/\//,
      '',
    )}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
  }

  // iOS: Safari로 직접 열 수 없으므로 URL 복사 안내
  return currentUrl;
};

export const getPlatform = (): 'ios' | 'android' | 'other' => {
  const parser = new UAParser();
  const osName = parser.getOS().name?.toLowerCase() || '';

  if (osName === 'ios' || osName === 'mac os') {
    // iPad는 Mac OS로 감지될 수 있음
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    // iPad with desktop mode
    if (navigator.maxTouchPoints > 1 && osName === 'mac os') return 'ios';
  }

  if (osName === 'android') return 'android';

  return 'other';
};
