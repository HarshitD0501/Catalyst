"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const translations = {
  en: {
    appName: "Catalyst",
    appTagline: "Elderly Care & Family Coordination Platform",
    disclaimerTitle: "Medical Notice",
    disclaimerText: "Informational only — confirm with doctor or pharmacist before substituting.",
    // Navigation
    navSearch: "Search & Compare",
    navScan: "Scan Prescription",
    navStores: "Find Kendra",
    navHistory: "Saved History",
    navLaunchApp: "Dashboard",
    navDashboard: "Dashboard",
    navBackLanding: "Home",
    // Common states
    loading: "Loading information…",
    retry: "Retry",
    notConnectedTitle: "Ready for Connection",
    notConnectedDesc: "Frontend foundation active. Awaiting backend verified data connection.",
    offlineNotice: "Offline mode — using cached app shell",
    // Page titles
    searchTitle: "Search Medicine & Compare Prices",
    searchSubtitle: "Verify Jan Aushadhi (PMBJP) generic alternatives against branded MRP and NPPA caps.",
    scanTitle: "Scan Prescription or Medicine Strip",
    scanSubtitle: "Upload a medicine box or prescription for OCR review and manual verification.",
    prescriptionTitle: "Confirmed Prescription Report",
    prescriptionSubtitle: "Review verified medicine substitutions, basket totals, and reminders.",
    storesTitle: "Find Jan Aushadhi Kendras",
    storesSubtitle: "Locate genuine PMBJP Kendras with verified addresses, opening hours, and driving routes.",
    historyTitle: "Device-Local Report History",
    historySubtitle: "Locally stored prescription summaries on this device. Zero login or cloud sync.",
    // Search page
    searchPlaceholder: "Search brand (e.g. Dolo, Glycomet) or molecule (Paracetamol, Metformin)…",
    searchAriaLabel: "Search brand or molecule name",
    searchHelpText: "Enter brand or molecule name to view verified PMBJP generic pricing and savings.",
    // Scan page
    uploadButton: "Choose Photo or Document",
    cameraButton: "Take Photo",
    ocrNotice: "OCR extracted text is unconfirmed. You must verify and select every medicine manually.",
    // Prescription detail
    estimatedSavingNotice: "Savings are estimated potential savings based on verified comparable pack prices.",
    printSlip: "Print Chemist Slip",
    callPatient: "Call Patient (Outbound)",
    // Stores page
    selectCity: "Select City",
    useLocation: "Use My Current Location",
    // History page
    emptyHistoryTitle: "No saved reports yet",
    emptyHistoryDesc: "Confirmed reports you generate on this phone will appear here for reprint and review.",
    localOnlyWarning: "Notice: Reports are saved strictly in this browser's IndexedDB. Clearing website data will remove local history.",
    // Senior Mode & Accessibility
    seniorModeLabel: "Senior Accessibility Mode",
    seniorModeHelp: "48px large touch targets, high-contrast, larger text",
    readDosesAloud: "Read Today's Routine Aloud",
    stopReading: "Stop Reading",
    routineReadoutIntro: "Here is your medication routine for today.",
    noMedsToday: "You have no scheduled medication doses for today."
  },
  hi: {
    appName: "केयरसेतु (Catalyst)",
    appTagline: "वरिष्ठ नागरिक देखभाल व परिवार सेतु",
    disclaimerTitle: "चिकित्सा सूचना",
    disclaimerText: "केवल सूचनात्मक — दवा बदलने से पहले डॉक्टर या फार्मासििस्ट से पुष्टि करें।",
    // Navigation
    navSearch: "खोजें व तुलना करें",
    navScan: "पर्चा स्कैन करें",
    navStores: "केंद्र खोजें",
    navHistory: "सहेजा इतिहास",
    navLaunchApp: "डैशबोर्ड",
    navDashboard: "डैशबोर्ड",
    navBackLanding: "मुख्य पृष्ठ",
    // Common states
    loading: "जानकारी लोड हो रही है…",
    retry: "पुनः प्रयास करें",
    notConnectedTitle: "कनेक्शन हेतु तैयार",
    notConnectedDesc: "फ़्रंटएंड बुनियादी ढांचा सक्रिय है। बैकएंड सत्यापित डेटा कनेक्शन की प्रतीक्षा है।",
    offlineNotice: "ऑफ़लाइन मोड — कैश्ड ऐप शेल का उपयोग हो रहा है",
    // Page titles
    searchTitle: "दवा खोजें और मूल्य तुलना देखें",
    searchSubtitle: "ब्रांडेड एमआरपी और एनपीपीए सीलिंग के मुकाबले जन औषधि (PMBJP) जेनेरिक विकल्प सत्यापित करें।",
    scanTitle: "दवा की पट्टी या पर्चा स्कैन करें",
    scanSubtitle: "समीक्षा और हस्तचालित पुष्टि के लिए दवा के डिब्बे या पर्चे की तस्वीर अपलोड करें।",
    prescriptionTitle: "पुष्ट दवा रिपोर्ट",
    prescriptionSubtitle: "सत्यापित जेनेरिक विकल्प, कुल मूल्य और दवा स्मरण की समीक्षा करें।",
    storesTitle: "जन औषधि केंद्र खोजें",
    storesSubtitle: "सत्यापित पते और ड्राइविंग मार्ग के साथ निकटतम आधिकारिक केंद्र खोजें।",
    historyTitle: "डिवाइस में सहेजी गई रिपोर्ट",
    historySubtitle: "इस फ़ोन पर स्थानीय रूप से सुरक्षित विवरण। कोई लॉगिन या क्लाउड सिंक नहीं।",
    // Search page
    searchPlaceholder: "ब्रांड (जैसे डोलो, ग्लाइकोमेट) या मूल घटक (पैरासिटामोल) लिखें…",
    searchAriaLabel: "ब्रांड या मूल घटक नाम खोजें",
    searchHelpText: "सत्यापित जन औषधि (PMBJP) मूल्य और संभावित बचत देखने के लिए नाम दर्ज करें।",
    // Scan page
    uploadButton: "फोटो या दस्तावेज चुनें",
    cameraButton: "कैमरे से फोटो लें",
    ocrNotice: "स्कैन से पढ़ा गया पाठ अपुष्ट है। प्रत्येक दवा की स्वयं पुष्टि करना अनिवार्य है।",
    // Prescription detail
    estimatedSavingNotice: "बचत केवल समतुल्य पैक कीमतों के आधार पर आकलित संभावित बचत है।",
    printSlip: "केमिस्ट पर्ची प्रिंट करें",
    callPatient: "मरीज को कॉल करें",
    // Stores page
    selectCity: "शहर चुनें",
    useLocation: "मेरा वर्तमान स्थान उपयोग करें",
    // History page
    emptyHistoryTitle: "अभी तक कोई रिपोर्ट नहीं है",
    emptyHistoryDesc: "इस फ़ोन पर बनाई गई पुष्ट रिपोर्ट यहाँ पुनः देखने और प्रिंट करने के लिए मिलेंगी।",
    localOnlyWarning: "ध्यान दें: रिपोर्ट केवल इस ब्राउज़र में रहती हैं। ब्राउज़र डेटा साफ़ करने पर इतिहास हट जाएगा।",
    // Senior Mode & Accessibility
    seniorModeLabel: "वरिष्ठ मोड (बड़ा पाठ व सुलभता)",
    seniorModeHelp: "बड़े टच बटन, 7:1 उच्च कंट्रास्ट और स्पष्ट आवाज़",
    readDosesAloud: "आज की दवाइयाँ बोलकर सुनाएँ",
    stopReading: "बोलना रोकें",
    routineReadoutIntro: "आज की आपकी दवाइयों का विवरण इस प्रकार है।",
    noMedsToday: "आज के लिए कोई निर्धारित दवा नहीं है।"
  }
};

const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {},
  seniorMode: false,
  toggleSeniorMode: () => {},
  t: translations.en
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState("en");
  const [seniorMode, setSeniorModeState] = useState(false);

  // Fix F40: Synchronize document.documentElement.lang on initial restore from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("catalyst_lang") || localStorage.getItem("catalyst_lang");
      if (saved === "hi" || saved === "en") {
        setLanguageState(saved);
        if (typeof document !== "undefined") {
          document.documentElement.lang = saved;
        }
      } else if (typeof document !== "undefined") {
        document.documentElement.lang = "en";
      }

      const savedSenior = localStorage.getItem("catalyst_senior_mode") || localStorage.getItem("catalyst_senior_mode");
      if (savedSenior === "true") {
        setSeniorModeState(true);
        if (typeof document !== "undefined") {
          document.documentElement.classList.add("senior-mode");
        }
      }
    } catch {}
  }, []);

  const setLanguage = (lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("catalyst_lang", lang);
      localStorage.setItem("catalyst_lang", lang);
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  };

  const toggleSeniorMode = () => {
    setSeniorModeState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("catalyst_senior_mode", String(next));
        localStorage.setItem("catalyst_senior_mode", String(next));
      } catch {}
      if (typeof document !== "undefined") {
        if (next) {
          document.documentElement.classList.add("senior-mode");
        } else {
          document.documentElement.classList.remove("senior-mode");
        }
      }
      return next;
    });
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        seniorMode,
        toggleSeniorMode,
        t: translations[language] || translations.en,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
