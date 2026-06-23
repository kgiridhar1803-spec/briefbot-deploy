import React, { useState, useRef, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';


const firebaseConfig = {
  apiKey: "AIzaSyB5tAzp8N_QactPSsXZkLBSD8tqErzm5jE",
  authDomain: "briefbot-f0f09.firebaseapp.com",
  projectId: "briefbot-f0f09",
  storageBucket: "briefbot-f0f09.firebasestorage.app",
  messagingSenderId: "1074202997833",
  appId: "1:1074202997833:web:2043aab824d4747268bb98"
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseClientAuth = getAuth(firebaseApp);

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' or 'workspace'
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(''); // Tracking dynamic processing state
  const [errorMessage, setErrorMessage] = useState('');
  const [analysisData, setAnalysisData] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); 
  const [summaryHistory, setSummaryHistory] = useState([]);
  const [generatedQuestions, setGeneratedQuestions] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [generatedAnswers, setGeneratedAnswers] = useState('');
  const [answerLoading, setAnswerLoading] = useState(false);
  const [questionsCopied, setQuestionsCopied] = useState(false);
  const [answersCopied, setAnswersCopied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [videoStartSeconds, setVideoStartSeconds] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('choice');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [adminStats, setAdminStats] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [profileForm, setProfileForm] = useState({ name: '', email: '', photoURL: '' });
  const [profileMessage, setProfileMessage] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [passwordChangeForm, setPasswordChangeForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [showChangePasswords, setShowChangePasswords] = useState(false);
  const [profileTab, setProfileTab] = useState('details');
  const [adminTab, setAdminTab] = useState('dashboard');
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState('mcq');
  const [showAssessmentTypeMenu, setShowAssessmentTypeMenu] = useState(false);
  const [assessmentDifficulty, setAssessmentDifficulty] = useState('medium');
  const [assessmentQuestionCount, setAssessmentQuestionCount] = useState(20);
  const [assessmentStartedAt, setAssessmentStartedAt] = useState(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');
  const [assessmentData, setAssessmentData] = useState(null);
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [assessmentTimer, setAssessmentTimer] = useState(20 * 60);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [assessmentLeaderboard, setAssessmentLeaderboard] = useState([]);
  const [assessmentLinkCopied, setAssessmentLinkCopied] = useState(false);
  const [assessmentSearchLink, setAssessmentSearchLink] = useState('');
  const [assessmentMode, setAssessmentMode] = useState('solo');
  const [assessmentArenaMode, setAssessmentArenaMode] = useState('solo'); // solo | battle
  const [assessmentCodeCopied, setAssessmentCodeCopied] = useState(false);
  const [bossBattleData, setBossBattleData] = useState(null);
  const [bossAnswers, setBossAnswers] = useState({});
  const [bossResult, setBossResult] = useState(null);
  const [bossLeaderboard, setBossLeaderboard] = useState([]);
  const [bossLoading, setBossLoading] = useState(false);
  const [bossError, setBossError] = useState('');
  const [bossTimer, setBossTimer] = useState(180);
  const [bossStartedAt, setBossStartedAt] = useState(null);
  const [showBossChampionPopup, setShowBossChampionPopup] = useState(false);
  const [bossVictorySoundEnabled, setBossVictorySoundEnabled] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedAdminUserId, setSelectedAdminUserId] = useState('');
  const [selectedAdminUserProgress, setSelectedAdminUserProgress] = useState(null);
  const [selectedAdminFeatureTab, setSelectedAdminFeatureTab] = useState('summaries');
  const [selectedAdminUserLoading, setSelectedAdminUserLoading] = useState(false);
  const [adminDeleteTarget, setAdminDeleteTarget] = useState(null);
  const [adminDeleteLoading, setAdminDeleteLoading] = useState(false);
  const [adminActionMessage, setAdminActionMessage] = useState('');

  // Timestamp support state
  const [videoCheckStatus, setVideoCheckStatus] = useState('idle'); // idle | checking | supported | unsupported
  const [videoCheckMessage, setVideoCheckMessage] = useState('');
  
  // NEW: Added state to handle user summary mode selection ('brief' or 'bullets')
  const [summaryType, setSummaryType] = useState('brief'); 
  const [pptLoading, setPptLoading] = useState(false);
  const [pptImageLoading, setPptImageLoading] = useState(false);
  const [pptExportLoading, setPptExportLoading] = useState(false);
  const [pptError, setPptError] = useState('');
  const [pptPlan, setPptPlan] = useState(null);
  const [pptTemplate, setPptTemplate] = useState('floral');
  const [selectedPptSlideIndex, setSelectedPptSlideIndex] = useState(0);
  const [pptTableRows, setPptTableRows] = useState(4);
  const [pptTableCols, setPptTableCols] = useState(4);
  const [pptDragState, setPptDragState] = useState(null);
  const [pptSlideDragIndex, setPptSlideDragIndex] = useState(null);
  const [showPptStudio, setShowPptStudio] = useState(false);
  const [pptSaveMessage, setPptSaveMessage] = useState('');
  const [recentPpts, setRecentPpts] = useState([]);
  const [recentPptsLoading, setRecentPptsLoading] = useState(false);
  const [profileTestMode, setProfileTestMode] = useState('solo');
  const [testHistoryData, setTestHistoryData] = useState({ solo: { summary: null, tests: [] }, battle: { summary: null, tests: [] }, boss_champion: { summary: null, tests: [] } });
  const [testHistoryLoading, setTestHistoryLoading] = useState(false);
  const [selectedHistoryTest, setSelectedHistoryTest] = useState(null);
  const [battleRoomCode, setBattleRoomCode] = useState('');
  const [battleRoom, setBattleRoom] = useState(null);
  const [battleRoomLoading, setBattleRoomLoading] = useState(false);
  const [battleRoomError, setBattleRoomError] = useState('');
  const [battleAnswers, setBattleAnswers] = useState({});
  const [battleResult, setBattleResult] = useState(null);
  const [battleTimeLeft, setBattleTimeLeft] = useState(20 * 60);
  const [adminBattleStats, setAdminBattleStats] = useState(null);
  const FIXED_ASSESSMENT_QUESTION_COUNT = 20;
  const FIXED_ASSESSMENT_TIMER_SECONDS = 20 * 60;
  const [assessmentPanel, setAssessmentPanel] = useState('solo');
  const [battleJoinCode, setBattleJoinCode] = useState('');
  const [battleLoading, setBattleLoading] = useState(false);
  const [compareVideo1, setCompareVideo1] = useState('');
  const [compareVideo2, setCompareVideo2] = useState('');
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');
  const [compareResult, setCompareResult] = useState(null);

  const languageOptions = [
    "English", "Spanish", "French", "German", 
    "Hindi", "Telugu", "Tamil", "Mandarin", 
    "Arabic", "Japanese", "Russian", "Portuguese"
  ];

  const pptTemplateOptions = [
    {
      id: 'floral',
      name: 'Floral Bloom',
      description: 'Soft botanical theme for elegant learning presentations',
      icon: '🌸',
      accent: '#F472B6',
      gradient: 'linear-gradient(135deg, rgba(244,114,182,0.22), rgba(52,211,153,0.12))',
      mood: 'Elegant'
    },
    {
      id: 'art',
      name: 'Art Canvas',
      description: 'Creative brush-stroke style for visual and expressive topics',
      icon: '🎨',
      accent: '#F59E0B',
      gradient: 'linear-gradient(135deg, rgba(245,158,11,0.22), rgba(168,85,247,0.13))',
      mood: 'Creative'
    },
    {
      id: 'corporate',
      name: 'Corporate Pro',
      description: 'Clean business layout for seminars, reports, and training',
      icon: '💼',
      accent: '#38BDF8',
      gradient: 'linear-gradient(135deg, rgba(56,189,248,0.20), rgba(15,23,42,0.82))',
      mood: 'Professional'
    },
    {
      id: 'chalkboard',
      name: 'Chalkboard Class',
      description: 'Classroom theme for teaching, revision, and academic notes',
      icon: '📚',
      accent: '#34D399',
      gradient: 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(6,78,59,0.18))',
      mood: 'Academic'
    },
    {
      id: 'futuristic',
      name: 'Futuristic Grid',
      description: 'Tech-style neon theme for AI, coding, and modern projects',
      icon: '🚀',
      accent: '#A855F7',
      gradient: 'linear-gradient(135deg, rgba(0,242,254,0.16), rgba(168,85,247,0.22))',
      mood: 'Modern'
    }
  ];


  const assessmentTypeOptions = [
    {
      id: 'mcq',
      name: 'MCQ',
      icon: '✅',
      description: 'Four-option objective questions',
      accent: '#00F2FE',
      glow: 'rgba(0,242,254,0.18)'
    },
    {
      id: 'fill_blank',
      name: 'Fill Blanks',
      icon: '✍️',
      description: 'Missing terms and key phrases',
      accent: '#34D399',
      glow: 'rgba(52,211,153,0.16)'
    },
    {
      id: 'descriptive',
      name: 'Descriptive',
      icon: '📝',
      description: 'Written explanation answers',
      accent: '#FBBF24',
      glow: 'rgba(251,191,36,0.16)'
    },
    {
      id: 'sjt',
      name: 'SJT',
      icon: '🧠',
      description: 'Real-life judgment situations',
      accent: '#F97316',
      glow: 'rgba(249,115,22,0.16)'
    },
    {
      id: 'mixed',
      name: 'Mixed',
      icon: '🎯',
      description: 'MCQ + blanks + descriptive',
      accent: '#A855F7',
      glow: 'rgba(168,85,247,0.16)'
    }
  ];

  // Chatbot State
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const videoPreviewRef = useRef(null);

  useEffect(() => {
    // Remove old shared browser history so users do not see each other's localStorage summaries.
    localStorage.removeItem('briefBotSummaryHistory');

    const savedUser = localStorage.getItem('briefBotCurrentUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
        setCurrentPage(parsedUser.role === 'admin' ? 'admin' : 'workspace');
      } catch (error) {
        localStorage.removeItem('briefBotCurrentUser');
      }
    }
  }, []);

  const loadSummaryHistory = async (user = currentUser) => {
    if (!user?.id || user.role === 'admin') {
      setSummaryHistory([]);
      return;
    }

    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/history/${user.id}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to load summary history.');

      setSummaryHistory(Array.isArray(data.history) ? data.history : []);
    } catch (error) {
      console.log('Firebase summary history load error:', error.message);
      setSummaryHistory([]);
    }
  };


  const loadRecentPpts = async (user = currentUser) => {
    if (!user?.id || user.role === 'admin') {
      setRecentPpts([]);
      return;
    }

    setRecentPptsLoading(true);
    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/ppt/recent/${user.id}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load recent PPTs.');
      setRecentPpts(Array.isArray(data.ppts) ? data.ppts : []);
    } catch (error) {
      console.log('Recent PPTs load skipped:', error.message);
      setRecentPpts([]);
    } finally {
      setRecentPptsLoading(false);
    }
  };

  useEffect(() => {
    loadSummaryHistory(currentUser);
  }, [currentUser?.id]);

  useEffect(() => {
    loadRecentPpts(currentUser);
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        email: currentUser.email || '',
        photoURL: currentUser.photoURL || ''
      });
      setProfileMessage('');
    }
  }, [currentUser?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);


  useEffect(() => {
    const existingGlowStyle = document.getElementById('briefbot-simple-btn-glow-style');
    if (existingGlowStyle) return;

    const style = document.createElement('style');
    style.id = 'briefbot-simple-btn-glow-style';
    style.textContent = `
      .simple-btn-glow {
        transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, filter 0.22s ease;
      }

      .simple-btn-glow:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 16px rgba(0, 242, 254, 0.34), 0 10px 26px rgba(0, 0, 0, 0.24) !important;
        filter: brightness(1.06);
      }

      .simple-btn-glow:active {
        transform: translateY(0px) scale(0.98);
        box-shadow: 0 0 10px rgba(0, 242, 254, 0.22) !important;
      }
    `;

    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (!battleRoom || battleRoom.status !== 'active' || battleResult) return;

    const timer = setInterval(() => {
      const endTime = battleRoom.endsAt ? new Date(battleRoom.endsAt).getTime() : Date.now() + 20 * 60 * 1000;
      const left = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setBattleTimeLeft(left);

      if (left <= 0) {
        clearInterval(timer);
        handleSubmitBattleRoom(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [battleRoom?.roomCode, battleRoom?.status, battleRoom?.endsAt, battleResult]);

  useEffect(() => {
    if (!battleRoom?.roomCode || battleResult) return;

    const interval = setInterval(() => {
      refreshBattleRoom(battleRoom.roomCode);
    }, battleRoom.status === 'waiting' ? 2500 : 5000);

    return () => clearInterval(interval);
  }, [battleRoom?.roomCode, battleRoom?.status, battleResult]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadAdminBattleStats();
    }
  }, [currentUser?.id, currentUser?.role]);



  useEffect(() => {
    if (currentUser?.id && currentPage === 'testsHistory') {
      loadTestHistory(profileTestMode);
    }
  }, [currentUser?.id, currentPage, profileTestMode]);


  const cleanDuplicateTimestamps = (text) => {
    return String(text || '').replace(
      /(⏱\s*)?(\d{1,2}:\d{2}(?::\d{2})?)\s+([^\n]{0,80}?)(?:⏱\s*)\2\\b/g,
      (match, clock, timestamp, middleText) => {
        const middle = String(middleText || '').trim();
        if (!middle || /^(by|at|around|near|from|after|before)$/i.test(middle)) {
          return `⏱ ${timestamp} `;
        }
        return match;
      }
    );
  };

  // Comprehensive Markdown renderer handling headers, bullet tracks, and nested bold marks
  const renderFormattedMarkdown = (rawText) => {
    if (!rawText) return null;
    
    const lines = cleanDuplicateTimestamps(rawText).split('\n');
    return lines.map((line, lineIdx) => {
      let currentLine = line.trim();
      if (!currentLine) return <div key={lineIdx} style={{ height: '0.8rem' }} />;

      // Match structural Markdown headers (### or ##)
      if (currentLine.startsWith('###') || currentLine.startsWith('##')) {
        const headerText = currentLine.replace(/^#+\s*/, '');
        return (
          <h3 key={lineIdx} style={{ color: '#FFF', fontSize: '1.25rem', marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: '700', borderLeft: '3px solid #00F2FE', paddingLeft: '0.6rem' }}>
            {parseInlineBold(headerText)}
          </h3>
        );
      }

      // Match standard bullet points
      const isBullet = currentLine.startsWith('*') || currentLine.startsWith('-');
      if (isBullet) {
        currentLine = currentLine.replace(/^[\*\-\s]+/, '');
        return (
          <div key={lineIdx} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '0.6rem', paddingLeft: '0.5rem' }}>
            <span style={{ color: '#00F2FE', marginRight: '0.6rem', lineHeight: '1.7' }}>•</span>
            <div style={{ flex: 1, lineHeight: '1.7' }}>{parseInlineBold(currentLine)}</div>
          </div>
        );
      }

      // Default paragraph node fallback
      return (
        <p key={lineIdx} style={{ marginBottom: '0.8rem', lineHeight: '1.7', color: '#E5E7EB' }}>
          {parseInlineBold(currentLine)}
        </p>
      );
    });
  };

  const timestampToSeconds = (timestamp) => {
    const parts = String(timestamp).split(':').map(Number);
    if (parts.length === 2) return (parts[0] * 60) + parts[1];
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    return 0;
  };

  const secondsToTimestamp = (totalSeconds) => {
    const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const jumpToEmbeddedVideo = (timestamp) => {
    const seconds = timestampToSeconds(timestamp);
    const embedUrl = getYouTubeEmbedUrl(inputUrl, seconds);

    if (!embedUrl) return;

    setVideoStartSeconds(seconds);

    setTimeout(() => {
      videoPreviewRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 100);
  };

  // Helper extractor to parse clickable timestamps + **bold** without breaking nested DOM layouts
  const parseInlineBold = (text) => {
    const parts = String(text).split(/(⏱\s*\d{1,2}:\d{2}(?::\d{2})?|\b\d{1,2}:\d{2}(?::\d{2})?\b|\*\*[\s\S]*?\*\*)/g);

    return parts.map((part, idx) => {
      if (!part) return null;

      const timestampMatch = part.match(/^(?:⏱\s*)?(\d{1,2}:\d{2}(?::\d{2})?)$/);
      if (timestampMatch) {
        const timestamp = timestampMatch[1];

        return (
          <button
            key={idx}
            type="button"
            onClick={() => jumpToEmbeddedVideo(timestamp)}
            className="timestamp-pill timestamp-button simple-btn-glow"
            title={`Play video here from ${timestamp}`}
          >
            ⏱ {timestamp}
          </button>
        );
      }

      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <strong key={idx} style={{ color: '#00F2FE', fontWeight: '600', background: 'rgba(0, 242, 254, 0.05)', padding: '0 2px', borderRadius: '3px' }}>
            {boldText}
          </strong>
        );
      }

      return part;
    });
  };

  const isYouTubeUrl = (url) => {
    return /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)/i.test(url || '');
  };


  const getYouTubeEmbedUrl = (url, startSeconds = 0) => {
    if (!url) return '';

    const patterns = [
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = String(url).match(pattern);
      if (match && match[1]) {
        const start = Math.max(0, Math.floor(Number(startSeconds) || 0));
        const autoplay = start > 0 ? '&autoplay=1' : '';
        return `https://www.youtube.com/embed/${match[1]}?start=${start}${autoplay}`;
      }
    }

    return '';
  };

  useEffect(() => {
    // Removed automatic /api/check-video-support call.
    // This prevents the repeated "URL is required" error while typing/pasting a URL.
    setVideoCheckStatus('idle');
    setVideoCheckMessage('');
    setVideoStartSeconds(0);
  }, [inputUrl, selectedLanguage]);

  const createHistoryDescription = (summaryText, url = '') => {
    if (!summaryText) return 'Saved summary';

    const cleanedLines = String(summaryText)
      .split('\n')
      .map(line =>
        line
          .replace(/[#*•]/g, '')
          .replace(/⏱\s*\d{1,2}:\d{2}(?::\d{2})?/g, '')
          .replace(/\d{1,2}:\d{2}(?::\d{2})?/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter(line =>
        line.length > 25 &&
        !line.toLowerCase().includes('the video opens') &&
        !line.toLowerCase().includes('this video') &&
        !line.toLowerCase().includes('in this video') &&
        !line.toLowerCase().includes('summary')
      );

    const bestLine = cleanedLines[0];

    if (bestLine) {
      return bestLine.length > 90 ? `${bestLine.slice(0, 90)}...` : bestLine;
    }

    try {
      const parsedUrl = new URL(url);
      return `Saved from ${parsedUrl.hostname.replace('www.', '')}`;
    } catch {
      return 'Saved summary';
    }
  };

  const saveSummaryToHistory = async (summaryText, url, language, type) => {
    if (!summaryText || !url || !currentUser?.id || currentUser.role === 'admin') return null;

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/history/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          url,
          summary: summaryText,
          description: createHistoryDescription(summaryText, url),
          language,
          summaryType: type
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save history.');

      if (data.historyItem) {
        setSummaryHistory((previousHistory) => {
          const filteredHistory = previousHistory.filter((item) => item.id !== data.historyItem.id);
          return [data.historyItem, ...filteredHistory].slice(0, 20);
        });
      }

      return data.historyItem || null;
    } catch (error) {
      console.log('Firebase history save skipped:', error.message);
      return null;
    }
  };

  const openHistoryItem = (item) => {
    if (!item) return;

    setInputUrl(item.url || '');
    setSelectedLanguage(item.language || 'English');
    setSummaryType(item.summaryType || 'brief');
    setAnalysisData(item.summary || '');
    setActiveTab('summary');
    setCurrentPage('workspace');
    setErrorMessage('');

    setChatHistory([
      {
        sender: 'bot',
        text: '📜 Loaded saved summary from history. Ask me anything about this saved summary.'
      }
    ]);
  };

  const deleteHistoryItem = async (id) => {
    if (!id || !currentUser?.id) return;

    try {
      await fetch(`https://briefbot-backend-giridhar.onrender.com/api/history/${currentUser.id}/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.log('Firebase history delete skipped:', error.message);
    }

    setSummaryHistory((previousHistory) => previousHistory.filter((item) => item.id !== id));
  };

  const clearSummaryHistory = async () => {
    if (!currentUser?.id) {
      setSummaryHistory([]);
      return;
    }

    try {
      await fetch(`https://briefbot-backend-giridhar.onrender.com/api/history/${currentUser.id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.log('Firebase history clear skipped:', error.message);
    }

    setSummaryHistory([]);
  };

  const handleAuthInputChange = (field, value) => {
    setAuthForm((prev) => ({ ...prev, [field]: value }));
    setAuthError('');
  };

  const getPasswordRules = (password) => {
    const value = String(password || '');

    return {
      minLength: value.length >= 8,
      capital: /[A-Z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[^A-Za-z0-9]/.test(value)
    };
  };

  const isPasswordStrong = (password) => {
    const rules = getPasswordRules(password);
    return rules.minLength && rules.capital && rules.number && rules.special;
  };


  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(String(email || '').trim());

  const finishAuthSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('briefBotCurrentUser', JSON.stringify(user));
    setAuthForm({ name: '', email: '', password: '' });
    setSummaryHistory([]);
    setProfileTab('details');
    setAdminTab(user.role === 'admin' ? 'dashboard' : 'details');
    setCurrentPage(user.role === 'admin' ? 'admin' : 'workspace');
  };

  const handleGoogleSignIn = async (roleMode = 'user') => {
    setAuthLoading(true);
    setAuthError('');

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(firebaseClientAuth, provider);
      const idToken = await result.user.getIdToken();

      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/social-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, roleMode })
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Social login backend returned invalid response. Restart backend and try again.');
      }

      if (!response.ok) throw new Error(data.error || 'Google sign in failed.');
      finishAuthSuccess(data.user);
    } catch (error) {
      setAuthError(error.message || 'Google sign in failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authForm.email.trim() || !authForm.password.trim()) return;
    if (!isValidEmail(authForm.email)) {
      setAuthError('Enter a valid email address.');
      return;
    }
    if (authMode === 'register' && !authForm.name.trim()) return;

    if (authMode === 'register' && !isPasswordStrong(authForm.password)) {
      setAuthError('Password: 8+ chars, A-Z, 0-9 & special symbol.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      const endpoint = authMode === 'register'
        ? '/api/register'
        : authMode === 'admin'
          ? '/api/admin/login'
          : '/api/login';

      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authForm.name.trim(),
          email: authForm.email.trim(),
          password: authForm.password
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed.');

      if (authMode === 'register') {
        setAuthForm({ name: '', email: authForm.email.trim(), password: '' });
        setAuthMode('login');
        setAuthError('✅ Account created successfully. Please login now.');
        return;
      }

      if (authMode === 'login' && data.user?.role === 'admin') {
        throw new Error('Admin accounts must use the separate Admin Login page.');
      }

      if (authMode === 'admin' && data.user?.role !== 'admin') {
        throw new Error('Only admin accounts can login here.');
      }

      finishAuthSuccess(data.user);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };


  const handlePasswordReset = async () => {
    const cleanEmail = String(currentUser?.email || authForm.email || '').trim().toLowerCase();
    const isProfileReset = Boolean(currentUser?.email);
    const setResetMessage = (message) => {
      if (isProfileReset) {
        setProfileMessage(message);
      } else {
        setAuthError(message);
      }
    };

    if (!cleanEmail) {
      setResetMessage('Enter your email first, then click Forgot Password.');
      return;
    }

    const provider = String(currentUser?.provider || '').toLowerCase();
    if (currentUser && provider && provider !== 'password' && provider !== 'email/password' && provider !== 'email') {
      const providerName = provider.includes('google') ? 'Google' : provider.includes('microsoft') ? 'Microsoft' : 'your social account';
      setResetMessage(`This account uses ${providerName} login. Change the password from that account, not Brief Bot.`);
      return;
    }

    setPasswordResetLoading(true);
    setAuthError('');
    setProfileMessage('');

    try {
      await sendPasswordResetEmail(firebaseClientAuth, cleanEmail);
      setResetMessage('✅ Password reset email sent. Check Inbox, Spam, Promotions, or Updates.');
    } catch (clientError) {
      console.log('[Client Password Reset Error]', clientError?.code || clientError?.message);

      try {
        const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to send password reset email.');

        setResetMessage('✅ Password reset email sent. Check Inbox, Spam, Promotions, or Updates.');
      } catch (serverError) {
        const message = serverError.message || clientError.message || 'Unable to send password reset email.';
        if (message.includes('auth/user-not-found') || message.includes('EMAIL_NOT_FOUND')) {
          setResetMessage('No account found with this email.');
        } else if (message.includes('auth/invalid-email') || message.includes('INVALID_EMAIL')) {
          setResetMessage('Invalid email address.');
        } else if (message.includes('provider') || message.includes('Google') || message.includes('Microsoft')) {
          setResetMessage(message);
        } else {
          setResetMessage(message);
        }
      }
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handleDirectPasswordChange = async (e) => {
    e.preventDefault();

    if (!currentUser?.id || !currentUser?.email) {
      setProfileMessage('Please login again before changing password.');
      return;
    }

    const provider = String(currentUser?.provider || '').toLowerCase();
    if (provider && provider !== 'password' && provider !== 'email/password' && provider !== 'email') {
      const providerName = provider.includes('google') ? 'Google' : provider.includes('microsoft') ? 'Microsoft' : 'your social account';
      setProfileMessage(`This account uses ${providerName} login. Change the password from that account settings.`);
      return;
    }

    const currentPassword = passwordChangeForm.currentPassword.trim();
    const newPassword = passwordChangeForm.newPassword.trim();
    const confirmPassword = passwordChangeForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setProfileMessage('Enter current password, new password, and confirm password.');
      return;
    }

    if (!isPasswordStrong(newPassword)) {
      setProfileMessage('New password: 8+ chars, A-Z, 0-9 & special symbol.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setProfileMessage('New password and confirm password do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setProfileMessage('New password must be different from current password.');
      return;
    }

    setPasswordChangeLoading(true);
    setProfileMessage('');

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          email: currentUser.email,
          currentPassword,
          newPassword
        })
      });

      const rawText = await response.text();
      let data = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseError) {
        throw new Error('Backend route not responding with JSON. Restart backend from C:\\Users\\girid\\server using node index.js.');
      }

      if (!response.ok) throw new Error(data.error || 'Password update failed.');

      setPasswordChangeForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setProfileMessage('✅ Password changed successfully. Use the new password from next login.');
    } catch (error) {
      setProfileMessage(`❌ ${error.message}`);
    } finally {
      setPasswordChangeLoading(false);
    }
  };


  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!currentUser?.id || !profileForm.name.trim()) return;

    setProfileLoading(true);
    setProfileMessage('');

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          name: profileForm.name.trim(),
          photoURL: profileForm.photoURL.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Profile update failed.');

      setCurrentUser(data.user);
      localStorage.setItem('briefBotCurrentUser', JSON.stringify(data.user));
      setProfileMessage('✅ Profile updated successfully.');
    } catch (error) {
      setProfileMessage(`❌ ${error.message}`);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfilePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileMessage('❌ Please choose a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage('❌ Image is too large. Choose an image below 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 360;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressedPhoto = canvas.toDataURL('image/jpeg', 0.78);

        setProfileForm((prev) => ({ ...prev, photoURL: compressedPhoto }));
        setProfileMessage('✅ Photo selected. Click Save Changes to update your profile.');
      };
      image.onerror = () => setProfileMessage('❌ Could not read this image. Try another photo.');
      image.src = reader.result;
    };
    reader.onerror = () => setProfileMessage('❌ Could not read this image. Try another photo.');
    reader.readAsDataURL(file);
  };

  const handleDeleteAccount = async () => {
    if (!currentUser?.id) return;

    const confirmDelete = window.confirm('Are you sure you want to delete your Brief Bot account? This removes your Firebase account and saved history.');
    if (!confirmDelete) return;

    setProfileLoading(true);
    setProfileMessage('');

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Account deletion failed.');

      localStorage.removeItem('briefBotCurrentUser');
      setCurrentUser(null);
      setSummaryHistory([]);
      setCurrentPage('home');
    } catch (error) {
      setProfileMessage(`❌ ${error.message}`);
    } finally {
      setProfileLoading(false);
    }
  };

  const requestLogout = () => {
    setShowLogoutConfirm(true);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);

    if (currentUser?.id) {
      try {
        await fetch('https://briefbot-backend-giridhar.onrender.com/api/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        });
      } catch (error) {
        console.log('Logout tracking skipped:', error.message);
      }
    }

    localStorage.removeItem('briefBotCurrentUser');
    setCurrentUser(null);
    setSummaryHistory([]);
    setCurrentPage('home');
  };

  const trackUserActivity = async (activityType, extra = {}) => {
    if (!currentUser?.id) return;

    try {
      await fetch('https://briefbot-backend-giridhar.onrender.com/api/user/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          activityType,
          ...extra
        })
      });
    } catch (error) {
      console.log('Activity tracking skipped:', error.message);
    }
  };

  const loadAdminDashboard = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;

    setAdminLoading(true);
    setAuthError('');
    setAdminActionMessage('');
    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/admin/stats?adminId=${currentUser.id}&t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load admin dashboard.');
      setAdminStats(data);
      loadAdminBattleStats();
      if (selectedAdminUserId) {
        loadAdminUserProgress(selectedAdminUserId, false);
      }
    } catch (error) {
      setAuthError(error.message);
      setAdminActionMessage(`❌ ${error.message}`);
      setAdminStats(null);
    } finally {
      setAdminLoading(false);
    }
  };

  const loadAdminUserProgress = async (userId, showLoading = true) => {
    if (!currentUser?.id || currentUser.role !== 'admin' || !userId) return;

    if (showLoading) setSelectedAdminUserLoading(true);
    setAdminActionMessage('');
    setSelectedAdminUserId(userId);

    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/admin/users/${userId}/progress?adminId=${currentUser.id}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load user progress.');
      setSelectedAdminUserProgress(data);
      setSelectedAdminFeatureTab('summaries');
    } catch (error) {
      setAdminActionMessage(`❌ ${error.message}`);
      setSelectedAdminUserProgress(null);
    } finally {
      if (showLoading) setSelectedAdminUserLoading(false);
    }
  };

  const requestAdminDeleteUser = (user) => {
    if (!user || user.role === 'admin') {
      setAdminActionMessage('❌ Admin accounts cannot be deleted from this dashboard.');
      return;
    }
    setAdminDeleteTarget(user);
    setAdminActionMessage('');
  };

  const cancelAdminDeleteUser = () => {
    setAdminDeleteTarget(null);
  };

  const confirmAdminDeleteUser = async () => {
    if (!currentUser?.id || !adminDeleteTarget?.id) return;

    setAdminDeleteLoading(true);
    setAdminActionMessage('');

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: currentUser.id,
          userId: adminDeleteTarget.id
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete user.');

      setAdminActionMessage('✅ User deleted successfully from Firebase Authentication and Firestore.');
      if (selectedAdminUserId === adminDeleteTarget.id) {
        setSelectedAdminUserId('');
        setSelectedAdminUserProgress(null);
        setSelectedAdminFeatureTab('summaries');
      }
      setAdminDeleteTarget(null);
      await loadAdminDashboard();
    } catch (error) {
      setAdminActionMessage(`❌ ${error.message}`);
    } finally {
      setAdminDeleteLoading(false);
    }
  };


  const exportSelectedUserProgress = () => {
    if (!selectedAdminUserProgress) {
      setAdminActionMessage('❌ Select a user first, then export progress.');
      return;
    }

    const user = selectedAdminUserProgress.user || selectedAdminUser || {};
    const stats = selectedAdminUserProgress.stats || {};
    const attempts = Array.isArray(selectedAdminUserProgress.attempts) ? selectedAdminUserProgress.attempts : [];
    const summaries = Array.isArray(selectedAdminUserProgress.summaries) ? selectedAdminUserProgress.summaries : [];
    const ppts = Array.isArray(selectedAdminUserProgress.ppts) ? selectedAdminUserProgress.ppts : [];

    const clean = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
    const csvCell = (value) => `"${clean(value).replace(/"/g, '""')}"`;
    const row = (items) => items.map(csvCell).join(',');

    const rows = [
      ['Brief Bot - User Progress Report'],
      ['Generated At', new Date().toLocaleString()],
      [],
      ['User Details'],
      ['Name', user.name || 'Unnamed User'],
      ['Email', user.email || '-'],
      ['Status', user.isLoggedIn ? 'Logged In' : 'Offline'],
      ['Last Login', user.lastLoginAt || '-'],
      [],
      ['Progress Summary'],
      ['Summaries Generated', stats.summaryCount || user.summariesGenerated || 0],
      ['Assessments Attempted', stats.attemptCount || user.assessmentsAttempted || 0],
      ['Average Score', `${stats.averageScore || 0}%`],
      ['Highest Score', `${stats.highestScore || 0}%`],
      ['Last Score', `${stats.lastScore || 0}%`],
      ['Chats Used', user.chatsSent || 0],
      ['PPTs Generated', stats.pptCount || user.pptsGenerated || 0],
      [],
      ['Assessment Attempts'],
      ['Assessment Title', 'Score', 'Total Marks', 'Percentage', 'Achievement/Remarks', 'Submitted At']
    ];

    if (attempts.length) {
      attempts.forEach((attempt) => {
        rows.push([
          attempt.assessmentTitle || 'Assessment',
          attempt.score ?? 0,
          attempt.totalMarks ?? 0,
          `${attempt.percentage ?? 0}%`,
          attempt.achievement || attempt.remarks || '-',
          attempt.submittedAt || '-'
        ]);
      });
    } else {
      rows.push(['No assessment attempts yet', '', '', '', '', '']);
    }

    rows.push([]);
    rows.push(['Recent PPTs']);
    rows.push(['Title', 'Slides', 'Template', 'Saved At']);

    if (ppts.length) {
      ppts.forEach((ppt) => {
        rows.push([
          ppt.title || 'Brief Bot PPT',
          ppt.slideCount || 0,
          ppt.template || '-',
          ppt.savedAt || ppt.createdAt || '-'
        ]);
      });
    } else {
      rows.push(['No PPTs generated yet', '', '', '']);
    }

    rows.push([]);
    rows.push(['Recent Summary History']);
    rows.push(['Title', 'Description', 'URL', 'Saved At']);

    if (summaries.length) {
      summaries.forEach((item) => {
        rows.push([
          item.title || 'Saved Summary',
          item.description || '-',
          item.url || '-',
          item.savedAt || item.updatedAt || item.createdAt || '-'
        ]);
      });
    } else {
      rows.push(['No summaries saved yet', '', '', '']);
    }

    const csv = rows.map(row).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = clean(user.name || user.email || 'user').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'user';
    link.href = url;
    link.download = `briefbot-${safeName}-progress-report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setAdminActionMessage('✅ User progress report exported successfully.');
  };


  const getAssessmentShareLink = (assessmentId) => {
    if (!assessmentId) return '';
    return `${window.location.origin}?assessment=${assessmentId}`;
  };

  const formatAssessmentTime = (seconds) => {
    const total = Math.max(0, Number(seconds) || 0);
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };


  const isBattleAssessment = (assessment = assessmentData) => assessment?.assessmentMode === 'battle' || assessment?.assessmentMode === 'challenge';


  const isHostOfBattle = (assessment = assessmentData) => {
    if (!currentUser?.id || !assessment) return false;
    const cleanUserId = String(currentUser.id);
    const players = assessment.players || {};
    const playerRecord = Array.isArray(players)
      ? players.find((player) => String(player.userId || '') === cleanUserId)
      : players[cleanUserId];

    return Boolean(
      String(assessment.createdBy || '') === cleanUserId &&
      playerRecord &&
      (playerRecord.isHost === true || playerRecord.role === 'host')
    );
  };

  const getBattlePlayers = (assessment = assessmentData) => {
    if (!assessment?.players) return [];
    const rawPlayers = Array.isArray(assessment.players) ? assessment.players : Object.values(assessment.players || {});
    const uniquePlayers = Array.from(
      new Map(rawPlayers.filter(Boolean).map((player) => [String(player.userId || player.id || ''), player])).values()
    ).filter((player) => player.userId || player.id);

    return uniquePlayers.sort((a, b) => {
      const aId = String(a.userId || a.id || '');
      const bId = String(b.userId || b.id || '');
      if (aId === String(assessment.createdBy || '')) return -1;
      if (bId === String(assessment.createdBy || '')) return 1;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  };

  const getBattleStatus = (assessment = assessmentData) => assessment?.status || (isBattleAssessment(assessment) ? 'waiting' : 'active');


  const isBossFinalResultScreen = () => {
    return currentPage === 'assessment' && assessmentPanel === 'boss' && isBossBattleFullyCompleted();
  };

  const isAssessmentAttemptActive = () => {
    if (isBossFinalResultScreen()) return true;
    if (!assessmentData || assessmentResult || bossResult) return false;
    if (assessmentPanel === 'boss' && bossBattleData?.questions?.length) return true;
    if (assessmentData.assessmentMode === 'solo') return true;
    if (isBattleAssessment(assessmentData) && getBattleStatus(assessmentData) === 'active') return true;
    return false;
  };



  const refreshAssessmentRoom = async (assessmentId = assessmentData?.id, silent = true) => {
    if (!assessmentId) return;
    if (!silent) setAssessmentLoading(true);
    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/assessments/${assessmentId}?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to refresh assessment room.');
      const freshLeaderboard = Array.isArray(data.assessment?.leaderboard) ? data.assessment.leaderboard : [];
      setAssessmentData((previous) => ({
        ...(previous || {}),
        ...(data.assessment || {}),
        players: data.assessment?.players || previous?.players || [],
        leaderboard: freshLeaderboard.length ? freshLeaderboard : (previous?.leaderboard || [])
      }));
      if (freshLeaderboard.length) setAssessmentLeaderboard(freshLeaderboard);
      if (data.assessment?.bossBattle) {
        setBossBattleData((previous) => {
          const previousQuestions = previous?.questions || [];
          const incoming = data.assessment.bossBattle;
          return {
            ...(previous || {}),
            ...incoming,
            questions: previousQuestions.length ? previousQuestions : (incoming.questions || [])
          };
        });
        if (Array.isArray(data.assessment.bossBattle.leaderboard)) {
          setBossLeaderboard(data.assessment.bossBattle.leaderboard);
        }
      }
      setAssessmentMode(data.assessment?.assessmentMode || 'solo');
      if (data.assessment?.status === 'active' && !assessmentStartedAt) {
        setAssessmentStartedAt(Date.now());
      }
      if (data.assessment?.endsAt) {
        const timeLeft = Math.max(0, Math.floor((new Date(data.assessment.endsAt).getTime() - Date.now()) / 1000));
        setAssessmentTimer(timeLeft);
      }
      if (isBattleAssessment(data.assessment)) {
        await loadAssessmentLeaderboard(data.assessment.id);
      }
    } catch (error) {
      if (!silent) setAssessmentError(error.message);
      console.log('Room refresh skipped:', error.message);
    } finally {
      if (!silent) setAssessmentLoading(false);
    }
  };

  const loadAssessmentLeaderboard = async (assessmentId) => {
    if (!assessmentId) return [];
    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/assessments/${assessmentId}/leaderboard?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load leaderboard.');

      const leaderboard = Array.isArray(data.leaderboard) ? data.leaderboard : [];
      setAssessmentLeaderboard(leaderboard);
      setAssessmentData((previous) => previous ? ({ ...previous, leaderboard }) : previous);
      return leaderboard;
    } catch (error) {
      console.log('Leaderboard load skipped:', error.message);
      return [];
    }
  };

  const loadAssessmentById = async (assessmentId) => {
    if (!assessmentId) return;
    setAssessmentLoading(true);
    setAssessmentError('');
    setAssessmentResult(null);
    setAssessmentAnswers({});
    setAssessmentTimer(0);
    setAssessmentStartedAt(Date.now());

    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/assessments/${assessmentId}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load assessment.');
      setAssessmentData((previous) => ({
        ...(previous || {}),
        ...(data.assessment || {}),
        players: data.assessment?.players || previous?.players || [],
        leaderboard: data.assessment?.leaderboard || previous?.leaderboard || []
      }));
      setAssessmentStartedAt(Date.now());
      setAssessmentMode(data.assessment?.assessmentMode || 'solo');
      setAssessmentPanel(data.assessment?.assessmentMode === 'battle' ? 'battle' : 'solo');
      setAssessmentType(data.assessment?.questionType || 'mcq');
      setAssessmentTitle(data.assessment?.title || 'Brief Bot Assessment');
      // Solo mode only: no leaderboard needed.
      setCurrentPage('assessment');
    } catch (error) {
      setAssessmentError(error.message);
    } finally {
      setAssessmentLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const assessmentId = params.get('assessment');
    if (assessmentId && currentUser?.id) {
      loadAssessmentById(assessmentId);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!assessmentData?.id || assessmentResult) return;
    const status = getBattleStatus(assessmentData);
    const shouldRunTimer = assessmentData.assessmentMode === 'solo' || status === 'active';
    if (!shouldRunTimer) return;

    const interval = setInterval(() => {
      setAssessmentTimer((previous) => {
        const next = Math.max(0, Number(previous || 0) - 1);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [assessmentData?.id, assessmentData?.status, assessmentResult]);

  useEffect(() => {
    if (!assessmentData?.id || assessmentResult) return;
    const status = getBattleStatus(assessmentData);
    const shouldSubmit = (assessmentData.assessmentMode === 'solo' || status === 'active') && assessmentTimer === 0;
    if (shouldSubmit) {
      handleSubmitAssessment(true);
    }
  }, [assessmentTimer, assessmentData?.id, assessmentData?.status, assessmentResult]);


  useEffect(() => {
    if (!bossBattleData?.questions?.length || bossResult) return;
    const interval = setInterval(() => {
      setBossTimer((previous) => Math.max(0, Number(previous || 0) - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [bossBattleData?.questions?.length, bossResult]);

  useEffect(() => {
    if (bossBattleData?.questions?.length && !bossResult && bossTimer === 0) {
      handleSubmitBossBattle(true);
    }
  }, [bossTimer, bossBattleData?.questions?.length, bossResult]);

  useEffect(() => {
    if (isCurrentUserFinalBossChampion()) {
      setShowBossChampionPopup(true);
      if (bossVictorySoundEnabled) {
        playBossChampionFanfare();
      }
    }
  }, [bossBattleData?.status, assessmentData?.bossBattle?.status, bossBattleData?.champion?.userId, assessmentData?.bossBattle?.champion?.userId, bossVictorySoundEnabled]);

  useEffect(() => {
    if (!showBossChampionPopup || !bossVictorySoundEnabled) return;
    const timer = setTimeout(() => playBossChampionFanfare(), 240);
    return () => clearTimeout(timer);
  }, [showBossChampionPopup, bossVictorySoundEnabled]);

  useEffect(() => {
    if (!isCurrentUserFinalBossChampion() && showBossChampionPopup) {
      setShowBossChampionPopup(false);
    }
  }, [bossBattleData?.status, assessmentData?.bossBattle?.status, bossBattleData?.champion?.userId, assessmentData?.bossBattle?.champion?.userId, showBossChampionPopup]);

  useEffect(() => {
    if (!assessmentData?.id || !isBattleAssessment(assessmentData)) return;
    const interval = setInterval(() => refreshAssessmentRoom(assessmentData.id, true), getBattleStatus(assessmentData) === 'waiting' ? 1200 : 2500);
    return () => clearInterval(interval);
  }, [assessmentData?.id, assessmentData?.status]);

  useEffect(() => {
    if (!assessmentData?.id || !bossResult || isBossBattleFullyCompleted()) return;
    const interval = setInterval(() => refreshAssessmentRoom(assessmentData.id, true), 2500);
    return () => clearInterval(interval);
  }, [assessmentData?.id, bossResult?.submittedAt, bossBattleData?.status, assessmentData?.bossBattle?.status]);


  const handleExitAssessment = async () => {
    try {
      if (assessmentData?.assessmentMode === 'battle' && assessmentData?.roomCode && currentUser?.id) {
        await fetch(`https://briefbot-backend-giridhar.onrender.com/api/battle-rooms/${assessmentData.roomCode}/quit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        });
      }
    } catch (error) {
      console.log('Assessment exit tracking skipped:', error.message);
    }

    setAssessmentData(null);
    setAssessmentResult(null);
    setAssessmentAnswers({});
    setAssessmentTimer(20 * 60);
    setAssessmentError('');
    setBattleResult(null);
    setBattleRoom(null);
    setBattleRoomCode('');
    setBattleAnswers({});
    setBattleRoomError('');
    setBossBattleData(null);
    setBossAnswers({});
    setBossResult(null);
    setBossLeaderboard([]);
    setBossError('');
    setBossTimer(180);
    setBossStartedAt(null);
    setShowBossChampionPopup(false);
    setAssessmentPanel('solo');
    setCurrentPage('home');
  };

  const handleExitBossResult = (event) => {
    if (event?.preventDefault) event.preventDefault();
    if (event?.stopPropagation) event.stopPropagation();

    setCurrentPage('home');
    setAssessmentPanel('solo');

    setTimeout(() => {
      setAssessmentMode('solo');
      setAssessmentData(null);
      setAssessmentResult(null);
      setAssessmentAnswers({});
      setAssessmentLeaderboard([]);
      setAssessmentStartedAt(null);
      setAssessmentTimer(20 * 60);

      setBossBattleData(null);
      setBossAnswers({});
      setBossResult(null);
      setBossLeaderboard([]);
      setBossError('');
      setBossTimer(180);
      setBossStartedAt(null);

      if (typeof setShowBossChampionPopup === 'function') {
        setShowBossChampionPopup(false);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };


  const handleBackToAssessmentArena = () => {
    setAssessmentData(null);
    setAssessmentResult(null);
    setAssessmentAnswers({});
    setAssessmentTimer(20 * 60);
    setAssessmentError('');
    setBattleResult(null);
    setBattleRoom(null);
    setBattleRoomCode('');
    setBattleAnswers({});
    setBattleRoomError('');
    setBossBattleData(null);
    setBossAnswers({});
    setBossResult(null);
    setBossLeaderboard([]);
    setBossError('');
    setBossTimer(180);
    setBossStartedAt(null);
    setAssessmentPanel('solo');
    setCurrentPage('assessment');
  };


  const playBossChampionFanfare = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioContext = new AudioCtx();
      const now = audioContext.currentTime;
      const notes = [392, 523.25, 659.25, 783.99, 1046.5];
      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.type = index % 2 === 0 ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, now + (index * 0.13));
        gainNode.gain.setValueAtTime(0.0001, now + (index * 0.13));
        gainNode.gain.exponentialRampToValueAtTime(0.16, now + (index * 0.13) + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + (index * 0.13) + 0.26);
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start(now + (index * 0.13));
        oscillator.stop(now + (index * 0.13) + 0.28);
      });
    } catch (error) {
      console.log('Champion fanfare skipped:', error.message);
    }
  };


  const isBossBattleFullyCompleted = () => {
    return bossBattleData?.status === 'completed' || assessmentData?.bossBattle?.status === 'completed';
  };

  const getBossChampion = () => {
    return bossBattleData?.champion || assessmentData?.bossBattle?.champion || null;
  };

  const isCurrentUserFinalBossChampion = () => {
    const champion = getBossChampion();
    return isBossBattleFullyCompleted() && champion && String(champion.userId || '') === String(currentUser?.id || '');
  };

  const getBossWaitingCount = () => {
    const qualifiedIds = (bossBattleData?.qualifiedUserIds || assessmentData?.bossBattle?.qualifiedUserIds || []).map(String);
    const submittedIds = (bossLeaderboard || bossBattleData?.leaderboard || assessmentData?.bossBattle?.leaderboard || []).map((item) => String(item.userId || ''));
    return Math.max(0, qualifiedIds.filter((id) => !submittedIds.includes(id)).length);
  };


  const getFinalBossLeaderboard = () => {
    const finalList = bossBattleData?.leaderboard || assessmentData?.bossBattle?.leaderboard || bossLeaderboard || [];
    return Array.isArray(finalList) ? finalList : [];
  };

  const getCurrentBossFinalRecord = () => {
    const list = getFinalBossLeaderboard();
    return list.find((player) => String(player.userId || '') === String(currentUser?.id || '')) || bossResult || null;
  };


  const renderBossChallengeArena = () => {
    const qualifiers = getBossQualifiersClient();
    const leaderboardList = Array.isArray(bossLeaderboard) && bossLeaderboard.length
      ? bossLeaderboard
      : (bossResult?.leaderboard || qualifiers || []);
    const hasBattleContext = Boolean(assessmentData && isBattleAssessment(assessmentData));
    const leaderboardReady = getBattleLeaderboardList().length >= 2;
    const currentUserQualified = isCurrentUserBossQualified();
    const championUnlocked = isCurrentUserFinalBossChampion();
    const bossFinishedForUser = Boolean(bossResult);
    const waitingForOtherBossPlayers = bossFinishedForUser && !isBossBattleFullyCompleted();
    const bossDisplayStatus = isBossBattleFullyCompleted()
      ? 'Locked'
      : waitingForOtherBossPlayers
        ? 'Waiting'
        : (bossBattleData?.questions?.length && !bossResult)
          ? 'Unlocked'
          : currentUserQualified
            ? 'Unlocked'
            : 'Locked';
    const finalBossLeaderboard = getFinalBossLeaderboard();
    const currentBossFinalRecord = getCurrentBossFinalRecord();
    const nonChampionCompleted = isBossBattleFullyCompleted() && Boolean(currentBossFinalRecord) && !championUnlocked;

    return (
      <section className="boss-fire-shell" style={{ position: 'relative', overflow: 'hidden', borderRadius: '28px', border: '1px solid rgba(249,115,22,0.36)', padding: '1.65rem', boxShadow: '0 32px 90px rgba(0,0,0,0.40)' }}>
        <div className="boss-fire-backdrop boss-fire-a" />
        <div className="boss-fire-backdrop boss-fire-b" />
        <div className="boss-fire-backdrop boss-fire-c" />
        <div className="boss-fire-noise" />
        <div className="boss-fire-embers">
          {[...Array(14)].map((_, index) => (
            <span key={index} className={`boss-ember ember-${(index % 4) + 1}`} style={{ left: `${6 + (index * 6.2)}%`, animationDelay: `${index * 0.35}s` }} />
          ))}
        </div>

        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gap: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', color: '#FDBA74', background: 'rgba(249,115,22,0.14)', border: '1px solid rgba(249,115,22,0.30)', borderRadius: '999px', padding: '0.45rem 0.9rem', fontSize: '0.78rem', fontWeight: '950', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                🔥 Boss Challenge Mode
              </div>
              <h2 style={{ color: '#FFF7ED', margin: '0.65rem 0 0 0', fontSize: '2rem', fontWeight: '950' }}>Fire Arena</h2>
              <p style={{ color: '#FED7AA', maxWidth: '760px', margin: '0.45rem 0 0 0', lineHeight: '1.65' }}>
                This is the final round for top battle performers. The arena is hotter, the timer is shorter, and only one player becomes the Brief Boss Champion.
              </p>
            </div>
            {!isBossBattleFullyCompleted() && (
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setAssessmentPanel('battle')} className="simple-btn-glow" style={{ background: 'rgba(15,23,42,0.80)', color: '#FDE68A', border: '1px solid rgba(251,191,36,0.30)', borderRadius: '12px', padding: '0.8rem 1rem', cursor: 'pointer', fontWeight: '900' }}>← Back to Battle Room</button>
                <button type="button" onClick={() => refreshAssessmentRoom(assessmentData?.id, false)} disabled={!assessmentData?.id || assessmentLoading} className="simple-btn-glow" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.18), rgba(239,68,68,0.18))', color: '#FFF7ED', border: '1px solid rgba(249,115,22,0.35)', borderRadius: '12px', padding: '0.8rem 1rem', cursor: !assessmentData?.id ? 'not-allowed' : 'pointer', fontWeight: '900', opacity: !assessmentData?.id ? 0.55 : 1 }}>{assessmentLoading ? 'Refreshing...' : 'Refresh Arena'}</button>
              </div>
            )}
          </div>

          {!isBossBattleFullyCompleted() && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
              {[
                ['Qualifiers', `${Math.max(0, qualifiers.length)}`, '#FBBF24'],
                ['Boss Questions', '5', '#FB7185'],
                ['Boss Timer', '3 min', '#FDBA74'],
                ['Status', bossDisplayStatus, bossDisplayStatus === 'Unlocked' ? '#F97316' : bossDisplayStatus === 'Waiting' ? '#FBBF24' : '#94A3B8']
              ].map(([label, value, accent]) => (
                <div key={label} style={{ background: 'linear-gradient(145deg, rgba(17,24,39,0.82), rgba(12,10,9,0.82))', border: `1px solid ${accent}44`, borderRadius: '18px', padding: '1rem', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                  <div style={{ color: '#FDBA74', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '950', letterSpacing: '0.08em' }}>{label}</div>
                  <div style={{ color: accent, fontSize: '1.45rem', fontWeight: '950', marginTop: '0.3rem' }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {bossError && (
            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(248,113,113,0.34)', borderRadius: '16px', padding: '0.9rem 1rem', color: '#FCA5A5', fontWeight: '850', lineHeight: '1.55' }}>
              ❌ {bossError}
            </div>
          )}

          {!hasBattleContext ? (
            <div style={{ background: 'rgba(15,23,42,0.76)', border: '1px dashed rgba(251,146,60,0.34)', borderRadius: '20px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem' }}>🔥</div>
              <h3 style={{ color: '#FFF7ED', margin: '0.55rem 0 0 0', fontWeight: '950' }}>Boss Mode unlocks after Battle Room</h3>
              <p style={{ color: '#FED7AA', maxWidth: '680px', margin: '0.55rem auto 0 auto', lineHeight: '1.65' }}>Create or join a Battle Room first. Once players complete the battle and the leaderboard is ready, the top performers can enter this fiery final round.</p>
            </div>
          ) : !leaderboardReady ? (
            <div style={{ background: 'rgba(15,23,42,0.76)', border: '1px dashed rgba(251,146,60,0.34)', borderRadius: '20px', padding: '1.35rem', display: 'grid', gap: '1rem' }}>
              <div>
                <h3 style={{ color: '#FFF7ED', margin: 0, fontWeight: '950' }}>Battle leaderboard not ready yet</h3>
                <p style={{ color: '#FED7AA', margin: '0.45rem 0 0 0', lineHeight: '1.65' }}>At least 2 players must complete the Battle Room. When results arrive, the top players will be promoted here automatically.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                {getBattlePlayers().map((player, index) => (
                  <div key={player.userId || index} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: player.userId === assessmentData?.createdBy ? 'linear-gradient(135deg, #FBBF24, #F97316)' : 'linear-gradient(135deg, #F97316, #EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950', color: '#0B0F19' }}>{player.userId === assessmentData?.createdBy ? '👑' : '⚡'}</div>
                    <div>
                      <div style={{ color: '#FFF7ED', fontWeight: '900' }}>{player.name || 'Player'}</div>
                      <div style={{ color: '#FECACA', fontSize: '0.82rem' }}>{player.userId === assessmentData?.createdBy ? 'Host' : 'Competitor'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isBossBattleFullyCompleted() && !championUnlocked ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ background: 'rgba(15,23,42,0.76)', border: '1px solid rgba(148,163,184,0.24)', borderRadius: '20px', padding: '1.35rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.4rem' }}>🔒</div>
                <h3 style={{ color: '#FCA5A5', margin: '0.55rem 0 0 0', fontWeight: '950', fontSize: 'clamp(2rem, 5vw, 3.5rem)', textTransform: 'uppercase', letterSpacing: '0.04em', textShadow: '0 0 26px rgba(248,113,113,0.28)' }}>Better Luck Next Time</h3>
                <p style={{ color: '#CBD5E1', maxWidth: '720px', margin: '0.55rem auto 0 auto', lineHeight: '1.7' }}>
                  This Boss Challenge is already completed. Check the final leaderboard below and try again in the next Battle Room.
                </p>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.1rem' }}>
                      <button
                        type="button"
                        onClick={(event) => handleExitBossResult(event)}
                        className="simple-btn-glow"
                        style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)', color: '#FFFFFF', border: 'none', borderRadius: '14px', padding: '0.9rem 1.4rem', cursor: 'pointer', fontWeight: '950', boxShadow: '0 14px 30px rgba(239,68,68,0.22)' }}
                      >
                        Exit
                      </button>
                    </div>
              </div>
              <div style={{ background: 'rgba(17,24,39,0.72)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: '22px', padding: '1.25rem' }}>
                <h3 style={{ color: '#FFF7ED', margin: '0 0 0.9rem 0', fontWeight: '950' }}>🔥 Final Boss Leaderboard</h3>
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  {(finalBossLeaderboard || []).map((player, index) => (
                    <div key={player.userId || index} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 90px 100px', gap: '0.85rem', alignItems: 'center', background: index === 0 ? 'linear-gradient(135deg, rgba(251,191,36,0.16), rgba(249,115,22,0.12))' : 'rgba(255,255,255,0.04)', border: index === 0 ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '0.95rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: index === 0 ? 'linear-gradient(135deg, #FBBF24, #F97316)' : 'linear-gradient(135deg, #FB7185, #F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950', color: '#0F172A', fontSize: '1.05rem' }}>{index === 0 ? '👑' : `#${index + 1}`}</div>
                      <div>
                        <div style={{ color: '#FFF7ED', fontWeight: '900' }}>{player.userName || player.name || 'Player'}</div>
                        <div style={{ color: '#FECACA', fontSize: '0.82rem' }}>{index === 0 ? 'Brief Boss Champion' : 'Better luck next time'}</div>
                      </div>
                      <div style={{ color: '#FBBF24', fontWeight: '950' }}>{player.score || 0}/{player.totalMarks || 5}</div>
                      <div style={{ color: '#FDBA74', fontWeight: '850' }}>{formatAssessmentTime(player.timeTakenSeconds || 0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : !currentUserQualified && !bossResult ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ background: 'rgba(15,23,42,0.76)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: '20px', padding: '1.35rem' }}>
                <h3 style={{ color: '#FFF7ED', margin: 0, fontWeight: '950' }}>Only the top battle players can enter Boss Challenge</h3>
                <p style={{ color: '#FED7AA', margin: '0.45rem 0 0 0', lineHeight: '1.65' }}>You can still watch the qualifiers below. Score higher in the next Battle Room to unlock the fire arena.</p>
              </div>
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                {qualifiers.map((player, index) => (
                  <div key={player.userId || index} style={{ display: 'grid', gridTemplateColumns: '56px 1fr 90px 100px', gap: '0.8rem', alignItems: 'center', background: index === 0 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)', border: index === 0 ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '0.95rem' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '16px', background: index === 0 ? 'linear-gradient(135deg, #FBBF24, #F97316)' : 'linear-gradient(135deg, #FB7185, #F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: '950', color: '#0F172A' }}>{index === 0 ? '👑' : `#${index + 1}`}</div>
                    <div style={{ color: '#FFF7ED', fontWeight: '900' }}>{player.userName || player.name || 'Player'}</div>
                    <div style={{ color: '#FBBF24', fontWeight: '950' }}>{player.score || 0}/{player.totalMarks || 20}</div>
                    <div style={{ color: '#FCA5A5', fontWeight: '850' }}>{formatAssessmentTime(player.timeTakenSeconds || 0)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : !bossBattleData?.questions?.length && !bossResult ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ background: 'rgba(17,24,39,0.76)', border: '1px solid rgba(249,115,22,0.28)', borderRadius: '20px', padding: '1.3rem' }}>
                <h3 style={{ color: '#FFF7ED', margin: 0, fontWeight: '950' }}>The fire gate is open</h3>
                <p style={{ color: '#FED7AA', margin: '0.45rem 0 0 0', lineHeight: '1.65' }}>You qualified for the final round. Enter now to face 5 rapid-fire boss questions. One attempt. Three minutes. Highest score becomes the champion.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                {qualifiers.map((player, index) => (
                  <div key={player.userId || index} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: index === 0 ? 'linear-gradient(135deg, #FBBF24, #F97316)' : 'linear-gradient(135deg, #FB7185, #F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950', color: '#0F172A' }}>{index === 0 ? '👑' : `#${index + 1}`}</div>
                    <div>
                      <div style={{ color: '#FFF7ED', fontWeight: '900' }}>{player.userName || player.name || 'Player'}</div>
                      <div style={{ color: '#FCA5A5', fontSize: '0.82rem' }}>Qualified for Boss Challenge</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button type="button" onClick={handleStartBossBattle} disabled={bossLoading} className="simple-btn-glow boss-enter-button" style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)', color: '#FFF7ED', border: 'none', borderRadius: '16px', padding: '1rem 1.45rem', cursor: bossLoading ? 'not-allowed' : 'pointer', fontWeight: '950', fontSize: '1rem', minWidth: '240px', opacity: bossLoading ? 0.7 : 1 }}>
                  {bossLoading ? 'Igniting the arena...' : '🔥 Enter Boss Challenge'}
                </button>
              </div>
            </div>
          ) : bossResult ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {waitingForOtherBossPlayers && (
                <div style={{ background: 'linear-gradient(145deg, rgba(251,191,36,0.14), rgba(249,115,22,0.10))', border: '1px solid rgba(251,191,36,0.32)', borderRadius: '22px', padding: '1.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.4rem' }}>⏳🔥</div>
                  <h3 style={{ color: '#FFF7ED', margin: '0.55rem 0 0 0', fontWeight: '950' }}>Waiting for other Boss challengers</h3>
                  <p style={{ color: '#FDE68A', maxWidth: '720px', margin: '0.55rem auto 0 auto', lineHeight: '1.7' }}>
                    Your Boss Challenge is submitted. The Brief Boss Champion will be revealed only after all qualified Boss players submit their tests.
                  </p>
                  <div style={{ marginTop: '0.85rem', color: '#FDBA74', fontWeight: '950' }}>
                    Remaining submissions: {getBossWaitingCount()}
                  </div>
                </div>
              )}

              <div className={championUnlocked ? 'boss-champion-stage' : ''} style={{ position: 'relative', overflow: 'hidden', background: championUnlocked ? 'linear-gradient(145deg, rgba(120,53,15,0.88), rgba(69,10,10,0.92))' : 'linear-gradient(145deg, rgba(17,24,39,0.86), rgba(28,25,23,0.90))', border: championUnlocked ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(249,115,22,0.20)', borderRadius: '24px', padding: '1.6rem', textAlign: 'center' }}>
                {championUnlocked && (
                  <>
                    <div className="boss-victory-aura" />
                    <div className="boss-victory-ring" />
                    <div className="boss-victory-burst">👑</div>
                    <div style={{
                      color: '#FBBF24',
                      fontSize: 'clamp(2.4rem, 6vw, 4.4rem)',
                      fontWeight: '950',
                      marginTop: '1rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      lineHeight: '1.05',
                      textShadow: '0 0 30px rgba(251,191,36,0.38), 0 0 70px rgba(249,115,22,0.22)'
                    }}>
                      BRIEF BOSS CHAMPION
                    </div>
                    <div style={{
                      width: 'min(360px, 75%)',
                      height: '3px',
                      margin: '0.95rem auto 0 auto',
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, rgba(251,191,36,0), rgba(251,191,36,1), rgba(249,115,22,0))',
                      boxShadow: '0 0 20px rgba(251,191,36,0.35)'
                    }} />
                    <div style={{ color: '#FFF7ED', fontSize: '1.55rem', fontWeight: '950', marginTop: '0.9rem' }}>{currentUser?.name || 'Champion'} conquered the fire arena!</div>
                    <p style={{ color: '#FDE68A', maxWidth: '700px', margin: '0.55rem auto 0 auto', lineHeight: '1.7' }}>Excellent performance. You finished Rank #1 in Boss Challenge and became the Brief Boss Champion.</p>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.1rem' }}>
                      <button
                        type="button"
                        onClick={(event) => handleExitBossResult(event)}
                        className="simple-btn-glow"
                        style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)', color: '#FFFFFF', border: 'none', borderRadius: '14px', padding: '0.9rem 1.4rem', cursor: 'pointer', fontWeight: '950', boxShadow: '0 14px 30px rgba(239,68,68,0.22)' }}
                      >
                        Exit
                      </button>
                    </div>
                  </>
                )}
                {!championUnlocked && (
                  <>
                    {nonChampionCompleted && !waitingForOtherBossPlayers ? (
                      <>
                        <div style={{ fontSize: '3.4rem', marginBottom: '0.3rem' }}>🔥🎯</div>
                        <div style={{
                          color: '#FCA5A5',
                          fontSize: 'clamp(2.4rem, 6vw, 4.2rem)',
                          fontWeight: '950',
                          marginTop: '0.4rem',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          lineHeight: '1.05',
                          textShadow: '0 0 28px rgba(248,113,113,0.35), 0 0 60px rgba(249,115,22,0.18)'
                        }}>
                          Better Luck Next Time
                        </div>
                        <div style={{
                          width: 'min(320px, 70%)',
                          height: '3px',
                          margin: '0.9rem auto 0 auto',
                          borderRadius: '999px',
                          background: 'linear-gradient(90deg, rgba(248,113,113,0), rgba(248,113,113,0.95), rgba(249,115,22,0))',
                          boxShadow: '0 0 18px rgba(248,113,113,0.28)'
                        }} />
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '2.4rem' }}>🔥</div>
                        <div style={{ color: '#FFF7ED', fontSize: '1.5rem', fontWeight: '950', marginTop: '0.4rem' }}>
                          {waitingForOtherBossPlayers ? 'Boss Challenge Submitted' : (bossResult.badge || 'Boss Finalist')}
                        </div>
                      </>
                    )}

                    <p style={{ color: '#FED7AA', margin: '0.75rem auto 0 auto', maxWidth: '720px', lineHeight: '1.7', fontWeight: nonChampionCompleted && !waitingForOtherBossPlayers ? '850' : '700' }}>
                      {waitingForOtherBossPlayers
                        ? 'Your answers are locked. Final champion reveal will happen after all Boss challengers submit.'
                        : nonChampionCompleted
                          ? 'You completed the Boss Challenge. Check your score, rank, and final leaderboard below. Try again in the next Battle Room and claim the crown.'
                          : 'You completed the Boss Challenge. Come back stronger to claim the crown next time.'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.1rem' }}>
                      <button
                        type="button"
                        onClick={(event) => handleExitBossResult(event)}
                        className="simple-btn-glow"
                        style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)', color: '#FFFFFF', border: 'none', borderRadius: '14px', padding: '0.9rem 1.4rem', cursor: 'pointer', fontWeight: '950', boxShadow: '0 14px 30px rgba(239,68,68,0.22)' }}
                      >
                        Exit
                      </button>
                    </div>
                  </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem', marginTop: '1.2rem' }}>
                  {[
                    ['Remarks', championUnlocked ? 'Outstanding victory' : 'Keep practicing', '#FCA5A5'],
                    ['Accuracy', `${(currentBossFinalRecord || bossResult).percentage || 0}%`, '#FB7185'],
                    ['Time Taken', formatAssessmentTime((currentBossFinalRecord || bossResult).timeTakenSeconds || 0), '#FDBA74'],
                    ['Rank', `#${(currentBossFinalRecord || bossResult).rank || '-'}`, '#F97316']
                  ].map(([label, value, accent]) => (
                    <div key={label} style={{ background: 'rgba(11,15,25,0.50)', border: `1px solid ${accent}44`, borderRadius: '18px', padding: '1rem' }}>
                      <div style={{ color: '#FECACA', fontSize: '0.74rem', fontWeight: '950', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ color: accent, fontSize: '1.35rem', fontWeight: '950', marginTop: '0.25rem' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'rgba(17,24,39,0.72)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: '22px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
                  <h3 style={{ color: '#FFF7ED', margin: 0, fontWeight: '950' }}>🔥 Boss Challenge Leaderboard</h3>
                  <span style={{ color: '#FBBF24', background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '999px', padding: '0.42rem 0.75rem', fontWeight: '950' }}>Final standings</span>
                </div>
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  {(Array.isArray(finalBossLeaderboard) && finalBossLeaderboard.length ? finalBossLeaderboard : Array.isArray(leaderboardList) && leaderboardList.length ? leaderboardList : qualifiers).map((player, index) => (
                    <div key={player.userId || index} className={index === 0 ? 'boss-leaderboard-top' : ''} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 90px 100px', gap: '0.85rem', alignItems: 'center', background: index === 0 ? 'linear-gradient(135deg, rgba(251,191,36,0.16), rgba(249,115,22,0.12))' : 'rgba(255,255,255,0.04)', border: index === 0 ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '0.95rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: index === 0 ? 'linear-gradient(135deg, #FBBF24, #F97316)' : 'linear-gradient(135deg, #FB7185, #F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950', color: '#0F172A', fontSize: '1.05rem' }}>{index === 0 ? '👑' : `#${index + 1}`}</div>
                      <div>
                        <div style={{ color: '#FFF7ED', fontWeight: '900' }}>{player.userName || player.name || 'Player'}</div>
                        <div style={{ color: '#FECACA', fontSize: '0.82rem' }}>{index === 0 ? 'Champion' : 'Boss Challenger'}</div>
                      </div>
                      <div style={{ color: '#FBBF24', fontWeight: '950' }}>{player.score || 0}/{player.totalMarks || 5}</div>
                      <div style={{ color: '#FDBA74', fontWeight: '850' }}>{formatAssessmentTime(player.timeTakenSeconds || 0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(17,24,39,0.72)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: '20px', padding: '1rem 1.15rem' }}>
                <div>
                  <div style={{ color: '#FDBA74', fontSize: '0.78rem', fontWeight: '950', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live Boss Battle</div>
                  <div style={{ color: '#FFF7ED', fontSize: '1.25rem', fontWeight: '950', marginTop: '0.25rem' }}>Answer fast. Think sharper. Finish first.</div>
                </div>
                <div style={{ color: bossTimer <= 30 ? '#FCA5A5' : '#FBBF24', fontSize: '1.65rem', fontWeight: '950' }}>⏱ {formatAssessmentTime(bossTimer)}</div>
              </div>

              {(bossBattleData.questions || []).map((question, index) => (
                <div key={question.id} style={{ background: 'linear-gradient(145deg, rgba(12,10,9,0.88), rgba(17,24,39,0.84))', border: '1px solid rgba(249,115,22,0.22)', borderRadius: '20px', padding: '1.1rem' }}>
                  <div style={{ color: '#FDBA74', fontSize: '0.78rem', fontWeight: '950', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Boss Question {index + 1}</div>
                  <h4 style={{ color: '#FFF7ED', margin: '0 0 0.85rem 0', lineHeight: '1.55', fontSize: '1.08rem' }}>{question.question}</h4>
                  <div style={{ display: 'grid', gap: '0.7rem' }}>
                    {(question.options || []).map((option, optIndex) => (
                      <label key={optIndex} style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', padding: '0.8rem', borderRadius: '14px', border: bossAnswers[question.id] === option ? '1px solid #F97316' : '1px solid rgba(255,255,255,0.10)', background: bossAnswers[question.id] === option ? 'linear-gradient(135deg, rgba(249,115,22,0.16), rgba(239,68,68,0.12))' : 'rgba(17,24,39,0.72)', color: '#FFF7ED', cursor: 'pointer' }}>
                        <input type="radio" checked={bossAnswers[question.id] === option} onChange={() => handleBossAnswerChange(question.id, option)} />
                        <span style={{ whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: '1.5' }}>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button type="button" onClick={() => handleSubmitBossBattle(false)} disabled={bossLoading} className="simple-btn-glow boss-enter-button" style={{ background: 'linear-gradient(135deg, #FBBF24, #EF4444)', color: '#111827', border: 'none', borderRadius: '16px', padding: '1rem 1.45rem', cursor: bossLoading ? 'not-allowed' : 'pointer', fontWeight: '950', fontSize: '1rem', minWidth: '220px', opacity: bossLoading ? 0.7 : 1 }}>{bossLoading ? 'Submitting...' : 'Submit Boss Challenge'}</button>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  };

  const handleCreateAssessment = async (mode = 'solo') => {
    if (!currentUser?.id) return;

    setAssessmentResult(null);
    setAssessmentAnswers({});
    setAssessmentTimer(20 * 60);
    setAssessmentError('');
    if (!analysisData) {
      setAssessmentError('First generate summary to access the assessment.');
      return;
    }

    setAssessmentLoading(true);
    setAssessmentError('');
    setAssessmentResult(null);
    setAssessmentLeaderboard([]);
    setAssessmentAnswers({});
    setAssessmentTimer(FIXED_ASSESSMENT_TIMER_SECONDS);
    setAssessmentStartedAt(mode === 'solo' ? Date.now() : null);

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/assessments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          title: assessmentTitle || (mode === 'battle' ? 'Brief Bot Battle Room' : 'Brief Bot Assessment'),
          questionType: assessmentType,
          difficulty: assessmentDifficulty,
          questionCount: FIXED_ASSESSMENT_QUESTION_COUNT,
          timeLimitMinutes: 20,
          language: selectedLanguage,
          summary: analysisData.slice(0, 6000),
          videoUrl: inputUrl,
          assessmentMode: mode
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Assessment generation failed.');

      setAssessmentData((previous) => ({
        ...(previous || {}),
        ...(data.assessment || {}),
        players: data.assessment?.players || previous?.players || [],
        leaderboard: data.assessment?.leaderboard || previous?.leaderboard || []
      }));
      setAssessmentMode(data.assessment?.assessmentMode || mode);
      setAssessmentTitle(data.assessment?.title || assessmentTitle);
      setAssessmentTimer(FIXED_ASSESSMENT_TIMER_SECONDS);
      setAssessmentStartedAt(data.assessment?.assessmentMode === 'solo' ? Date.now() : null);
      setCurrentPage('assessment');
      if (data.assessment?.assessmentMode !== 'solo') {
        setAssessmentPanel('battle');
      }
      await loadAssessmentLeaderboard(data.assessment?.id);
    } catch (error) {
      setAssessmentError(error.message);
    } finally {
      setAssessmentLoading(false);
    }
  };

  const joinBattleRoom = async (codeValue = battleJoinCode || assessmentSearchLink) => {
    const code = normalizeAssessmentCode(codeValue);
    if (!code || !currentUser?.id) return;

    setBattleLoading(true);
    setAssessmentLoading(true);
    setAssessmentError('');
    setAssessmentResult(null);
    setAssessmentAnswers({});
    setAssessmentTimer(FIXED_ASSESSMENT_TIMER_SECONDS);
    setAssessmentStartedAt(null);

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/battle-room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, userId: currentUser.id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to join Battle Room.');

      setAssessmentData((previous) => ({
        ...(previous || {}),
        ...(data.assessment || {}),
        players: data.assessment?.players || previous?.players || [],
        leaderboard: data.assessment?.leaderboard || previous?.leaderboard || []
      }));
      setAssessmentMode('battle');
      setAssessmentPanel('battle');
      setAssessmentType(data.assessment?.questionType || 'mcq');
      setAssessmentTitle(data.assessment?.title || 'Brief Bot Battle Room');
      if (data.assessment?.status === 'active') {
        setAssessmentStartedAt(Date.now());
      }
      setTimeout(() => refreshAssessmentRoom(data.assessment?.id, true), 350);
      await loadAssessmentLeaderboard(data.assessment?.id);
      setCurrentPage('assessment');
    } catch (error) {
      setAssessmentError(error.message);
    } finally {
      setBattleLoading(false);
      setAssessmentLoading(false);
    }
  };

  const startBattleRoom = async () => {
    if (!assessmentData?.id || !currentUser?.id) return;
    setBattleLoading(true);
    setAssessmentError('');
    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/battle-room/${assessmentData.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to start Battle Room.');
      setAssessmentData((previous) => ({
        ...(previous || {}),
        ...(data.assessment || {}),
        players: data.assessment?.players || previous?.players || [],
        leaderboard: data.assessment?.leaderboard || previous?.leaderboard || []
      }));
      setAssessmentTimer(FIXED_ASSESSMENT_TIMER_SECONDS);
      setAssessmentStartedAt(Date.now());
    } catch (error) {
      setAssessmentError(error.message);
    } finally {
      setBattleLoading(false);
    }
  };

  const handleAssessmentAnswerChange = (questionId, value) => {
    setAssessmentAnswers((prev) => ({ ...prev, [questionId]: value }));
  };


  const getBattleLeaderboardList = () => {
    return assessmentLeaderboard?.length
      ? assessmentLeaderboard
      : (assessmentData?.leaderboard || assessmentResult?.leaderboard || []);
  };

  const getBossQualifiersClient = () => {
    const list = getBattleLeaderboardList();
    if (!Array.isArray(list) || list.length < 2) return [];
    return list.slice(0, Math.min(3, list.length));
  };

  const isCurrentUserBossQualified = () => {
    return getBossQualifiersClient().some((player) => String(player.userId || player.id) === String(currentUser?.id));
  };

  const handleBossAnswerChange = (questionId, value) => {
    setBossAnswers((prev) => ({ ...prev, [questionId]: value }));
  };


  const openBossChallengeTab = async () => {
    setAssessmentPanel('boss');
    setBossError('');
    setCurrentPage('assessment');

    if (!assessmentData?.id) {
      setBossError('Battle Room data is not ready. Please refresh the room and try again.');
      return;
    }

    await refreshAssessmentRoom(assessmentData.id, false);
  };

  const handleStartBossBattle = async () => {
    setAssessmentPanel('boss');
    setCurrentPage('assessment');

    if (!assessmentData?.id || !currentUser?.id) {
      setBossError('Boss Challenge cannot start because Battle Room data or login details are missing.');
      return;
    }

    setBossLoading(true);
    setBossError('');
    setBossResult(null);
    setBossAnswers({});

    try {
      await refreshAssessmentRoom(assessmentData.id, true);

      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/assessments/${assessmentData.id}/boss/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({ userId: currentUser.id })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Boss Battle start failed.');

      const incomingBossBattle = data.bossBattle || null;
      setBossBattleData(incomingBossBattle);
      setAssessmentData((previous) => previous ? ({ ...previous, bossBattle: incomingBossBattle || previous.bossBattle }) : previous);

      if (data.result) setBossResult(data.result);
      if (Array.isArray(data.bossLeaderboard)) setBossLeaderboard(data.bossLeaderboard);

      if (!data.result && (!incomingBossBattle?.questions || !incomingBossBattle.questions.length)) {
        setBossError('Boss Challenge opened, but questions were not received. Please click Refresh Arena and try again.');
      }

      setBossTimer(Number(incomingBossBattle?.timerSeconds || 180));
      setBossStartedAt(Date.now());
    } catch (error) {
      setBossError(error.message || 'Unable to open Boss Challenge.');
    } finally {
      setBossLoading(false);
    }
  };

  const handleSubmitBossBattle = async (autoSubmit = false) => {
    if (!assessmentData?.id || !currentUser?.id || bossResult) return;
    setBossLoading(true);
    setBossError('');
    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/assessments/${assessmentData.id}/boss/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          answers: bossAnswers,
          timeTakenSeconds: bossStartedAt ? Math.max(0, Math.floor((Date.now() - bossStartedAt) / 1000)) : Math.max(0, 180 - Number(bossTimer || 0)),
          autoSubmit
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Boss Battle submit failed.');
      setBossResult(data.result);
      if (Array.isArray(data.bossLeaderboard)) setBossLeaderboard(data.bossLeaderboard);
      if (data.bossBattle) {
        setBossBattleData((previous) => ({ ...(previous || {}), ...data.bossBattle, questions: previous?.questions || data.bossBattle.questions || [] }));
        setAssessmentData((previous) => previous ? ({ ...previous, bossBattle: data.bossBattle }) : previous);
      }
      trackUserActivity('boss_battle_submitted', { assessmentId: assessmentData.id, score: data.result?.score });
    } catch (error) {
      setBossError(error.message);
    } finally {
      setBossLoading(false);
    }
  };


  const handleSubmitAssessment = async (autoSubmit = false) => {
    if (!assessmentData?.id || !currentUser?.id || assessmentResult) return;

    setAssessmentLoading(true);
    setAssessmentError('');

    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/assessments/${assessmentData.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          answers: assessmentAnswers,
          timeTakenSeconds: assessmentStartedAt ? Math.max(0, Math.floor((Date.now() - assessmentStartedAt) / 1000)) : 0,
          autoSubmit
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Assessment submission failed.');

      setAssessmentResult(data.result);
      if ((data.assessment?.assessmentMode || assessmentData?.assessmentMode) === 'battle') {
        await saveBattleHistoryFromResult(data.result, data.assessment);
      }

      const computedHistoryMode = data.assessment?.assessmentMode || assessmentData?.assessmentMode || 'solo';
      if (computedHistoryMode !== 'battle') {
        await saveTestHistoryToProfile({
          mode: 'solo',
          title: data.assessment?.title || assessmentData?.title || 'Solo Practice Assessment',
          score: data.result?.score ?? data.result?.marks ?? 0,
          totalMarks: data.result?.totalMarks ?? data.result?.total ?? 20,
          percentage: data.result?.percentage ?? data.result?.accuracy ?? 0,
          accuracy: data.result?.accuracy ?? data.result?.percentage ?? 0,
          timeTakenSeconds: data.result?.timeTakenSeconds ?? Math.max(0, (20 * 60) - Number(assessmentTimer || 0)),
          achievement: data.result?.achievement || '',
          remarks: data.result?.remarks || '',
          review: data.result?.review || [],
          questions: data.assessment?.questions || assessmentData?.questions || []
        });
      }

      if (data.assessment) {
        setAssessmentData((previous) => ({
          ...(previous || {}),
          ...data.assessment,
          players: data.assessment.players || previous?.players || [],
          leaderboard: data.assessment.leaderboard || data.result?.leaderboard || previous?.leaderboard || []
        }));
      }
      if (Array.isArray(data.leaderboard)) {
        setAssessmentLeaderboard(data.leaderboard);
      }
      if (isBattleAssessment(data.assessment || assessmentData)) {
        setTimeout(() => refreshAssessmentRoom(data.assessment?.id || assessmentData.id, true), 600);
      }
      trackUserActivity(isBattleAssessment() ? 'battle_assessment_submitted' : 'assessment_submitted', { assessmentId: assessmentData.id, score: data.result?.score });
    } catch (error) {
      setAssessmentError(error.message);
    } finally {
      setAssessmentLoading(false);
    }
  };

  const getAssessmentModeLabel = (mode) => {
    return (mode === 'battle' || mode === 'challenge') ? 'Battle Room' : 'Solo Practice';
  };

  const normalizeAssessmentCode = (value) => {
    const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!raw) return '';
    if (raw.startsWith('BB-')) return raw;
    if (raw.startsWith('BB')) return `BB-${raw.slice(2)}`;
    return raw.includes('-') ? raw : `BB-${raw}`;
  };

  const copyAssessmentCode = () => {
    const code = assessmentData?.roomCode;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setAssessmentCodeCopied(true);
    setTimeout(() => setAssessmentCodeCopied(false), 2000);
  };

  const copyAssessmentLink = () => {
    const link = getAssessmentShareLink(assessmentData?.id);
    if (!link) return;
    navigator.clipboard.writeText(link);
    setAssessmentLinkCopied(true);
    setTimeout(() => setAssessmentLinkCopied(false), 2000);
  };

  const openAssessmentByCode = async (codeValue = assessmentSearchLink) => {
    return joinBattleRoom(codeValue);
  };

  const openAssessmentFromLinkInput = () => {
    const value = String(assessmentSearchLink || '').trim();
    if (!value) return;
    let id = '';
    let code = '';
    try {
      const parsed = new URL(value);
      id = parsed.searchParams.get('assessment') || '';
      code = parsed.searchParams.get('code') || parsed.searchParams.get('room') || '';
    } catch {
      if (value.includes('assessment=')) id = value.split('assessment=')[1]?.split('&')[0] || '';
      else if (value.toUpperCase().includes('BB')) code = value;
      else id = value;
    }
    if (code) return openAssessmentByCode(code);
    if (id) return loadAssessmentById(id);
  };


  const handleRunAnalysis = async (e) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    setLoading(true);
    setLoadingStep('Extracting transcript timestamps...');
    setErrorMessage('');
    setAnalysisData('');
    
    setChatHistory([{ 
      sender: 'bot', 
      text: `👋 System Core Synced! Ask me any follow-up question regarding your custom metrics inside the text payload compiled in ${selectedLanguage}.` 
    }]);

    try {
      // Step feedback transitions
      setTimeout(() => setLoadingStep('Passing layers to multi-lingual translator node...'), 1200);
      
      // CRA FIX: use the backend URL directly. Do not use Vite config/proxy.
      const finalUrl = inputUrl.trim();
      console.log('[FRONTEND URL SENDING]', finalUrl);

      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-url': finalUrl
        },
        body: JSON.stringify({
          type: 'url',
          url: finalUrl,
          content: finalUrl,
          inputUrl: finalUrl,
          link: finalUrl,
          videoUrl: finalUrl,
          websiteUrl: finalUrl,
          language: selectedLanguage,
          summaryType: summaryType, // Sent as 'brief' or 'bullets'
          userId: currentUser?.id || ''
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Server processing error lookup.');

      const finalSummary = resData.data || 'No operational metrics returned.';
      setAnalysisData(finalSummary);

      if (resData.historyItem) {
        setSummaryHistory((previousHistory) => {
          const filteredHistory = previousHistory.filter((item) => item.id !== resData.historyItem.id);
          return [resData.historyItem, ...filteredHistory].slice(0, 20);
        });
      } else {
        await saveSummaryToHistory(finalSummary, finalUrl, selectedLanguage, summaryType);
      }

      trackUserActivity('summary_generated', { summaryType, language: selectedLanguage, url: finalUrl });
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    const userText = chatMessage.trim();
    setChatMessage('');
    setChatHistory(prev => [...prev, { sender: 'user', text: userText }]);
    setChatLoading(true);

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, contextSummary: analysisData, chatHistory: chatHistory })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to sync message record.');

      setChatHistory(prev => [...prev, { sender: 'bot', text: resData.reply }]);
      trackUserActivity('chat_message');
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'bot', text: `❌ Engine Exception: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!analysisData || questionLoading) return;

    setQuestionLoading(true);
    setGeneratedQuestions('');
    setGeneratedAnswers('');

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextSummary: analysisData.slice(0, 3000),
          language: selectedLanguage,
          summaryType
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to generate questions.');

      setGeneratedQuestions(resData.questions || 'No questions generated.');
      trackUserActivity('questions_generated');
    } catch (err) {
      setGeneratedQuestions(`❌ Question Generator Error: ${err.message}`);
    } finally {
      setQuestionLoading(false);
    }
  };

  const handleGenerateAnswers = async () => {
    if (!analysisData || !generatedQuestions || answerLoading) return;

    setAnswerLoading(true);
    setGeneratedAnswers('');

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/generate-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextSummary: analysisData.slice(0, 3000),
          questions: generatedQuestions.slice(0, 2500),
          language: selectedLanguage
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to generate answers.');

      setGeneratedAnswers(resData.answers || 'No answers generated.');
      trackUserActivity('answers_generated');
    } catch (err) {
      setGeneratedAnswers(`❌ Answer Generator Error: ${err.message}`);
    } finally {
      setAnswerLoading(false);
    }
  };

  const copyQuestionsToClipboard = () => {
    if (!generatedQuestions) return;
    navigator.clipboard.writeText(generatedQuestions);
    setQuestionsCopied(true);
    setTimeout(() => setQuestionsCopied(false), 2000);
  };

  const copyAnswersToClipboard = () => {
    if (!generatedAnswers) return;
    navigator.clipboard.writeText(generatedAnswers);
    setAnswersCopied(true);
    setTimeout(() => setAnswersCopied(false), 2000);
  };

  const copyToClipboard = () => {
    if (!analysisData) return;
    navigator.clipboard.writeText(analysisData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTextSummary = () => {
    if (!analysisData) return;
    const element = document.createElement("a");
    const file = new Blob([analysisData], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `nexus-${summaryType}-${selectedLanguage.toLowerCase()}-summary.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };


  const generatePptImagesForPairs = async (basePlan, options = {}) => {
    if (!basePlan?.slides?.length) return basePlan;

    const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/ppt/images/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pptPlan: basePlan,
        every: 2,
        ...options
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'AI image generation failed.');

    if (Array.isArray(data.errors) && data.errors.length) {
      setPptSaveMessage(`⚠️ PPT ready, but some AI images failed: ${data.errors[0]}`);
    } else {
      setPptSaveMessage(`✅ Generated ${data.generatedCount || 0} AI image set(s). One image is used for every 2 slides.`);
    }

    return data.pptPlan || basePlan;
  };

  const handleGeneratePptImagePair = async (slideIndex = selectedPptSlideIndex) => {
    if (!pptPlan?.slides?.length || pptImageLoading) return;

    const pairStartIndex = Math.floor(Number(slideIndex || 0) / 2) * 2;
    setPptImageLoading(true);
    setPptSaveMessage(`🎨 Generating AI image for slides ${pairStartIndex + 1}-${Math.min(pairStartIndex + 2, pptPlan.slides.length)}...`);

    try {
      const updatedPlan = await generatePptImagesForPairs(pptPlan, {
        startIndex: pairStartIndex,
        count: 2
      });
      setPptPlan(updatedPlan);
    } catch (error) {
      setPptSaveMessage(`❌ ${error.message}`);
    } finally {
      setPptImageLoading(false);
    }
  };

  const handleGeneratePptPlan = async () => {
    if (!analysisData || pptLoading) return;

    setPptLoading(true);
    setPptError('');
    setPptSaveMessage('');
    setPptPlan(null);

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/ppt/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: analysisData,
          title: createHistoryDescription(analysisData, inputUrl),
          language: selectedLanguage,
          userId: currentUser?.id || ''
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate PPT.');

      let finalPptPlan = { fontFamily: 'Aptos', fontStyle: 'modern', ...data.pptPlan };

      setPptSaveMessage('🎨 Generating AI images for every 2 slides...');
      try {
        finalPptPlan = await generatePptImagesForPairs(finalPptPlan, { every: 2 });
      } catch (imageError) {
        setPptSaveMessage(`⚠️ PPT generated, but AI images were skipped: ${imageError.message}`);
      }

      setPptPlan(finalPptPlan);
      setSelectedPptSlideIndex(0);
      setCurrentPage('pptStudio');
      trackUserActivity('ppt_plan_generated');
    } catch (error) {
      setPptError(error.message);
    } finally {
      setPptLoading(false);
    }
  };

  const updatePptPlanField = (field, value) => {
    setPptPlan((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const updatePptSlide = (slideIndex, field, value) => {
    setPptPlan((prev) => {
      const slides = [...(prev?.slides || [])];
      slides[slideIndex] = {
        ...slides[slideIndex],
        [field]: value
      };

      return {
        ...prev,
        slides
      };
    });
  };

  const updatePptSlidePoint = (slideIndex, pointIndex, value) => {
    setPptPlan((prev) => {
      const slides = [...(prev?.slides || [])];
      const points = [...(slides[slideIndex]?.points || [])];

      points[pointIndex] = value;

      slides[slideIndex] = {
        ...slides[slideIndex],
        points
      };

      return {
        ...prev,
        slides
      };
    });
  };

  const addPptSlidePoint = (slideIndex) => {
    setPptPlan((prev) => {
      const slides = [...(prev?.slides || [])];
      const points = [...(slides[slideIndex]?.points || [])];

      if (points.length >= 7) return prev;

      points.push('New point');

      slides[slideIndex] = {
        ...slides[slideIndex],
        points
      };

      return {
        ...prev,
        slides
      };
    });
  };

  const removePptSlidePoint = (slideIndex, pointIndex) => {
    setPptPlan((prev) => {
      const slides = [...(prev?.slides || [])];
      const points = [...(slides[slideIndex]?.points || [])];

      points.splice(pointIndex, 1);

      slides[slideIndex] = {
        ...slides[slideIndex],
        points
      };

      return {
        ...prev,
        slides
      };
    });
  };

  const addPptSlide = () => {
    setPptPlan((prev) => {
      const slides = [...(prev?.slides || [])];

      slides.push({
        id: `slide-${Date.now()}`,
        title: 'New Slide',
        points: ['Add your first point', 'Add your second point'],
        speakerNote: '',
        imagePrompt: 'AI visual for this slide',
        imageUrl: '',
        imageMode: 'ai',
        aiImageData: '',
        imageX: 7.25,
        imageY: 1.65,
        imageW: 4.65,
        imageH: 3.55,
        pointsX: 0.95,
        pointsY: 1.55,
        pointsW: 5.95,
        pointsH: 3.75,
        pointsFontSize: 18,
        table: null
      });

      return {
        ...prev,
        slides
      };
    });
  };

  const removePptSlide = (slideIndex) => {
    setPptPlan((prev) => {
      const slides = [...(prev?.slides || [])];
      slides.splice(slideIndex, 1);

      return {
        ...prev,
        slides
      };
    });
    setSelectedPptSlideIndex((previous) => Math.max(0, Math.min(previous, Math.max(0, (pptPlan?.slides || []).length - 2))));
  };

  const movePptSlide = (fromIndex, toIndex) => {
    const from = Number(fromIndex);
    const to = Number(toIndex);

    if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return;

    setPptPlan((prev) => {
      const slides = [...(prev?.slides || [])];

      if (from < 0 || to < 0 || from >= slides.length || to >= slides.length) return prev;

      const [movedSlide] = slides.splice(from, 1);
      slides.splice(to, 0, movedSlide);

      return {
        ...prev,
        slides
      };
    });

    setSelectedPptSlideIndex(to);
  };


  const handlePptManualImageUpload = (slideIndex, event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      updatePptSlide(slideIndex, 'imageUrl', reader.result);
      updatePptSlide(slideIndex, 'imageMode', 'manual');
    };
    reader.readAsDataURL(file);
  };

  const removePptSlideImage = (slideIndex) => {
    updatePptSlide(slideIndex, 'imageMode', 'none');
    updatePptSlide(slideIndex, 'imageUrl', '');
  };

  const restorePptAiImage = (slideIndex) => {
    updatePptSlide(slideIndex, 'imageMode', 'ai');
  };

  const addPptSlideTable = (slideIndex, rowsCount = pptTableRows, colsCount = pptTableCols) => {
    const rows = Math.max(1, Math.min(10, Number(rowsCount) || 4));
    const cols = Math.max(1, Math.min(10, Number(colsCount) || 4));
    const headers = Array.from({ length: cols }, (_, index) => `Column ${index + 1}`);
    const bodyRows = Array.from({ length: Math.max(1, rows - 1) }, (_, rowIndex) =>
      Array.from({ length: cols }, (_, colIndex) => `Cell ${rowIndex + 1}-${colIndex + 1}`)
    );

    const tableW = Math.min(11.55, Math.max(4.8, cols * 1.08));
    const tableH = Math.min(4.15, Math.max(1.35, rows * 0.28));

    setPptPlan((prev) => {
      const slides = [...(prev?.slides || [])];
      slides[slideIndex] = {
        ...slides[slideIndex],
        table: {
          headers,
          rows: bodyRows,
          tableX: 0.9,
          tableY: 4.55,
          tableW,
          tableH
        }
      };
      return { ...prev, slides };
    });
  };

  const removePptSlideTable = (slideIndex) => {
    setPptPlan((prev) => {
      const slides = [...(prev?.slides || [])];
      slides[slideIndex] = {
        ...slides[slideIndex],
        table: null
      };
      return { ...prev, slides };
    });
  };

  const updatePptSlideTableCell = (slideIndex, rowIndex, cellIndex, value, isHeader = false) => {
    setPptPlan((prev) => {
      const slides = [...(prev?.slides || [])];
      const currentTable = slides[slideIndex]?.table || { headers: ['Column 1', 'Column 2'], rows: [['', '']] };
      const table = {
        ...currentTable,
        headers: [...(currentTable.headers || [])],
        rows: (currentTable.rows || []).map((row) => [...row])
      };

      if (isHeader) {
        table.headers[cellIndex] = value;
      } else {
        if (!table.rows[rowIndex]) table.rows[rowIndex] = [];
        table.rows[rowIndex][cellIndex] = value;
      }

      slides[slideIndex] = { ...slides[slideIndex], table };
      return { ...prev, slides };
    });
  };

  const updatePptSlideTableLayout = (slideIndex, field, value) => {
    setPptPlan((prev) => {
      const slides = [...(prev?.slides || [])];
      const table = { ...(slides[slideIndex]?.table || {}) };
      table[field] = value;
      slides[slideIndex] = { ...slides[slideIndex], table };
      return { ...prev, slides };
    });
  };

  const slideInchesToPercent = (value, total) => `${(Number(value || 0) / total) * 100}%`;

  const getPptFontStyleMeta = (style = 'modern') => {
    const map = {
      modern: { titleWeight: 950, bodyWeight: 700, bodySize: 'clamp(0.84rem, 1.08vw, 0.98rem)', letterSpacing: '0em' },
      bold: { titleWeight: 950, bodyWeight: 900, bodySize: 'clamp(0.9rem, 1.15vw, 1.04rem)', letterSpacing: '0em' },
      classic: { titleWeight: 800, bodyWeight: 650, bodySize: 'clamp(0.84rem, 1.04vw, 0.96rem)', letterSpacing: '0.01em' },
      minimal: { titleWeight: 800, bodyWeight: 600, bodySize: 'clamp(0.8rem, 1vw, 0.94rem)', letterSpacing: '0.01em' }
    };
    return map[style] || map.modern;
  };


  const handlePptElementMouseDown = (event, type, action, slideIndex) => {
    event.preventDefault();
    event.stopPropagation();
    const canvas = event.currentTarget.closest('[data-ppt-canvas="true"]');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const slide = pptPlan?.slides?.[slideIndex] || {};
    const table = slide.table || {};
    setPptDragState({
      type,
      action,
      slideIndex,
      startX: event.clientX,
      startY: event.clientY,
      rect,
      imageX: Number(slide.imageX ?? 7.25),
      imageY: Number(slide.imageY ?? 1.65),
      imageW: Number(slide.imageW ?? 4.65),
      imageH: Number(slide.imageH ?? 3.55),
      pointsX: Number(slide.pointsX ?? 0.95),
      pointsY: Number(slide.pointsY ?? 1.55),
      pointsW: Number(slide.pointsW ?? ((slide.imageMode !== 'none' && (slide.aiImageData || slide.imageUrl)) ? 5.95 : 11.0)),
      pointsH: Number(slide.pointsH ?? ((slide.imageMode !== 'none' && (slide.aiImageData || slide.imageUrl)) ? 3.75 : 4.75)),
      tableX: Number(table.tableX ?? 0.9),
      tableY: Number(table.tableY ?? 4.65),
      tableW: Number(table.tableW ?? 6.15),
      tableH: Number(table.tableH ?? 1.65)
    });
  };


  useEffect(() => {
    if (!pptDragState) return;

    const handleMove = (event) => {
      const dx = ((event.clientX - pptDragState.startX) / pptDragState.rect.width) * 13.33;
      const dy = ((event.clientY - pptDragState.startY) / pptDragState.rect.height) * 7.5;

      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

      if (pptDragState.type === 'image') {
        if (pptDragState.action === 'move') {
          updatePptSlide(pptDragState.slideIndex, 'imageX', clamp(pptDragState.imageX + dx, 0, 12.2));
          updatePptSlide(pptDragState.slideIndex, 'imageY', clamp(pptDragState.imageY + dy, 0.25, 6.85));
        } else {
          updatePptSlide(pptDragState.slideIndex, 'imageW', clamp(pptDragState.imageW + dx, 1.35, 9.2));
          updatePptSlide(pptDragState.slideIndex, 'imageH', clamp(pptDragState.imageH + dy, 1.0, 6.2));
        }
      }

      if (pptDragState.type === 'points') {
        if (pptDragState.action === 'move') {
          updatePptSlide(pptDragState.slideIndex, 'pointsX', clamp(pptDragState.pointsX + dx, 0.3, 11.5));
          updatePptSlide(pptDragState.slideIndex, 'pointsY', clamp(pptDragState.pointsY + dy, 1.1, 6.65));
        } else {
          updatePptSlide(pptDragState.slideIndex, 'pointsW', clamp(pptDragState.pointsW + dx, 2.8, 11.9));
          updatePptSlide(pptDragState.slideIndex, 'pointsH', clamp(pptDragState.pointsH + dy, 1.35, 5.35));
        }
      }

      if (pptDragState.type === 'table') {
        if (pptDragState.action === 'move') {
          updatePptSlideTableLayout(pptDragState.slideIndex, 'tableX', clamp(pptDragState.tableX + dx, 0.25, 12.0));
          updatePptSlideTableLayout(pptDragState.slideIndex, 'tableY', clamp(pptDragState.tableY + dy, 1.25, 6.85));
        } else {
          updatePptSlideTableLayout(pptDragState.slideIndex, 'tableW', clamp(pptDragState.tableW + dx, 2.2, 12.15));
          updatePptSlideTableLayout(pptDragState.slideIndex, 'tableH', clamp(pptDragState.tableH + dy, 1.0, 4.85));
        }
      }
    };

    const handleUp = () => setPptDragState(null);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [pptDragState, pptPlan]);

  const getPptPreviewTheme = () => {
    const selected = pptTemplateOptions.find((template) => template.id === pptTemplate) || pptTemplateOptions[0];
    const previewThemes = {
      floral: {
        bg: 'linear-gradient(135deg, #FFF7FB, #FFFFFF)',
        panel: 'rgba(255,255,255,0.86)',
        title: '#831843',
        text: '#3F2636',
        accent: '#F472B6',
        accent2: '#34D399',
        decor: '🌸'
      },
      art: {
        bg: 'linear-gradient(135deg, #FFF7ED, #FFFBEB)',
        panel: 'rgba(255,251,235,0.90)',
        title: '#7C2D12',
        text: '#3F2A1D',
        accent: '#F59E0B',
        accent2: '#A855F7',
        decor: '🎨'
      },
      corporate: {
        bg: 'linear-gradient(135deg, #F8FAFC, #FFFFFF)',
        panel: 'rgba(255,255,255,0.92)',
        title: '#0F172A',
        text: '#334155',
        accent: '#2563EB',
        accent2: '#38BDF8',
        decor: '💼'
      },
      chalkboard: {
        bg: 'linear-gradient(135deg, #09221A, #103529)',
        panel: 'rgba(15,53,41,0.92)',
        title: '#ECFDF5',
        text: '#D1FAE5',
        accent: '#34D399',
        accent2: '#FDE68A',
        decor: '📚'
      },
      futuristic: {
        bg: 'linear-gradient(135deg, #0F1626, #111827)',
        panel: 'rgba(19,28,46,0.92)',
        title: '#FFFFFF',
        text: '#D1D5DB',
        accent: '#00F2FE',
        accent2: '#A855F7',
        decor: '🚀'
      }
    };

    return { ...selected, ...(previewThemes[pptTemplate] || previewThemes.floral) };
  };

  const getSelectedPptSlide = () => {
    const slides = pptPlan?.slides || [];
    return slides[Math.max(0, Math.min(selectedPptSlideIndex, slides.length - 1))] || slides[0] || null;
  };

  const downloadPptBlob = async (response, fallbackTitle = 'briefbot-presentation') => {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${(fallbackTitle || 'briefbot-presentation').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pptx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  };

  const exportOrSavePptToDevice = async (actionType = 'exported') => {
    if (!pptPlan || pptExportLoading) return;

    setPptExportLoading(true);
    setPptError('');
    if (actionType === 'saved') setPptSaveMessage('');

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/ppt/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pptPlan,
          template: pptTemplate,
          userId: currentUser?.id || '',
          saveRecord: true,
          actionType
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let errorMessage = 'Failed to generate PPT file.';

        if (contentType.includes('application/json')) {
          const data = await response.json().catch(() => null);
          errorMessage = data?.error || errorMessage;
        } else {
          const rawText = await response.text().catch(() => '');
          if (response.status === 413) {
            errorMessage = 'PPT is too large because of AI images. Backend limit was increased; restart backend and try again.';
          } else if (rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
            errorMessage = `Server returned an HTML error page instead of JSON. Status: ${response.status}. Restart backend and check the backend terminal error.`;
          } else if (rawText.trim()) {
            errorMessage = rawText.slice(0, 280);
          }
        }

        throw new Error(errorMessage);
      }

      const exportContentType = response.headers.get('content-type') || '';
      if (exportContentType.includes('application/json') || exportContentType.includes('text/html')) {
        const rawText = await response.text().catch(() => '');
        throw new Error(rawText.includes('<!DOCTYPE') || rawText.includes('<html')
          ? 'Export route returned HTML instead of PPT. Make sure backend is running on port 5000 and restart node index.js.'
          : rawText.slice(0, 280) || 'Export route did not return a PPT file.');
      }

      await downloadPptBlob(response, pptPlan.title || 'briefbot-presentation');

      if (actionType === 'saved') {
        setPptSaveMessage('✅ PPT saved to your device Downloads folder and added to Recent PPTs.');
        setTimeout(() => setPptSaveMessage(''), 4500);
      }

      await loadRecentPpts(currentUser);
      trackUserActivity(actionType === 'saved' ? 'ppt_saved' : 'ppt_exported');
    } catch (error) {
      setPptError(error.message);
    } finally {
      setPptExportLoading(false);
    }
  };

  const handleSavePpt = () => exportOrSavePptToDevice('saved');

  const handleExportPpt = () => exportOrSavePptToDevice('exported');

  const youtubeEmbedUrl = getYouTubeEmbedUrl(inputUrl, videoStartSeconds);
  const filteredAdminUsers = (adminStats?.users || []).filter((user) => {
    if (String(user.role || '').toLowerCase() === 'admin') return false;
    const query = adminSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      String(user.name || '').toLowerCase().includes(query) ||
      String(user.email || '').toLowerCase().includes(query) ||
      String(user.role || '').toLowerCase().includes(query)
    );
  });

  const selectedAdminUser = (adminStats?.users || []).find((user) => user.id === selectedAdminUserId && String(user.role || '').toLowerCase() !== 'admin');

  const getProgressBadge = (percentage = 0) => {
    const score = Number(percentage || 0);
    if (score >= 85) return { label: 'Excellent', color: '#34D399' };
    if (score >= 70) return { label: 'Good', color: '#00F2FE' };
    if (score >= 50) return { label: 'Average', color: '#FBBF24' };
    return { label: 'Needs Improvement', color: '#F87171' };
  };

  const filteredHistory = summaryHistory.filter((item) => {
    const query = historySearch.trim().toLowerCase();
    if (!query) return true;
    return (
      String(item.title || '').toLowerCase().includes(query) ||
      String(item.description || '').toLowerCase().includes(query) ||
      String(item.url || '').toLowerCase().includes(query)
    );
  });

  const userInitial = (currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase();
  const profilePhoto = profileForm.photoURL || currentUser?.photoURL || '';

  const isAdminLogin = authMode === 'admin';
  const isRegister = authMode === 'register';
  const isUserLogin = authMode === 'login';
  const isSuccessMessage = authError.startsWith('✅');
  const authAccentColor = isAdminLogin ? '#A855F7' : '#00F2FE';
  const authSecondaryAccent = isAdminLogin ? '#F472B6' : '#4FACFE';
  const authPageTitle = isRegister
    ? 'User Sign Up'
    : isAdminLogin
      ? 'Admin Login'
      : 'User Sign In';
  const showPasswordCaution = isRegister && authForm.password && !isPasswordStrong(authForm.password);

  const resetAuthAndOpen = (mode, message = '') => {
    setAuthMode(mode);
    setAuthError(message);
    setAuthForm({ name: '', email: '', password: '' });
    setShowAuthPassword(false);
    setCurrentPage('auth');
  };

  const requireUserAccess = (targetPage, message = '⚠️ Please sign up or login to continue.') => {
    if (!currentUser) {
      resetAuthAndOpen('login', message);
      return;
    }
    setCurrentPage(targetPage);
  };


  if (false && !currentUser) {
    const isChoicePage = authMode === 'choice';
    const isAdminLogin = authMode === 'admin';
    const isRegister = authMode === 'register';
    const isUserLogin = authMode === 'login';
    const isSuccessMessage = authError.startsWith('✅');
    const accentColor = isAdminLogin ? '#A855F7' : '#00F2FE';
    const secondaryAccent = isAdminLogin ? '#F472B6' : '#4FACFE';

    const pageTitle = isRegister
      ? 'User Sign Up'
      : isAdminLogin
        ? 'Admin Login'
        : 'User Sign In';

    const showPasswordCaution = isRegister && authForm.password && !isPasswordStrong(authForm.password);
    const resetAuthAndOpen = (mode) => {
      setAuthMode(mode);
      setAuthError('');
      setAuthForm({ name: '', email: '', password: '' });
      setShowAuthPassword(false);
    };

    const inputStyle = {
      width: '100%',
      boxSizing: 'border-box',
      padding: '1rem 1rem 1rem 2.9rem',
      borderRadius: '14px',
      border: '1px solid rgba(45, 55, 72, 0.95)',
      backgroundColor: 'rgba(21, 29, 48, 0.92)',
      color: '#FFFFFF',
      outline: 'none',
      fontSize: '0.98rem',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
    };

    const iconStyle = {
      position: 'absolute',
      left: '1rem',
      top: '50%',
      transform: 'translateY(-50%)',
      color: accentColor,
      fontSize: '1rem',
      pointerEvents: 'none'
    };

    return (
      <div className="auth-shell">
        <div className="starfield" aria-hidden="true">
          {[...Array(140)].map((_, i) => {
            const size = i % 10 === 0 ? 'medium' : i % 3 === 0 ? 'small' : 'tiny';
            const twinkle = i % 5 === 0 ? 'twinkle' : i % 7 === 0 ? 'twinkle-slow' : i % 11 === 0 ? 'twinkle-fast' : '';
            return (
              <div
                key={i}
                className={`star star-${size} ${twinkle ? `star-${twinkle}` : ''}`}
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.75 + 0.25,
                  animationDelay: `${Math.random() * 3}s`,
                }}
              />
            );
          })}
        </div>

        <style>{`
          .auth-shell {
            min-height: 100vh;
            background: radial-gradient(circle at top left, rgba(0, 242, 254, 0.14), transparent 32%),
                        radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.12), transparent 34%),
                        #070A13;
            color: #F3F4F6;
            font-family: "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            position: relative;
            overflow: hidden;
          }
          .auth-card {
            width: 100%;
            max-width: 520px;
            background: linear-gradient(145deg, rgba(15, 22, 38, 0.92), rgba(7, 10, 19, 0.92));
            border: 1px solid rgba(0, 242, 254, 0.18);
            backdrop-filter: blur(20px);
            box-shadow: 0 28px 90px rgba(0, 0, 0, 0.58), inset 0 1px 0 rgba(255,255,255,0.06);
            border-radius: 30px;
            padding: 2.25rem;
            position: relative;
            z-index: 1;
            overflow: hidden;
          }
          .auth-landing-card {
            max-width: 1060px;
            min-height: 560px;
            padding: 0;
            display: grid;
            grid-template-columns: 1.08fr 0.92fr;
            gap: 0;
          }
          .auth-landing-left {
            position: relative;
            padding: 3.2rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
            border-right: 1px solid rgba(255,255,255,0.08);
            background: radial-gradient(circle at 35% 30%, rgba(0,242,254,0.20), transparent 36%),
                        radial-gradient(circle at 70% 70%, rgba(79,172,254,0.12), transparent 42%);
          }
          .auth-landing-right {
            position: relative;
            padding: 3rem 2.4rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
            z-index: 2;
          }
          .briefbot-visual {
            position: relative;
            width: min(100%, 390px);
            height: 300px;
            margin: 2.2rem auto 0 auto;
            perspective: 900px;
          }
          .visual-orb {
            position: absolute;
            inset: 25px 35px 30px 35px;
            border-radius: 36px;
            background: linear-gradient(145deg, rgba(0,242,254,0.18), rgba(79,172,254,0.04));
            border: 1px solid rgba(0,242,254,0.32);
            box-shadow: 0 30px 80px rgba(0,242,254,0.16), inset 0 1px 0 rgba(255,255,255,0.12);
            transform: rotateY(-14deg) rotateX(8deg);
            animation: floatPanel 4s ease-in-out infinite;
          }
          .visual-bot-face {
            position: absolute;
            top: 72px;
            left: 50%;
            transform: translateX(-50%);
            width: 170px;
            height: 116px;
            border-radius: 34px;
            background: linear-gradient(145deg, #111827, #0B1120);
            border: 1px solid rgba(0,242,254,0.42);
            box-shadow: 0 0 35px rgba(0,242,254,0.20);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 28px;
          }
          .visual-eye {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #00F2FE;
            box-shadow: 0 0 18px rgba(0,242,254,0.8);
          }
          .visual-line {
            position: absolute;
            height: 8px;
            border-radius: 999px;
            background: linear-gradient(90deg, #00F2FE, rgba(79,172,254,0.2));
            left: 58px;
            right: 58px;
            opacity: 0.8;
          }
          .visual-line.one { bottom: 82px; }
          .visual-line.two { bottom: 58px; width: 55%; right: auto; }
          .floating-chip {
            position: absolute;
            padding: 0.55rem 0.85rem;
            border-radius: 999px;
            background: rgba(15,22,38,0.82);
            border: 1px solid rgba(255,255,255,0.10);
            color: #D1D5DB;
            font-size: 0.8rem;
            font-weight: 800;
            box-shadow: 0 18px 40px rgba(0,0,0,0.28);
          }
          .chip-a { top: 16px; right: 20px; animation: floatChip 3.4s ease-in-out infinite; }
          .chip-b { left: 10px; bottom: 22px; animation: floatChip 3.8s ease-in-out infinite reverse; }
          .chip-c { right: 0; bottom: 38px; animation: floatChip 4.2s ease-in-out infinite; }
          @keyframes floatPanel {
            0%, 100% { transform: rotateY(-14deg) rotateX(8deg) translateY(0); }
            50% { transform: rotateY(-8deg) rotateX(5deg) translateY(-12px); }
          }
          @keyframes floatChip {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .auth-card::before {
            content: '';
            position: absolute;
            width: 190px;
            height: 190px;
            border-radius: 999px;
            background: radial-gradient(circle, rgba(0,242,254,0.16), transparent 65%);
            top: -90px;
            right: -80px;
            pointer-events: none;
          }
          .auth-card::after {
            content: '';
            position: absolute;
            width: 160px;
            height: 160px;
            border-radius: 999px;
            background: radial-gradient(circle, rgba(79,172,254,0.12), transparent 65%);
            bottom: -75px;
            left: -70px;
            pointer-events: none;
          }
          .auth-brand-title {
            position: relative;
            z-index: 1;
            text-shadow: 0 0 28px rgba(0,242,254,0.25);
          }
          .auth-subline {
            text-align: center;
            color: #9CA3AF;
            font-size: 0.92rem;
            margin-top: 0.45rem;
            letter-spacing: 0.4px;
          }
          .auth-choice-grid {
            position: relative;
            z-index: 1;
            margin-top: 2rem;
            display: grid;
            gap: 1rem;
          }
          .auth-option-btn, .auth-main-btn, .auth-back-btn {
            transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, filter 0.22s ease;
          }
          .auth-option-btn {
            transform-style: preserve-3d;
            position: relative;
          }
          .auth-option-btn::after {
            content: '';
            position: absolute;
            left: 12px;
            right: 12px;
            bottom: -10px;
            height: 14px;
            border-radius: 0 0 16px 16px;
            background: rgba(0,0,0,0.28);
            filter: blur(8px);
            z-index: -1;
          }
          .auth-option-btn:hover, .auth-main-btn:hover, .auth-back-btn:hover {
            transform: translateY(-5px) rotateX(4deg);
            filter: brightness(1.08);
          }
          .auth-option-btn:active {
            transform: translateY(1px) scale(0.99);
          }
          .auth-option-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
          }
          .auth-option-left {
            display: flex;
            align-items: center;
            gap: 0.85rem;
            text-align: left;
          }
          .auth-option-icon {
            width: 36px;
            height: 36px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.08);
            font-size: 0.95rem;
          }
          .google-icon {
            background: rgba(255,255,255,0.10);
            color: #FFFFFF;
            font-weight: 950;
            font-family: Arial, sans-serif;
          }
          .auth-input-wrap:focus-within input {
            border-color: ${accentColor} !important;
            box-shadow: 0 0 0 3px ${isAdminLogin ? 'rgba(168,85,247,0.12)' : 'rgba(0,242,254,0.12)'};
          }
          .starfield {
            position: absolute;
            inset: 0;
            overflow: hidden;
            pointer-events: none;
            z-index: 0;
          }
          .star {
            position: absolute;
            border-radius: 999px;
            background: #ffffff;
            box-shadow: 0 0 10px rgba(0, 242, 254, 0.75);
          }
          .star-tiny { width: 1px; height: 1px; }
          .star-small { width: 2px; height: 2px; }
          .star-medium { width: 3px; height: 3px; }
          .star-twinkle { animation: authTwinkle 2.8s infinite ease-in-out; }
          .star-twinkle-slow { animation: authTwinkle 4s infinite ease-in-out; }
          .star-twinkle-fast { animation: authTwinkle 1.8s infinite ease-in-out; }
          @keyframes authTwinkle {
            0%, 100% { opacity: 0.25; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.6); }
          }
          @media (max-width: 900px) {
            .auth-landing-card { grid-template-columns: 1fr; min-height: auto; }
            .auth-landing-left { padding: 2rem 1.4rem 1rem 1.4rem; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); }
            .auth-landing-right { padding: 1.4rem; }
            .briefbot-visual { height: 220px; margin-top: 1rem; transform: scale(0.86); }
          }
          @media (max-width: 600px) {
            .auth-shell { padding: 1rem; }
            .auth-card { padding: 1.4rem; border-radius: 22px; }
            .auth-landing-card { padding: 0; }
            .auth-brand-title { font-size: 2.45rem !important; }
          }
        `}
</style>

        <section className={`auth-card ${isChoicePage ? 'auth-landing-card' : ''}`}>
          {isChoicePage ? (
            <>
              <div className="auth-landing-left">
                <h1 className="auth-brand-title" style={{
                  margin: 0,
                  fontSize: '4.2rem',
                  fontWeight: '950',
                  letterSpacing: '1px',
                  background: 'linear-gradient(135deg, #FFFFFF 12%, #00F2FE 55%, #4FACFE 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Brief Bot
                </h1>
                <p style={{ color: '#9CA3AF', fontSize: '1.05rem', lineHeight: '1.7', maxWidth: '430px', margin: '0.85rem 0 0 0' }}>
                  AI summarizes      You Understand
                </p>

                <div className="briefbot-visual" aria-hidden="true">
                  <div className="visual-orb" />
                  <div className="visual-bot-face">
                    <span className="visual-eye" />
                    <span className="visual-eye" />
                  </div>
                 
                  
                </div>
              </div>

              <div className="auth-landing-right">
                <div style={{ marginBottom: '1.6rem' }}>
                  <h2 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.65rem', fontWeight: '950' }}>Continue as</h2>
                  <p style={{ margin: '0.45rem 0 0 0', color: '#9CA3AF', fontSize: '0.92rem' }}>Select your access type to enter Briefbot.</p>
                </div>

                <div className="auth-choice-grid">
                  <button
                    type="button"
                    className="auth-option-btn auth-choice-primary simple-btn-glow"
                    onClick={() => resetAuthAndOpen('register')}
                    style={{
                      width: '100%',
                      border: '1px solid rgba(0,242,254,0.35)',
                      background: 'linear-gradient(145deg, rgba(0,242,254,0.18), rgba(79,172,254,0.07))',
                      color: '#FFFFFF',
                      padding: '0.9rem 1rem',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      fontWeight: '850',
                      fontSize: '0.96rem',
                      boxShadow: '0 10px 0 rgba(0,110,130,0.14), 0 18px 34px rgba(0,242,254,0.10)'
                    }}
                  >
                    <span className="auth-option-content">
                      <span className="auth-option-left"><span className="auth-option-icon">📝</span><span>User Sign Up</span></span>
                      <span>→</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="auth-option-btn simple-btn-glow"
                    onClick={() => resetAuthAndOpen('login')}
                    style={{
                      width: '100%',
                      border: '1px solid rgba(0,242,254,0.26)',
                      background: 'linear-gradient(145deg, rgba(21,29,48,0.82), rgba(15,22,38,0.70))',
                      color: '#00F2FE',
                      padding: '0.9rem 1rem',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      fontWeight: '850',
                      fontSize: '0.96rem',
                      boxShadow: '0 10px 0 rgba(0,0,0,0.18), 0 18px 32px rgba(0,0,0,0.26)'
                    }}
                  >
                    <span className="auth-option-content">
                      <span className="auth-option-left"><span className="auth-option-icon">👤</span><span>User Sign In</span></span>
                      <span>→</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="auth-option-btn simple-btn-glow"
                    onClick={() => resetAuthAndOpen('admin')}
                    style={{
                      width: '100%',
                      border: '1px solid rgba(168,85,247,0.38)',
                      background: 'linear-gradient(145deg, rgba(168,85,247,0.14), rgba(244,114,182,0.05))',
                      color: '#C084FC',
                      padding: '0.9rem 1rem',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      fontWeight: '850',
                      fontSize: '0.96rem',
                      boxShadow: '0 10px 0 rgba(80,40,130,0.13), 0 18px 32px rgba(168,85,247,0.10)'
                    }}
                  >
                    <span className="auth-option-content">
                      <span className="auth-option-left"><span className="auth-option-icon">🛡️</span><span>Admin Login</span></span>
                      <span>→</span>
                    </span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.45rem 0 0.15rem 0' }}>
                    <span style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.10)' }} />
                    <span style={{ color: '#6B7280', fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.8px' }}>OR</span>
                    <span style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.10)' }} />
                  </div>

                  <button
                    type="button"
                    className="auth-option-btn google-soft-btn simple-btn-glow"
                    onClick={() => handleGoogleSignIn('user')}
                    disabled={authLoading}
                    style={{
                      width: '100%',
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#FFFFFF',
                      padding: '0.82rem 1rem',
                      borderRadius: '16px',
                      cursor: authLoading ? 'not-allowed' : 'pointer',
                      fontWeight: '800',
                      fontSize: '0.94rem',
                      boxShadow: '0 8px 0 rgba(0,0,0,0.16), 0 15px 28px rgba(0,0,0,0.22)',
                      opacity: authLoading ? 0.7 : 1
                    }}
                  >
                    <span className="auth-option-content">
                      <span className="auth-option-left"><span className="auth-option-icon google-icon">G</span><span>Continue with Google</span></span>
                      <span>→</span>
                    </span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h1 className="auth-brand-title" style={{
                margin: 0,
                textAlign: 'center',
                fontSize: '3rem',
                fontWeight: '950',
                letterSpacing: '1px',
                background: 'linear-gradient(135deg, #FFFFFF 15%, #00F2FE 55%, #4FACFE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Brief Bot
              </h1>
              <div style={{ textAlign: 'center', margin: '1.3rem 0 1.5rem 0' }}>
                <h2 style={{ margin: 0, fontSize: '1.55rem', color: '#FFFFFF', fontWeight: '900' }}>
                  {pageTitle}
                </h2>
              </div>

              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(isRegister || isUserLogin) && (
                  <div className="auth-input-wrap" style={{ position: 'relative' }}>
                    <span style={iconStyle}>👤</span>
                    <input
                      value={authForm.name}
                      onChange={(e) => handleAuthInputChange('name', e.target.value)}
                      placeholder="Name"
                      required
                      style={inputStyle}
                    />
                  </div>
                )}

                <div className="auth-input-wrap" style={{ position: 'relative' }}>
                  <span style={iconStyle}>✉️</span>
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(e) => handleAuthInputChange('email', e.target.value)}
                    placeholder={isAdminLogin ? 'Admin email' : 'Email'}
                    required
                    style={inputStyle}
                  />
                </div>

                <div className="auth-input-wrap" style={{ position: 'relative' }}>
                  <span style={iconStyle}>🔒</span>
                  <input
                    type={showAuthPassword ? 'text' : 'password'}
                    value={authForm.password}
                    onChange={(e) => handleAuthInputChange('password', e.target.value)}
                    placeholder="Password"
                    required
                    minLength={isRegister ? 8 : 4}
                    style={{ ...inputStyle, paddingRight: '3.2rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword((prev) => !prev)}
                    aria-label={showAuthPassword ? 'Hide password' : 'Show password'}
                    title={showAuthPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '0.8rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(156,163,175,0.18)',
                      borderRadius: '9px',
                      color: '#D1D5DB',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: '0.28rem 0.42rem'
                    }}
                   className="simple-btn-glow">
                    {showAuthPassword ? '🙈' : '👁️'}
                  </button>
                </div>

                {showPasswordCaution && (
                  <div style={{
                    color: '#FBBF24',
                    backgroundColor: 'rgba(251, 191, 36, 0.08)',
                    border: '1px solid rgba(251, 191, 36, 0.28)',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '12px',
                    fontSize: '0.86rem',
                    lineHeight: '1.5'
                  }}>
                    ⚠️ Password: 8+ chars, A-Z, 0-9 & special symbol.
                  </div>
                )}

                {authError && (
                  <div style={{
                    color: isSuccessMessage ? '#34D399' : '#F87171',
                    backgroundColor: isSuccessMessage ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
                    border: `1px solid ${isSuccessMessage ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.35)'}`,
                    padding: '0.85rem',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    lineHeight: '1.5'
                  }}>
                    {authError}
                  </div>
                )}

                <button
                  className="auth-main-btn simple-btn-glow"
                  type="submit"
                  disabled={authLoading || (isRegister && !isPasswordStrong(authForm.password))}
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}, ${secondaryAccent})`,
                    color: isAdminLogin ? '#FFFFFF' : '#070A13',
                    border: 'none',
                    padding: '1rem',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    fontWeight: '950',
                    opacity: (authLoading || (isRegister && !isPasswordStrong(authForm.password))) ? 0.65 : 1,
                    boxShadow: `0 14px 30px ${isAdminLogin ? 'rgba(168,85,247,0.22)' : 'rgba(0,242,254,0.2)'}`
                  }}
                >
                  {authLoading ? 'Please wait...' : isAdminLogin ? 'Admin Login' : isRegister ? 'Create Account' : 'User Sign In'}
                </button>

                {!isAdminLogin && (
                  <button
                    type="button"
                    onClick={() => handleGoogleSignIn('user')}
                    disabled={authLoading}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.16)',
                      color: '#FFFFFF',
                      borderRadius: '14px',
                      padding: '0.9rem',
                      cursor: authLoading ? 'not-allowed' : 'pointer',
                      fontWeight: '900'
                    }}
                   className="simple-btn-glow">
                    G Continue with Google
                  </button>
                )}

              </form>

              <button
                type="button"
                className="auth-back-btn simple-btn-glow"
                onClick={() => resetAuthAndOpen('choice')}
                style={{
                  width: '100%',
                  marginTop: '1rem',
                  background: 'transparent',
                  border: '1px solid #374151',
                  color: '#9CA3AF',
                  borderRadius: '12px',
                  padding: '0.78rem',
                  cursor: 'pointer',
                  fontWeight: '800'
                }}
              >
                ← Back
              </button>
            </>
          )}
        </section>
      </div>
    );
  }



  const handleCompareVideos = async () => {
    if (!currentUser?.id) {
      resetAuthAndOpen('login', '⚠️ Please login or sign up to compare videos.');
      return;
    }

    if (!compareVideo1.trim() || !compareVideo2.trim()) {
      setCompareError('Please paste both video links.');
      return;
    }

    if (compareVideo1.trim() === compareVideo2.trim()) {
      setCompareError('Please paste two different video links.');
      return;
    }

    setCompareLoading(true);
    setCompareError('');
    setCompareResult(null);

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/compare-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl1: compareVideo1.trim(),
          videoUrl2: compareVideo2.trim(),
          language: selectedLanguage,
          userId: currentUser.id
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Smart Compare failed.');

      setCompareResult(data.result);
    } catch (error) {
      setCompareError(error.message);
    } finally {
      setCompareLoading(false);
    }
  };

  const getCompareScoreColor = (score = 0) => {
    if (score >= 80) return '#34D399';
    if (score >= 60) return '#FBBF24';
    return '#F87171';
  };


  const homeFeatureCards = [
    {
      icon: '⚡',
      title: 'Smart Summary',
      accent: '#00F2FE',
      glow: 'rgba(0,242,254,0.18)',
      tag: 'Core AI',
      points: ['Short videos = more detail', 'Long videos = smart compression'],
      description: 'Generate clean and student-friendly summaries from YouTube videos or web content with strong coverage from start to finish.'
    },
    {
      icon: '🎞',
      title: 'PPT Studio',
      accent: '#A855F7',
      glow: 'rgba(168,85,247,0.18)',
      tag: 'New Feature',
      points: ['Editable slides', '5 stylish templates'],
      description: 'Convert a summary into richer slide content, edit points inside Brief Bot, export the PPT, and export it to PowerPoint.'
    },
    {
      icon: '🧠',
      title: 'Context Chat',
      accent: '#4FACFE',
      glow: 'rgba(79,172,254,0.18)',
      tag: 'Ask Anything',
      points: ['Summary-aware', 'Instant follow-up Q&A'],
      description: 'Chat with the generated summary directly, ask doubts, and get fast contextual answers without re-entering the full content.'
    },
    {
      icon: '🔍',
      title: 'Smart Compare',
      accent: '#38BDF8',
      glow: 'rgba(56,189,248,0.18)',
      tag: 'Video Lens',
      points: ['Similarity score', 'Best video recommendation'],
      description: 'Compare two similar YouTube videos, find which one is easier, more detailed, better communicated, and generate combined notes.'
    },
    {
      icon: '⚔️',
      title: 'Battle Room',
      accent: '#EF4444',
      glow: 'rgba(239,68,68,0.18)',
      tag: 'Group Challenge',
      points: ['Room code', '20-minute test', 'Leaderboard'],
      description: 'Create or join a Battle Room and let multiple users attempt the same assessment together with timer, rankings, achievements, and accuracy results.'
    },
    {
      icon: '📝',
      title: 'Assessment Arena',
      accent: '#F59E0B',
      glow: 'rgba(245,158,11,0.18)',
      tag: 'Practice',
      points: ['MCQ', 'Fill in the blank', 'Descriptive'],
      description: 'Turn summaries into focused questions and solo assessments so users can practice, score, and improve learning retention.'
    },
    {
      icon: '👤',
      title: 'Profile + History',
      accent: '#34D399',
      glow: 'rgba(52,211,153,0.18)',
      tag: 'Personal Space',
      points: ['Recent summaries', 'Recent PPTs'],
      description: 'Each user gets a private profile with saved summary history, PPT activity, and account settings under Firebase login.'
    },
    {
      icon: '📊',
      title: 'Admin Dashboard',
      accent: '#FB7185',
      glow: 'rgba(251,113,133,0.18)',
      tag: 'Monitoring',
      points: ['User progress', 'PPT generation count'],
      description: 'Admins can monitor users, assessment activity, generated summaries, and now PPT usage with cleaner progress visibility.'
    }
  ];

  const homeWorkflowSteps = [
    { step: '01', title: 'Paste Link', text: 'Drop a YouTube or article link into the workspace.' },
    { step: '02', title: 'Generate Summary', text: 'Brief Bot extracts content and creates a focused summary.' },
    { step: '03', title: 'Create PPT', text: 'Turn the summary into detailed slides with editable points.' },
    { step: '04', title: 'Save or Export', text: 'Export PPTs for the user profile and export to PowerPoint when needed.' }
  ];

  const handleFeatureTiltMove = (event) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 10;
    const rotateX = (0.5 - py) * 10;

    card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    card.style.boxShadow = '0 28px 60px rgba(0,0,0,0.38)';
  };

  const handleFeatureTiltLeave = (event) => {
    const card = event.currentTarget;
    card.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    card.style.boxShadow = '0 18px 45px rgba(0,0,0,0.26)';
  };


  const loadAdminBattleStats = async () => {
    if (!currentUser?.id || currentUser.role !== 'admin') return;
    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/admin/battle-room-stats?adminId=${currentUser.id}&t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load battle stats.');
      setAdminBattleStats(data);
    } catch (error) {
      console.log('Admin battle stats load skipped:', error.message);
    }
  };

  const normalizeBattleCodeClient = (value) => {
    const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!raw) return '';
    return raw.startsWith('BB-') ? raw : `BB-${raw.replace(/^BB-?/, '')}`;
  };

  const handleCreateBattleRoom = async () => {
    if (!currentUser?.id) return;
    if (!analysisData) {
      setBattleRoomError('First generate summary to create a Battle Room.');
      return;
    }

    setBattleRoomLoading(true);
    setBattleRoomError('');
    setBattleResult(null);
    setBattleAnswers({});

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/battle-rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          hostName: currentUser.name || currentUser.email || 'Host',
          title: assessmentTitle || 'Battle Room',
          summary: analysisData,
          language: selectedLanguage,
          questionType: assessmentType || 'mcq',
          difficulty: assessmentDifficulty || 'medium'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create Battle Room.');

      syncBattleRoomIntoAssessment(data.room);
      setBattleRoomCode(data.room?.roomCode || '');
      setBattleTimeLeft(20 * 60);
      setCurrentPage('assessment');
    } catch (error) {
      setBattleRoomError(error.message);
    } finally {
      setBattleRoomLoading(false);
    }
  };

  const handleJoinBattleRoom = async () => {
    if (!currentUser?.id) return;

    const code = normalizeBattleCodeClient(battleRoomCode);
    if (!code) {
      setBattleRoomError('Enter a Battle Room code.');
      return;
    }

    setBattleRoomLoading(true);
    setBattleRoomError('');
    setBattleResult(null);
    setBattleAnswers({});

    try {
      const response = await fetch('https://briefbot-backend-giridhar.onrender.com/api/battle-rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: code,
          userId: currentUser.id,
          name: currentUser.name || currentUser.email || 'Player'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to join Battle Room.');

      syncBattleRoomIntoAssessment(data.room);
      setBattleRoomCode(data.room?.roomCode || code);
      setBattleTimeLeft(20 * 60);
      setCurrentPage('assessment');
    } catch (error) {
      setBattleRoomError(error.message);
    } finally {
      setBattleRoomLoading(false);
    }
  };


  const syncBattleRoomIntoAssessment = (room) => {
    if (!room) return;

    setBattleRoom(room);

    setAssessmentData((previous) => {
      if (!previous || previous.assessmentMode !== 'battle') return previous;

      return {
        ...previous,
        status: room.status || previous.status,
        roomCode: room.roomCode || previous.roomCode,
        players: room.players || previous.players || [],
        leaderboard: room.leaderboard || previous.leaderboard || [],
        questions: room.questions || previous.questions || [],
        startedAt: room.startedAt || previous.startedAt,
        endsAt: room.endsAt || previous.endsAt,
        completedAt: room.completedAt || previous.completedAt
      };
    });
  };


  const refreshBattleRoom = async (code = battleRoom?.roomCode || battleRoomCode) => {
    const cleanCode = normalizeBattleCodeClient(code);
    if (!cleanCode) return null;

    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/battle-rooms/${cleanCode}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to refresh Battle Room.');
      syncBattleRoomIntoAssessment(data.room);
      return data.room;
    } catch (error) {
      console.log('Battle Room refresh skipped:', error.message);
      return null;
    }
  };

  const handleStartBattleRoom = async () => {
    if (!battleRoom?.roomCode || !currentUser?.id) return;

    setBattleRoomLoading(true);
    setBattleRoomError('');

    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/battle-rooms/${battleRoom.roomCode}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to start Battle Room.');

      syncBattleRoomIntoAssessment(data.room);
      setBattleAnswers({});
      setBattleResult(null);
      setBattleTimeLeft(20 * 60);
    } catch (error) {
      setBattleRoomError(error.message);
    } finally {
      setBattleRoomLoading(false);
    }
  };

  const handleBattleAnswerChange = (questionId, value) => {
    setBattleAnswers((prev) => ({ ...prev, [questionId]: value }));
  };


  const saveBattleHistoryFromResult = async (result, room) => {
    if (!currentUser?.id || !result) return;

    const leaderboard = result.leaderboard || room?.leaderboard || [];
    const myRankData = Array.isArray(leaderboard)
      ? leaderboard.find((player) => player.userId === currentUser.id)
      : null;

    await saveTestHistoryToProfile({
      mode: 'battle',
      title: room?.title || 'Battle Room Assessment',
      roomCode: room?.roomCode || battleRoom?.roomCode || assessmentData?.roomCode || '',
      hostName: room?.hostName || battleRoom?.hostName || '',
      rank: myRankData?.rank || '',
      achievement: result.achievement || myRankData?.achievement || '',
      remarks: result.remarks || myRankData?.remarks || '',
      score: Number(result.score ?? 0),
      totalMarks: Number(result.totalMarks ?? 20),
      percentage: Number(result.percentage ?? result.accuracy ?? 0),
      accuracy: Number(result.accuracy ?? result.percentage ?? 0),
      timeTakenSeconds: Number(result.timeTakenSeconds ?? 0),
      review: result.review || [],
      questions: room?.questions || battleRoom?.questions || assessmentData?.questions || []
    });

    loadTestHistory('battle');
  };


  const handleSubmitBattleRoom = async (autoSubmit = false) => {
    if (!battleRoom?.roomCode || !currentUser?.id || battleResult) return;

    setBattleRoomLoading(true);
    setBattleRoomError('');

    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/battle-rooms/${battleRoom.roomCode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          answers: battleAnswers,
          autoSubmit
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to submit Battle Room.');

      setBattleResult(data.result);
      await saveBattleHistoryFromResult(data.result, data.room);
      syncBattleRoomIntoAssessment(data.room);
    } catch (error) {
      setBattleRoomError(error.message);
    } finally {
      setBattleRoomLoading(false);
    }
  };

  const handleQuitBattleRoom = async () => {
    if (battleRoom?.roomCode && currentUser?.id) {
      try {
        await fetch(`https://briefbot-backend-giridhar.onrender.com/api/battle-rooms/${battleRoom.roomCode}/quit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        });
      } catch (error) {
        console.log('Battle quit tracking skipped:', error.message);
      }
    }

    setBattleRoom(null);
    setBattleRoomCode('');
    setBattleAnswers({});
    setBattleResult(null);
    setBattleRoomError('');
    setCurrentPage('home');
  };

  const currentBattlePlayer = battleRoom?.players?.find((player) => player.userId === currentUser?.id);
  const isBattleHost = battleRoom?.hostId === currentUser?.id;




  const saveTestHistoryToProfile = async (payload = {}) => {
    if (!currentUser?.id) return;
    try {
      await fetch(`https://briefbot-backend-giridhar.onrender.com/api/users/${currentUser.id}/test-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.log('Test history save skipped:', error.message);
    }
  };

  const loadTestHistory = async (mode = profileTestMode) => {
    if (!currentUser?.id) return;
    setTestHistoryLoading(true);
    try {
      const response = await fetch(`https://briefbot-backend-giridhar.onrender.com/api/users/${currentUser.id}/test-history?mode=${mode}&t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load test history.');
      setTestHistoryData((previous) => ({
        ...previous,
        [mode]: { summary: data.summary || null, tests: data.tests || [] }
      }));
    } catch (error) {
      console.log('Test history load skipped:', error.message);
    } finally {
      setTestHistoryLoading(false);
    }
  };

  const openProfileTestMode = (mode) => {
    setProfileTestMode(mode);
    setSelectedHistoryTest(null);
    loadTestHistory(mode);
  };

  const formatHistoryDate = (value) => {
    if (!value) return '-';
    try { return new Date(value).toLocaleString(); } catch { return String(value); }
  };

  const formatHistoryDuration = (seconds = 0) => {
    const total = Number(seconds || 0);
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return `${minutes}m ${secs}s`;
  };


  const getHistoryProgress = (test) => {
    const direct = Number(test?.percentage ?? test?.accuracy ?? 0);
    if (direct > 0) return direct;
    const score = Number(test?.score || 0);
    const total = Number(test?.totalMarks || test?.total || 20);
    return total ? Math.round((score / total) * 100) : 0;
  };


  const renderProfileTestsHistory = () => {
    const currentHistory = testHistoryData[profileTestMode] || { summary: null, tests: [] };
    const summary = currentHistory.summary || {};
    const tests = currentHistory.tests || [];

    return (
      <div style={{ background: 'linear-gradient(145deg, #0F1626, #0B1120)', border: '1px solid rgba(0,242,254,0.14)', borderRadius: '24px', padding: '1.35rem', boxShadow: '0 18px 45px rgba(0,0,0,0.28)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <div style={{ color: '#00F2FE', fontSize: '0.78rem', fontWeight: '950', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tests History</div>
            <h3 style={{ color: '#FFFFFF', margin: '0.35rem 0 0 0', fontSize: '1.35rem', fontWeight: '950' }}>Track your Solo, Battle Room, and Brief Boss Champion performance</h3>
            <p style={{ color: '#9CA3AF', margin: '0.35rem 0 0 0', lineHeight: '1.55' }}>View overall progress at the top, then open each test to check individual performance and answer review.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setCurrentPage('profile')} className="simple-btn-glow" style={{ background: '#151D30', color: '#D1D5DB', border: '1px solid #2D3748', borderRadius: '12px', padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: '900' }}>← Back to Profile</button>
            <button type="button" onClick={() => loadTestHistory(profileTestMode)} className="simple-btn-glow" style={{ background: '#151D30', color: '#D1D5DB', border: '1px solid #2D3748', borderRadius: '12px', padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: '900' }}>Refresh</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {[
            ['solo', '👤 Solo'],
            ['battle', '⚔️ Battle Room'],
            ['boss_champion', '👑 Brief Boss Champion']
          ].map(([mode, label]) => (
            <button key={mode} type="button" onClick={() => openProfileTestMode(mode)} className="simple-btn-glow" style={{ background: profileTestMode === mode ? 'linear-gradient(135deg, #00F2FE, #4FACFE)' : '#151D30', color: profileTestMode === mode ? '#07111F' : '#D1D5DB', border: profileTestMode === mode ? 'none' : '1px solid #2D3748', borderRadius: '999px', padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: '950' }}>{label}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
          {[
            ['Total Tests', summary.totalTests || 0, '#00F2FE'],
            ['Average Progress', `${summary.averageProgress || 0}%`, '#34D399'],
            ['Best Score', `${summary.bestScore || 0}%`, '#FBBF24'],
            ['Overall Accuracy', `${summary.overallAccuracy || 0}%`, '#C084FC']
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: '#111827', border: `1px solid ${color}44`, borderRadius: '16px', padding: '1rem' }}>
              <div style={{ color: '#9CA3AF', fontSize: '0.72rem', fontWeight: '950', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ color, fontSize: '1.45rem', fontWeight: '950', marginTop: '0.35rem' }}>{value}</div>
            </div>
          ))}
        </div>

        {selectedHistoryTest ? (
          <div style={{ background: '#0B1120', border: '1px solid #1F2937', borderRadius: '18px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ color: '#FFF', margin: 0, fontSize: '1.15rem', fontWeight: '950' }}>{selectedHistoryTest.title || 'Assessment'}</h4>
                <p style={{ color: '#9CA3AF', margin: '0.35rem 0 0 0' }}>{selectedHistoryTest.mode === 'battle' ? `Battle Room ${selectedHistoryTest.roomCode || ''}` : 'Solo Practice'} • {formatHistoryDate(selectedHistoryTest.submittedAt)}</p>
              </div>
              <button type="button" onClick={() => setSelectedHistoryTest(null)} className="simple-btn-glow" style={{ background: '#151D30', color: '#D1D5DB', border: '1px solid #2D3748', borderRadius: '12px', padding: '0.7rem 0.95rem', cursor: 'pointer', fontWeight: '900' }}>Back to Tests</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                ['Score', `${selectedHistoryTest.score || 0}/${selectedHistoryTest.totalMarks || 20}`, '#00F2FE'],
                ['Progress', `${getHistoryProgress(selectedHistoryTest)}%`, '#34D399'],
                ['Time', formatHistoryDuration(selectedHistoryTest.timeTakenSeconds), '#FBBF24'],
                ['Rank', selectedHistoryTest.rank ? `#${selectedHistoryTest.rank}` : '-', '#C084FC']
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '14px', padding: '0.85rem' }}>
                  <div style={{ color: '#6B7280', fontSize: '0.7rem', fontWeight: '950', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ color, fontWeight: '950', marginTop: '0.28rem' }}>{value}</div>
                </div>
              ))}
            </div>

            {(selectedHistoryTest.review || []).length ? (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {(selectedHistoryTest.review || []).map((item, index) => (
                  <div key={item.questionId || index} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '14px', padding: '0.9rem' }}>
                    <div style={{ color: '#FFF', fontWeight: '900', lineHeight: '1.5' }}>Q{index + 1}. {item.question}</div>
                    <div style={{ color: item.isCorrect ? '#34D399' : '#F87171', marginTop: '0.5rem', fontWeight: '850' }}>Your answer: {item.userAnswer || '-'} {item.isCorrect ? '✅' : '❌'}</div>
                    <div style={{ color: '#D1D5DB', marginTop: '0.35rem' }}>Correct answer: {item.correctAnswer || '-'}</div>
                    {item.explanation && <div style={{ color: '#9CA3AF', marginTop: '0.35rem', lineHeight: '1.55' }}>Explanation: {item.explanation}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#9CA3AF', textAlign: 'center', padding: '1.5rem' }}>No detailed answer review saved for this test.</div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {testHistoryLoading ? (
              <div style={{ color: '#9CA3AF', textAlign: 'center', padding: '2rem' }}>Loading test history...</div>
            ) : tests.length ? tests.map((test) => (
              <button key={test.id} type="button" onClick={() => setSelectedHistoryTest(test)} className="simple-btn-glow" style={{ textAlign: 'left', background: '#0B1120', border: '1px solid #1F2937', borderRadius: '16px', padding: '1rem', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#FFFFFF', fontWeight: '950' }}>{test.title || (profileTestMode === 'battle' ? 'Battle Room Assessment' : 'Solo Practice Assessment')}</div>
                  <div style={{ color: '#9CA3AF', fontSize: '0.86rem', marginTop: '0.28rem' }}>{profileTestMode === 'battle' && test.roomCode ? `${test.roomCode} • ` : ''}{formatHistoryDate(test.submittedAt)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#34D399', fontWeight: '950', fontSize: '1.15rem' }}>{getHistoryProgress(test)}%</div>
                  <div style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>{test.score || 0}/{test.totalMarks || 20}</div>
                </div>
              </button>
            )) : (
              <div style={{ color: '#9CA3AF', textAlign: 'center', padding: '2rem', background: '#0B1120', border: '1px dashed #2D3748', borderRadius: '16px' }}>No {profileTestMode === 'battle' ? 'Battle Room' : 'Solo'} tests attempted yet.</div>
            )}
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="app-shell" style={{ backgroundColor: '#070A13', minHeight: '100vh', color: '#F3F4F6', fontFamily: '"Segoe UI", Roboto, sans-serif', position: 'relative', isolation: 'isolate' }}>
        <div className="starfield">
      {[...Array(180)].map((_, i) => {
        const size = i % 10 === 0 ? 'medium' : i % 3 === 0 ? 'small' : 'tiny';
        const twinkle = i % 5 === 0 ? 'twinkle' : i % 7 === 0 ? 'twinkle-slow' : i % 11 === 0 ? 'twinkle-fast' : '';
        return (
          <div
            key={i}
            className={`star star-${size} ${twinkle ? `star-${twinkle}` : ''}`}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.7 + 0.3,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        );
      })}
    </div>

                  

      
      {/* Global Navigation Header Container */}
      <nav style={{ backgroundColor: '#0F1626', borderBottom: '1px solid #1F2937', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }} onClick={() => setCurrentPage('home')}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#00F2FE', borderRadius: '3px', boxShadow: '0 0 10px #00F2FE' }} />
          <strong style={{ fontSize: '1.2rem', letterSpacing: '0.5px', background: 'linear-gradient(45deg, #FFF, #9CA3AF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BRIEF BOT</strong>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.95rem', fontWeight: '650', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ color: currentPage === 'home' ? '#00F2FE' : '#9CA3AF', cursor: 'pointer', transition: 'color 0.2s' }} onClick={() => setCurrentPage('home')}>Home</span>

          {!currentUser ? (
            <>
              <button
                type="button"
                onClick={() => resetAuthAndOpen('login')}
                style={{ background: currentPage === 'auth' && authMode === 'login' ? 'rgba(0,242,254,0.16)' : 'transparent', color: currentPage === 'auth' && authMode === 'login' ? '#00F2FE' : '#D1D5DB', border: '1px solid rgba(0,242,254,0.28)', borderRadius: '999px', padding: '0.62rem 1rem', cursor: 'pointer', fontWeight: '850' }}
               className="simple-btn-glow">Sign In</button>
              <button
                type="button"
                onClick={() => resetAuthAndOpen('register')}
                style={{ background: 'linear-gradient(135deg, #00F2FE, #4FACFE)', color: '#070A13', border: 'none', borderRadius: '999px', padding: '0.66rem 1.05rem', cursor: 'pointer', fontWeight: '950', boxShadow: '0 10px 24px rgba(0,242,254,0.18)' }}
               className="simple-btn-glow">Sign Up</button>
            </>
          ) : (
            <>
              {currentUser?.role !== 'admin' && (
                <>
                  <span style={{ color: currentPage === 'workspace' ? '#00F2FE' : '#9CA3AF', cursor: 'pointer', transition: 'color 0.2s' }} onClick={() => requireUserAccess('workspace')}>Workspace</span>
                  <span style={{ color: currentPage === 'pptStudio' ? '#00F2FE' : '#9CA3AF', cursor: 'pointer', transition: 'color 0.2s' }} onClick={() => requireUserAccess('pptStudio', '⚠️ Please login or sign up to use PPT Studio.')}>PPT Studio</span>
                  <span style={{ color: currentPage === 'smartCompare' ? '#00F2FE' : '#9CA3AF', cursor: 'pointer', transition: 'color 0.2s' }} onClick={() => requireUserAccess('smartCompare', '⚠️ Please login or sign up to use Smart Compare.')}>Smart Compare</span>
                  <span style={{ color: currentPage === 'assessment' ? '#00F2FE' : '#9CA3AF', cursor: 'pointer', transition: 'color 0.2s' }} onClick={() => requireUserAccess('assessment', '⚠️ Please login or sign up to attempt assessments.')}>Assessment</span>
                </>
              )}

              {currentUser?.role === 'admin' && (
                <span
                  style={{ color: currentPage === 'admin' ? '#00F2FE' : '#9CA3AF', cursor: 'pointer', transition: 'color 0.2s' }}
                  onClick={() => {
                    setAdminTab('dashboard');
                    setCurrentPage('admin');
                  }}
                >Admin Dashboard</span>
              )}
              <button
                type="button"
                title="Open Profile"
                aria-label="Open Profile"
                onClick={() => {
                  if (currentUser?.role === 'admin') {
                    setAdminTab('details');
                    setCurrentPage('adminProfile');
                  } else {
                    setProfileTab('details');
                    setCurrentPage('profile');
                  }
                }}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: (currentUser?.role === 'admin' ? currentPage === 'adminProfile' : currentPage === 'profile')
                    ? '2px solid #00F2FE'
                    : '1px solid rgba(0,242,254,0.35)',
                  background: 'linear-gradient(145deg, rgba(0,242,254,0.16), rgba(79,172,254,0.06))',
                  color: '#00F2FE',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  padding: 0,
                  boxShadow: (currentUser?.role === 'admin' ? currentPage === 'adminProfile' : currentPage === 'profile')
                    ? '0 0 18px rgba(0,242,254,0.40)'
                    : '0 0 12px rgba(0,242,254,0.16)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
               className="simple-btn-glow">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontWeight: '950', fontSize: '0.95rem' }}>{(currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase()}</span>
                )}
              </button>
            </>
          )}
        </div>
      </nav>

      {adminDeleteTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '440px', background: 'linear-gradient(145deg, #0F1626, #0B1120)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: '22px', padding: '1.5rem', boxShadow: '0 28px 90px rgba(0,0,0,0.55)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#FFF', fontSize: '1.25rem' }}>Delete User?</h3>
            <p style={{ color: '#D1D5DB', lineHeight: '1.6' }}>This will permanently remove <strong style={{ color: '#FFF' }}>{adminDeleteTarget.name || adminDeleteTarget.email}</strong> from Firebase Authentication, Firestore profile, saved history, PPTs, assessment attempts, and activity logs. This action cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={cancelAdminDeleteUser} disabled={adminDeleteLoading} style={{ background: 'transparent', color: '#D1D5DB', border: '1px solid #374151', borderRadius: '12px', padding: '0.8rem 1rem', fontWeight: '900', cursor: 'pointer' }} className="simple-btn-glow">Cancel</button>
              <button type="button" onClick={confirmAdminDeleteUser} disabled={adminDeleteLoading} style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)', color: '#FFF', border: 'none', borderRadius: '12px', padding: '0.8rem 1rem', fontWeight: '950', cursor: 'pointer', opacity: adminDeleteLoading ? 0.7 : 1 }} className="simple-btn-glow">{adminDeleteLoading ? 'Deleting...' : 'Delete User'}</button>
            </div>
          </div>
        </div>
      )}







      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.68)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '430px', background: 'linear-gradient(145deg, #0F1626, #0B1120)', border: '1px solid rgba(248, 113, 113, 0.35)', borderRadius: '22px', padding: '1.7rem', boxShadow: '0 28px 80px rgba(0,0,0,0.58)', textAlign: 'center' }}>
            <div style={{ width: '58px', height: '58px', borderRadius: '18px', margin: '0 auto 1rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248, 113, 113, 0.12)', border: '1px solid rgba(248, 113, 113, 0.35)', fontSize: '1.65rem' }}>
              🚪
            </div>
            <h3 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.28rem', fontWeight: '900' }}>Confirm Logout</h3>
            <p style={{ margin: '0.75rem 0 1.45rem 0', color: '#9CA3AF', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Are you sure you want to logout from Brief Bot?
            </p>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={cancelLogout}
                style={{ backgroundColor: '#151D30', color: '#D1D5DB', border: '1px solid #2D3748', borderRadius: '12px', padding: '0.75rem 1.15rem', cursor: 'pointer', fontWeight: '800', minWidth: '120px' }}
               className="simple-btn-glow">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                style={{ background: 'linear-gradient(135deg, #EF4444, #F87171)', color: '#FFFFFF', border: 'none', borderRadius: '12px', padding: '0.75rem 1.15rem', cursor: 'pointer', fontWeight: '900', minWidth: '120px', boxShadow: '0 12px 30px rgba(248,113,113,0.22)' }}
               className="simple-btn-glow">
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}


      {currentPage === 'testsHistory' && currentUser && currentUser?.role !== 'admin' && (
        <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '2.6rem 1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          {renderProfileTestsHistory()}
        </div>
      )}

      {currentPage === 'profile' && currentUser && currentUser.role !== 'admin' && (
        <div style={{ maxWidth: '1220px', margin: '0 auto', padding: '3rem 1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }} className="profile-layout">
            <aside style={{ background: 'linear-gradient(145deg, #0F1626, #0B1120)', border: '1px solid #1F2937', borderRadius: '22px', padding: '1.3rem', boxShadow: '0 18px 45px rgba(0,0,0,0.35)', position: 'sticky', top: '92px' }}>
              <div style={{ textAlign: 'center', padding: '1rem 0 1.2rem 0', borderBottom: '1px solid #1F2937', marginBottom: '1rem' }}>
                <div style={{ width: '82px', height: '82px', borderRadius: '50%', margin: '0 auto 0.8rem auto', background: profilePhoto ? `url(${profilePhoto}) center/cover` : 'linear-gradient(135deg, #00F2FE, #4FACFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#070A13', fontSize: '2rem', fontWeight: '950', border: '2px solid rgba(0,242,254,0.45)', boxShadow: '0 0 28px rgba(0,242,254,0.25)' }}>{!profilePhoto && userInitial}</div>
                <h3 style={{ margin: 0, color: '#FFF', fontWeight: '900' }}>{currentUser.name || 'User'}</h3>
                <p style={{ margin: '0.35rem 0 0 0', color: '#9CA3AF', fontSize: '0.84rem', wordBreak: 'break-word' }}>{currentUser.email}</p>
              </div>
              {[
                ['details', '👤 Profile Details'],
                ['edit', '✏️ Edit Profile'],
                ['history', '📚 My Summary History'],
                ['ppts', '🎞 Recent PPTs'],
                ['settings', '⚙️ Settings'],
                ['logout', '🚪 Logout']
              ].map(([id, label]) => (
                <button key={id} type="button" onClick={() => id === 'logout' ? requestLogout() : setProfileTab(id)} style={{ width: '100%', textAlign: 'left', background: profileTab === id ? 'rgba(0,242,254,0.12)' : 'transparent', color: profileTab === id ? '#00F2FE' : '#D1D5DB', border: profileTab === id ? '1px solid rgba(0,242,254,0.28)' : '1px solid transparent', padding: '0.85rem 0.95rem', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', marginBottom: '0.45rem' }} className="simple-btn-glow">{label}</button>
              ))}
            </aside>

            <main style={{ backgroundColor: '#0F1626', border: '1px solid #1F2937', borderRadius: '22px', padding: '1.7rem', boxShadow: '0 18px 45px rgba(0,0,0,0.28)', minHeight: '520px' }}>
              {profileTab === 'details' && (
                <div>
                  <h2 style={{ margin: 0, color: '#FFF', fontSize: '1.8rem', fontWeight: '950' }}>Profile Details</h2>
                  <p style={{ color: '#9CA3AF', marginTop: '0.4rem' }}>Your Brief Bot account information.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                    {[
                      ['Name', currentUser.name || '-'],
                      ['Email', currentUser.email || '-'],
                      ['Role', currentUser.role || 'user'],
                      ['Provider', currentUser.provider || 'password'],
                      ['Last Login', currentUser.lastLoginAt || '-']
                    ].map(([label, value]) => (
                      <div key={label} style={{ backgroundColor: '#0B1120', border: '1px solid #1F2937', borderRadius: '16px', padding: '1rem' }}>
                        <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.8rem', fontWeight: '800' }}>{label}</p>
                        <strong style={{ color: '#E5E7EB', display: 'block', marginTop: '0.35rem', wordBreak: 'break-word' }}>{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profileTab === 'edit' && (
                <div>
                  <h2 style={{ margin: 0, color: '#FFF', fontSize: '1.8rem', fontWeight: '950' }}>Edit Profile</h2>
                  <p style={{ color: '#9CA3AF', marginTop: '0.4rem' }}>Change your name and choose a profile photo from your device.</p>
                  <form onSubmit={handleProfileUpdate} style={{ display: 'grid', gap: '1rem', marginTop: '1.4rem', maxWidth: '620px' }}>
                    <label style={{ color: '#9CA3AF', fontSize: '0.85rem', fontWeight: '800' }}>Change Name</label>
                    <input value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} style={{ padding: '0.95rem', borderRadius: '12px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }} />
                    <label style={{ color: '#9CA3AF', fontSize: '0.85rem', fontWeight: '800' }}>Change Profile Photo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', backgroundColor: '#0B1120', border: '1px solid #1F2937', borderRadius: '14px', padding: '1rem' }}>
                      <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #00F2FE, #4FACFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#070A13', fontWeight: '950', fontSize: '1.6rem', flexShrink: 0 }}>
                        {profileForm.photoURL ? <img src={profileForm.photoURL} alt="Profile preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (profileForm.name || currentUser?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <input id="user-profile-photo-upload" type="file" accept="image/*" onChange={handleProfilePhotoUpload} style={{ display: 'none' }} />
                        <label htmlFor="user-profile-photo-upload" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem', background: 'linear-gradient(135deg, #00F2FE, #4FACFE)', color: '#070A13', border: 'none', borderRadius: '12px', padding: '0.85rem 1.05rem', cursor: 'pointer', fontWeight: '950', boxShadow: '0 12px 28px rgba(0,242,254,0.20)', width: 'fit-content' }}>
                          📷 Choose Profile Photo
                        </label>
                        <small style={{ color: '#9CA3AF', display: 'block', marginTop: '0.5rem' }}>Choose an image from your device. It will be compressed automatically.</small>
                      </div>
                    </div>
                    <button type="submit" disabled={profileLoading} style={{ background: 'linear-gradient(135deg, #00F2FE, #4FACFE)', color: '#070A13', border: 'none', borderRadius: '12px', padding: '0.95rem', fontWeight: '950', cursor: 'pointer' }} className="simple-btn-glow">{profileLoading ? 'Saving...' : 'Save Changes'}</button>
                  </form>
                  {profileMessage && <p style={{ color: profileMessage.startsWith('✅') ? '#34D399' : '#F87171', marginTop: '1rem' }}>{profileMessage}</p>}
                </div>
              )}

              {profileTab === 'history' && (
                <div>
                  <h2 style={{ margin: 0, color: '#FFF', fontSize: '1.8rem', fontWeight: '950' }}>My Summary History</h2>
                  <p style={{ color: '#9CA3AF', marginTop: '0.4rem' }}>View, search, open, or delete your previous summaries.</p>
                  <input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search summaries..." style={{ margin: '1rem 0', width: '100%', boxSizing: 'border-box', padding: '0.9rem 1rem', borderRadius: '12px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }} />
                  <div className="custom-scroll" style={{ display: 'grid', gap: '0.85rem', maxHeight: '440px', overflowY: 'auto' }}>
                    {filteredHistory.length ? filteredHistory.map((item) => (
                      <div key={item.id} style={{ backgroundColor: '#0B1120', border: '1px solid #1F2937', borderRadius: '16px', padding: '1rem' }}>
                        <strong style={{ color: '#FFF' }}>{item.title || 'Saved summary'}</strong>
                        <p style={{ color: '#9CA3AF', margin: '0.35rem 0', lineHeight: '1.5' }}>{item.description}</p>
                        <small style={{ color: '#6B7280' }}>{item.savedAt || item.createdAt || ''}</small>
                        <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => openHistoryItem(item)} className="history-open-btn simple-btn-glow">Open</button>
                          <button type="button" onClick={() => deleteHistoryItem(item.id)} style={{ background: 'transparent', color: '#F87171', border: '1px solid rgba(248,113,113,0.45)', borderRadius: '8px', padding: '0.55rem 0.9rem', cursor: 'pointer', fontWeight: '800' }} className="simple-btn-glow">Delete</button>
                        </div>
                      </div>
                    )) : <div style={{ color: '#6B7280', textAlign: 'center', padding: '3rem' }}>No summaries found.</div>}
                  </div>
                </div>
              )}

              {profileTab === 'ppts' && (
                <div>
                  <h2 style={{ margin: 0, color: '#FFF', fontSize: '1.8rem', fontWeight: '950' }}>Recent PPTs</h2>
                  <p style={{ color: '#9CA3AF', marginTop: '0.4rem' }}>PPTs you exported from Brief Bot. The actual PPT file is downloaded to your device when you click Export PPT or Export.</p>

                  {recentPptsLoading ? (
                    <div style={{ color: '#9CA3AF', padding: '2rem', textAlign: 'center' }}>Loading recent PPTs...</div>
                  ) : recentPpts.length ? (
                    <div style={{ display: 'grid', gap: '0.85rem', marginTop: '1.2rem' }}>
                      {recentPpts.map((ppt) => (
                        <div key={ppt.id} style={{ backgroundColor: '#0B1120', border: '1px solid #1F2937', borderRadius: '16px', padding: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div>
                              <h3 style={{ color: '#FFF', margin: 0, fontSize: '1rem' }}>{ppt.title || 'Brief Bot PPT'}</h3>
                              <p style={{ color: '#9CA3AF', margin: '0.35rem 0 0 0', fontSize: '0.85rem' }}>
                                {ppt.slideCount || 0} slides • {ppt.template || 'template'} • {ppt.savedAt || ppt.createdAt || '-'}
                              </p>
                              {ppt.subtitle && <p style={{ color: '#6B7280', margin: '0.35rem 0 0 0', fontSize: '0.82rem' }}>{ppt.subtitle}</p>}
                            </div>
                            <span style={{ color: ppt.actionType === 'saved' ? '#34D399' : '#00F2FE', border: `1px solid ${ppt.actionType === 'saved' ? '#34D399' : '#00F2FE'}`, padding: '0.28rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '900' }}>
                              {ppt.actionType === 'saved' ? 'Saved' : 'Exported'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#0B1120', border: '1px dashed #374151', borderRadius: '16px', padding: '2.5rem', textAlign: 'center', marginTop: '1.2rem' }}>
                      <div style={{ fontSize: '2.4rem', marginBottom: '0.7rem' }}>🎞</div>
                      <h3 style={{ color: '#FFF', margin: 0 }}>No PPTs yet</h3>
                      <p style={{ color: '#9CA3AF', margin: '0.5rem 0 1.2rem 0' }}>Generate a summary, create PPT slides, then click Export PPT.</p>
                      <button type="button" onClick={() => setCurrentPage('workspace')} className="history-open-btn simple-btn-glow">Create PPT</button>
                    </div>
                  )}
                </div>
              )}

              {profileTab === 'settings' && (
                <div>
                  <h2 style={{ margin: 0, color: '#FFF', fontSize: '1.8rem', fontWeight: '950' }}>Settings</h2>
                  <p style={{ color: '#9CA3AF', marginTop: '0.4rem' }}>Password, privacy, and security controls.</p>
                  <div style={{ display: 'grid', gap: '1rem', marginTop: '1.4rem' }}>
                    <div style={{ backgroundColor: '#0B1120', border: '1px solid #1F2937', borderRadius: '16px', padding: '1.1rem' }}>
                      <h3 style={{ color: '#FFF', marginTop: 0 }}>Change Password</h3>
                      <p style={{ color: '#9CA3AF', marginBottom: '1rem' }}>Update your password directly inside Brief Bot. No reset email required.</p>
                      <form onSubmit={handleDirectPasswordChange} style={{ display: 'grid', gap: '0.85rem' }}>
                        <input
                          type={showChangePasswords ? 'text' : 'password'}
                          placeholder="Current password"
                          value={passwordChangeForm.currentPassword}
                          onChange={(e) => setPasswordChangeForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                          style={{ padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }}
                        />
                        <input
                          type={showChangePasswords ? 'text' : 'password'}
                          placeholder="New password"
                          value={passwordChangeForm.newPassword}
                          onChange={(e) => setPasswordChangeForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                          style={{ padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }}
                        />
                        <input
                          type={showChangePasswords ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          value={passwordChangeForm.confirmPassword}
                          onChange={(e) => setPasswordChangeForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                          style={{ padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <button type="button" onClick={() => setShowChangePasswords((prev) => !prev)} style={{ backgroundColor: '#151D30', color: '#D1D5DB', border: '1px solid #2D3748', borderRadius: '10px', padding: '0.72rem 1rem', fontWeight: '850', cursor: 'pointer' }} className="simple-btn-glow">{showChangePasswords ? '🙈 Hide' : '👁 Show'}</button>
                          <button type="submit" disabled={passwordChangeLoading} style={{ background: 'linear-gradient(135deg, #00F2FE, #4FACFE)', color: '#070A13', border: 'none', borderRadius: '10px', padding: '0.75rem 1rem', fontWeight: '950', cursor: 'pointer', opacity: passwordChangeLoading ? 0.7 : 1 }} className="simple-btn-glow">{passwordChangeLoading ? 'Updating...' : 'Update Password'}</button>
                        </div>
                        <small style={{ color: '#9CA3AF' }}>New password: 8+ chars, A-Z, 0-9 & special symbol.</small>
                      </form>
                    </div>
                    <div style={{ backgroundColor: '#0B1120', border: '1px solid #1F2937', borderRadius: '16px', padding: '1.1rem' }}>
                      <h3 style={{ color: '#FFF', marginTop: 0 }}>Privacy & Security</h3>
                      <p style={{ color: '#9CA3AF' }}>Your summary history is stored privately under your Firebase user ID. Other users cannot view it.</p>
                      <button type="button" onClick={handleDeleteAccount} disabled={profileLoading} style={{ background: 'transparent', color: '#F87171', border: '1px solid rgba(248,113,113,0.55)', borderRadius: '10px', padding: '0.75rem 1rem', fontWeight: '900', cursor: 'pointer' }} className="simple-btn-glow">Delete Account</button>
                    </div>
                  </div>
                  {profileMessage && <p style={{ color: profileMessage.startsWith('✅') ? '#34D399' : '#F87171', marginTop: '1rem' }}>{profileMessage}</p>}
                </div>
              )}
            
              {assessmentResult && (
                <div style={{
                  marginTop: '1.4rem',
                  padding: '1rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(0,242,254,0.18)',
                  background: 'rgba(0,242,254,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <div style={{ color: '#FFF', fontWeight: '950' }}>Assessment completed</div>
                    <div style={{ color: '#9CA3AF', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                      Exit this result screen or return to Assessment Arena for a new attempt.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleBackToAssessmentArena}
                      className="simple-btn-glow"
                      style={{ background: '#151D30', color: '#D1D5DB', border: '1px solid #2D3748', borderRadius: '12px', padding: '0.78rem 1rem', cursor: 'pointer', fontWeight: '900' }}
                    >
                      New Solo Practice
                    </button>
                    <button
                      type="button"
                      onClick={(event) => handleExitBossResult(event)}
                      className="simple-btn-glow"
                      style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)', color: '#FFF', border: 'none', borderRadius: '12px', padding: '0.78rem 1rem', cursor: 'pointer', fontWeight: '950' }}
                    >
                      {assessmentData?.assessmentMode === 'battle' ? 'Exit Battle Room' : 'Exit Assessment'}
                    </button>
                  </div>
                </div>
              )}

</main>
          </div>
        
            <div style={{
              background: 'linear-gradient(145deg, #0F1626, #0B1120)',
              border: '1px solid rgba(0,242,254,0.16)',
              borderRadius: '22px',
              padding: '1.2rem',
              marginTop: '1.2rem',
              boxShadow: '0 18px 45px rgba(0,0,0,0.25)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#00F2FE', fontSize: '0.78rem', fontWeight: '950', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tests History</div>
                  <h3 style={{ color: '#FFFFFF', margin: '0.35rem 0 0 0', fontSize: '1.18rem', fontWeight: '950' }}>View Solo and Battle Room progress</h3>
                  <p style={{ color: '#9CA3AF', margin: '0.35rem 0 0 0', lineHeight: '1.55', fontSize: '0.9rem' }}>Open your attempted tests, average progress, best score, and individual test reports.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHistoryTest(null);
                    setCurrentPage('testsHistory');
                    loadTestHistory(profileTestMode);
                  }}
                  className="simple-btn-glow"
                  style={{ background: 'linear-gradient(135deg, #00F2FE, #4FACFE)', color: '#07111F', border: 'none', borderRadius: '14px', padding: '0.85rem 1.1rem', cursor: 'pointer', fontWeight: '950', boxShadow: '0 14px 30px rgba(0,242,254,0.18)' }}
                >
                  Open Tests History →
                </button>
              </div>
            </div>

</div>
      )}

      {currentPage === 'admin' && currentUser?.role === 'admin' && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ backgroundColor: '#0F1626', border: '1px solid #1F2937', borderRadius: '22px', padding: '1.7rem', boxShadow: '0 18px 45px rgba(0,0,0,0.28)', minHeight: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, color: '#FFF', fontSize: '1.8rem', fontWeight: '950' }}>Admin Dashboard</h2>
                <p style={{ margin: '0.45rem 0 0 0', color: '#9CA3AF' }}>Minimal overview and user details.</p>
              </div>
              <button
                type="button"
                onClick={() => { loadAdminDashboard(); loadAdminBattleStats(); }}
                className="history-open-btn simple-btn-glow"
              >
                Refresh
              </button>
            </div>

            {adminLoading ? (
              <div style={{ color: '#9CA3AF', padding: '3rem', textAlign: 'center' }}>Loading admin dashboard...</div>
            ) : adminStats ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[
                    ['Total Users', adminStats.totals?.totalUsers || 0, '👥', '#00F2FE'],
                    ['Active Users', adminStats.totals?.loggedInUsers || 0, '🟢', '#34D399'],
                    ['Summaries Generated', adminStats.totals?.totalSummaries || 0, '📄', '#4FACFE'],
                    ['Assessments Attempted', adminStats.totals?.totalAssessmentAttempts || 0, '📝', '#FBBF24'],
                    ['Battle Rooms Generated', adminStats.totals?.totalBattleRooms || adminBattleStats?.stats?.totalRooms || 0, '⚔️', '#A855F7'],
                    ['PPTs Generated', adminStats.totals?.totalPpts || 0, '🎞️', '#FB7185'],
                    ['Smart Video Compares', adminStats.totals?.totalSmartCompares || adminBattleStats?.smartCompare?.totalCompares || 0, '🔍', '#38BDF8']
                  ].map(([label, value, icon, color]) => (
                    <div key={label} style={{ background: 'linear-gradient(145deg, #0B1120, #111827)', border: `1px solid ${color}44`, borderRadius: '16px', padding: '1rem', boxShadow: `0 0 22px ${color}10` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                        <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.74rem', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                      </div>
                      <strong style={{ display: 'block', color, fontSize: '1.65rem', marginTop: '0.45rem' }}>{value}</strong>
                    </div>
                  ))}
                </div>

                <div style={{ backgroundColor: '#0B1120', border: '1px solid #1F2937', borderRadius: '16px', overflow: 'hidden' }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid #1F2937', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#FFF', fontSize: '1.05rem' }}>Manage Users</strong>
                      <p style={{ margin: '0.25rem 0 0 0', color: '#9CA3AF', fontSize: '0.85rem' }}>Click View User to see simple feature counts only.</p>
                    </div>
                    <input
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      placeholder="Search users..."
                      style={{ minWidth: '240px', padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }}
                    />
                  </div>

                  <div className="custom-scroll" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#131C2E', color: '#9CA3AF', textAlign: 'left', fontSize: '0.82rem' }}>
                          {['User', 'Email', 'Status', 'Summaries', 'Assessments', 'Battle Rooms', 'PPTs', 'Smart Compares', 'Actions'].map((h) => (
                            <th key={h} style={{ padding: '0.9rem' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAdminUsers.map((user) => (
                          <tr key={user.id} style={{ borderTop: '1px solid #1F2937', color: '#E5E7EB', background: selectedAdminUserId === user.id ? 'rgba(0,242,254,0.04)' : 'transparent' }}>
                            <td style={{ padding: '0.9rem', fontWeight: '800' }}>{user.name}</td>
                            <td style={{ padding: '0.9rem', color: '#9CA3AF' }}>{user.email}</td>
                            <td style={{ padding: '0.9rem', color: user.isLoggedIn ? '#34D399' : '#6B7280' }}>{user.isLoggedIn ? 'Active' : 'Offline'}</td>
                            <td style={{ padding: '0.9rem' }}>{user.summariesGenerated || 0}</td>
                            <td style={{ padding: '0.9rem' }}>{user.assessmentsAttempted || 0}</td>
                            <td style={{ padding: '0.9rem' }}>{user.battleRoomsGenerated || 0}</td>
                            <td style={{ padding: '0.9rem' }}>{user.pptsGenerated || 0}</td>
                            <td style={{ padding: '0.9rem' }}>{user.smartCompares || 0}</td>
                            <td style={{ padding: '0.9rem' }}>
                              <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => loadAdminUserProgress(user.id)}
                                  className="simple-btn-glow"
                                  style={{ background: 'rgba(0,242,254,0.10)', color: '#00F2FE', border: '1px solid rgba(0,242,254,0.30)', borderRadius: '10px', padding: '0.58rem 0.8rem', cursor: 'pointer', fontWeight: '900' }}
                                >
                                  View User
                                </button>
                                <button
                                  type="button"
                                  onClick={() => requestAdminDeleteUser(user)}
                                  className="simple-btn-glow"
                                  style={{ background: 'rgba(239,68,68,0.10)', color: '#F87171', border: '1px solid rgba(248,113,113,0.36)', borderRadius: '10px', padding: '0.58rem 0.8rem', cursor: 'pointer', fontWeight: '900' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {selectedAdminUserLoading && (
                    <div style={{ padding: '1rem', color: '#9CA3AF', borderTop: '1px solid #1F2937' }}>Loading selected user details...</div>
                  )}

                  {selectedAdminUserProgress && (
                    <div style={{ padding: '1rem', borderTop: '1px solid #1F2937', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={{ color: '#FFF', margin: 0, fontSize: '1.1rem', fontWeight: '950' }}>{selectedAdminUserProgress.user?.name || 'Selected User'}</h3>
                          <p style={{ color: '#9CA3AF', margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>{selectedAdminUserProgress.user?.email || ''}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedAdminUserId(''); setSelectedAdminUserProgress(null); setSelectedAdminFeatureTab('summaries'); }}
                          className="simple-btn-glow"
                          style={{ background: 'transparent', color: '#9CA3AF', border: '1px solid #374151', borderRadius: '10px', padding: '0.6rem 0.85rem', cursor: 'pointer', fontWeight: '850' }}
                        >
                          Close
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
                        {[
                          ['summaries', 'Summaries Generated', selectedAdminUserProgress.stats?.summaryCount || 0, '#00F2FE'],
                          ['assessments', 'Assessments Attempted', selectedAdminUserProgress.stats?.assessmentCount || selectedAdminUserProgress.stats?.attemptCount || 0, '#FBBF24'],
                          ['battleRooms', 'Battle Rooms Generated', selectedAdminUserProgress.stats?.battleRoomCount || 0, '#A855F7'],
                          ['ppts', 'PPTs Generated', selectedAdminUserProgress.stats?.pptCount || 0, '#FB7185'],
                          ['smartCompares', 'Smart Video Compares', selectedAdminUserProgress.stats?.smartCompareCount || 0, '#38BDF8']
                        ].map(([key, label, value, color]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedAdminFeatureTab(key)}
                            className="simple-btn-glow"
                            style={{
                              textAlign: 'left',
                              background: selectedAdminFeatureTab === key ? `${color}14` : '#111827',
                              border: selectedAdminFeatureTab === key ? `1px solid ${color}` : `1px solid ${color}44`,
                              borderRadius: '14px',
                              padding: '0.9rem',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ color: '#9CA3AF', fontSize: '0.72rem', fontWeight: '950', textTransform: 'uppercase' }}>{label}</div>
                            <div style={{ color, fontSize: '1.45rem', fontWeight: '950', marginTop: '0.35rem' }}>{value}</div>
                            <div style={{ color: selectedAdminFeatureTab === key ? color : '#6B7280', fontSize: '0.76rem', fontWeight: '850', marginTop: '0.45rem' }}>
                              Click to view details →
                            </div>
                          </button>
                        ))}
                      </div>

                      <div style={{ marginTop: '1rem', background: '#0B1120', border: '1px solid #1F2937', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid #1F2937', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div>
                            <strong style={{ color: '#FFFFFF' }}>
                              {selectedAdminFeatureTab === 'summaries' && 'Generated Summaries'}
                              {selectedAdminFeatureTab === 'assessments' && 'Attempted Assessments'}
                              {selectedAdminFeatureTab === 'battleRooms' && 'Generated Battle Rooms'}
                              {selectedAdminFeatureTab === 'ppts' && 'Generated PPTs'}
                              {selectedAdminFeatureTab === 'smartCompares' && 'Smart Video Compare History'}
                            </strong>
                            <p style={{ color: '#9CA3AF', margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                              Showing selected feature details for this user.
                            </p>
                          </div>
                        </div>

                        <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem', maxHeight: '360px', overflowY: 'auto' }} className="custom-scroll">
                          {selectedAdminFeatureTab === 'summaries' && (
                            (selectedAdminUserProgress.summaries || []).length ? (selectedAdminUserProgress.summaries || []).map((item) => (
                              <div key={item.id} style={{ padding: '0.9rem', borderRadius: '12px', background: '#111827', border: '1px solid #1F2937' }}>
                                <div style={{ color: '#FFFFFF', fontWeight: '900' }}>{item.title || item.summaryTitle || 'Generated Summary'}</div>
                                <div style={{ color: '#9CA3AF', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: '1.5' }}>
                                  {item.url || item.sourceUrl || 'No URL'} • {item.updatedAt || item.savedAt || item.createdAt || '-'}
                                </div>
                                {(item.shortDescription || item.description) && (
                                  <div style={{ color: '#D1D5DB', fontSize: '0.88rem', marginTop: '0.45rem', lineHeight: '1.55' }}>{item.shortDescription || item.description}</div>
                                )}
                              </div>
                            )) : <div style={{ color: '#9CA3AF', textAlign: 'center', padding: '1rem' }}>No summaries generated by this user yet.</div>
                          )}

                          {selectedAdminFeatureTab === 'assessments' && (
                            (selectedAdminUserProgress.attempts || []).length ? (selectedAdminUserProgress.attempts || []).map((item) => (
                              <div key={`${item.assessmentId}-${item.id}`} style={{ padding: '0.9rem', borderRadius: '12px', background: '#111827', border: '1px solid #1F2937', display: 'grid', gap: '0.35rem' }}>
                                <div style={{ color: '#FFFFFF', fontWeight: '900' }}>{item.assessmentTitle || 'Assessment'}</div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', color: '#D1D5DB', fontSize: '0.84rem' }}>
                                  <span>Mode: {item.assessmentMode || 'solo'}</span>
                                  <span>Score: {item.score || 0}/{item.totalMarks || 20}</span>
                                  <span>Accuracy: {item.percentage || item.accuracy || 0}%</span>
                                  <span>{item.submittedAt || '-'}</span>
                                </div>
                                {(item.remarks || item.achievement) && (
                                  <div style={{ color: '#FBBF24', fontSize: '0.84rem' }}>{item.achievement || ''} {item.remarks || ''}</div>
                                )}
                              </div>
                            )) : <div style={{ color: '#9CA3AF', textAlign: 'center', padding: '1rem' }}>No assessments attempted by this user yet.</div>
                          )}

                          {selectedAdminFeatureTab === 'battleRooms' && (
                            (selectedAdminUserProgress.battleRooms || []).length ? (selectedAdminUserProgress.battleRooms || []).map((item) => (
                              <div key={`${item.source}-${item.id}`} style={{ padding: '0.9rem', borderRadius: '12px', background: '#111827', border: '1px solid #1F2937' }}>
                                <div style={{ color: '#FFFFFF', fontWeight: '900' }}>{item.title || 'Battle Room'} {item.roomCode ? `• ${item.roomCode}` : ''}</div>
                                <div style={{ color: '#9CA3AF', fontSize: '0.84rem', marginTop: '0.35rem' }}>
                                  Status: {item.status || '-'} • Players: {item.playerCount || 0} • Attempts: {item.attemptedCount || 0} • Created: {item.createdAt || '-'}
                                </div>
                              </div>
                            )) : <div style={{ color: '#9CA3AF', textAlign: 'center', padding: '1rem' }}>No Battle Rooms generated by this user yet.</div>
                          )}

                          {selectedAdminFeatureTab === 'ppts' && (
                            (selectedAdminUserProgress.ppts || []).length ? (selectedAdminUserProgress.ppts || []).map((item) => (
                              <div key={item.id} style={{ padding: '0.9rem', borderRadius: '12px', background: '#111827', border: '1px solid #1F2937' }}>
                                <div style={{ color: '#FFFFFF', fontWeight: '900' }}>{item.title || 'Generated PPT'}</div>
                                <div style={{ color: '#9CA3AF', fontSize: '0.84rem', marginTop: '0.35rem' }}>
                                  Slides: {item.slideCount || 0} • Template: {item.template || '-'} • Saved: {item.savedAt || item.createdAt || '-'}
                                </div>
                              </div>
                            )) : <div style={{ color: '#9CA3AF', textAlign: 'center', padding: '1rem' }}>No PPTs generated by this user yet.</div>
                          )}

                          {selectedAdminFeatureTab === 'smartCompares' && (
                            (selectedAdminUserProgress.smartCompares || []).length ? (selectedAdminUserProgress.smartCompares || []).map((item) => (
                              <div key={`${item.source}-${item.id}`} style={{ padding: '0.9rem', borderRadius: '12px', background: '#111827', border: '1px solid #1F2937' }}>
                                <div style={{ color: '#FFFFFF', fontWeight: '900' }}>{item.isSimilar ? 'Similar Videos' : 'Topic Mismatch'} • {item.similarityScore || 0}%</div>
                                <div style={{ color: '#9CA3AF', fontSize: '0.84rem', marginTop: '0.35rem', lineHeight: '1.5' }}>
                                  {item.video1Topic || 'Video 1'} vs {item.video2Topic || 'Video 2'} • {item.generatedAt || '-'}
                                </div>
                                {item.bestOverall && <div style={{ color: '#38BDF8', fontSize: '0.84rem', marginTop: '0.35rem' }}>Best Overall: {item.bestOverall}</div>}
                              </div>
                            )) : <div style={{ color: '#9CA3AF', textAlign: 'center', padding: '1rem' }}>No Smart Video Compare history for this user yet.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ color: '#9CA3AF', padding: '3rem', textAlign: 'center' }}>{adminActionMessage || authError || 'Click Refresh to view reports.'}</div>
            )}
          </div>
        </div>
      )}

      {currentPage === 'adminProfile' && currentUser?.role === 'admin' && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }} className="profile-layout">
            <aside style={{ background: 'linear-gradient(145deg, #0F1626, #0B1120)', border: '1px solid #1F2937', borderRadius: '22px', padding: '1.3rem', boxShadow: '0 18px 45px rgba(0,0,0,0.35)', position: 'sticky', top: '92px' }}>
              <div style={{ textAlign: 'center', padding: '1rem 0 1.2rem 0', borderBottom: '1px solid #1F2937', marginBottom: '1rem' }}>
                <div style={{ width: '82px', height: '82px', borderRadius: '50%', margin: '0 auto 0.8rem auto', background: profilePhoto ? `url(${profilePhoto}) center/cover` : 'linear-gradient(135deg, #A855F7, #F472B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '2rem', fontWeight: '950', border: '2px solid rgba(168,85,247,0.45)', boxShadow: '0 0 28px rgba(168,85,247,0.25)' }}>{!profilePhoto && userInitial}</div>
                <h3 style={{ margin: 0, color: '#FFF', fontWeight: '900' }}>{currentUser.name || 'Admin'}</h3>
                <p style={{ margin: '0.35rem 0 0 0', color: '#9CA3AF', fontSize: '0.84rem', wordBreak: 'break-word' }}>{currentUser.email}</p>
              </div>
              {[
                ['details', '🛡️ Admin Details'],
                ['edit', '✏️ Edit Profile'],
                ['settings', '⚙️ Settings'],
                ['logout', '🚪 Logout']
              ].map(([id, label]) => (
                <button key={id} type="button" onClick={() => id === 'logout' ? requestLogout() : setAdminTab(id)} style={{ width: '100%', textAlign: 'left', background: adminTab === id ? 'rgba(168,85,247,0.14)' : 'transparent', color: adminTab === id ? '#C084FC' : '#D1D5DB', border: adminTab === id ? '1px solid rgba(168,85,247,0.32)' : '1px solid transparent', padding: '0.85rem 0.95rem', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', marginBottom: '0.45rem' }} className="simple-btn-glow">{label}</button>
              ))}
            </aside>
            <main style={{ backgroundColor: '#0F1626', border: '1px solid #1F2937', borderRadius: '22px', padding: '1.7rem', boxShadow: '0 18px 45px rgba(0,0,0,0.28)', minHeight: '560px' }}>
              {adminTab === 'details' && (
                <div>
                  <h2 style={{ margin: 0, color: '#FFF', fontSize: '1.8rem', fontWeight: '950' }}>Admin Details</h2>
                  <p style={{ color: '#9CA3AF' }}>Secure administrator profile information.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                    {[
                      ['Admin Name', currentUser.name || '-'],
                      ['Admin Email', currentUser.email || '-'],
                      ['Role', currentUser.role || 'admin'],
                      ['Provider', currentUser.provider || 'password'],
                      ['Last Login', currentUser.lastLoginAt || '-']
                    ].map(([label, value]) => <div key={label} style={{ backgroundColor: '#0B1120', border: '1px solid #1F2937', borderRadius: '16px', padding: '1rem' }}><p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.8rem', fontWeight: '800' }}>{label}</p><strong style={{ color: '#E5E7EB', display: 'block', marginTop: '0.35rem', wordBreak: 'break-word' }}>{value}</strong></div>)}
                  </div>
                </div>
              )}
              {adminTab === 'edit' && (
                <div>
                  <h2 style={{ margin: 0, color: '#FFF', fontSize: '1.8rem', fontWeight: '950' }}>Edit Admin Profile</h2>
                  <p style={{ color: '#9CA3AF' }}>Change admin name and choose a profile photo from your device.</p>
                  <form onSubmit={handleProfileUpdate} style={{ display: 'grid', gap: '1rem', marginTop: '1.4rem', maxWidth: '620px' }}>
                    <label style={{ color: '#9CA3AF', fontSize: '0.85rem', fontWeight: '800' }}>Change Name</label>
                    <input value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} style={{ padding: '0.95rem', borderRadius: '12px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }} />
                    <label style={{ color: '#9CA3AF', fontSize: '0.85rem', fontWeight: '800' }}>Change Profile Photo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', backgroundColor: '#0B1120', border: '1px solid #1F2937', borderRadius: '14px', padding: '1rem' }}>
                      <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #A855F7, #F472B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: '950', fontSize: '1.6rem', flexShrink: 0 }}>
                        {profileForm.photoURL ? <img src={profileForm.photoURL} alt="Admin profile preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (profileForm.name || currentUser?.name || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <input id="admin-profile-photo-upload" type="file" accept="image/*" onChange={handleProfilePhotoUpload} style={{ display: 'none' }} />
                        <label htmlFor="admin-profile-photo-upload" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem', background: 'linear-gradient(135deg, #A855F7, #F472B6)', color: '#FFFFFF', border: 'none', borderRadius: '12px', padding: '0.85rem 1.05rem', cursor: 'pointer', fontWeight: '950', boxShadow: '0 12px 28px rgba(168,85,247,0.24)', width: 'fit-content' }}>
                          📷 Choose Admin Photo
                        </label>
                        <small style={{ color: '#9CA3AF', display: 'block', marginTop: '0.5rem' }}>Choose an image from your device. It will be compressed automatically.</small>
                      </div>
                    </div>
                    <button type="submit" disabled={profileLoading} style={{ background: 'linear-gradient(135deg, #A855F7, #F472B6)', color: '#FFF', border: 'none', borderRadius: '12px', padding: '0.95rem', fontWeight: '950', cursor: 'pointer' }} className="simple-btn-glow">{profileLoading ? 'Saving...' : 'Save Admin Profile'}</button>
                  </form>
                  {profileMessage && <p style={{ color: profileMessage.startsWith('✅') ? '#34D399' : '#F87171', marginTop: '1rem' }}>{profileMessage}</p>}
                </div>
              )}
              {adminTab === 'dashboard' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    <div>
                      <h2 style={{ margin: 0, color: '#FFF', fontSize: '1.8rem', fontWeight: '950' }}>Dashboard</h2>
                      <p style={{ margin: '0.45rem 0 0 0', color: '#9CA3AF' }}>Simple admin overview and user management.</p>
                    </div>
                    <button type="button" onClick={() => { loadAdminDashboard(); loadAdminBattleStats(); }} className="history-open-btn simple-btn-glow">Refresh</button>
                  </div>

                  {adminLoading ? (
                    <div style={{ color: '#9CA3AF', padding: '3rem', textAlign: 'center' }}>Loading admin dashboard...</div>
                  ) : adminStats ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        {[
                          ['Total Users', adminStats.totals.totalUsers || 0, '👥', '#00F2FE'],
                          ['Active Users', adminStats.totals.loggedInUsers || 0, '🟢', '#34D399'],
                          ['Summaries Generated', adminStats.totals.totalSummaries || 0, '📄', '#4FACFE'],
                          ['Assessments Attempted', adminStats.totals.totalAssessmentAttempts || 0, '📝', '#FBBF24'],
                          ['Battle Rooms Generated', adminStats.totals.totalBattleRooms || adminBattleStats?.stats?.totalRooms || 0, '⚔️', '#A855F7'],
                          ['PPTs Generated', adminStats.totals.totalPpts || 0, '🎞️', '#FB7185'],
                          ['Smart Video Compares', adminStats.totals.totalSmartCompares || adminBattleStats?.smartCompare?.totalCompares || 0, '🔍', '#38BDF8']
                        ].map(([label, value, icon, color]) => (
                          <div key={label} style={{ background: 'linear-gradient(145deg, #0B1120, #111827)', border: `1px solid ${color}44`, borderRadius: '16px', padding: '1rem', boxShadow: `0 0 22px ${color}10` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                              <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.76rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                              <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                            </div>
                            <strong style={{ display: 'block', color, fontSize: '1.6rem', marginTop: '0.45rem' }}>{value}</strong>
                          </div>
                        ))}
                      </div>

                      <div style={{ backgroundColor: '#0B1120', border: '1px solid #1F2937', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid #1F2937', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <div>
                            <strong style={{ color: '#FFF', fontSize: '1.05rem' }}>Manage Users</strong>
                            <p style={{ margin: '0.25rem 0 0 0', color: '#9CA3AF', fontSize: '0.85rem' }}>Click View User to see simple feature usage counts.</p>
                          </div>
                          <input value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} placeholder="Search users..." style={{ minWidth: '240px', padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }} />
                        </div>

                        <div className="custom-scroll" style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#131C2E', color: '#9CA3AF', textAlign: 'left', fontSize: '0.82rem' }}>
                                {['User', 'Email', 'Status', 'Summaries', 'Assessments', 'Battle Rooms', 'PPTs', 'Smart Compares', 'Actions'].map((h) => (
                                  <th key={h} style={{ padding: '0.9rem' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAdminUsers.map((user) => (
                                <tr key={user.id} style={{ borderTop: '1px solid #1F2937', color: '#E5E7EB', background: selectedAdminUserId === user.id ? 'rgba(0,242,254,0.04)' : 'transparent' }}>
                                  <td style={{ padding: '0.9rem', fontWeight: '800' }}>{user.name}</td>
                                  <td style={{ padding: '0.9rem', color: '#9CA3AF' }}>{user.email}</td>
                                  <td style={{ padding: '0.9rem', color: user.isLoggedIn ? '#34D399' : '#6B7280' }}>{user.isLoggedIn ? 'Active' : 'Offline'}</td>
                                  <td style={{ padding: '0.9rem' }}>{user.summariesGenerated || 0}</td>
                                  <td style={{ padding: '0.9rem' }}>{user.assessmentsAttempted || 0}</td>
                                  <td style={{ padding: '0.9rem' }}>{user.battleRoomsGenerated || 0}</td>
                                  <td style={{ padding: '0.9rem' }}>{user.pptsGenerated || 0}</td>
                                  <td style={{ padding: '0.9rem' }}>{user.smartCompares || 0}</td>
                                  <td style={{ padding: '0.9rem' }}>
                                    <button type="button" onClick={() => loadAdminUserProgress(user.id)} className="simple-btn-glow" style={{ background: 'rgba(0,242,254,0.10)', color: '#00F2FE', border: '1px solid rgba(0,242,254,0.30)', borderRadius: '10px', padding: '0.58rem 0.8rem', cursor: 'pointer', fontWeight: '900' }}>
                                      View User
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {selectedAdminUserLoading && (
                          <div style={{ padding: '1rem', color: '#9CA3AF', borderTop: '1px solid #1F2937' }}>Loading selected user details...</div>
                        )}

                        {selectedAdminUserProgress && (
                          <div style={{ padding: '1rem', borderTop: '1px solid #1F2937', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                              <div>
                                <h3 style={{ color: '#FFF', margin: 0, fontSize: '1.1rem', fontWeight: '950' }}>{selectedAdminUserProgress.user?.name || 'Selected User'}</h3>
                                <p style={{ color: '#9CA3AF', margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>{selectedAdminUserProgress.user?.email || ''}</p>
                              </div>
                              <button type="button" onClick={() => { setSelectedAdminUserId(''); setSelectedAdminUserProgress(null); }} className="simple-btn-glow" style={{ background: 'transparent', color: '#9CA3AF', border: '1px solid #374151', borderRadius: '10px', padding: '0.6rem 0.85rem', cursor: 'pointer', fontWeight: '850' }}>
                                Close
                              </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
                              {[
                                ['Summaries Generated', selectedAdminUserProgress.stats?.summaryCount || 0, '#00F2FE'],
                                ['Assessments Attempted', selectedAdminUserProgress.stats?.assessmentCount || selectedAdminUserProgress.stats?.attemptCount || 0, '#FBBF24'],
                                ['Battle Rooms Generated', selectedAdminUserProgress.stats?.battleRoomCount || 0, '#A855F7'],
                                ['PPTs Generated', selectedAdminUserProgress.stats?.pptCount || 0, '#FB7185'],
                                ['Smart Video Compares', selectedAdminUserProgress.stats?.smartCompareCount || 0, '#38BDF8']
                              ].map(([label, value, color]) => (
                                <div key={label} style={{ background: '#111827', border: `1px solid ${color}44`, borderRadius: '14px', padding: '0.9rem' }}>
                                  <div style={{ color: '#9CA3AF', fontSize: '0.72rem', fontWeight: '950', textTransform: 'uppercase' }}>{label}</div>
                                  <div style={{ color, fontSize: '1.45rem', fontWeight: '950', marginTop: '0.35rem' }}>{value}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#9CA3AF', padding: '3rem', textAlign: 'center' }}>Click Refresh to view reports.</div>
                  )}
                </div>
              )}
              {adminTab === 'settings' && (
                <div>
                  <h2 style={{ margin: 0, color: '#FFF', fontSize: '1.8rem', fontWeight: '950' }}>Security Settings</h2>
                  <p style={{ color: '#9CA3AF' }}>Change password and review admin security notes.</p>
                  <div style={{ display: 'grid', gap: '1rem', marginTop: '1.4rem' }}>
                    <div style={{ backgroundColor: '#0B1120', border: '1px solid #1F2937', borderRadius: '16px', padding: '1.1rem' }}>
                      <h3 style={{ color: '#FFF', marginTop: 0 }}>Change Password</h3>
                      <p style={{ color: '#9CA3AF', marginBottom: '1rem' }}>Update the admin password directly. No reset email required.</p>
                      <form onSubmit={handleDirectPasswordChange} style={{ display: 'grid', gap: '0.85rem' }}>
                        <input
                          type={showChangePasswords ? 'text' : 'password'}
                          placeholder="Current admin password"
                          value={passwordChangeForm.currentPassword}
                          onChange={(e) => setPasswordChangeForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                          style={{ padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }}
                        />
                        <input
                          type={showChangePasswords ? 'text' : 'password'}
                          placeholder="New admin password"
                          value={passwordChangeForm.newPassword}
                          onChange={(e) => setPasswordChangeForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                          style={{ padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }}
                        />
                        <input
                          type={showChangePasswords ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          value={passwordChangeForm.confirmPassword}
                          onChange={(e) => setPasswordChangeForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                          style={{ padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <button type="button" onClick={() => setShowChangePasswords((prev) => !prev)} style={{ backgroundColor: '#151D30', color: '#D1D5DB', border: '1px solid #2D3748', borderRadius: '10px', padding: '0.72rem 1rem', fontWeight: '850', cursor: 'pointer' }} className="simple-btn-glow">{showChangePasswords ? '🙈 Hide' : '👁 Show'}</button>
                          <button type="submit" disabled={passwordChangeLoading} style={{ background: 'linear-gradient(135deg, #A855F7, #F472B6)', color: '#FFF', border: 'none', borderRadius: '10px', padding: '0.75rem 1rem', fontWeight: '950', cursor: 'pointer', opacity: passwordChangeLoading ? 0.7 : 1 }} className="simple-btn-glow">{passwordChangeLoading ? 'Updating...' : 'Update Admin Password'}</button>
                        </div>
                        <small style={{ color: '#9CA3AF' }}>New password: 8+ chars, A-Z, 0-9 & special symbol.</small>
                      </form>
                    </div>
                    <div style={{ backgroundColor: '#0B1120', border: '1px solid #1F2937', borderRadius: '16px', padding: '1.1rem' }}>
                      <h3 style={{ color: '#FFF', marginTop: 0 }}>Security Settings</h3>
                      <p style={{ color: '#9CA3AF' }}>Admin actions are logged in Firebase activities. Keep admin access limited to trusted accounts.</p>
                    </div>
                  </div>
                  {profileMessage && <p style={{ color: profileMessage.startsWith('✅') ? '#34D399' : '#F87171', marginTop: '1rem' }}>{profileMessage}</p>}
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      {currentPage === 'auth' && !currentUser && (
        <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '3rem 1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(320px, 460px)', gap: '2rem', alignItems: 'center' }} className="auth-public-layout">
            <section style={{ padding: '2rem', borderRadius: '24px', border: '1px solid rgba(0,242,254,0.14)', background: 'linear-gradient(145deg, rgba(15,22,38,0.78), rgba(7,10,19,0.62))', boxShadow: '0 24px 70px rgba(0,0,0,0.35)' }}>
              <div style={{ color: '#00F2FE', fontWeight: '950', letterSpacing: '1px', fontSize: '0.82rem', marginBottom: '0.8rem' }}>BRIEF BOT ACCESS</div>
              <h1 style={{ margin: 0, color: '#FFF', fontSize: '2.6rem', lineHeight: '1.1', fontWeight: '950', letterSpacing: '-1px' }}>
                Start learning smarter with AI summaries and assessments.
              </h1>
              <p style={{ color: '#9CA3AF', fontSize: '1.05rem', lineHeight: '1.75', marginTop: '1rem', maxWidth: '620px' }}>
                
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginTop: '1.6rem' }}>
                {[
                  ['⚡', 'Smart Summary', 'Timestamped learning briefs'],
                  ['🎞', 'PPT Studio', 'Generate editable PowerPoint slides'],
                  ['📝', 'Assessment Arena', 'MCQ, blanks, descriptive'],
                  ['⚔️', 'Battle Room', 'Group assessment with leaderboard'],
                  ['🔍', 'Smart Compare', 'Compare two learning videos'],
                  ['📊', 'Progress Reports', 'Admin-visible analytics']
                ].map(([icon, title, desc]) => (
                  <div key={title} style={{ padding: '1rem', borderRadius: '16px', border: '1px solid #1F2937', backgroundColor: 'rgba(15,22,38,0.72)' }}>
                    <div style={{ fontSize: '1.55rem', marginBottom: '0.4rem' }}>{icon}</div>
                    <strong style={{ color: '#FFF' }}>{title}</strong>
                    <p style={{ margin: '0.35rem 0 0 0', color: '#9CA3AF', fontSize: '0.88rem', lineHeight: '1.45' }}>{desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ background: 'linear-gradient(145deg, rgba(15,22,38,0.95), rgba(7,10,19,0.95))', border: `1px solid ${isAdminLogin ? 'rgba(168,85,247,0.35)' : 'rgba(0,242,254,0.22)'}`, borderRadius: '26px', padding: '2rem', boxShadow: '0 28px 90px rgba(0,0,0,0.48)' }}>
              <div style={{ display: 'flex', gap: '0.55rem', marginBottom: '1.4rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => resetAuthAndOpen('login')} style={{ flex: 1, minWidth: '95px', border: authMode === 'login' ? '1px solid #00F2FE' : '1px solid #2D3748', background: authMode === 'login' ? 'rgba(0,242,254,0.13)' : '#111827', color: authMode === 'login' ? '#00F2FE' : '#D1D5DB', borderRadius: '12px', padding: '0.72rem', cursor: 'pointer', fontWeight: '900' }} className="simple-btn-glow">Login</button>
                <button type="button" onClick={() => resetAuthAndOpen('register')} style={{ flex: 1, minWidth: '95px', border: authMode === 'register' ? '1px solid #00F2FE' : '1px solid #2D3748', background: authMode === 'register' ? 'rgba(0,242,254,0.13)' : '#111827', color: authMode === 'register' ? '#00F2FE' : '#D1D5DB', borderRadius: '12px', padding: '0.72rem', cursor: 'pointer', fontWeight: '900' }} className="simple-btn-glow">Sign Up</button>
                <button type="button" onClick={() => resetAuthAndOpen('admin')} style={{ flex: 1, minWidth: '115px', border: authMode === 'admin' ? '1px solid #A855F7' : '1px solid #2D3748', background: authMode === 'admin' ? 'rgba(168,85,247,0.15)' : '#111827', color: authMode === 'admin' ? '#C084FC' : '#D1D5DB', borderRadius: '12px', padding: '0.72rem', cursor: 'pointer', fontWeight: '900' }} className="simple-btn-glow">Admin</button>
              </div>

              <h2 style={{ margin: 0, color: '#FFF', fontSize: '1.65rem', fontWeight: '950' }}>{authPageTitle}</h2>
              <p style={{ margin: '0.45rem 0 1.3rem 0', color: '#9CA3AF', lineHeight: '1.55' }}>
                {isRegister ? '' : isAdminLogin ? 'Admin access is separated for secure user progress monitoring.' : ''}
              </p>

              <form onSubmit={handleAuthSubmit} style={{ display: 'grid', gap: '1rem' }}>
                {(isRegister || isUserLogin) && (
                  <input value={authForm.name} onChange={(e) => handleAuthInputChange('name', e.target.value)} placeholder="Name" required style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '14px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }} />
                )}
                <input type="email" value={authForm.email} onChange={(e) => handleAuthInputChange('email', e.target.value)} placeholder={isAdminLogin ? 'Admin email' : 'Email'} required style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '14px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }} />
                <div style={{ position: 'relative' }}>
                  <input type={showAuthPassword ? 'text' : 'password'} value={authForm.password} onChange={(e) => handleAuthInputChange('password', e.target.value)} placeholder="Password" required minLength={isRegister ? 8 : 4} style={{ width: '100%', boxSizing: 'border-box', padding: '1rem 3.1rem 1rem 1rem', borderRadius: '14px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }} />
                  <button type="button" onClick={() => setShowAuthPassword((prev) => !prev)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '9px', color: '#D1D5DB', cursor: 'pointer', padding: '0.28rem 0.45rem' }} className="simple-btn-glow">{showAuthPassword ? '🙈' : '👁️'}</button>
                </div>

                {showPasswordCaution && <div style={{ color: '#FBBF24', backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.28)', padding: '0.75rem', borderRadius: '12px', fontSize: '0.88rem' }}>⚠️ Password: 8+ chars, A-Z, 0-9 & special symbol.</div>}
                {authError && <div style={{ color: isSuccessMessage ? '#34D399' : '#F87171', backgroundColor: isSuccessMessage ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${isSuccessMessage ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.35)'}`, padding: '0.85rem', borderRadius: '12px', fontSize: '0.9rem', lineHeight: '1.5' }}>{authError}</div>}

                <button type="submit" disabled={authLoading || (isRegister && !isPasswordStrong(authForm.password))} style={{ background: `linear-gradient(135deg, ${authAccentColor}, ${authSecondaryAccent})`, color: isAdminLogin ? '#FFF' : '#070A13', border: 'none', padding: '1rem', borderRadius: '14px', cursor: 'pointer', fontWeight: '950', opacity: (authLoading || (isRegister && !isPasswordStrong(authForm.password))) ? 0.65 : 1, boxShadow: `0 14px 30px ${isAdminLogin ? 'rgba(168,85,247,0.22)' : 'rgba(0,242,254,0.2)'}` }} className="simple-btn-glow">
                  {authLoading ? 'Please wait...' : isAdminLogin ? 'Admin Login' : isRegister ? 'Create Account' : 'User Sign In'}
                </button>
              </form>

              {!isAdminLogin && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.15rem 0' }}>
                    <span style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.10)' }} />
                    <span style={{ color: '#6B7280', fontSize: '0.78rem', fontWeight: '800' }}>OR</span>
                    <span style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.10)' }} />
                  </div>
                  <button type="button" onClick={() => handleGoogleSignIn('user')} disabled={authLoading} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.16)', color: '#FFF', borderRadius: '14px', padding: '0.95rem', cursor: authLoading ? 'not-allowed' : 'pointer', fontWeight: '900', opacity: authLoading ? 0.7 : 1 }} className="simple-btn-glow">
                    G Continue with Google
                  </button>
                </>
              )}

              <button type="button" onClick={() => setCurrentPage('home')} style={{ width: '100%', marginTop: '1rem', background: 'transparent', border: '1px solid #374151', color: '#9CA3AF', borderRadius: '12px', padding: '0.78rem', cursor: 'pointer', fontWeight: '800' }} className="simple-btn-glow">
                ← Back to Features
              </button>
            </section>
          </div>
        </div>
      )}

      {/* PAGE 1 LAYOUT: PLATFORM HUB OVERVIEW */}
      {currentPage === 'home' && (
        <div style={{ maxWidth: '1260px', margin: '0 auto', padding: '3.2rem 1.5rem 5rem 1.5rem', animation: 'fadeIn 0.4s ease-out' }}>

          <div style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: '370px',
            padding: '0.8rem 1rem 1.2rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                radial-gradient(2px 2px at 12% 22%, rgba(255,255,255,0.80), transparent 55%),
                radial-gradient(1.5px 1.5px at 22% 68%, rgba(0,242,254,0.80), transparent 60%),
                radial-gradient(2px 2px at 40% 18%, rgba(255,255,255,0.60), transparent 60%),
                radial-gradient(1.5px 1.5px at 58% 76%, rgba(168,85,247,0.70), transparent 60%),
                radial-gradient(2px 2px at 76% 28%, rgba(255,255,255,0.70), transparent 60%),
                radial-gradient(1.5px 1.5px at 90% 62%, rgba(79,172,254,0.75), transparent 60%)
              `,
              opacity: 0.55,
              pointerEvents: 'none'
            }} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '760px', margin: '0 auto' }}>
              <h1 style={{
                margin: 0,
                color: '#FFFFFF',
                fontSize: 'clamp(2.8rem, 6.2vw, 4.8rem)',
                lineHeight: '1.0',
                fontWeight: '950',
                letterSpacing: '-2px',
                textShadow: '0 18px 50px rgba(0,0,0,0.45)'
              }}>
                Skip the Bulk.
                <span style={{ display: 'block', marginTop: '0.48rem' }}>
                  Get the <span style={{ background: 'linear-gradient(135deg, #00F2FE, #4FACFE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Brief.</span>
                </span>
              </h1>

              <button
                type="button"
                onClick={() => requireUserAccess('workspace')}
                style={{
                  marginTop: '3.4rem',
                  background: 'linear-gradient(135deg, #00F2FE, #4FACFE)',
                  color: '#04111F',
                  border: 'none',
                  borderRadius: '13px',
                  padding: '0.95rem 1.55rem',
                  cursor: 'pointer',
                  fontWeight: '950',
                  fontSize: '0.98rem',
                  boxShadow: '0 18px 36px rgba(0,242,254,0.24)'
                }}
                className="simple-btn-glow"
              >
                Get Briefed →
              </button>
            </div>
          </div>

          <div style={{ marginTop: '-0.9rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ color: '#00F2FE', fontWeight: '900', fontSize: '2.0rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Everything in one platform</div>
              <h2 style={{ color: '#FFFFFF', fontSize: '2.2rem', margin: '0.55rem 0 0 0', fontWeight: '950' }}></h2>
              <p style={{ color: '#9CA3AF', maxWidth: '760px', margin: '0.75rem auto 0 auto', lineHeight: '1.7' }}></p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {homeFeatureCards.map((card) => (
                <div
                  key={card.title}
                  onMouseMove={handleFeatureTiltMove}
                  onMouseLeave={handleFeatureTiltLeave}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0px)',
                    transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                    background: 'linear-gradient(145deg, #0F1626, #0A1120)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '24px',
                    padding: '1.35rem',
                    boxShadow: '0 18px 45px rgba(0,0,0,0.26)'
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at top right, ${card.glow}, transparent 52%)`, pointerEvents: 'none' }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem', background: 'rgba(255,255,255,0.04)', border: `1px solid ${card.accent}55`, boxShadow: `0 0 24px ${card.glow}` }}>{card.icon}</div>
                      <span style={{ color: card.accent, border: `1px solid ${card.accent}55`, background: `${card.accent}12`, padding: '0.35rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '900', alignSelf: 'center' }}>{card.tag}</span>
                    </div>
                    <h3 style={{ color: '#FFFFFF', margin: '1rem 0 0.55rem 0', fontSize: '1.18rem', fontWeight: '900' }}>{card.title}</h3>
                    <p style={{ color: '#9CA3AF', lineHeight: '1.65', margin: 0, minHeight: '96px' }}>{card.description}</p>
                    <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                      {card.points.map((point) => (
                        <span key={point} style={{ color: '#E5E7EB', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '0.38rem 0.72rem', fontSize: '0.76rem', fontWeight: '800' }}>{point}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <section style={{ marginTop: '3.4rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
              <div style={{ color: '#00F2FE', fontWeight: '950', fontSize: '2.0rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>How It Works</div>
              <h2 style={{ color: '#FFFFFF', fontSize: '2.25rem', margin: '0.35rem 0 0 0', fontWeight: '950' }}>Paste once. Learn, present, practice, and grow.</h2>
              <p style={{ color: '#9CA3AF', maxWidth: '850px', margin: '0.8rem auto 0 auto', lineHeight: '1.8' }}>
                
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
              {[
                {
                  step: '01',
                  icon: '🔗',
                  title: 'Paste a Link',
                  text: 'Users paste a YouTube video or article link in the Workspace. Brief Bot checks the content and prepares it for learning.'
                },
                {
                  step: '02',
                  icon: '⚡',
                  title: 'Generate Smart Summary',
                  text: 'The system creates a clean summary with simple points, useful coverage, and timestamp-based learning support for videos.'
                },
                {
                  step: '03',
                  icon: '🔍',
                  title: 'Compare Videos',
                  text: 'Smart Compare helps users compare two similar videos and decide which one is easier, more detailed, better explained, and more useful for learning.'
                },
                {
                  step: '04',
                  icon: '🎞️',
                  title: 'Convert into PPT',
                  text: 'With PPT Studio, the summary can become editable slides. Users can adjust slide points and export a ready presentation.'
                },
                {
                  step: '05',
                  icon: '📝',
                  title: 'Practice Assessment',
                  text: 'Assessment Arena generates MCQs, fill-in-the-blanks, and descriptive questions to test understanding after studying.'
                },
                {
                  step: '06',
                  icon: '⚔️',
                  title: 'Battle with Friends',
                  text: 'Battle Room lets multiple users join with a room code, attempt the same timed test, and view leaderboard results.'
                },
                {
                  step: '07',
                  icon: '📊',
                  title: 'Track Progress',
                  text: 'Profile and Admin Dashboard store summaries, PPTs, tests, Battle Room activity, and Smart Compare usage for review.'
                }
              ].map((item) => (
                <div key={item.step} style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg, #0F1626, #0A1120)', border: '1px solid rgba(0,242,254,0.12)', borderRadius: '22px', padding: '1.25rem', boxShadow: '0 18px 45px rgba(0,0,0,0.24)' }}>
                  <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '110px', height: '110px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,242,254,0.14), transparent 65%)' }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '17px', background: 'rgba(0,242,254,0.08)', border: '1px solid rgba(0,242,254,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.55rem' }}>{item.icon}</div>
                      <span style={{ color: '#00F2FE', fontSize: '0.8rem', fontWeight: '950', border: '1px solid rgba(0,242,254,0.24)', borderRadius: '999px', padding: '0.35rem 0.62rem' }}>{item.step}</span>
                    </div>
                    <h3 style={{ color: '#FFFFFF', margin: '1rem 0 0.55rem 0', fontSize: '1.08rem', fontWeight: '950' }}>{item.title}</h3>
                    <p style={{ color: '#9CA3AF', margin: 0, lineHeight: '1.65', fontSize: '0.92rem' }}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginTop: '3.4rem', position: 'relative', overflow: 'hidden', borderRadius: '30px', border: '1px solid rgba(168,85,247,0.16)', background: 'linear-gradient(145deg, rgba(15,22,38,0.95), rgba(7,10,19,0.98))', padding: '2rem', boxShadow: '0 24px 70px rgba(0,0,0,0.32)' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top left, rgba(0,242,254,0.12), transparent 32%), radial-gradient(circle at bottom right, rgba(168,85,247,0.16), transparent 34%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ textAlign: 'center', marginBottom: '1.7rem' }}>
                <div style={{ color: '#A855F7', fontWeight: '950', fontSize: '2.0rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Why Brief Bot?</div>
                <h2 style={{ color: '#FFFFFF', fontSize: '2.25rem', margin: '0.35rem 0 0 0', fontWeight: '950' }}>Built for minds that learn beyond limits</h2>
                <p style={{ color: '#9CA3AF', maxWidth: '860px', margin: '0.8rem auto 0 auto', lineHeight: '1.8' }}>
                  Whether it is for study, teaching, presentations, training, or quick knowledge review, Brief Bot converts long content into useful learning outputs. It brings summaries, PPTs, assessments, Battle Rooms, Smart Compare, and progress tracking into one simple platform.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 0.95fr) minmax(280px, 1.05fr)', gap: '1.2rem', alignItems: 'stretch' }} className="assessment-layout">
                <div style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'linear-gradient(145deg, rgba(0,242,254,0.08), rgba(17,24,39,0.92) 42%, rgba(168,85,247,0.08))',
                  border: '1px solid rgba(0,242,254,0.20)',
                  borderRadius: '24px',
                  padding: '1.45rem',
                  boxShadow: '0 22px 58px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.04)'
                }}>
                  <div style={{ position: 'absolute', width: '180px', height: '180px', top: '-90px', right: '-70px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,242,254,0.20), transparent 68%)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', width: '220px', height: '220px', bottom: '-120px', left: '-95px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.16), transparent 70%)', pointerEvents: 'none' }} />

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.42rem 0.75rem', borderRadius: '999px', background: 'rgba(0,242,254,0.10)', border: '1px solid rgba(0,242,254,0.24)', color: '#A5F3FC', fontSize: '0.76rem', fontWeight: '950', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.9rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00F2FE', boxShadow: '0 0 12px rgba(0,242,254,0.9)' }} />
                      Complete Flow
                    </div>

                    <h3 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.45rem', fontWeight: '950', letterSpacing: '-0.02em' }}>The complete learning chain</h3>
                    <p style={{ color: '#A7B0C0', lineHeight: '1.7', margin: '0.75rem 0 0 0', fontSize: '0.98rem' }}>
                      Brief Bot connects every step of learning into one smooth path — understand content, turn it into slides, test knowledge, compete, compare resources, and track growth.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '0.75rem', marginTop: '1.15rem' }}>
                      {[
                        ['Understand', 'Smart Summary'],
                        ['Create', 'PPT Studio'],
                        ['Practice', 'Assessment'],
                        ['Compete', 'Battle Room'],
                        ['Compare', 'Smart Compare'],
                        ['Improve', 'Progress']
                      ].map(([title, sub]) => (
                        <div key={title} style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '15px', padding: '0.82rem' }}>
                          <div style={{ color: '#00F2FE', fontSize: '0.86rem', fontWeight: '950' }}>{title}</div>
                          <div style={{ color: '#D1D5DB', fontSize: '0.78rem', marginTop: '0.25rem', fontWeight: '750' }}>{sub}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gap: '0.7rem', marginTop: '1.15rem' }}>
                      {[
                        'Smart Summary turns long content into clear notes.',
                        'PPT Studio converts ideas into presentation-ready slides.',
                        'Assessment Arena and Battle Room make practice measurable and fun.',
                        'Smart Compare helps users choose the better resource before learning.'
                      ].map((point) => (
                        <div key={point} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start', color: '#E5E7EB', lineHeight: '1.55', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '13px', padding: '0.7rem 0.8rem' }}>
                          <span style={{ color: '#00F2FE', fontWeight: '950', textShadow: '0 0 12px rgba(0,242,254,0.55)' }}>✓</span>
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
                  {[
                    { icon: '⏱️', title: 'Saves Time', text: 'Students can move from link to notes, PPT, and test without switching between many tools.', color: '#00F2FE' },
                    { icon: '🧠', title: 'Improves Understanding', text: 'Summaries, questions, and answers help users revise the same topic in different ways.', color: '#34D399' },
                    { icon: '🎯', title: 'Shows Progress', text: 'Profiles and admin reports show how many summaries, PPTs, tests, battles, and compares were used.', color: '#FBBF24' },
                    { icon: '🚀', title: 'All-in-One Workspace', text: 'Summaries, PPTs, assessments, Battle Room, Smart Compare, and progress tracking work together in one clean platform.', color: '#A855F7' }
                  ].map((item) => (
                    <div key={item.title} style={{ background: '#0B1120', border: `1px solid ${item.color}33`, borderRadius: '20px', padding: '1.15rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${item.color}12`, border: `1px solid ${item.color}44`, fontSize: '1.45rem', marginBottom: '0.85rem' }}>{item.icon}</div>
                      <h3 style={{ color: '#FFFFFF', margin: 0, fontSize: '1rem', fontWeight: '950' }}>{item.title}</h3>
                      <p style={{ color: '#9CA3AF', lineHeight: '1.6', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <footer style={{ borderTop: '1px solid #1F2937', paddingTop: '2.2rem', textAlign: 'center', color: '#4B5563', fontSize: '0.9rem', marginTop: '3.2rem' }}>
            <p style={{ margin: '0 0 0.4rem 0' }}>Powered by BriefBot</p>
          </footer>
        </div>
      )}


      {currentPage === 'smartCompare' && currentUser && currentUser?.role !== 'admin' && (
        <div style={{ maxWidth: compareResult ? '1320px' : '1240px', margin: '0 auto', padding: '2.8rem 1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ color: '#38BDF8', fontWeight: '950', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem' }}>Smart Video Compare</div>
              <h2 style={{ margin: '0.35rem 0 0 0', color: '#FFFFFF', fontSize: '2rem', fontWeight: '950' }}>
                {compareResult ? 'Smart Compare Report' : 'Compare two learning videos'}
              </h2>
              <p style={{ color: '#9CA3AF', margin: '0.45rem 0 0 0', lineHeight: '1.7', maxWidth: compareResult ? '980px' : '760px' }}>
                {compareResult
                  ? 'Full comparison report with similarity, explanation quality, topic coverage, recommendation, and combined notes.'
                  : 'Paste two YouTube videos about the same topic. Brief Bot checks similarity first, then compares clarity, depth, examples, communication, revision value, and recommends the better video.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
              {compareResult && (
                <button
                  type="button"
                  onClick={() => {
                    setCompareResult(null);
                    setCompareError('');
                  }}
                  className="simple-btn-glow"
                  style={{ background: 'rgba(56,189,248,0.10)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '12px', padding: '0.8rem 1rem', cursor: 'pointer', fontWeight: '900' }}
                >
                  Compare Another
                </button>
              )}
              <button
                type="button"
                onClick={() => setCurrentPage('workspace')}
                className="simple-btn-glow"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#D1D5DB', border: '1px solid #2D3748', borderRadius: '12px', padding: '0.8rem 1rem', cursor: 'pointer', fontWeight: '900' }}
              >
                ← Back to Workspace
              </button>
            </div>
          </div>

          {!compareResult && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 430px) 1fr', gap: '1.35rem', alignItems: 'start' }} className="assessment-layout">
              <aside style={{ background: 'linear-gradient(145deg, #0F1626, #0B1120)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '22px', padding: '1.35rem', boxShadow: '0 18px 45px rgba(0,0,0,0.30)' }}>
                <h3 style={{ color: '#FFFFFF', margin: 0, fontWeight: '950' }}>🔍 Video Links</h3>
                <p style={{ color: '#9CA3AF', fontSize: '0.9rem', lineHeight: '1.6', margin: '0.45rem 0 1rem 0' }}>
                  Use two videos from the same or related topic for the best comparison.
                </p>

                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  <input
                    value={compareVideo1}
                    onChange={(e) => setCompareVideo1(e.target.value)}
                    placeholder="Paste Video Link 1"
                    style={{ padding: '0.95rem', borderRadius: '14px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }}
                  />
                  <input
                    value={compareVideo2}
                    onChange={(e) => setCompareVideo2(e.target.value)}
                    placeholder="Paste Video Link 2"
                    style={{ padding: '0.95rem', borderRadius: '14px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }}
                  />

                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    style={{ padding: '0.95rem', borderRadius: '14px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }}
                  >
                    {languageOptions.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                  </select>

                  {compareError && (
                    <div style={{ color: '#F87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.28)', borderRadius: '12px', padding: '0.85rem', lineHeight: '1.5' }}>
                      ❌ {compareError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleCompareVideos}
                    disabled={compareLoading || !compareVideo1.trim() || !compareVideo2.trim()}
                    className="simple-btn-glow"
                    style={{
                      background: 'linear-gradient(135deg, #38BDF8, #00F2FE)',
                      color: '#07111F',
                      border: 'none',
                      borderRadius: '14px',
                      padding: '1rem',
                      cursor: (compareLoading || !compareVideo1.trim() || !compareVideo2.trim()) ? 'not-allowed' : 'pointer',
                      fontWeight: '950',
                      opacity: (compareLoading || !compareVideo1.trim() || !compareVideo2.trim()) ? 0.65 : 1,
                      boxShadow: '0 14px 30px rgba(56,189,248,0.18)'
                    }}
                  >
                    {compareLoading ? 'Analyzing both videos...' : 'Compare Videos'}
                  </button>
                </div>

                <div style={{ marginTop: '1.1rem', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.20)', borderRadius: '16px', padding: '1rem', color: '#D1D5DB', lineHeight: '1.6', fontSize: '0.9rem' }}>
                  <strong style={{ color: '#38BDF8' }}>How it works:</strong>
                  <div>1. Extracts transcripts</div>
                  <div>2. Checks topic similarity</div>
                  <div>3. Compares explanation quality</div>
                  <div>4. Recommends the better video</div>
                </div>
              </aside>

              <main style={{ display: 'grid', gap: '1rem' }}>
                {!compareLoading && (
                  <div style={{ background: 'linear-gradient(145deg, #0F1626, #0B1120)', border: '1px dashed rgba(56,189,248,0.35)', borderRadius: '22px', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎬</div>
                    <h3 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.5rem', fontWeight: '950' }}>Find the best video before studying</h3>
                    <p style={{ color: '#9CA3AF', maxWidth: '680px', margin: '0.75rem auto 0 auto', lineHeight: '1.7' }}>
                      Smart Compare works best when both videos discuss the same topic. If topics are different, it will show a mismatch warning instead of giving a wrong comparison.
                    </p>
                  </div>
                )}

                {compareLoading && (
                  <div style={{ background: 'linear-gradient(145deg, #0F1626, #0B1120)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '22px', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔎</div>
                    <h3 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.5rem', fontWeight: '950' }}>Comparing both videos...</h3>
                    <p style={{ color: '#9CA3AF', marginTop: '0.75rem' }}>Checking transcripts, similarity, clarity, depth, and recommendation.</p>
                  </div>
                )}
              </main>
            </div>
          )}

          {compareResult && (
            <div style={{ display: 'grid', gap: '1.15rem' }}>
              <section style={{ background: 'linear-gradient(145deg, #0F1626, #0B1120)', border: `1px solid ${getCompareScoreColor(compareResult.similarityScore)}55`, borderRadius: '24px', padding: '1.5rem', boxShadow: '0 18px 45px rgba(0,0,0,0.30)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 240px) 1fr', gap: '1.2rem', alignItems: 'center' }} className="assessment-layout">
                  <div style={{ background: '#111827', border: `1px solid ${getCompareScoreColor(compareResult.similarityScore)}55`, borderRadius: '20px', padding: '1.2rem', textAlign: 'center' }}>
                    <div style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: '950', textTransform: 'uppercase' }}>Similarity Score</div>
                    <div style={{ color: getCompareScoreColor(compareResult.similarityScore), fontSize: '3rem', fontWeight: '950', marginTop: '0.25rem' }}>{compareResult.similarityScore}%</div>
                  </div>
                  <div>
                    <h3 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.55rem', fontWeight: '950' }}>
                      {compareResult.isSimilar ? '✅ Similar topic comparison ready' : '⚠️ These videos may not be similar'}
                    </h3>
                    <p style={{ color: '#D1D5DB', margin: '0.65rem 0 0 0', lineHeight: '1.7' }}>{compareResult.quickVerdict}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '1rem' }} className="assessment-layout">
                      <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.22)', borderRadius: '14px', padding: '0.85rem' }}>
                        <div style={{ color: '#38BDF8', fontWeight: '950', marginBottom: '0.35rem' }}>Video 1 Topic</div>
                        <div style={{ color: '#D1D5DB' }}>{compareResult.video1Topic || 'Unknown'}</div>
                      </div>
                      <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.22)', borderRadius: '14px', padding: '0.85rem' }}>
                        <div style={{ color: '#C084FC', fontWeight: '950', marginBottom: '0.35rem' }}>Video 2 Topic</div>
                        <div style={{ color: '#D1D5DB' }}>{compareResult.video2Topic || 'Unknown'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {!compareResult.isSimilar && (
                <section style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.28)', borderRadius: '18px', padding: '1rem', color: '#FECACA', lineHeight: '1.6' }}>
                  <strong>Topic mismatch warning:</strong> These videos appear to be different topics. Replace one video with a similar topic video to get a useful recommendation.
                </section>
              )}

              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                {[
                  ['Best Overall', compareResult.bestOverall, '#38BDF8'],
                  ['Beginner Friendly', compareResult.bestForBeginners, '#34D399'],
                  ['More Detailed', compareResult.moreDetailed, '#FBBF24'],
                  ['Communication', compareResult.betterCommunication, '#C084FC'],
                  ['Revision', compareResult.betterForRevision, '#00F2FE']
                ].map(([label, value, color]) => (
                  <div key={label} style={{ background: '#111827', border: `1px solid ${color}44`, borderRadius: '16px', padding: '1rem' }}>
                    <div style={{ color: '#9CA3AF', fontSize: '0.72rem', fontWeight: '950', textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ color, marginTop: '0.45rem', fontWeight: '950', fontSize: '1.05rem' }}>{value || '-'}</div>
                  </div>
                ))}
              </section>

              <section style={{ background: '#0B1120', border: '1px solid #1F2937', borderRadius: '18px', overflow: 'hidden' }}>
                <div style={{ padding: '1rem', color: '#FFFFFF', fontWeight: '950', borderBottom: '1px solid #1F2937' }}>Comparison Table</div>
                <div style={{ overflowX: 'auto' }}>
                  {(compareResult.comparisonTable || []).map((row, index) => (
                    <div key={row.category || index} style={{ minWidth: '780px', display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.3fr 0.8fr', gap: '0.9rem', padding: '0.95rem 1rem', borderBottom: index === (compareResult.comparisonTable || []).length - 1 ? 'none' : '1px solid #1F2937', color: '#D1D5DB', alignItems: 'center' }}>
                      <strong style={{ color: '#FFFFFF' }}>{row.category}</strong>
                      <span>{row.video1}</span>
                      <span>{row.video2}</span>
                      <span style={{ color: '#38BDF8', fontWeight: '900' }}>{row.winner}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {[
                  ['Common Topics', compareResult.commonTopics, '#34D399'],
                  ['Only in Video 1', compareResult.onlyInVideo1, '#38BDF8'],
                  ['Only in Video 2', compareResult.onlyInVideo2, '#A855F7']
                ].map(([title, items, color]) => (
                  <div key={title} style={{ background: '#111827', border: `1px solid ${color}44`, borderRadius: '18px', padding: '1rem' }}>
                    <h4 style={{ color, margin: '0 0 0.75rem 0', fontWeight: '950' }}>{title}</h4>
                    {(items || []).length ? (
                      <ul style={{ color: '#D1D5DB', margin: 0, paddingLeft: '1.2rem', lineHeight: '1.7' }}>
                        {(items || []).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : (
                      <p style={{ color: '#9CA3AF', margin: 0 }}>No clear points found.</p>
                    )}
                  </div>
                ))}
              </section>

              <section style={{ background: 'linear-gradient(145deg, rgba(56,189,248,0.10), rgba(15,22,38,0.98))', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '18px', padding: '1.25rem' }}>
                <h4 style={{ color: '#FFFFFF', margin: '0 0 0.6rem 0', fontWeight: '950' }}>AI Recommendation</h4>
                <p style={{ color: '#D1D5DB', lineHeight: '1.75', margin: 0 }}>{compareResult.recommendation}</p>
              </section>

              {compareResult.isSimilar && compareResult.combinedNotes && (
                <section style={{ background: '#0B1120', border: '1px solid #1F2937', borderRadius: '18px', padding: '1.25rem' }}>
                  <h4 style={{ color: '#FFFFFF', margin: '0 0 0.6rem 0', fontWeight: '950' }}>Best Combined Notes</h4>
                  <div style={{ color: '#D1D5DB', lineHeight: '1.8', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{compareResult.combinedNotes}</div>
                </section>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCompareResult(null);
                    setCompareError('');
                  }}
                  className="simple-btn-glow"
                  style={{ background: 'rgba(56,189,248,0.10)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '14px', padding: '0.9rem 1.2rem', cursor: 'pointer', fontWeight: '950' }}
                >
                  Compare Another
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompareResult(null);
                    setCompareError('');
                    setCurrentPage('workspace');
                  }}
                  className="simple-btn-glow"
                  style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)', color: '#FFFFFF', border: 'none', borderRadius: '14px', padding: '0.9rem 1.2rem', cursor: 'pointer', fontWeight: '950', boxShadow: '0 14px 30px rgba(249,115,22,0.18)' }}
                >
                  Exit Smart Compare
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      {currentPage === 'pptStudio' && currentUser && currentUser?.role !== 'admin' && (
        <div style={{ maxWidth: '1480px', margin: '0 auto', padding: '2.8rem 1.2rem', animation: 'fadeIn 0.3s ease-out' }}>
          {!analysisData ? (
            <div style={{
              background: 'linear-gradient(145deg, #0F1626, #0B1120)',
              border: '1px dashed rgba(168,85,247,0.35)',
              borderRadius: '24px',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              boxShadow: '0 18px 45px rgba(0,0,0,0.25)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>🎞</div>
              <h2 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.7rem', fontWeight: '950' }}>
                Generate a Smart Summary first
              </h2>
              <p style={{ color: '#9CA3AF', maxWidth: '600px', margin: '0.75rem auto 1.5rem auto', lineHeight: '1.7' }}>
                PPT Studio needs your latest summary to create editable slides.
              </p>
              <button
                type="button"
                onClick={() => setCurrentPage('workspace')}
                style={{
                  background: 'linear-gradient(135deg, #A855F7, #00F2FE)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '0.95rem 1.35rem',
                  cursor: 'pointer',
                  fontWeight: '950'
                }}
               className="simple-btn-glow">
                Go to Workspace
              </button>
            </div>
          ) : !pptPlan ? (
            <div style={{
              background: 'linear-gradient(145deg, #0F1626, #0B1120)',
              border: '1px solid rgba(168,85,247,0.25)',
              borderRadius: '24px',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              boxShadow: '0 18px 45px rgba(0,0,0,0.25)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>✨</div>
              <h2 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.7rem', fontWeight: '950' }}>
                PPT Studio Editor
              </h2>
              <p style={{ color: '#9CA3AF', maxWidth: '620px', margin: '0.75rem auto 1.5rem auto', lineHeight: '1.7' }}>
                Click below to generate editable PPT slides from your current summary.
              </p>
              <button
                type="button"
                onClick={handleGeneratePptPlan}
                disabled={pptLoading}
                style={{
                  background: pptLoading ? '#374151' : 'linear-gradient(135deg, #A855F7, #00F2FE)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '0.95rem 1.35rem',
                  cursor: pptLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '950',
                  opacity: pptLoading ? 0.75 : 1
                }}
               className="simple-btn-glow">
                {pptLoading ? 'Creating Slides...' : 'Generate PPT Slides'}
              </button>
              {pptError && (
                <p style={{ color: '#FCA5A5', marginTop: '1rem', fontWeight: '800' }}>❌ {pptError}</p>
              )}
            </div>
          ) : (
            <div style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '0',
              overflow: 'visible',
              boxShadow: 'none'
            }}>
              <div style={{
                padding: '0.4rem 0 1.2rem 0',
                backgroundColor: 'transparent',
                borderBottom: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div>
                  <h2 style={{ margin: 0, color: '#FFF', fontSize: '1.35rem' }}>
                    🎞 PPT Studio Editor
                  </h2>
                  <p style={{ margin: '0.3rem 0 0 0', color: '#9CA3AF', fontSize: '0.9rem' }}>
                    Preview the PPT inside the website, edit slide content, change template, then export the final PPT.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={addPptSlide}
                    style={{
                      padding: '0.7rem 1rem',
                      borderRadius: '10px',
                      border: '1px solid #2D3748',
                      backgroundColor: '#151D30',
                      color: '#D1D5DB',
                      cursor: 'pointer',
                      fontWeight: '800'
                    }}
                   className="simple-btn-glow">
                    ➕ Add Slide
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPpt}
                    disabled={pptExportLoading}
                    style={{
                      padding: '0.7rem 1rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: pptExportLoading ? '#374151' : 'linear-gradient(135deg, #00F2FE, #4FACFE)',
                      color: '#070A13',
                      cursor: pptExportLoading ? 'not-allowed' : 'pointer',
                      fontWeight: '950'
                    }}
                   className="simple-btn-glow">
                    {pptExportLoading ? 'Exporting...' : '⬇ Export PPT'}
                  </button>
                </div>
              </div>

              <div style={{ padding: '0', display: 'grid', gap: '1.2rem' }}>
                {pptError && (
                  <div style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    color: '#FCA5A5',
                    fontWeight: '700'
                  }}>
                    ❌ {pptError}
                  </div>
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem'
                }}>
                  <div>
                    <label style={{ display: 'block', color: '#9CA3AF', fontSize: '0.8rem', fontWeight: '850', marginBottom: '0.4rem' }}>
                      PPT TITLE
                    </label>
                    <input
                      value={pptPlan.title || ''}
                      onChange={(e) => updatePptPlanField('title', e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.85rem',
                        borderRadius: '10px',
                        border: '1px solid #2D3748',
                        backgroundColor: '#151D30',
                        color: '#FFF',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#9CA3AF', fontSize: '0.8rem', fontWeight: '850', marginBottom: '0.4rem' }}>
                      SUBTITLE
                    </label>
                    <input
                      value={pptPlan.subtitle || ''}
                      onChange={(e) => updatePptPlanField('subtitle', e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.85rem',
                        borderRadius: '10px',
                        border: '1px solid #2D3748',
                        backgroundColor: '#151D30',
                        color: '#FFF',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>


                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#9CA3AF', fontSize: '0.8rem', fontWeight: '850', marginBottom: '0.4rem' }}>FONT FAMILY</label>
                    <select value={pptPlan.fontFamily || 'Aptos'} onChange={(e) => updatePptPlanField('fontFamily', e.target.value)} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }}>
                      {['Aptos', 'Arial', 'Georgia', 'Verdana', 'Trebuchet MS', 'Times New Roman'].map((font) => <option key={font} value={font}>{font}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#9CA3AF', fontSize: '0.8rem', fontWeight: '850', marginBottom: '0.4rem' }}>FONT STYLE</label>
                    <select value={pptPlan.fontStyle || 'modern'} onChange={(e) => updatePptPlanField('fontStyle', e.target.value)} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }}>
                      <option value="modern">Modern</option>
                      <option value="bold">Bold</option>
                      <option value="classic">Classic</option>
                      <option value="minimal">Minimal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div style={{ color: '#9CA3AF', fontSize: '0.8rem', fontWeight: '850', marginBottom: '0.65rem' }}>
                    SELECT TEMPLATE
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                    gap: '0.85rem'
                  }}>
                    {pptTemplateOptions.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setPptTemplate(template.id)}
                        style={{
                          position: 'relative',
                          overflow: 'hidden',
                          textAlign: 'left',
                          padding: '1rem',
                          minHeight: '148px',
                          borderRadius: '18px',
                          border: pptTemplate === template.id ? `1px solid ${template.accent}` : '1px solid #2D3748',
                          background: pptTemplate === template.id ? template.gradient : 'linear-gradient(145deg, #151D30, #0B1120)',
                          color: pptTemplate === template.id ? '#FFFFFF' : '#E5E7EB',
                          cursor: 'pointer',
                          boxShadow: pptTemplate === template.id ? `0 0 28px ${template.accent}22` : 'none'
                        }}
                       className="simple-btn-glow">
                        <div style={{ position: 'absolute', width: '90px', height: '90px', right: '-28px', top: '-28px', borderRadius: '50%', background: `${template.accent}22` }} />
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <div style={{ width: '46px', height: '46px', borderRadius: '15px', background: `${template.accent}18`, border: `1px solid ${template.accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.45rem' }}>{template.icon}</div>
                          <span style={{ color: template.accent, background: `${template.accent}14`, border: `1px solid ${template.accent}44`, borderRadius: '999px', padding: '0.25rem 0.55rem', fontSize: '0.68rem', fontWeight: '950' }}>{template.mood}</span>
                        </div>
                        <div style={{ position: 'relative', zIndex: 1, fontWeight: '950', marginTop: '0.85rem', marginBottom: '0.35rem', color: '#FFFFFF' }}>{template.name}</div>
                        <div style={{ position: 'relative', zIndex: 1, fontSize: '0.78rem', color: '#CBD5E1', lineHeight: '1.45' }}>
                          {template.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(145deg, rgba(11,17,32,0.72), rgba(17,24,39,0.68))',
                  border: '1px solid rgba(0,242,254,0.16)',
                  borderRadius: '26px',
                  padding: '1.45rem',
                  boxShadow: '0 22px 60px rgba(0,0,0,0.30)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ color: '#00F2FE', fontSize: '0.78rem', fontWeight: '950', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live PPT Preview</div>
                      <h3 style={{ color: '#FFFFFF', margin: '0.28rem 0 0 0', fontSize: '1.25rem', fontWeight: '950' }}>See and edit your PPT before export</h3>
                    </div>
                    <span style={{ color: '#9CA3AF', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '0.45rem 0.75rem', fontWeight: '850', fontSize: '0.82rem' }}>
                      Slide {Math.min(selectedPptSlideIndex + 1, (pptPlan.slides || []).length)} / {(pptPlan.slides || []).length}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: '1.15rem', alignItems: 'start', width: '100%', minWidth: 0, overflowX: 'hidden' }} className="ppt-preview-layout">
                    <div className="custom-scroll" style={{ display: 'grid', gap: '0.75rem', maxHeight: '620px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '0.35rem', minWidth: 0 }}>
                      <div style={{ color: '#9CA3AF', fontSize: '0.72rem', lineHeight: '1.4', padding: '0 0.2rem' }}>
                        Drag any slide here to reorder it. New slides are added at the end, then drag them to the middle.
                      </div>
                      {(pptPlan.slides || []).map((slide, slideIndex) => {
                        const theme = getPptPreviewTheme();
                        return (
                          <button
                            key={slide.id || slideIndex}
                            type="button"
                            draggable
                            onDragStart={(event) => {
                              setPptSlideDragIndex(slideIndex);
                              event.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(event) => {
                              event.preventDefault();
                              event.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              movePptSlide(pptSlideDragIndex, slideIndex);
                              setPptSlideDragIndex(null);
                            }}
                            onDragEnd={() => setPptSlideDragIndex(null)}
                            onClick={() => setSelectedPptSlideIndex(slideIndex)}
                            className="simple-btn-glow"
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              textAlign: 'left',
                              borderRadius: '14px',
                              border: selectedPptSlideIndex === slideIndex ? `1px solid ${theme.accent}` : '1px solid #1F2937',
                              background: selectedPptSlideIndex === slideIndex ? 'rgba(0,242,254,0.08)' : '#0B0F19',
                              padding: '0.55rem',
                              cursor: 'grab',
                              overflow: 'hidden',
                              opacity: pptSlideDragIndex === slideIndex ? 0.55 : 1,
                              outline: pptSlideDragIndex === slideIndex ? `2px dashed ${theme.accent}` : 'none'
                            }}
                          >
                            <div style={{
                              aspectRatio: '16 / 9',
                              width: '100%',
                              maxWidth: '100%',
                              borderRadius: '10px',
                              background: theme.bg,
                              border: `1px solid ${theme.accent}55`,
                              padding: '0.42rem',
                              overflow: 'hidden',
                              boxSizing: 'border-box',
                              position: 'relative', userSelect: pptDragState ? 'none' : 'auto'
                            }} data-ppt-canvas="true">
                              <div style={{ color: theme.accent, fontWeight: '950', fontFamily: pptPlan.fontFamily || 'Aptos', fontSize: '0.62rem', marginBottom: '0.22rem' }}>SLIDE {slideIndex + 1}</div>
                              <div style={{ color: theme.title, fontWeight: '950', fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slide.title || 'Untitled Slide'}</div>
                              <div style={{ marginTop: '0.3rem', display: 'grid', gap: '0.12rem' }}>
                                {(slide.points || []).slice(0, 3).map((point, idx) => (
                                  <div key={idx} style={{ color: theme.text, fontSize: '0.48rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>• {point}</div>
                                ))}
                              </div>
                              <span style={{ position: 'absolute', right: '0.35rem', bottom: '0.25rem', opacity: 0.45 }}>{theme.decor}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {(() => {
                      const theme = getPptPreviewTheme();
                      const selectedSlide = getSelectedPptSlide();
                      if (!selectedSlide) return null;
                      const selectedSlideImage = selectedSlide.imageMode === 'none'
                        ? ''
                        : selectedSlide.imageMode === 'manual'
                          ? selectedSlide.imageUrl
                          : (selectedSlide.aiImageData || selectedSlide.imageUrl);
                      const fontStyleMeta = getPptFontStyleMeta(pptPlan.fontStyle || 'modern');
                      const selectedPointsFontSize = Math.max(10, Math.min(34, Number(selectedSlide.pointsFontSize ?? 18)));
                      const pointsBox = {
                        x: Number(selectedSlide.pointsX ?? 0.95),
                        y: Number(selectedSlide.pointsY ?? 1.55),
                        w: Number(selectedSlide.pointsW ?? (selectedSlideImage ? 5.95 : 11.0)),
                        h: Number(selectedSlide.pointsH ?? (selectedSlideImage ? 3.75 : 4.75))
                      };
                      const tableColumnCount = selectedSlide.table?.headers?.length || 1;
                      const tableRowCount = (selectedSlide.table?.rows?.length || 0) + 1;
                      const tablePreviewFontSize = Math.max(7, Math.min(13, 15 - Math.max(tableColumnCount, tableRowCount) * 0.45));
                      return (
                        <div style={{ display: 'grid', gap: '1rem', minWidth: 0, width: '100%', overflowX: 'hidden' }}>
                          <div data-ppt-canvas="true" style={{
                            aspectRatio: '16 / 9',
                            width: '100%',
                            maxWidth: '100%',
                            borderRadius: '24px',
                            background: theme.bg,
                            border: `1px solid ${theme.accent}55`,
                            boxShadow: `0 24px 70px ${theme.accent}18`,
                            padding: '2.4rem',
                            position: 'relative',
                            overflow: 'hidden',
                            boxSizing: 'border-box',
                            minHeight: '560px',
                            userSelect: pptDragState ? 'none' : 'auto'
                          }}>
                            <div style={{ position: 'absolute', width: '180px', height: '180px', right: '-70px', top: '-70px', borderRadius: '50%', background: `${theme.accent}22` }} />
                            <div style={{ position: 'absolute', width: '220px', height: '220px', left: '-100px', bottom: '-115px', borderRadius: '50%', background: `${theme.accent2}22` }} />
                            <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                                <span style={{ color: theme.accent, fontWeight: '950', fontSize: '0.78rem', letterSpacing: '0.08em' }}>BRIEF BOT • {theme.name}</span>
                                <span style={{ fontSize: '1.5rem' }}>{theme.decor}</span>
                              </div>

                              <h2 style={{ color: theme.title, margin: 0, fontSize: 'clamp(1.35rem, 2.5vw, 2.25rem)', lineHeight: '1.12', fontWeight: fontStyleMeta.titleWeight, fontFamily: pptPlan.fontFamily || 'Aptos', maxWidth: '92%', letterSpacing: fontStyleMeta.letterSpacing }}>
                                {selectedSlide.title || 'Untitled Slide'}
                              </h2>

                              <div
                                onMouseDown={(event) => handlePptElementMouseDown(event, 'points', 'move', selectedPptSlideIndex)}
                                style={{
                                  position: 'absolute',
                                  left: slideInchesToPercent(pointsBox.x, 13.33),
                                  top: slideInchesToPercent(pointsBox.y, 7.5),
                                  width: slideInchesToPercent(pointsBox.w, 13.33),
                                  height: slideInchesToPercent(pointsBox.h, 7.5),
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '0',
                                  padding: '0',
                                  display: 'grid',
                                  gap: '0.62rem',
                                  overflow: 'hidden',
                                  cursor: 'move',
                                  zIndex: 4,
                                  boxShadow: 'none',
                                  boxSizing: 'border-box',
                                  minWidth: 0
                                }}
                              >
                                <div style={{ display: 'grid', gap: '0.62rem', alignContent: 'start', height: '100%', overflow: 'hidden' }}>
                                  {(selectedSlide.points || []).slice(0, 7).map((point, pointIndex) => (
                                    <div key={pointIndex} style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start', color: theme.text, lineHeight: '1.45', fontWeight: fontStyleMeta.bodyWeight, fontFamily: pptPlan.fontFamily || 'Aptos', fontSize: `${selectedPointsFontSize}px`, letterSpacing: fontStyleMeta.letterSpacing, minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                      <span style={{ color: theme.accent, fontWeight: '950', flexShrink: 0 }}>•</span>
                                      <span style={{ minWidth: 0, whiteSpace: 'normal' }}>{point}</span>
                                    </div>
                                  ))}
                                </div>
                                <div
                                  onMouseDown={(event) => handlePptElementMouseDown(event, 'points', 'resize', selectedPptSlideIndex)}
                                  title="Resize bullet points"
                                  style={{ position: 'absolute', right: 0, bottom: 0, width: '22px', height: '22px', background: `${theme.accent}cc`, color: '#fff', borderRadius: '999px', cursor: 'nwse-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '950' }}
                                >
                                  ↘
                                </div>
                              </div>

                              {(selectedSlide.imageMode !== 'none') && selectedSlideImage && (
                                <div
                                  onMouseDown={(event) => handlePptElementMouseDown(event, 'image', 'move', selectedPptSlideIndex)}
                                  style={{
                                    position: 'absolute',
                                    left: slideInchesToPercent(selectedSlide.imageX ?? 7.25, 13.33),
                                    top: slideInchesToPercent(selectedSlide.imageY ?? 1.65, 7.5),
                                    width: slideInchesToPercent(selectedSlide.imageW ?? 4.65, 13.33),
                                    height: slideInchesToPercent(selectedSlide.imageH ?? 3.55, 7.5),
                                    borderRadius: '18px',
                                    overflow: 'hidden',
                                    border: `2px solid ${theme.accent}`,
                                    background: theme.panel,
                                    cursor: 'move',
                                    boxShadow: `0 16px 38px ${theme.accent}22`,
                                    zIndex: 5
                                  }}
                                >
                                  <img src={selectedSlideImage} alt="Slide visual" draggable={false} onDragStart={(event) => event.preventDefault()} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', userSelect: 'none' }} />
                                  <div
                                    onMouseDown={(event) => handlePptElementMouseDown(event, 'image', 'resize', selectedPptSlideIndex)}
                                    style={{ position: 'absolute', right: 0, bottom: 0, width: '18px', height: '18px', background: theme.accent, borderRadius: '10px 0 0 0', cursor: 'nwse-resize' }}
                                  />
                                </div>
                              )}
                              {selectedSlide.table && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: slideInchesToPercent(selectedSlide.table.tableX ?? 0.9, 13.33),
                                    top: slideInchesToPercent(selectedSlide.table.tableY ?? 4.65, 7.5),
                                    width: slideInchesToPercent(selectedSlide.table.tableW ?? 6.15, 13.33),
                                    height: slideInchesToPercent(selectedSlide.table.tableH ?? 1.65, 7.5),
                                    border: `2px solid ${theme.accent}`,
                                    background: 'rgba(255,255,255,0.96)',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    cursor: 'default',
                                    zIndex: 6,
                                    boxShadow: `0 18px 38px ${theme.accent}20`
                                  }}
                                >
                                  <div
                                    onMouseDown={(event) => handlePptElementMouseDown(event, 'table', 'move', selectedPptSlideIndex)}
                                    title="Drag table"
                                    style={{ position: 'absolute', left: 0, top: 0, width: '22px', height: '22px', zIndex: 8, background: theme.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '900', cursor: 'move', borderRadius: '0 0 8px 0' }}
                                  >
                                    ↕
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedSlide.table.headers?.length || 1}, minmax(0, 1fr))`, gridAutoRows: 'minmax(0, 1fr)', height: '100%', width: '100%' }}>
                                    {[selectedSlide.table.headers || [], ...(selectedSlide.table.rows || [])].map((row, rowIndex) =>
                                      row.map((cell, cellIndex) => (
                                        <input
                                          key={`${rowIndex}-${cellIndex}`}
                                          value={cell}
                                          onMouseDown={(event) => event.stopPropagation()}
                                          onChange={(event) => updatePptSlideTableCell(selectedPptSlideIndex, rowIndex - 1, cellIndex, event.target.value, rowIndex === 0)}
                                          style={{
                                            minWidth: 0,
                                            width: '100%',
                                            height: '100%',
                                            boxSizing: 'border-box',
                                            border: `1px solid ${theme.accent}45`,
                                            background: rowIndex === 0 ? theme.accent : 'rgba(255,255,255,0.96)',
                                            color: rowIndex === 0 ? '#FFFFFF' : '#111827',
                                            fontWeight: rowIndex === 0 ? '900' : '700',
                                            fontSize: `${rowIndex === 0 ? tablePreviewFontSize + 0.5 : tablePreviewFontSize}px`,
                                            padding: rowIndex === 0 ? '0.16rem 0.22rem 0.16rem 1.45rem' : '0.14rem 0.22rem',
                                            outline: 'none',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }}
                                        />
                                      ))
                                    )}
                                  </div>
                                  <div
                                    onMouseDown={(event) => handlePptElementMouseDown(event, 'table', 'resize', selectedPptSlideIndex)}
                                    title="Resize table"
                                    style={{ position: 'absolute', right: 0, bottom: 0, width: '18px', height: '18px', background: theme.accent, borderRadius: '10px 0 0 0', cursor: 'nwse-resize', zIndex: 8 }}
                                  />
                                </div>
                              )}


                              <div style={{ marginTop: 'auto', color: theme.accent, fontWeight: '850', fontSize: '0.78rem', opacity: 0.9 }}>
                                Generated by Brief Bot • Slide {selectedPptSlideIndex + 1}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.65rem', alignItems: 'center' }}>
                              <input
                                value={selectedSlide.title || ''}
                                onChange={(e) => updatePptSlide(selectedPptSlideIndex, 'title', e.target.value)}
                                placeholder="Edit selected slide title"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem', borderRadius: '12px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none', fontWeight: '850' }}
                              />
                              <button
                                type="button"
                                onClick={() => removePptSlide(selectedPptSlideIndex)}
                                disabled={(pptPlan.slides || []).length <= 1}
                                className="simple-btn-glow"
                                style={{
                                  padding: '0.82rem 0.95rem',
                                  borderRadius: '12px',
                                  border: '1px solid rgba(239,68,68,0.45)',
                                  background: 'rgba(239,68,68,0.10)',
                                  color: '#FCA5A5',
                                  cursor: (pptPlan.slides || []).length <= 1 ? 'not-allowed' : 'pointer',
                                  opacity: (pptPlan.slides || []).length <= 1 ? 0.5 : 1,
                                  fontWeight: '900',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Delete Slide
                              </button>
                            </div>

                            <div style={{ background: 'rgba(15,22,38,0.82)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: '16px', padding: '0.85rem', display: 'grid', gap: '0.75rem', maxWidth: '100%', overflowX: 'hidden' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <strong style={{ color: '#FFF' }}>🛠 Advanced Slide Tools</strong>
                                <span style={{ color: '#9CA3AF', fontSize: '0.78rem' }}>Drag and resize directly inside the slide preview.</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: '0.55rem' }}>
                                <label style={{ color: '#9CA3AF', fontSize: '0.76rem', fontWeight: '850' }}>Rows
                                  <input type="number" min="1" max="10" value={pptTableRows} onChange={(e) => setPptTableRows(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', marginTop: '0.25rem', padding: '0.55rem', borderRadius: '8px', border: '1px solid #2D3748', background: '#111827', color: '#FFF' }} />
                                </label>
                                <label style={{ color: '#9CA3AF', fontSize: '0.76rem', fontWeight: '850' }}>Columns
                                  <input type="number" min="1" max="10" value={pptTableCols} onChange={(e) => setPptTableCols(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', marginTop: '0.25rem', padding: '0.55rem', borderRadius: '8px', border: '1px solid #2D3748', background: '#111827', color: '#FFF' }} />
                                </label>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.55rem', alignItems: 'end' }}>
                                <label style={{ color: '#9CA3AF', fontSize: '0.76rem', fontWeight: '850' }}>Bullet Font Size
                                  <input
                                    type="range"
                                    min="10"
                                    max="34"
                                    value={selectedPointsFontSize}
                                    onChange={(e) => updatePptSlide(selectedPptSlideIndex, 'pointsFontSize', Number(e.target.value))}
                                    style={{ width: '100%', marginTop: '0.45rem' }}
                                  />
                                </label>
                                <button type="button" onClick={() => updatePptSlide(selectedPptSlideIndex, 'pointsFontSize', Math.max(10, selectedPointsFontSize - 1))} className="simple-btn-glow" style={{ border: '1px solid #2D3748', background: '#111827', color: '#E5E7EB', borderRadius: '10px', padding: '0.55rem 0.8rem', cursor: 'pointer', fontWeight: '900' }}>A−</button>
                                <button type="button" onClick={() => updatePptSlide(selectedPptSlideIndex, 'pointsFontSize', Math.min(34, selectedPointsFontSize + 1))} className="simple-btn-glow" style={{ border: '1px solid #2D3748', background: '#111827', color: '#E5E7EB', borderRadius: '10px', padding: '0.55rem 0.8rem', cursor: 'pointer', fontWeight: '900' }}>A+</button>
                              </div>
                              <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                                <button type="button" onClick={() => handleGeneratePptImagePair(selectedPptSlideIndex)} disabled={pptImageLoading} className="simple-btn-glow" style={{ background: 'rgba(0,242,254,0.12)', color: '#00F2FE', border: '1px solid rgba(0,242,254,0.30)', borderRadius: '10px', padding: '0.55rem 0.75rem', cursor: pptImageLoading ? 'not-allowed' : 'pointer', opacity: pptImageLoading ? 0.62 : 1, fontWeight: '900' }}>{pptImageLoading ? '🎨 Generating...' : '✨ Generate AI Image'}</button>
                                <label className="simple-btn-glow" style={{ background: 'rgba(168,85,247,0.12)', color: '#C084FC', border: '1px solid rgba(168,85,247,0.30)', borderRadius: '10px', padding: '0.55rem 0.75rem', cursor: 'pointer', fontWeight: '900' }}>
                                  🖼 Insert Own Image
                                  <input type="file" accept="image/*" onChange={(event) => handlePptManualImageUpload(selectedPptSlideIndex, event)} style={{ display: 'none' }} />
                                </label>
                                <button type="button" onClick={() => removePptSlideImage(selectedPptSlideIndex)} className="simple-btn-glow" style={{ background: 'rgba(239,68,68,0.10)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.28)', borderRadius: '10px', padding: '0.55rem 0.75rem', cursor: 'pointer', fontWeight: '900' }}>🗑 Remove Image</button>
                                <button type="button" onClick={() => addPptSlideTable(selectedPptSlideIndex, pptTableRows, pptTableCols)} className="simple-btn-glow" style={{ background: 'rgba(52,211,153,0.10)', color: '#86EFAC', border: '1px solid rgba(52,211,153,0.28)', borderRadius: '10px', padding: '0.55rem 0.75rem', cursor: 'pointer', fontWeight: '900' }}>📊 Insert Table</button>
                                {selectedSlide.table && (
                                  <button type="button" onClick={() => removePptSlideTable(selectedPptSlideIndex)} className="simple-btn-glow" style={{ background: 'rgba(239,68,68,0.10)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.28)', borderRadius: '10px', padding: '0.55rem 0.75rem', cursor: 'pointer', fontWeight: '900' }}>🧹 Remove Table</button>
                                )}
                              </div>
                              <div style={{ color: '#9CA3AF', fontSize: '0.78rem', lineHeight: '1.55' }}>
                                Image, table, and bullet points can be moved/resized from the slide itself. Table cells are editable directly inside the slide.
                              </div>
                            </div>
                            {(selectedSlide.points || []).map((point, pointIndex) => (
                              <div key={pointIndex} style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                  value={point}
                                  onChange={(e) => updatePptSlidePoint(selectedPptSlideIndex, pointIndex, e.target.value)}
                                  placeholder={`Point ${pointIndex + 1}`}
                                  style={{ flex: 1, minWidth: 0, padding: '0.75rem', borderRadius: '10px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#E5E7EB', outline: 'none' }}
                                />
                                <button type="button" onClick={() => removePptSlidePoint(selectedPptSlideIndex, pointIndex)} className="simple-btn-glow" style={{ width: '42px', borderRadius: '10px', border: '1px solid #374151', backgroundColor: '#111827', color: '#FCA5A5', cursor: 'pointer' }}>×</button>
                              </div>
                            ))}
                            <button type="button" onClick={() => addPptSlidePoint(selectedPptSlideIndex)} disabled={(selectedSlide.points || []).length >= 7} className="simple-btn-glow" style={{ justifySelf: 'start', padding: '0.58rem 0.9rem', borderRadius: '10px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#D1D5DB', cursor: (selectedSlide.points || []).length >= 7 ? 'not-allowed' : 'pointer', opacity: (selectedSlide.points || []).length >= 7 ? 0.5 : 1, fontWeight: '800' }}>
                              ➕ Add Point to Preview Slide
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={addPptSlide}
                    className="simple-btn-glow"
                    style={{
                      padding: '0.8rem 1.1rem',
                      borderRadius: '10px',
                      border: '1px solid #2D3748',
                      backgroundColor: '#151D30',
                      color: '#D1D5DB',
                      cursor: 'pointer',
                      fontWeight: '900'
                    }}
                  >
                    ➕ Add Slide
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPpt}
                    disabled={pptExportLoading}
                    style={{
                      padding: '0.8rem 1.1rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: pptExportLoading ? '#374151' : 'linear-gradient(135deg, #00F2FE, #4FACFE)',
                      color: '#070A13',
                      cursor: pptExportLoading ? 'not-allowed' : 'pointer',
                      fontWeight: '950'
                    }}
                   className="simple-btn-glow">
                    {pptExportLoading ? 'Exporting...' : '⬇ Export PPT'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {currentPage === 'assessment' && currentUser && currentUser?.role !== 'admin' && (
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '2.5rem 1.5rem', animation: 'fadeIn 0.3s ease-out', overflowX: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, color: '#FFF', fontSize: '2rem', fontWeight: '950' }}>Assessment Arena</h2>
              <p style={{ margin: '0.45rem 0 0 0', color: '#9CA3AF' }}>Solo Practice and Battle Room are fixed to 20 questions and 20 minutes.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              {isAssessmentAttemptActive() && (
                <div style={{ color: '#FBBF24', background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.28)', borderRadius: '999px', padding: '0.7rem 1rem', fontWeight: '950' }}>
                  🔒 Test in progress
                </div>
              )}
              {!isAssessmentAttemptActive() && ['solo', 'battle', 'join', 'boss'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAssessmentPanel(tab)}
                  style={{
                    padding: '0.7rem 1rem',
                    borderRadius: '999px',
                    border: assessmentPanel === tab ? (tab === 'boss' ? '1px solid #F97316' : '1px solid #00F2FE') : '1px solid #2D3748',
                    backgroundColor: assessmentPanel === tab ? (tab === 'boss' ? 'rgba(249,115,22,0.16)' : 'rgba(0,242,254,0.13)') : '#111827',
                    color: assessmentPanel === tab ? (tab === 'boss' ? '#FDBA74' : '#00F2FE') : '#D1D5DB',
                    cursor: 'pointer',
                    fontWeight: '900'
                  }}
                 className="simple-btn-glow">
                  {tab === 'solo' ? '👤 Solo Practice' : tab === 'battle' ? '⚔️ Battle Room' : tab === 'join' ? '🔑 Join Room' : '🔥 Boss Challenge'}
                </button>
              ))}
            </div>
          </div>

          
          {assessmentError && (
            <div style={{ marginBottom: '1rem', color: '#F87171', backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '12px', padding: '1rem' }}>❌ {assessmentError}</div>
          )}

          {!analysisData && !assessmentData && assessmentPanel !== 'join' && assessmentPanel !== 'boss' && (
            <div style={{ background: 'linear-gradient(145deg, #0F1626, #0B1120)', border: '1px dashed rgba(0,242,254,0.35)', borderRadius: '24px', padding: '3rem 1.5rem', textAlign: 'center', marginBottom: '1.5rem', boxShadow: '0 18px 45px rgba(0,0,0,0.25)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>📝</div>
              <h2 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.7rem', fontWeight: '950' }}>First generate summary to access the assessment</h2>
              <p style={{ color: '#9CA3AF', maxWidth: '620px', margin: '0.75rem auto 1.5rem auto', lineHeight: '1.7' }}>Solo Practice and Battle Room creation need your latest video summary. Generate a Smart Summary in Workspace first.</p>
              <button type="button" onClick={() => setCurrentPage('workspace')} style={{ background: 'linear-gradient(135deg, #00F2FE, #4FACFE)', color: '#070A13', border: 'none', borderRadius: '14px', padding: '0.95rem 1.35rem', cursor: 'pointer', fontWeight: '950' }} className="simple-btn-glow">Go to Workspace</button>
            </div>
          )}

          {!isAssessmentAttemptActive() && !assessmentData && (analysisData || assessmentPanel === 'join') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) 1fr', gap: '1.5rem', alignItems: 'start' }} className="assessment-layout">
              <aside style={{ background: 'linear-gradient(145deg, #0F1626, #0B1120)', border: '1px solid #1F2937', borderRadius: '20px', padding: '1.4rem', boxShadow: '0 18px 45px rgba(0,0,0,0.35)' }}>
                <h3 style={{ margin: 0, color: '#FFF', fontSize: '1.2rem', fontWeight: '900' }}>{assessmentPanel === 'battle' ? 'Create Battle Room' : assessmentPanel === 'join' ? 'Join Battle Room' : 'Create Solo Practice'}</h3>
                <p style={{ margin: '0.4rem 0 1rem 0', color: '#9CA3AF', fontSize: '0.9rem', lineHeight: '1.5' }}>Fixed rules: 20 questions • 20 minutes • instant results • mixed type supported.</p>

                {(assessmentPanel === 'solo' || assessmentPanel === 'battle') && (
                  <div style={{ display: 'grid', gap: '0.85rem' }}>
                    <div style={{ padding: '0.95rem', borderRadius: '16px', border: assessmentPanel === 'battle' ? '1px solid rgba(168,85,247,0.35)' : '1px solid rgba(0,242,254,0.28)', background: assessmentPanel === 'battle' ? 'rgba(168,85,247,0.10)' : 'rgba(0,242,254,0.08)', color: '#D1D5DB', lineHeight: '1.6' }}>
                      <strong style={{ color: assessmentPanel === 'battle' ? '#C084FC' : '#00F2FE' }}>{assessmentPanel === 'battle' ? '⚔️ Battle Room' : '👤 Solo Practice'}</strong>
                      <div style={{ marginTop: '0.25rem', fontSize: '0.88rem' }}>{assessmentPanel === 'battle' ? 'Create a game-like live assessment room for friends.' : 'Attempt your own private timed test.'}</div>
                    </div>
                    <input value={assessmentTitle} onChange={(e) => setAssessmentTitle(e.target.value)} placeholder={assessmentPanel === 'battle' ? 'Battle room title' : 'Assessment title'} style={{ padding: '0.9rem', borderRadius: '12px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }} />
                    <div style={{ display: 'grid', gap: '0.55rem', position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setShowAssessmentTypeMenu((previous) => !previous)}
                        className="simple-btn-glow"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.8rem',
                          padding: '0.9rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(0,242,254,0.28)',
                          background: 'linear-gradient(145deg, rgba(0,242,254,0.08), #151D30)',
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                          <span style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: (assessmentTypeOptions.find((type) => type.id === assessmentType)?.glow || 'rgba(0,242,254,0.14)'),
                            border: `1px solid ${(assessmentTypeOptions.find((type) => type.id === assessmentType)?.accent || '#00F2FE')}55`,
                            fontSize: '1.1rem'
                          }}>
                            {assessmentTypeOptions.find((type) => type.id === assessmentType)?.icon || '✅'}
                          </span>
                          <span>
                            <div style={{ color: '#9CA3AF', fontSize: '0.72rem', fontWeight: '950', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Choose Question Type</div>
                            <div style={{ color: (assessmentTypeOptions.find((type) => type.id === assessmentType)?.accent || '#00F2FE'), fontWeight: '950', marginTop: '0.15rem' }}>
                              {assessmentTypeOptions.find((type) => type.id === assessmentType)?.name || 'MCQ'}
                            </div>
                          </span>
                        </span>
                        <span style={{ color: '#00F2FE', fontWeight: '950', fontSize: '1.05rem' }}>{showAssessmentTypeMenu ? '▲' : '▼'}</span>
                      </button>

                      {showAssessmentTypeMenu && (
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                          padding: '0.65rem',
                          borderRadius: '14px',
                          border: '1px solid rgba(255,255,255,0.10)',
                          background: 'rgba(11,17,32,0.96)',
                          boxShadow: '0 18px 40px rgba(0,0,0,0.30)'
                        }}>
                          {assessmentTypeOptions.map((type) => (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => {
                                setAssessmentType(type.id);
                                setShowAssessmentTypeMenu(false);
                              }}
                              className="simple-btn-glow"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                padding: '0.55rem 0.72rem',
                                borderRadius: '999px',
                                border: assessmentType === type.id ? `1px solid ${type.accent}` : '1px solid #2D3748',
                                background: assessmentType === type.id ? type.glow : '#151D30',
                                color: assessmentType === type.id ? type.accent : '#D1D5DB',
                                cursor: 'pointer',
                                fontWeight: '900',
                                fontSize: '0.82rem'
                              }}
                            >
                              <span>{type.icon}</span>
                              <span>{type.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <select value={assessmentDifficulty} onChange={(e) => setAssessmentDifficulty(e.target.value)} style={{ padding: '0.9rem', borderRadius: '12px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                      <div style={{ padding: '0.9rem', borderRadius: '14px', background: '#111827', border: '1px solid #1F2937' }}><div style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: '800' }}>QUESTIONS</div><div style={{ color: '#00F2FE', fontSize: '1.5rem', fontWeight: '950' }}>20</div></div>
                      <div style={{ padding: '0.9rem', borderRadius: '14px', background: '#111827', border: '1px solid #1F2937' }}><div style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: '800' }}>TIMER</div><div style={{ color: '#34D399', fontSize: '1.5rem', fontWeight: '950' }}>20 min</div></div>
                    </div>
                    <button type="button" onClick={() => handleCreateAssessment(assessmentPanel === 'battle' ? 'battle' : 'solo')} disabled={assessmentLoading || !analysisData} style={{ background: assessmentPanel === 'battle' ? 'linear-gradient(135deg, #A855F7, #00F2FE)' : 'linear-gradient(135deg, #00F2FE, #4FACFE)', color: assessmentPanel === 'battle' ? '#FFF' : '#070A13', border: 'none', padding: '0.95rem 1rem', borderRadius: '12px', cursor: (assessmentLoading || !analysisData) ? 'not-allowed' : 'pointer', fontWeight: '950', opacity: (assessmentLoading || !analysisData) ? 0.65 : 1 }} className="simple-btn-glow">
                      {assessmentLoading ? 'Generating 20 questions...' : assessmentPanel === 'battle' ? 'Create Battle Room' : 'Start Solo Practice'}
                    </button>
                  </div>
                )}

                {assessmentPanel === 'join' && (
                  <div style={{ display: 'grid', gap: '0.85rem' }}>
                    <div style={{ padding: '0.95rem', borderRadius: '16px', border: '1px solid rgba(168,85,247,0.35)', background: 'rgba(168,85,247,0.10)', color: '#D1D5DB', lineHeight: '1.6' }}>
                      <strong style={{ color: '#C084FC' }}>🔑 Join with Room Code</strong>
                      <div style={{ marginTop: '0.25rem', fontSize: '0.88rem' }}>Enter code like BB-48291 to join your friend’s Battle Room.</div>
                    </div>
                    <input value={battleJoinCode} onChange={(e) => setBattleJoinCode(e.target.value.toUpperCase())} placeholder="Enter Battle Room code" style={{ padding: '0.9rem', borderRadius: '12px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none', fontWeight: '900', letterSpacing: '0.08em' }} />
                    <button type="button" onClick={() => joinBattleRoom()} disabled={battleLoading || !battleJoinCode.trim()} style={{ background: 'linear-gradient(135deg, #A855F7, #00F2FE)', color: '#FFF', border: 'none', padding: '0.95rem 1rem', borderRadius: '12px', cursor: (battleLoading || !battleJoinCode.trim()) ? 'not-allowed' : 'pointer', fontWeight: '950', opacity: (battleLoading || !battleJoinCode.trim()) ? 0.65 : 1 }} className="simple-btn-glow">{battleLoading ? 'Joining...' : 'Join Battle Room'}</button>
                  </div>
                )}
              </aside>

              <main style={{ display: 'grid', gap: '1.2rem' }}>
                <div style={{ background: 'linear-gradient(145deg, #0F1626, #0B1120)', border: '1px solid #1F2937', borderRadius: '20px', padding: '1.5rem' }}>
                  <h3 style={{ color: '#FFF', marginTop: 0 }}>{assessmentPanel === 'battle' ? '⚔️ Battle Room Flow' : assessmentPanel === 'join' ? '🔑 Join and compete' : '👤 Solo Practice Flow'}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.8rem' }}>
                    {[
                      ['1', assessmentPanel === 'battle' ? 'Create Room' : assessmentPanel === 'join' ? 'Enter Code' : 'Generate Test'],
                      ['2', assessmentPanel === 'battle' ? 'Players Join' : assessmentPanel === 'join' ? 'Wait in Lobby' : 'Answer 20 Questions'],
                      ['3', assessmentPanel === 'battle' ? 'Host Starts' : assessmentPanel === 'join' ? 'Timed Battle' : 'Submit Test'],
                      ['4', 'Leaderboard + Results']
                    ].map((item) => (
                      <div key={item[0]} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '1rem' }}>
                        <div style={{ color: '#00F2FE', fontWeight: '950', fontSize: '1.3rem' }}>{item[0]}</div>
                        <div style={{ color: '#D1D5DB', fontWeight: '850', marginTop: '0.35rem' }}>{item[1]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </main>
            </div>
          )}


          {assessmentPanel === 'boss' && (
            <div style={{ marginBottom: '1.5rem' }}>
              {renderBossChallengeArena()}
            </div>
          )}

          {assessmentPanel !== 'boss' && assessmentData && isBattleAssessment() && getBattleStatus() === 'waiting' && (
            <div style={{ background: 'linear-gradient(145deg, #0F1626, #0B1120)', border: '1px solid rgba(168,85,247,0.35)', borderRadius: '24px', padding: '1.6rem', boxShadow: '0 22px 70px rgba(0,0,0,0.36)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
                <div>
                  <h2 style={{ color: '#FFF', margin: 0, fontWeight: '950' }}>⚔️ Battle Room Lobby</h2>
                  <p style={{ color: '#9CA3AF', margin: '0.4rem 0 0 0' }}>{assessmentData.title} • 20 Questions • 20 Minutes</p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button" onClick={copyAssessmentCode} style={{ background: 'rgba(168,85,247,0.12)', color: '#C084FC', border: '1px solid rgba(168,85,247,0.35)', borderRadius: '12px', padding: '0.75rem 1rem', fontWeight: '900', cursor: 'pointer' }} className="simple-btn-glow">{assessmentCodeCopied ? 'Copied!' : `Code: ${assessmentData.roomCode}`}</button>
                  {isHostOfBattle() && <button type="button" onClick={startBattleRoom} disabled={battleLoading || getBattlePlayers().length < 2} style={{ background: 'linear-gradient(135deg, #A855F7, #00F2FE)', color: '#FFF', border: 'none', borderRadius: '12px', padding: '0.75rem 1rem', fontWeight: '950', cursor: (battleLoading || getBattlePlayers().length < 2) ? 'not-allowed' : 'pointer', opacity: (battleLoading || getBattlePlayers().length < 2) ? 0.6 : 1 }} className="simple-btn-glow">{battleLoading ? 'Starting...' : getBattlePlayers().length < 2 ? 'Waiting for players' : 'Start Battle'}</button>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.9rem' }}>
                {getBattlePlayers().map((player, index) => (
                  <div key={player.userId || index} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: player.userId === assessmentData.createdBy ? 'linear-gradient(135deg, #FBBF24, #F97316)' : 'linear-gradient(135deg, #00F2FE, #4FACFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950', color: '#070A13' }}>{player.userId === assessmentData.createdBy ? '👑' : '⚡'}</div>
                    <div><div style={{ color: '#FFF', fontWeight: '900' }}>{player.name || 'Player'}</div><div style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>{player.userId === assessmentData.createdBy ? 'Host' : 'Player'} • Ready</div></div>
                  </div>
                ))}
              </div>
              {!isHostOfBattle() && <p style={{ color: '#9CA3AF', marginTop: '1.2rem', textAlign: 'center' }}>Waiting for host to start the battle...</p>}
            </div>
          )}

          {assessmentPanel !== 'boss' && assessmentData && (!isBattleAssessment() || getBattleStatus() === 'active' || assessmentResult) && (
            <main style={{ display: 'grid', gap: '1.5rem' }}>
              <section style={{ backgroundColor: '#0F1626', border: '1px solid #1F2937', borderRadius: '20px', overflow: 'hidden' }}>
                <div style={{ padding: '1.2rem 1.4rem', borderBottom: '1px solid #1F2937', backgroundColor: '#131C2E', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#FFF', fontWeight: '950' }}>{assessmentData.title}</h3>
                    <p style={{ margin: '0.35rem 0 0 0', color: '#9CA3AF', fontSize: '0.9rem' }}>{getAssessmentModeLabel(assessmentData.assessmentMode)} • {assessmentData.questionTypeLabel} • {assessmentData.difficulty} • 20 Questions</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: assessmentTimer <= 60 ? '#F87171' : '#34D399', fontSize: '1.5rem', fontWeight: '950' }}>⏱ {formatAssessmentTime(assessmentTimer)}</div>
                    <div style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>Answered {Object.values(assessmentAnswers).filter(Boolean).length}/20</div>
                  </div>
                </div>

                <div className="custom-scroll" style={{ maxHeight: '620px', overflowY: 'auto', padding: '1.4rem', display: 'grid', gap: '1rem' }}>
                  {(assessmentData.questions || []).map((question, index) => (
                    <div key={question.id} style={{ backgroundColor: '#0B0F19', border: '1px solid #1F2937', borderRadius: '16px', padding: '1.1rem' }}>
                      <h4 style={{ margin: '0 0 0.9rem 0', color: '#FFF', lineHeight: '1.5' }}>{index + 1}. {question.question}</h4>
                      {question.type === 'sjt' && (
                        <div style={{ display: 'inline-flex', color: '#FBBF24', background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '999px', padding: '0.32rem 0.65rem', fontSize: '0.74rem', fontWeight: '950', marginBottom: '0.85rem' }}>
                          SJT • Choose the best real-life response
                        </div>
                      )}
                      {(question.type === 'mcq' || question.type === 'sjt') && (
                        <div style={{ display: 'grid', gap: '0.65rem' }}>
                          {(question.options || []).map((option, optIndex) => (
                            <label key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem', borderRadius: '12px', border: assessmentAnswers[question.id] === option ? '1px solid #00F2FE' : '1px solid #1F2937', backgroundColor: assessmentAnswers[question.id] === option ? 'rgba(0,242,254,0.08)' : '#111827', color: '#D1D5DB', cursor: assessmentResult ? 'default' : 'pointer' }}>
                              <input type="radio" disabled={Boolean(assessmentResult)} checked={assessmentAnswers[question.id] === option} onChange={() => handleAssessmentAnswerChange(question.id, option)} />
                              <span style={{ whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: '1.5' }}>{option}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {question.type === 'fill_blank' && (
                        <input disabled={Boolean(assessmentResult)} value={assessmentAnswers[question.id] || ''} onChange={(e) => handleAssessmentAnswerChange(question.id, e.target.value)} placeholder="Type your answer" style={{ width: '100%', boxSizing: 'border-box', padding: '0.9rem', borderRadius: '12px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }} />
                      )}
                      {question.type === 'descriptive' && (
                        <textarea disabled={Boolean(assessmentResult)} value={assessmentAnswers[question.id] || ''} onChange={(e) => handleAssessmentAnswerChange(question.id, e.target.value)} placeholder="Write your answer" rows={4} style={{ width: '100%', boxSizing: 'border-box', padding: '0.9rem', borderRadius: '12px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none', resize: 'vertical' }} />
                      )}
                      {assessmentResult && (
                        <div style={{ marginTop: '0.8rem', color: '#9CA3AF', fontSize: '0.9rem' }}>
                          Correct answer: <span style={{ color: '#34D399', fontWeight: '800' }}>{question.correctAnswer || 'See key points'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {!assessmentResult && (
                  <div style={{ padding: '1.2rem 1.4rem', borderTop: '1px solid #1F2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', backgroundColor: '#131C2E' }}>
                    <span style={{ color: '#9CA3AF' }}>Submit before timer ends. Faster time wins tie-breakers in Battle Room.</span>
                    <button type="button" onClick={() => handleSubmitAssessment(false)} disabled={assessmentLoading} style={{ background: 'linear-gradient(135deg, #34D399, #00F2FE)', color: '#070A13', border: 'none', padding: '0.9rem 1.4rem', borderRadius: '12px', cursor: 'pointer', fontWeight: '950' }} className="simple-btn-glow">{assessmentLoading ? 'Submitting...' : isBattleAssessment() ? 'Submit Battle' : 'Submit Assessment'}</button>
                  </div>
                )}
              </section>

              {assessmentResult && (
                <section style={{ background: 'linear-gradient(145deg, rgba(15,22,38,0.98), rgba(7,10,19,0.96))', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 55px rgba(0,0,0,0.35)' }}>
                  <div style={{ padding: '1.3rem 1.5rem', borderBottom: '1px solid #1F2937', background: 'linear-gradient(135deg, rgba(52,211,153,0.12), rgba(0,242,254,0.06))' }}>
                    <h3 style={{ margin: 0, color: '#FFF', fontWeight: '950' }}>{isBattleAssessment() ? '🏆 Battle Results' : '📊 Solo Practice Result'}</h3>

                  {assessmentResult && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap', margin: '1rem 0' }}>
                      <button
                        type="button"
                        onClick={handleBackToAssessmentArena}
                        className="simple-btn-glow"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          color: '#D1D5DB',
                          border: '1px solid #2D3748',
                          borderRadius: '12px',
                          padding: '0.8rem 1rem',
                          cursor: 'pointer',
                          fontWeight: '900'
                        }}
                      >
                        Back to Assessment Arena
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleExitBossResult(event)}
                        className="simple-btn-glow"
                        style={{
                          background: assessmentData?.assessmentMode === 'battle' ? 'linear-gradient(135deg, #EF4444, #F97316)' : 'linear-gradient(135deg, #00F2FE, #4FACFE)',
                          color: assessmentData?.assessmentMode === 'battle' ? '#FFFFFF' : '#07111F',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '0.8rem 1rem',
                          cursor: 'pointer',
                          fontWeight: '950',
                          boxShadow: '0 14px 30px rgba(0,0,0,0.18)'
                        }}
                      >
                        {assessmentData?.assessmentMode === 'battle' ? 'Exit Battle Room' : 'Exit Assessment'}
                      </button>
                    </div>
                  )}

                    <p style={{ margin: '0.35rem 0 0 0', color: '#9CA3AF', fontSize: '0.9rem' }}>{isBattleAssessment() ? 'Leaderboard, rank, accuracy, achievement, and time performance.' : 'Your personal assessment performance summary.'}</p>
                  </div>

                  <div style={{ padding: '1.3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '1.1rem' }}><div style={{ color: '#9CA3AF', fontSize: '0.82rem', fontWeight: '800', marginBottom: '0.45rem' }}>ACCURACY</div><div style={{ color: '#34D399', fontSize: '1.8rem', fontWeight: '950' }}>{assessmentResult.percentage}%</div></div>
                    <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '1.1rem' }}><div style={{ color: '#9CA3AF', fontSize: '0.82rem', fontWeight: '800', marginBottom: '0.45rem' }}>CORRECT ANSWERS</div><div style={{ color: '#00F2FE', fontSize: '1.8rem', fontWeight: '950' }}>{assessmentResult.score}/{assessmentResult.totalMarks}</div></div>
                    <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '1.1rem' }}><div style={{ color: '#9CA3AF', fontSize: '0.82rem', fontWeight: '800', marginBottom: '0.45rem' }}>RANK</div><div style={{ color: '#FBBF24', fontSize: '1.8rem', fontWeight: '950' }}>{assessmentResult.rank ? `#${assessmentResult.rank}` : '-'}</div></div>
                    <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '1.1rem' }}><div style={{ color: '#9CA3AF', fontSize: '0.82rem', fontWeight: '800', marginBottom: '0.45rem' }}>TIME SPENT</div><div style={{ color: '#C084FC', fontSize: '1.8rem', fontWeight: '950' }}>{formatAssessmentTime(assessmentResult.timeTakenSeconds || 0)}</div></div>
                  </div>

                  <div style={{ padding: '0 1.3rem 1.3rem 1.3rem' }}>
                    <div style={{ backgroundColor: 'rgba(0,242,254,0.06)', border: '1px solid rgba(0,242,254,0.18)', borderRadius: '16px', padding: '1rem', marginBottom: '1rem' }}>
                      <div style={{ color: '#FFF', fontWeight: '900' }}>Remark: <span style={{ color: '#34D399' }}>{assessmentResult.remarks}</span></div>
                      <div style={{ color: '#9CA3AF', fontSize: '0.9rem', marginTop: '0.25rem' }}>Achievement: {assessmentResult.achievement || 'Keep practicing'}</div>
                    </div>

                    {isBattleAssessment() && (
                      <div style={{
                        position: 'relative',
                        overflow: 'hidden',
                        background: 'linear-gradient(145deg, rgba(15,22,38,0.98), rgba(5,8,18,0.98))',
                        border: '1px solid rgba(251,191,36,0.28)',
                        borderRadius: '22px',
                        boxShadow: '0 22px 60px rgba(0,0,0,0.36)'
                      }}>
                        <div style={{ position: 'absolute', width: '220px', height: '220px', top: '-130px', right: '-80px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.22), transparent 70%)' }} />
                        <div style={{ position: 'absolute', width: '250px', height: '250px', bottom: '-150px', left: '-100px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.18), transparent 70%)' }} />

                        <div style={{ position: 'relative', zIndex: 1, padding: '1.2rem 1.2rem 0.8rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ color: '#FBBF24', fontSize: '0.8rem', fontWeight: '950', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Battle Results</div>
                            <h3 style={{ color: '#FFFFFF', margin: '0.25rem 0 0 0', fontSize: '1.45rem', fontWeight: '950' }}>🏆 Game Leaderboard</h3>
                          </div>
                          <span style={{ color: '#FDE68A', background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.28)', borderRadius: '999px', padding: '0.45rem 0.75rem', fontWeight: '900', fontSize: '0.8rem' }}>
                            {((assessmentLeaderboard?.length ? assessmentLeaderboard : (assessmentData?.leaderboard || assessmentResult?.leaderboard || [])).length || 0)} Players
                          </span>
                        </div>

                        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: '0.75rem', padding: '1rem' }}>
                          {(assessmentLeaderboard?.length ? assessmentLeaderboard : (assessmentData?.leaderboard || assessmentResult?.leaderboard || [])).length ? (assessmentLeaderboard?.length ? assessmentLeaderboard : (assessmentData?.leaderboard || assessmentResult?.leaderboard || [])).map((player, index) => {
                            const rankColor = index === 0 ? '#FBBF24' : index === 1 ? '#CBD5E1' : index === 2 ? '#F97316' : '#38BDF8';
                            const medal = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                            const percent = Number(player.percentage || player.accuracy || 0);
                            return (
                              <div key={player.userId || player.id || index} style={{
                                display: 'grid',
                                gridTemplateColumns: '70px 1fr 120px 110px',
                                gap: '0.85rem',
                                alignItems: 'center',
                                padding: '0.95rem',
                                borderRadius: '18px',
                                background: index === 0 ? 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(15,23,42,0.88))' : 'rgba(255,255,255,0.035)',
                                border: index === 0 ? '1px solid rgba(251,191,36,0.45)' : '1px solid rgba(255,255,255,0.08)',
                                boxShadow: index === 0 ? '0 0 28px rgba(251,191,36,0.12)' : 'none',
                                color: '#D1D5DB'
                              }}>
                                <div style={{ width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${rankColor}18`, border: `1px solid ${rankColor}55`, color: rankColor, fontSize: '1.35rem', fontWeight: '950' }}>{medal}</div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ color: '#FFFFFF', fontWeight: '950', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.userName || player.name || 'Player'}</div>
                                  <div style={{ color: '#9CA3AF', fontSize: '0.78rem', marginTop: '0.2rem' }}>Time: {formatAssessmentTime(player.timeTakenSeconds || 0)}</div>
                                </div>
                                <div>
                                  <div style={{ color: rankColor, fontWeight: '950', fontSize: '1.2rem' }}>{percent}%</div>
                                  <div style={{ height: '7px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', marginTop: '0.35rem', overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(100, Math.max(0, percent))}%`, height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${rankColor}, #00F2FE)` }} />
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', color: '#E5E7EB', fontWeight: '900' }}>{player.score}/{player.totalMarks}</div>
                              </div>
                            );
                          }) : <div style={{ padding: '1.2rem', color: '#9CA3AF', textAlign: 'center' }}>Leaderboard will appear after players submit.</div>}
                        </div>
                      </div>
                    )}

                    
                    {isBattleAssessment() && (
                      <div style={{ marginTop: '1.2rem', background: 'linear-gradient(145deg, rgba(127,29,29,0.30), rgba(15,23,42,0.96))', border: '1px solid rgba(248,113,113,0.35)', borderRadius: '20px', padding: '1.1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ color: '#FCA5A5', fontSize: '0.78rem', fontWeight: '950', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Final Round</div>
                          <h3 style={{ color: '#FFF', margin: '0.25rem 0 0 0', fontWeight: '950' }}>🔥 Brief Boss Challenge</h3>
                          <p style={{ color: '#CBD5E1', margin: '0.4rem 0 0 0', lineHeight: '1.55' }}>Boss mode opens in its own fiery tab. Top battle performers can continue there and fight for the champion crown.</p>
                        </div>
                        <button type="button" onClick={openBossChallengeTab} className="simple-btn-glow" style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)', color: '#FFF7ED', border: 'none', borderRadius: '14px', padding: '0.9rem 1.2rem', cursor: 'pointer', fontWeight: '950' }}>
                          Open Boss Mode →
                        </button>
                      </div>
                    )}

                  </div>
                </section>
              )}
            </main>
          )}
        </div>
      )}

      {currentPage === 'workspace' && currentUser && (
        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '2.5rem 1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, color: '#FFF', fontSize: '1.8rem', fontWeight: '800' }}>The Brief Room</h2>
              <p style={{ margin: '0.4rem 0 0 0', color: '#9CA3AF', fontSize: '0.95rem' }}>Drop any web or YouTube link — we’ll pull out what actually matters.</p>
            </div>
            <button 
              onClick={() => setCurrentPage('home')}
              style={{ backgroundColor: 'transparent', color: '#9CA3AF', border: '1px solid #374151', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
             className="simple-btn-glow">
              ← Back to Home
            </button>
          </div>

          {/* Link Input Interface Box */}
          <div style={{ backgroundColor: '#0F1626', borderRadius: '16px', padding: '1.75rem', border: '1px solid #1F2937', boxShadow: '0 10px 30px rgba(0,0,0,0.4)', marginBottom: '2.5rem' }}>
            <form onSubmit={handleRunAnalysis} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* URL Input */}
              <input
                type="url"
                required
                placeholder="Drop your URL here...."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '1rem 1.2rem',
                  fontSize: '1rem',
                  borderRadius: '10px',
                  border: videoCheckStatus === 'unsupported' ? '1px solid #EF4444' : videoCheckStatus === 'supported' ? '1px solid #34D399' : '1px solid #2D3748',
                  backgroundColor: '#151D30',
                  color: '#FFF',
                  outline: 'none'
                }}
                disabled={loading}
              />

              {youtubeEmbedUrl && (
                <div className="youtube-preview-card" ref={videoPreviewRef} id="video-preview">
                  <div className="youtube-preview-header">
                    <span>▶ Video Preview</span>
                    <small>{videoStartSeconds > 0 ? `Playing from ${secondsToTimestamp(videoStartSeconds)}` : 'You can play the video here before generating the summary'}</small>
                  </div>

                  <div className="youtube-embed-wrapper">
                    <iframe
                      src={youtubeEmbedUrl}
                      title="YouTube video preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {videoCheckMessage && (
                <div style={{
                  color: videoCheckStatus === 'unsupported' ? '#F87171' : videoCheckStatus === 'supported' ? '#34D399' : '#9CA3AF',
                  backgroundColor: videoCheckStatus === 'unsupported' ? 'rgba(248, 113, 113, 0.06)' : videoCheckStatus === 'supported' ? 'rgba(52, 211, 153, 0.06)' : 'rgba(156, 163, 175, 0.06)',
                  padding: '0.9rem 1rem',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${videoCheckStatus === 'unsupported' ? '#EF4444' : videoCheckStatus === 'supported' ? '#34D399' : '#6B7280'}`,
                  whiteSpace: 'pre-line',
                  fontSize: '0.9rem',
                  lineHeight: '1.5'
                }}>
                  {videoCheckMessage}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                
                {/* NEW: Interactive Toggle Switch Controls for Summary Mode (Brief Info vs. Short Bullets) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ color: '#9CA3AF', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.5px' }}>SUMMARY STRUCTURE TYPE</span>
                  <div style={{ display: 'flex', backgroundColor: '#151D30', padding: '4px', borderRadius: '10px', border: '1px solid #2D3748' }}>
                    <button
                      type="button"
                      onClick={() => setSummaryType('brief')}
                      disabled={loading}
                      style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: summaryType === 'brief' ? '#0070F3' : 'transparent', color: summaryType === 'brief' ? '#FFF' : '#9CA3AF', transition: 'all 0.2s' }}
                     className="simple-btn-glow">
                      ℹ️ Brief Video Info
                    </button>
                    <button
                      type="button"
                      onClick={() => setSummaryType('bullets')}
                      disabled={loading}
                      style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: summaryType === 'bullets' ? '#00F2FE' : 'transparent', color: summaryType === 'bullets' ? '#070A13' : '#9CA3AF', transition: 'all 0.2s' }}
                     className="simple-btn-glow">
                      📌 Important Bullets
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  {/* Language Selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.5px' }}>OUTPUT LANGUAGE</span>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      disabled={loading}
                      style={{ padding: '0.75rem 2.5rem 0.75rem 1.2rem', fontSize: '0.95rem', borderRadius: '10px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none', minWidth: '160px', fontWeight: '600', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239CA3AF\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px' }}
                    >
                      {languageOptions.map((lang) => (
                        <option key={lang} value={lang} style={{ backgroundColor: '#151D30', color: '#FFF' }}>{lang}</option>
                      ))}
                    </select>
                  </div>

                  {/* Submission Trigger */}
                  <button
                    type="submit"
                    disabled={loading || !inputUrl.trim()}
                    style={{ background: summaryType === 'bullets' ? 'linear-gradient(135deg, #00F2FE, #4FACFE)' : 'linear-gradient(135deg, #0070F3, #4FACFE)', color: summaryType === 'bullets' ? '#070A13' : '#FFF', fontWeight: '800', padding: '0.85rem 2rem', border: 'none', borderRadius: '10px', cursor: 'pointer', opacity: (loading || !inputUrl.trim()) ? 0.6 : 1, transition: 'all 0.2s', height: '42px', display: 'flex', alignItems: 'center' }}
                   className="simple-btn-glow">
                    {loading ? 'Summarizing....' : ` ${summaryType === 'bullets' ? 'Important Bullets' : 'Summarize'}`}
                  </button>
                </div>

              </div>
            </form>
            
            {errorMessage && (
              <div style={{ marginTop: '1.2rem', color: '#F87171', backgroundColor: 'rgba(248, 113, 113, 0.06)', padding: '1rem 1.2rem', borderRadius: '8px', borderLeft: '4px solid #F87171', fontSize: '0.95rem' }}>
                <span style={{ fontWeight: '700' }}>Active Pipeline Exception:</span> {errorMessage}
              </div>
            )}
          </div>

          {/* Loader Sequence Animation Card */}
          {loading && (
            <div style={{ backgroundColor: '#0F1626', borderRadius: '16px', border: '1px solid #1F2937', padding: '4rem 2rem', textAlign: 'center', color: '#9CA3AF', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              <div className="spinner" style={{ border: '3px solid rgba(0,242,254,0.1)', borderTop: `3px solid ${summaryType === 'bullets' ? '#00F2FE' : '#0070F3'}`, borderRadius: '50%', width: '40px', height: '40px', margin: '0 auto 1.5rem auto' }} />
              <p style={{ margin: 0, fontWeight: '600', color: '#FFF', fontSize: '1.1rem' }}>{loadingStep}</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#6B7280' }}>Processing standard {summaryType === 'bullets' ? 'bullet matrix arrays' : 'overview descriptions'} inside core system templates...</p>
            </div>
          )}

          {/* Core Split Evaluation Workspace Screen */}
          {analysisData && !loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem', alignItems: 'start' }}>
              
              {/* Left Screen Panel: Markdown Bullet Output Engine */}
              <div style={{ backgroundColor: '#0F1626', border: '1px solid #1F2937', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 25px rgba(0,0,0,0.2)' }}>
                <div style={{ borderBottom: '1px solid #1F2937', display: 'flex', backgroundColor: '#131C2E' }}>
                  <button 
                    onClick={() => setActiveTab('summary')}
                    style={{ flex: 1, padding: '1.2rem', fontSize: '0.95rem', fontWeight: '700', backgroundColor: activeTab === 'summary' ? '#0F1626' : 'transparent', color: activeTab === 'summary' ? (summaryType === 'bullets' ? '#00F2FE' : '#0070F3') : '#9CA3AF', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'summary' ? `2px solid ${summaryType === 'bullets' ? '#00F2FE' : '#0070F3'}` : '2px solid transparent', transition: 'all 0.2s' }}
                   className="simple-btn-glow">
                    {summaryType === 'bullets' ? '📌 Compiled Important Bullets' : '📝 Brief Overview Log'}
                  </button>

                </div>

                {activeTab === 'summary' && (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div className="custom-scroll" style={{ padding: '2rem 1.75rem', overflowY: 'auto', height: '420px', color: '#E5E7EB', fontSize: '1.02rem' }}>
                      {renderFormattedMarkdown(analysisData)}
                    </div>
                    
                    {/* Action Bar with Integrated Voice Synthesis Controllers */}
                    <div style={{ padding: '1.2rem 1.5rem', backgroundColor: '#131C2E', borderTop: '1px solid #1F2937', display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                      

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={copyToClipboard} style={{ padding: '0.6rem 1.1rem', fontSize: '0.88rem', fontWeight: '600', border: '1px solid #2D3748', borderRadius: '6px', backgroundColor: '#151D30', color: '#D1D5DB', cursor: 'pointer' }} className="simple-btn-glow">
                          {copied ? '✅ Saved text' : '📋 Copy Output'}
                        </button>
                        <button onClick={downloadTextSummary} style={{ padding: '0.6rem 1.1rem', fontSize: '0.88rem', fontWeight: '700', border: 'none', borderRadius: '6px', backgroundColor: '#2563EB', color: '#FFF', cursor: 'pointer' }} className="simple-btn-glow">
                          📥 Export File
                        </button>
                        <button onClick={handleGeneratePptPlan} disabled={!analysisData || pptLoading} style={{ padding: '0.6rem 1.1rem', fontSize: '0.88rem', fontWeight: '800', border: 'none', borderRadius: '6px', background: pptLoading ? '#374151' : 'linear-gradient(135deg, #A855F7, #00F2FE)', color: '#FFF', cursor: (pptLoading || !analysisData) ? 'not-allowed' : 'pointer', opacity: (pptLoading || !analysisData) ? 0.7 : 1 }} className="simple-btn-glow">
                          {pptLoading ? 'Creating PPT...' : '🎞 Generate PPT'}
                        </button>
                        <button onClick={() => setCurrentPage('assessment')} style={{ padding: '0.6rem 1.1rem', fontSize: '0.88rem', fontWeight: '800', border: 'none', borderRadius: '6px', background: 'linear-gradient(135deg, #00F2FE, #4FACFE)', color: '#070A13', cursor: 'pointer' }} className="simple-btn-glow">
                          📝 Create Assessment
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Screen Panel: Interactive Sandbox Chat Box */}
              <div style={{ backgroundColor: '#0F1626', border: '1px solid #1F2937', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '566px', boxShadow: '0 4px 25px rgba(0,0,0,0.2)' }}>
                <div style={{ borderBottom: '1px solid #1F2937', padding: '1.2rem 1.5rem', backgroundColor: '#131C2E', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34D399', boxShadow: '0 0 6px #34D399' }} />
                  <strong style={{ fontSize: '0.95rem', color: '#E5E7EB', fontWeight: '700' }}>Interactive ChatBot</strong>
                </div>

                <div className="custom-scroll" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#0B0F19' }}>
                  {chatHistory.map((msg, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '85%', padding: '0.85rem 1.2rem', borderRadius: '12px', fontSize: '0.95rem', lineHeight: '1.5', backgroundColor: msg.sender === 'user' ? '#2563EB' : '#151D30', color: '#FFF', border: msg.sender === 'user' ? 'none' : '1px solid #2D3748', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ color: '#9CA3AF', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '0.2rem' }}>
                      <div className="pulse-dot" />
                      <span style={{ color: '#6B7280', fontWeight: '500' }}>Analyzing data vectors...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid #1F2937', backgroundColor: '#131C2E', display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="Ask anything about the compiled summary details..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    style={{ flex: 1, padding: '0.8rem 1.1rem', fontSize: '0.95rem', borderRadius: '8px', border: '1px solid #2D3748', backgroundColor: '#151D30', color: '#FFF', outline: 'none' }}
                    disabled={chatLoading}
                  />
                  <button type="submit" disabled={chatLoading || !chatMessage.trim()} style={{ backgroundColor: '#34D399', color: '#070A13', border: 'none', borderRadius: '8px', padding: '0 1.5rem', fontWeight: '700', cursor: 'pointer', opacity: (chatLoading || !chatMessage.trim()) ? 0.6 : 1 }} className="simple-btn-glow">Ask</button>
                </form>
              </div>


              

            </div>
          )}
        </div>
      )}

      {currentPage === 'history' && (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ margin: 0, color: '#FFF', fontSize: '2rem', fontWeight: '800' }}>📜 Summary History</h2>
              <p style={{ margin: '0.5rem 0 0 0', color: '#9CA3AF', fontSize: '0.95rem' }}>
                Your last 20 summaries are saved securely in Firebase for your account only.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setCurrentPage('workspace')} className="back-overview-btn simple-btn-glow">
                ← Back to Workspace
              </button>

              {summaryHistory.length > 0 && (
                <button type="button" onClick={clearSummaryHistory} className="danger-btn simple-btn-glow">
                  Clear All
                </button>
              )}
            </div>
          </div>

          {summaryHistory.length === 0 ? (
            <div style={{ backgroundColor: '#0F1626', border: '1px dashed #374151', borderRadius: '18px', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗂️</div>
              <h3 style={{ color: '#FFF', margin: '0 0 0.6rem 0', fontSize: '1.4rem' }}>No saved summaries yet</h3>
              <p style={{ color: '#9CA3AF', margin: '0 0 1.5rem 0', lineHeight: '1.6' }}>
                Generate a summary first. It will automatically appear here.
              </p>
              <button type="button" onClick={() => setCurrentPage('workspace')} className="history-open-btn simple-btn-glow">
                Generate Summary
              </button>
            </div>
          ) : (
            <div className="history-grid">
              {summaryHistory.map((item) => (
                <div key={item.id} className="history-card">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.7rem' }}>
                      <h3 style={{ color: '#FFF', margin: 0, fontSize: '1rem', lineHeight: '1.4', wordBreak: 'break-word' }}>
                        {item.title || item.url}
                      </h3>

                      <span style={{ color: item.summaryType === 'bullets' ? '#00F2FE' : '#A855F7', border: `1px solid ${item.summaryType === 'bullets' ? '#00F2FE' : '#A855F7'}`, padding: '0.25rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '800', whiteSpace: 'nowrap' }}>
                        {item.summaryType === 'bullets' ? 'Bullets' : 'Brief'}
                      </span>
                    </div>

                    <p style={{ color: '#6B7280', margin: '0 0 0.9rem 0', fontSize: '0.8rem' }}>
                      {item.savedAt} • {item.language || 'English'}
                    </p>

                    <p style={{
                      color: '#9CA3AF',
                      margin: 0,
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.description || createHistoryDescription(item.summary, item.url)}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.3rem', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => openHistoryItem(item)} className="history-open-btn simple-btn-glow">
                      Open Summary
                    </button>

                    <button type="button" onClick={() => deleteHistoryItem(item.id)} className="history-delete-btn simple-btn-glow">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* Global CSS Core Styles */}
     <style>{`
  /* --- Existing Styles --- */
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
  
  .custom-scroll::-webkit-scrollbar { width: 6px; }
  .custom-scroll::-webkit-scrollbar-track { background: #0F1626; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #253147; border-radius: 3px; }
  .custom-scroll::-webkit-scrollbar-thumb:hover { background: #00F2FE; }
  
  /* --- STAR EFFECTS --- */
  .starfield {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }
  .app-shell > *:not(.starfield) {
    position: relative;
    z-index: 1;
  }
  .stars-container { position: fixed; inset: 0; width: 100vw; height: 100vh; overflow: hidden; pointer-events: none; z-index: 0; }
  .star { position: absolute; background-color: white; border-radius: 50%; width: 2px; height: 2px; animation: twinkle 4s infinite ease-in-out; }
  .star:nth-child(1) { top: 10%; left: 20%; animation-delay: 0s; }
  .star:nth-child(2) { top: 40%; left: 80%; animation-delay: 1s; }
  .star:nth-child(3) { top: 70%; left: 50%; animation-delay: 2s; }
  .star:nth-child(4) { top: 20%; left: 90%; animation-delay: 3s; }
  .star:nth-child(5) { top: 80%; left: 10%; animation-delay: 1.5s; }
  @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
  .feature-card {
  position: relative;
  background-color: #0F1626;
  border: 1px solid #1F2937;
  padding: 2.5rem;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  min-height: 250px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;

  transform: perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0);
  transform-style: preserve-3d;
  transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
}

.feature-card:hover {
  transform: perspective(1000px) rotateX(2deg) rotateY(-2deg) translateY(-14px) scale(1.03);
  box-shadow:
    0 30px 60px rgba(0, 0, 0, 0.45),
    0 0 35px rgba(0, 242, 254, 0.28);
  border-color: #00F2FE;
}

.feature-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(0, 242, 254, 0.22),
    transparent 45%,
    rgba(79, 172, 254, 0.16)
  );
  opacity: 0;
  transition: opacity 0.35s ease;
  pointer-events: none;
}

.feature-card:hover::before {
  opacity: 1;
}

.feature-card > * {
  position: relative;
  z-index: 1;
  transform: translateZ(35px);
}

  /* --- NEW: NEON BUTTON GLOW --- */
  .btn-glow {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .btn-glow:hover {
    box-shadow: 0 0 15px rgba(0, 242, 254, 0.6), 0 0 30px rgba(0, 242, 254, 0.3);
    transform: translateY(-2px) scale(1.02);
  }
  .btn-glow:active {
    transform: translateY(0) scale(0.98);
  }

  /* --- NEW: NAV LINK GLOW --- */

  .spinner {
    animation: spin 0.8s linear infinite;
  }

  .timestamp-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: #00F2FE;
    background: rgba(0, 242, 254, 0.10);
    border: 1px solid rgba(0, 242, 254, 0.45);
    padding: 0.18rem 0.55rem;
    border-radius: 999px;
    font-weight: 800;
    font-size: 0.92rem;
    margin-right: 0.35rem;
    text-decoration: none;
    box-shadow: 0 0 10px rgba(0, 242, 254, 0.18);
    transition: all 0.2s ease;
  }

  .timestamp-pill:hover {
    background: rgba(0, 242, 254, 0.18);
    box-shadow: 0 0 14px rgba(0, 242, 254, 0.35);
    transform: translateY(-1px);
  }

  .nav-link:hover {
    text-shadow: 0 0 8px #00F2FE;
    color: #00F2FE !important;
  }


  .back-overview-btn {
    background-color: transparent;
    color: #9CA3AF;
    border: 1px solid #374151;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.25s ease;
  }

  .back-overview-btn:hover {
    color: #00F2FE;
    border-color: #00F2FE;
    transform: translateY(-2px);
    box-shadow: 0 0 16px rgba(0, 242, 254, 0.25);
  }



  .youtube-preview-card {
    background: linear-gradient(145deg, #0B1120, #111827);
    border: 1px solid rgba(0, 242, 254, 0.22);
    border-radius: 16px;
    padding: 1rem;
    box-shadow: 0 14px 35px rgba(0, 0, 0, 0.35);
  }

  .youtube-preview-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    margin-bottom: 0.9rem;
    flex-wrap: wrap;
  }

  .youtube-preview-header span {
    color: #FFFFFF;
    font-weight: 800;
    font-size: 1rem;
  }

  .youtube-preview-header small {
    color: #9CA3AF;
    font-size: 0.82rem;
  }

  .youtube-embed-wrapper {
    position: relative;
    width: 100%;
    padding-top: 56.25%;
    border-radius: 12px;
    overflow: hidden;
    background: #000;
    border: 1px solid #1F2937;
  }

  .youtube-embed-wrapper iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
  }

  .history-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.4rem;
  }

  .history-card {
    background: linear-gradient(145deg, #0F1626, #111827);
    border: 1px solid #1F2937;
    border-radius: 18px;
    padding: 1.4rem;
    min-height: 230px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 12px 30px rgba(0,0,0,0.35);
    transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  }

  .history-card:hover {
    transform: translateY(-6px);
    border-color: rgba(0, 242, 254, 0.55);
    box-shadow: 0 20px 45px rgba(0, 242, 254, 0.13);
  }

  .history-open-btn {
    background: #00F2FE;
    color: #070A13;
    border: none;
    padding: 0.65rem 1rem;
    border-radius: 9px;
    cursor: pointer;
    font-weight: 800;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .history-open-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 16px rgba(0, 242, 254, 0.35);
  }

  .history-delete-btn,
  .danger-btn {
    background: transparent;
    color: #F87171;
    border: 1px solid #F87171;
    padding: 0.65rem 1rem;
    border-radius: 9px;
    cursor: pointer;
    font-weight: 700;
    transition: transform 0.2s ease, background-color 0.2s ease;
  }

  .history-delete-btn:hover,
  .danger-btn:hover {
    transform: translateY(-2px);
    background-color: rgba(248, 113, 113, 0.08);
  }
  
  
        .boss-fire-shell {
          background:
            radial-gradient(circle at top center, rgba(255, 163, 72, 0.18), transparent 28%),
            radial-gradient(circle at 20% 100%, rgba(239, 68, 68, 0.20), transparent 34%),
            radial-gradient(circle at 80% 100%, rgba(249, 115, 22, 0.22), transparent 32%),
            linear-gradient(180deg, #120809 0%, #13080A 26%, #1B0C08 58%, #120A08 100%);
        }
        .boss-fire-backdrop {
          position: absolute;
          border-radius: 50%;
          filter: blur(28px);
          opacity: 0.75;
          animation: bossFlameDrift 6s ease-in-out infinite;
        }
        .boss-fire-a {
          width: 420px;
          height: 420px;
          left: -120px;
          bottom: -140px;
          background: radial-gradient(circle, rgba(251,191,36,0.42), rgba(249,115,22,0.18) 45%, transparent 72%);
        }
        .boss-fire-b {
          width: 360px;
          height: 360px;
          right: -90px;
          bottom: -120px;
          background: radial-gradient(circle, rgba(239,68,68,0.34), rgba(249,115,22,0.18) 48%, transparent 72%);
          animation-delay: 1.6s;
        }
        .boss-fire-c {
          width: 260px;
          height: 260px;
          left: 50%;
          top: -90px;
          transform: translateX(-50%);
          background: radial-gradient(circle, rgba(251,146,60,0.20), rgba(239,68,68,0.10) 48%, transparent 72%);
          animation-delay: 0.8s;
        }
        .boss-fire-noise {
          position: absolute;
          inset: 0;
          opacity: 0.14;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 22px 22px;
          mix-blend-mode: screen;
        }
        .boss-fire-embers {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .boss-ember {
          position: absolute;
          bottom: -20px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: radial-gradient(circle, #FDE68A 0%, #FB923C 55%, rgba(249,115,22,0) 72%);
          box-shadow: 0 0 18px rgba(251,146,60,0.6);
          animation: emberRise 5.5s linear infinite;
        }
        .boss-ember.ember-2 { width: 6px; height: 6px; animation-duration: 4.8s; }
        .boss-ember.ember-3 { width: 10px; height: 10px; animation-duration: 6.2s; }
        .boss-ember.ember-4 { width: 5px; height: 5px; animation-duration: 4.4s; }
        .boss-enter-button {
          box-shadow: 0 0 28px rgba(249,115,22,0.30), 0 0 60px rgba(239,68,68,0.18);
        }
        .boss-champion-stage::before {
          content: '';
          position: absolute;
          inset: -40% -10% auto;
          height: 100%;
          background: radial-gradient(circle, rgba(251,191,36,0.20), transparent 55%);
          animation: championAura 3.8s ease-in-out infinite;
          pointer-events: none;
        }
        .boss-victory-aura {
          position: absolute;
          width: 360px;
          height: 360px;
          border-radius: 50%;
          left: 50%;
          top: 46%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(251,191,36,0.18), rgba(249,115,22,0.10) 46%, transparent 70%);
          filter: blur(10px);
          animation: championAura 3s ease-in-out infinite;
        }
        .boss-victory-ring {
          position: absolute;
          width: 260px;
          height: 260px;
          border-radius: 50%;
          left: 50%;
          top: 46%;
          transform: translate(-50%, -50%);
          border: 2px solid rgba(251,191,36,0.28);
          box-shadow: 0 0 0 12px rgba(251,191,36,0.06), 0 0 45px rgba(249,115,22,0.22);
          animation: championRing 2.8s linear infinite;
        }
        .boss-victory-burst {
          position: relative;
          width: 112px;
          height: 112px;
          margin: 0 auto;
          border-radius: 32px;
          background: linear-gradient(135deg, #FBBF24, #F97316);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.6rem;
          color: #111827;
          box-shadow: 0 0 40px rgba(249,115,22,0.38);
          animation: championBurst 2.2s ease-in-out infinite;
        }
        .boss-victory-title {
          margin-top: 1rem;
          color: #FBBF24;
          font-size: clamp(2.4rem, 6vw, 4.4rem);
          font-weight: 950;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          line-height: 1.05;
          text-shadow: 0 0 30px rgba(251,191,36,0.38), 0 0 70px rgba(249,115,22,0.22);
        }
        .boss-leaderboard-top {
          box-shadow: 0 0 30px rgba(251,191,36,0.12);
        }
        .boss-popup-overlay {
          position: fixed;
          inset: 0;
          z-index: 3000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: radial-gradient(circle at center, rgba(120,53,15,0.18), rgba(2,6,23,0.92) 55%, rgba(2,6,23,0.98) 100%);
          backdrop-filter: blur(8px);
        }
        .boss-popup-panel {
          position: relative;
          width: min(100%, 920px);
          padding: 2rem 1.8rem;
          border-radius: 32px;
          border: 1px solid rgba(251,146,60,0.34);
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 0%, rgba(251,191,36,0.10), transparent 30%),
            radial-gradient(circle at 0% 100%, rgba(239,68,68,0.12), transparent 28%),
            radial-gradient(circle at 100% 100%, rgba(249,115,22,0.16), transparent 30%),
            linear-gradient(180deg, rgba(24,10,10,0.96), rgba(10,10,18,0.96));
          box-shadow: 0 40px 120px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .boss-popup-particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .boss-popup-particle {
          position: absolute;
          bottom: -30px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(253,224,71,1) 0%, rgba(249,115,22,1) 55%, rgba(239,68,68,0) 75%);
          box-shadow: 0 0 20px rgba(249,115,22,0.55);
          animation: bossPopupRise 5s linear infinite;
        }
        .boss-popup-particle.particle-2 { width: 7px; height: 7px; animation-duration: 4.2s; }
        .boss-popup-particle.particle-3 { width: 12px; height: 12px; animation-duration: 5.8s; }
        .boss-popup-particle.particle-4 { width: 6px; height: 6px; animation-duration: 3.8s; }
        .boss-popup-particle.particle-5 { width: 9px; height: 9px; animation-duration: 4.9s; }
        .boss-popup-flare {
          position: absolute;
          border-radius: 50%;
          filter: blur(26px);
          opacity: 0.85;
          pointer-events: none;
        }
        .boss-popup-flare-left {
          width: 260px;
          height: 260px;
          left: -80px;
          bottom: -100px;
          background: radial-gradient(circle, rgba(249,115,22,0.55), rgba(239,68,68,0.16) 48%, transparent 70%);
        }
        .boss-popup-flare-right {
          width: 260px;
          height: 260px;
          right: -80px;
          bottom: -80px;
          background: radial-gradient(circle, rgba(251,191,36,0.42), rgba(249,115,22,0.16) 48%, transparent 70%);
        }
        .boss-popup-flare-top {
          width: 220px;
          height: 220px;
          left: 50%;
          top: -90px;
          transform: translateX(-50%);
          background: radial-gradient(circle, rgba(251,191,36,0.35), rgba(239,68,68,0.12) 48%, transparent 70%);
        }
        .boss-popup-crown-wrap {
          position: relative;
          width: 190px;
          height: 190px;
          margin: 0 auto 1.1rem auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .boss-popup-crown-burst {
          position: absolute;
          inset: 18px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(251,191,36,0.18), rgba(249,115,22,0.08) 45%, transparent 70%);
          animation: championAura 3s ease-in-out infinite;
        }
        .boss-popup-crown-ring {
          position: absolute;
          width: 148px;
          height: 148px;
          border-radius: 50%;
          border: 2px solid rgba(251,191,36,0.30);
          box-shadow: 0 0 0 18px rgba(251,191,36,0.05), 0 0 60px rgba(249,115,22,0.22);
          animation: championRing 3.2s linear infinite;
        }
        .boss-popup-crown {
          position: relative;
          width: 104px;
          height: 104px;
          border-radius: 30px;
          background: linear-gradient(135deg, #FBBF24, #F97316);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.9rem;
          color: #111827;
          box-shadow: 0 0 46px rgba(249,115,22,0.42);
          animation: championBurst 2.4s ease-in-out infinite;
        }
        .boss-popup-reveal {
          position: relative;
          text-align: center;
          animation: bossTitleReveal 0.9s ease-out both;
        }
        .boss-popup-kicker {
          color: #FDBA74;
          font-size: 0.82rem;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .boss-popup-title {
          margin: 0.7rem 0 0 0;
          color: #FFF7ED;
          font-size: clamp(2rem, 4vw, 3.3rem);
          font-weight: 950;
          line-height: 1.02;
          letter-spacing: 0.03em;
          text-shadow: 0 0 28px rgba(249,115,22,0.22);
        }
        .boss-popup-glow-line {
          width: min(240px, 58%);
          height: 3px;
          margin: 0.85rem auto 1rem auto;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(249,115,22,0), rgba(251,191,36,1), rgba(249,115,22,0));
          box-shadow: 0 0 18px rgba(251,191,36,0.35);
        }
        .boss-popup-subtitle {
          margin: 0;
          color: #FFF7ED;
          font-size: 1.15rem;
          font-weight: 850;
          line-height: 1.6;
        }
        .boss-popup-description {
          margin: 0.75rem auto 0 auto;
          max-width: 720px;
          color: #FED7AA;
          line-height: 1.72;
        }
        .boss-popup-stats {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.85rem;
          margin-top: 1.4rem;
        }
        .boss-popup-stat-card {
          background: rgba(10,15,25,0.55);
          border: 1px solid rgba(251,146,60,0.18);
          border-radius: 18px;
          padding: 1rem;
          text-align: center;
        }
        .boss-popup-stat-card span {
          display: block;
          color: #FDBA74;
          font-size: 0.76rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .boss-popup-stat-card strong {
          display: block;
          color: #FFF7ED;
          font-size: 1.2rem;
          font-weight: 950;
          margin-top: 0.35rem;
        }
        .boss-popup-toolbar {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-top: 1.45rem;
        }
        .boss-popup-sound-toggle,
        .boss-popup-secondary,
        .boss-popup-primary {
          border-radius: 14px;
          padding: 0.88rem 1.12rem;
          cursor: pointer;
          font-weight: 900;
          border: none;
        }
        .boss-popup-sound-toggle {
          background: rgba(15,23,42,0.76);
          color: #FDE68A;
          border: 1px solid rgba(251,191,36,0.28);
        }
        .boss-popup-actions {
          display: flex;
          gap: 0.7rem;
          flex-wrap: wrap;
        }
        .boss-popup-secondary {
          background: rgba(17,24,39,0.78);
          color: #FFF7ED;
          border: 1px solid rgba(255,255,255,0.10);
        }
        .boss-popup-primary {
          background: linear-gradient(135deg, #FBBF24, #F97316);
          color: #111827;
          box-shadow: 0 0 28px rgba(249,115,22,0.28);
        }
        @keyframes bossPopupRise {
          0% { transform: translateY(0) scale(0.65); opacity: 0; }
          12% { opacity: 1; }
          85% { opacity: 0.9; }
          100% { transform: translateY(-120vh) translateX(32px) scale(1.2); opacity: 0; }
        }
        @keyframes bossTitleReveal {
          0% { opacity: 0; transform: translateY(24px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes emberRise {
          0% { transform: translateY(0) scale(0.7); opacity: 0; }
          10% { opacity: 1; }
          80% { opacity: 0.9; }
          100% { transform: translateY(-520px) translateX(28px) scale(1.35); opacity: 0; }
        }
        @keyframes bossFlameDrift {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-16px) scale(1.05); }
        }
        @keyframes championAura {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.78; }
          50% { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
        }
        @keyframes championRing {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.92); opacity: 0.65; }
          50% { transform: translate(-50%, -50%) rotate(180deg) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(360deg) scale(0.92); opacity: 0.65; }
        }
        @keyframes championBurst {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.06); }
        }
@media (max-width: 900px) {
    .assessment-layout {
      grid-template-columns: 1fr !important;
    }
    .boss-popup-panel {
      padding: 1.4rem 1rem;
      border-radius: 24px;
    }
    .boss-popup-toolbar {
      flex-direction: column;
      align-items: stretch;
    }
    .boss-popup-actions {
      width: 100%;
      justify-content: stretch;
    }
    .boss-popup-actions button,
    .boss-popup-sound-toggle {
      width: 100%;
      justify-content: center;
    }
  }

.timestamp-button {
  border: none;
  font-family: inherit;
}
`}
</style>
  </div>
);
}
export default App;