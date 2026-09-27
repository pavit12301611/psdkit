const LOCALE_KEY = 'psdkit_locale';

export const STRINGS = {
  en: {
    localeLabel: 'EN',
    siteName: 'PSDKIT Pro',
    home: 'Home',
    tools: 'Tools',
    learn: 'Learn',
    community: 'Community',
    help: 'Help',
    profile: 'My Profile',
    publishTool: 'Publish a Tool',
    publishATool: 'Publish a tool',
    signIn: 'Sign in',
    signOut: 'Sign out',
    openToolkit: 'Open Toolkit',
    continueWithoutAccount: 'Continue without an account',
    continueWithGoogle: 'Continue with Google',
    benefitsPublish: 'Publish your tools',
    benefitsCredit: 'Get credit for your work',
    benefitsManage: 'Manage what you share',
    privacyNote: 'We only use your name, email and photo.',
    recentSearches: 'Recent searches',
    myFavourites: 'My Favourites',
    jumpBackIn: 'Jump back in',
    popularTools: 'Popular tools',
    keyboardShortcuts: 'Keyboard shortcuts',
    footerShortcuts: 'Keyboard shortcuts',
    newChat: 'New chat',
    clearHistory: 'Clear history',
    history: 'History',
    searchTools: 'Search tools',
    askAI: 'Ask AI',
    allTools: 'All tools',
    viewAll: 'View all',
    latest: 'Latest',
    trending: 'Trending',
    report: 'Report',
    edit: 'Edit',
    delete: 'Delete',
    open: 'Open',
    save: 'Save',
    cancel: 'Cancel',
    admin: 'Admin',
    noResults: 'No results',
    backHome: 'Back home',
    backToTop: 'Back to top',
    dimMode: 'Dim mode',
    lightMode: 'Warm mode',
    memberSince: 'Member since',
    toolsPublished: 'Tools published',
    totalRuns: 'Total runs',
    yourPublishedTools: 'Your published tools',
    favouritesEmpty: 'No favourites yet — star a tool to save it here.',
    signInRequired: 'Sign in to see your profile',
    profileEmpty: 'You have not published a community tool yet.',
    featuredCommunity: 'From the community',
    smartSearchHint: 'Search 175 tools… try “pdf”, “qr”, “convert”, “regex”, “hike”',
    shortcutsBody: 'Use these shortcuts to move faster around PSDKIT Pro.',
    unknownRoute: 'We could not find that page.',
    reportReason: 'Reason for report',
  },
  hi: {
    localeLabel: 'हिंदी',
    siteName: 'PSDKIT Pro',
    home: 'होम',
    tools: 'टूल्स',
    learn: 'सीखें',
    community: 'कम्युनिटी',
    help: 'मदद',
    profile: 'मेरा प्रोफ़ाइल',
    publishTool: 'टूल प्रकाशित करें',
    publishATool: 'टूल प्रकाशित करें',
    signIn: 'साइन इन',
    signOut: 'साइन आउट',
    openToolkit: 'टूलकिट खोलें',
    continueWithoutAccount: 'बिना खाते के जारी रखें',
    continueWithGoogle: 'Google से जारी रखें',
    benefitsPublish: 'अपने टूल प्रकाशित करें',
    benefitsCredit: 'अपने काम का श्रेय पाएँ',
    benefitsManage: 'जो शेयर किया है उसे संभालें',
    privacyNote: 'हम केवल आपका नाम, ईमेल और फ़ोटो उपयोग करते हैं।',
    recentSearches: 'हाल की खोजें',
    myFavourites: 'मेरे पसंदीदा',
    jumpBackIn: 'फिर से शुरू करें',
    popularTools: 'लोकप्रिय टूल्स',
    keyboardShortcuts: 'कीबोर्ड शॉर्टकट',
    footerShortcuts: 'कीबोर्ड शॉर्टकट',
    newChat: 'नई चैट',
    clearHistory: 'इतिहास साफ़ करें',
    history: 'इतिहास',
    searchTools: 'टूल खोजें',
    askAI: 'AI से पूछें',
    allTools: 'सभी टूल्स',
    viewAll: 'सब देखें',
    latest: 'नवीनतम',
    trending: 'ट्रेंडिंग',
    report: 'रिपोर्ट करें',
    edit: 'संपादित करें',
    delete: 'हटाएँ',
    open: 'खोलें',
    save: 'सेव करें',
    cancel: 'रद्द करें',
    admin: 'एडमिन',
    noResults: 'कोई परिणाम नहीं',
    backHome: 'होम पर जाएँ',
    backToTop: 'ऊपर जाएँ',
    dimMode: 'डिम मोड',
    lightMode: 'वार्म मोड',
    memberSince: 'सदस्य बने',
    toolsPublished: 'प्रकाशित टूल',
    totalRuns: 'कुल रन',
    yourPublishedTools: 'आपके प्रकाशित टूल',
    favouritesEmpty: 'अभी कोई पसंदीदा नहीं — स्टार दबाकर सेव करें।',
    signInRequired: 'अपना प्रोफ़ाइल देखने के लिए साइन इन करें',
    profileEmpty: 'आपने अभी तक कोई कम्युनिटी टूल प्रकाशित नहीं किया है।',
    featuredCommunity: 'कम्युनिटी से',
    smartSearchHint: '175 टूल खोजें… जैसे “pdf”, “qr”, “convert”, “regex”, “hike”',
    shortcutsBody: 'PSDKIT Pro में तेज़ी से चलने के लिए ये शॉर्टकट इस्तेमाल करें।',
    unknownRoute: 'यह पेज नहीं मिला।',
    reportReason: 'रिपोर्ट का कारण',
  },
};

export function getLocale() {
  try {
    return localStorage.getItem(LOCALE_KEY) || 'en';
  } catch {
    return 'en';
  }
}

export function setLocale(locale) {
  const next = STRINGS[locale] ? locale : 'en';
  try { localStorage.setItem(LOCALE_KEY, next); } catch { /* ignore */ }
  document.documentElement.lang = next === 'hi' ? 'hi-IN' : 'en';
  document.dispatchEvent(new CustomEvent('psdkit:locale', { detail: next }));
  return next;
}

export function t(key, locale = getLocale()) {
  return STRINGS[locale]?.[key] || STRINGS.en[key] || key;
}

export function initLocale() {
  setLocale(getLocale());
}
