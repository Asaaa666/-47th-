import { useState, useEffect, useRef } from 'react';

// ⚠️ STEP 2で取得したGASのWebアプリURLをここに貼り付けてください
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxkejAhnIoPCg5EncAM2NT4YfbTOX4dJXkhCQbKHSsIEF2uqnZdbCLLy1qziCrOBZv6vw/exec";

interface Group {
  name: string;
  description: string;
  location: string;
  logo: string;
  status: '更新済' | '未更新';
  waitingTime: string;
  comment: string;
  lastUpdated: string;
  category: string;
}

interface Coordinate {
  groupName: string;
  location: string;
  x: number;
  y: number;
  category?: string;
}

// ⏱️ 更新からの経過時間を計算する関数
const getTimeAgo = (dateString: string): string => {
  if (!dateString || dateString === "ー") return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "たった今";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}分前`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}時間前`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}日前`;
};

export default function App() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [coords, setCoords] = useState<Coordinate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterLocation, setFilterLocation] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('location') || 'すべて';
  });

  const [filterCategory, setFilterCategory] = useState<string>('すべて');
  const [sortBy, setSortBy] = useState<'waiting' | 'name' | 'category'>('waiting');
  const [isOpen, setisOpen] = useState(false);

  const [modalGroupName, setModalGroupName] = useState<string | null>(null);
  const [highlightedGroupName, setHighlightedGroupName] = useState<string | null>(null);

  const [pendingScroll, setPendingScroll] = useState<{ type: 'map'; groupName: string } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (filterLocation && filterLocation !== 'すべて') {
      params.set('location', filterLocation);
    } else {
      params.delete('location');
    }
    const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState(null, '', newRelativePathQuery);
  }, [filterLocation]);

  // 表示中のピンの中で「最も待ち時間が低い（空いている）」団体を自動選択
  const activePins = coords.filter(pin => pin.location === filterLocation);
  
  useEffect(() => {
    if (activePins.length > 0) {
      const exists = activePins.some(p => p.groupName === highlightedGroupName);
      if (!exists) {
        const sortedPins = [...activePins].sort((a, b) => {
          const getScore = (name: string) => {
            const g = groups.find(item => item.name === name);
            if (!g || !g.waitingTime) return 999;
            if (g.waitingTime === 'ー') return 0; 
            const val = parseFloat(g.waitingTime);
            return isNaN(val) ? 999 : val;
          };
          return getScore(a.groupName) - getScore(b.groupName);
        });

        setHighlightedGroupName(sortedPins[0].groupName);
      }
    } else {
      setHighlightedGroupName(null);
    }
  }, [filterLocation, coords, groups]);

  // 下部カードクリック時のみマップへスムーズスクロール
  useEffect(() => {
    if (!pendingScroll) return;

    const timer = setTimeout(() => {
      if (pendingScroll.type === 'map' && mapContainerRef.current) {
        mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setPendingScroll(null);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [filterLocation, pendingScroll]);

  const getLogoSrcCandidates = (originalLogo: string, groupName: string): string[] => {
    const filenames: string[] = [];
    const name = groupName.trim();

    if (originalLogo) {
      filenames.push(originalLogo.trim());
    }

    const clean = name.replace(/\s+/g, '');
    filenames.push(`${name}_ロゴ.png`, `${name} ロゴ.png`, `${name}.png`, `${clean}_ロゴ.png`, `${name}_ロゴ.jpg`, `${name}.jpeg`);

    const urls: string[] = [];
    filenames.forEach(fn => {
      if (!fn) return;
      urls.push('/' + fn.replace(/#/g, '%23').replace(/&/g, '%26').replace(/\?/g, '%3F'));
      urls.push('/' + encodeURIComponent(fn));
      urls.push('/' + fn);
    });

    return Array.from(new Set(urls));
  };

  const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    const candidatesStr = img.getAttribute('data-candidates');
    if (!candidatesStr) return;
    try {
      const candidates = JSON.parse(candidatesStr);
      const currentIdx = parseInt(img.getAttribute('data-index') || '0', 10);
      if (currentIdx < candidates.length - 1) {
        const nextIdx = currentIdx + 1;
        img.setAttribute('data-index', nextIdx.toString());
        img.src = candidates[nextIdx];
      } else {
        img.style.display = 'none';
        const parent = img.parentElement;
        if (parent && !parent.querySelector('.fallback-text')) {
          const textDiv = document.createElement('div');
          textDiv.className = 'fallback-text text-xs font-bold text-slate-400 absolute inset-0 flex items-center justify-center bg-slate-100';
          textDiv.innerText = '祭';
          parent.appendChild(textDiv);
        }
      }
    } catch (err) { console.error(err); }
  };

  // 🗺️ 屋台も含め、マップ画像のない場所は null を返す（絞り込み機能自体は維持）
  const getMapImagePath = (buttonName: string): string | null => {
    if (!buttonName || buttonName === 'すべて' || buttonName === 'その他' || buttonName === '屋台') return null;
    
    if (buttonName === '中学・高校棟 1階') return '/1階 (1).png';
    if (buttonName === '中学・高校棟 2階') return '/2階 (1).png';
    if (buttonName === '中学棟 3階') return '/中学棟3階 (1).png';
    if (buttonName === '中学棟 4階') return '/中学棟4階 (1).png';
    if (buttonName === '中学棟 5階') return '/中学棟5階 (1).png';
    if (buttonName === '高校棟 3階') return '/高校棟3階 (1).png';
    if (buttonName === '高校棟 4階') return '/高校棟4階 (1).png';
    if (buttonName === '高校棟 5階') return '/高校棟5階 (1).png';
    return null;
  };

  const getUnifiedLocationGroup = (rawLocation: string): string => {
    if (!rawLocation) return 'その他';
    if (rawLocation.includes('清和書林') || rawLocation.includes('清話書林') || rawLocation.includes('ハンドボールコートB')) return 'その他';
    if (rawLocation.includes('屋台') || rawLocation.includes('ハンドボールコート')) return '屋台';
    if (rawLocation.includes('アリーナ') || rawLocation.includes('打越アリーナ')) return '打越アリーナ';
    if (rawLocation.includes('中学棟 1階') || rawLocation.includes('高校棟 1階') || (rawLocation.includes('1階') && (rawLocation.includes('中学') || rawLocation.includes('高校')))) return '中学・高校棟 1階';
    if (rawLocation.includes('中学棟 2階') || rawLocation.includes('高校棟 2階') || (rawLocation.includes('2階') && (rawLocation.includes('中学') || rawLocation.includes('高校')))) return '中学・高校棟 2階';
    if (rawLocation.includes('中学棟')) {
      if (rawLocation.includes('3階')) return '中学棟 3階';
      if (rawLocation.includes('4階')) return '中学棟 4階';
      if (rawLocation.includes('5階')) return '中学棟 5階';
    }
    if (rawLocation.includes('高校棟')) {
      if (rawLocation.includes('3階')) return '高校棟 3階';
      if (rawLocation.includes('4階')) return '高校棟 4階';
      if (rawLocation.includes('5階')) return '高校棟 5階';
    }
    if (rawLocation.includes('1階')) return '中学・高校棟 1階';
    if (rawLocation.includes('2階')) return '中学・高校棟 2階';
    return 'other_fallback'; 
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await fetch(GAS_API_URL);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();

      const coordsCategoryMap: Record<string, string> = {};

      const coordsRows = (data.coords || []).slice(1);
      const parsedCoords: Coordinate[] = coordsRows.filter((row: any[]) => row && row[0] && row[1]).map((row: any[]) => {
        const groupName = String(row[0]).trim();
        const category = row[5] ? String(row[5]).trim() : (row[4] ? String(row[4]).trim() : "");
        if (groupName && category) {
          coordsCategoryMap[groupName] = category;
        }
        return {
          groupName: groupName,
          location: getUnifiedLocationGroup(String(row[1])),
          x: parseFloat(row[2]) || 50,
          y: parseFloat(row[3]) || 50,
          category: category
        };
      });
      setCoords(parsedCoords);

      const updatesRows = (data.updates || []).slice(1);
      const latestUpdates: Record<string, { waiting: string; comment: string; time: string }> = {};
      
      updatesRows.forEach((row: any[]) => {
        if (!row || row.length < 2) return;
        const timestamp = String(row[0]), name = String(row[1]), waiting = String(row[2]), comment = String(row[3]);
        if (name) latestUpdates[name] = { waiting: waiting || "ー", comment: comment || "", time: timestamp || "" };
      });

      const groupsRows = (data.groups || []).slice(1);
      let mergedGroups: Group[] = groupsRows.filter((row: any[]) => row && row.length > 1 && row[1]).map((row: any[]) => {
        const name = String(row[1]).trim();
        const category = coordsCategoryMap[name] || (row[5] ? String(row[5]).trim() : "その他");
        return {
          name: name,
          description: row[2] ? String(row[2]) : "紹介文はまだありません。",
          location: row[3] ? String(row[3]) : "校内",
          logo: row[4] ? String(row[4]) : "",
          status: latestUpdates[name] ? "更新済" : "未更新",
          waitingTime: latestUpdates[name] ? latestUpdates[name].waiting : "ー",
          comment: latestUpdates[name] ? latestUpdates[name].comment : "",
          lastUpdated: latestUpdates[name] ? latestUpdates[name].time : "",
          category: category || "その他"
        };
      });

      const hasBio = mergedGroups.some(g => g.name.includes("生物"));
      const hasLibrary = mergedGroups.some(g => g.name.includes("図書"));

      if (!hasBio) {
        const bioUpdates = Object.keys(latestUpdates).find(k => k.includes("生物"));
        mergedGroups.push({
          name: "生物部", description: "生物部です！様々な展示を行っています。ぜひお越しください！", location: "生物特別教室", logo: "肩 生物部ロゴ.png",
          status: bioUpdates ? "更新済" : "未更新", waitingTime: bioUpdates ? latestUpdates[bioUpdates].waiting : "ー",
          comment: bioUpdates ? latestUpdates[bioUpdates].comment : "", lastUpdated: bioUpdates ? latestUpdates[bioUpdates].time : "",
          category: coordsCategoryMap["生物部"] || "展示"
        });
      }

      if (!hasLibrary) {
        const libUpdates = Object.keys(latestUpdates).find(k => k.includes("図書"));
        mergedGroups.push({
          name: "図書研究部", description: "図書研究部（図書委員会古本バザー）です。面白い本がたくさんあります！", location: "本校舎教室", logo: "図書研究部 ロゴ.png",
          status: libUpdates ? "更新済" : "未更新", waitingTime: libUpdates ? latestUpdates[libUpdates].waiting : "ー",
          comment: libUpdates ? latestUpdates[libUpdates].comment : "", lastUpdated: libUpdates ? latestUpdates[libUpdates].time : "",
          category: coordsCategoryMap["図書研究部"] || "展示"
        });
      }

      setGroups(mergedGroups);
    } catch (error) {
      console.error("データの取得に失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const uniqueCategories = Array.from(new Set(groups.map(g => g.category).filter(Boolean)));
  const categoryOptions = ['すべて', ...uniqueCategories];

  const filteredGroups = groups.filter(group => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = group.name.toLowerCase().includes(searchLower) || 
                          group.description.toLowerCase().includes(searchLower) ||
                          group.category.toLowerCase().includes(searchLower) ||
                          group.location.toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;

    if (filterLocation !== 'すべて') {
      const rawLocation = group.location || "";
      if (rawLocation.includes('生徒ホール') || rawLocation.includes('せいとほーる')) {
        if (filterLocation !== '中学・高校棟 1階' && filterLocation !== 'その他') return false;
      } else {
        const unified = getUnifiedLocationGroup(rawLocation);
        if (filterLocation === 'その他') {
          if (unified !== 'other_fallback') return false;
        } else if (unified !== filterLocation) {
          return false;
        }
      }
    }

    if (filterCategory !== 'すべて' && group.category !== filterCategory) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name, 'ja');
    } else if (sortBy === 'category') {
      const catCompare = a.category.localeCompare(b.category, 'ja');
      if (catCompare !== 0) return catCompare;
      const valA = a.waitingTime === "ー" ? Infinity : parseFloat(a.waitingTime);
      const valB = b.waitingTime === "ー" ? Infinity : parseFloat(b.waitingTime);
      return valA - valB;
    } else {
      const valA = a.waitingTime === "ー" ? Infinity : parseFloat(a.waitingTime);
      const valB = b.waitingTime === "ー" ? Infinity : parseFloat(b.waitingTime);
      if (valA !== valB) return valA - valB;
      return a.name.localeCompare(b.name, 'ja');
    }
  });

  const presetLocations = [
    'すべて', '中学・高校棟 1階', '中学・高校棟 2階', '中学棟 3階', '中学棟 4階', '中学棟 5階', '高校棟 3階', '高校棟 4階', '高校棟 5階', '打越アリーナ', '屋台', 'その他'
  ];

  const currentMapPath = getMapImagePath(filterLocation);
  const highlightedGroup = groups.find(g => g.name === highlightedGroupName);

  const getPinTheme = (time: string) => {
    if (time === "ー" || !time) return { border: "border-blue-500", bg: "bg-blue-500" };
    const t = parseFloat(time);
    if (isNaN(t)) return { border: "border-blue-500", bg: "bg-blue-500" };
    if (t <= 2) return { border: "border-green-500", bg: "bg-green-500" };
    if (t <= 4) return { border: "border-orange-500", bg: "bg-orange-500" };
    if (t <= 5) return { border: "border-red-500", bg: "bg-red-500" };
    return { border: "border-red-600", bg: "bg-red-600" };
  };

  const handleItemClick = (groupName: string, source: 'map' | 'list') => {
    const groupCoord = coords.find(c => c.groupName === groupName);
    const group = groups.find(g => g.name === groupName);
    const targetLocation = groupCoord?.location || (group ? getUnifiedLocationGroup(group.location) : null);

    if (targetLocation && getMapImagePath(targetLocation)) {
      setHighlightedGroupName(groupName);

      if (filterLocation !== targetLocation) {
        setFilterLocation(targetLocation);
      }

      if (source === 'list') {
        setPendingScroll({ type: 'map', groupName });
      } else if (source === 'map' && window.innerWidth < 1024) {
        setModalGroupName(groupName);
      }
    } else {
      setModalGroupName(groupName);
    }
  };

  const selectedGroupInfo = groups.find(g => g.name === modalGroupName);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans pb-12">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md flex items-center justify-center text-xl font-bold w-9 h-9">🎪</div>
            <div>
              <h1 className="font-black text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">打越祭リアルタイム混雑マップ</h1>
              <p className="text-[10px] text-slate-400 font-medium -mt-0.5">Live Traffic & Activity Monitor</p>
            </div>
          </div>
          <button onClick={fetchData} disabled={loading} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50">
            <span className={loading ? 'animate-spin inline-block' : ''}>🔄</span>
            <span>{loading ? '読込中...' : '更新'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-6 relative z-10">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <input type="text" placeholder="🔍 団体名、部門、キーワードで検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
          
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">表示順 (並び替え)</span>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setSortBy('waiting')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${sortBy === 'waiting' ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                ⚡ 待ち時間順 (低い順)
              </button>
              <button onClick={() => setSortBy('name')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${sortBy === 'name' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                🔤 名前順 (五十音)
              </button>
              <button onClick={() => setSortBy('category')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${sortBy === 'category' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                🏷️ 部門順
              </button>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-100">
            <button 
              onClick={() => setisOpen(!isOpen)}
              className="w-full py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1"
            >
              {isOpen ? '絞り込みを閉じる ▲' : '絞り込みを開く ▼'}
            </button>
          </div>

          {isOpen && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              {uniqueCategories.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">部門で絞り込む</span>
                  <div className="flex flex-wrap gap-1.5">
                    {categoryOptions.map((cat, i) => (
                      <button 
                        key={i} 
                        onClick={() => {
                          setFilterCategory(cat);
                          setFilterLocation('すべて');
                        }} 
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterCategory === cat ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {cat === 'すべて' ? 'すべての部門' : cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">場所・エリアで絞り込む</span>
                <div className="flex flex-wrap gap-1.5">
                  {presetLocations.map((loc, i) => (
                    <button 
                      key={i} 
                      onClick={() => {
                        setFilterLocation(loc);
                        setFilterCategory('すべて');
                      }} 
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterLocation === loc ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🗺️ マップコンテナ（マップ画像が存在するエリアのみ表示） */}
        {currentMapPath && (
          <div ref={mapContainerRef} className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm space-y-4 scroll-mt-20">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">🗺️ {filterLocation} のリアルタイムピンマップ</h2>
                <span className="hidden lg:inline-block text-xs text-slate-400 font-normal">（一番待ち時間の低い団体が自動選択されています）</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* 左側: マップエリア */}
              <div className="lg:col-span-7 xl:col-span-8">
                <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative shadow-inner">
                  <div className="relative inline-block w-full leading-none text-[0]">
                    <img src={currentMapPath} alt={`${filterLocation}のマップ`} className="w-full h-auto block pointer-events-none" />
                    
                    {activePins.map((pin, i) => {
                      const groupInfo = groups.find(g => g.name === pin.groupName);
                      const theme = getPinTheme(groupInfo?.waitingTime || "ー");
                      const isTarget = highlightedGroupName === pin.groupName;
                      const candidates = groupInfo ? getLogoSrcCandidates(groupInfo.logo, groupInfo.name) : [];
                      const candidatesJson = JSON.stringify(candidates);
                      
                      return (
                        <div 
                          key={i} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(pin.groupName, 'map');
                          }} 
                          className={`absolute cursor-pointer group transform -translate-x-1/2 -translate-y-1/2 transition-all ${isTarget ? 'scale-125 z-50' : 'hover:scale-125 z-20 hover:z-30'}`} 
                          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                        >
                          <div className="relative flex items-center justify-center">
                            <div className={`w-8 h-8 md:w-14 md:h-14 rounded-full bg-white border-2 md:border-4 shadow-md overflow-hidden flex items-center justify-center relative transition-all ${
                              isTarget 
                                ? 'ring-4 ring-yellow-400 border-yellow-500 shadow-[0_0_20px_rgba(250,204,21,0.9)] animate-pulse' 
                                : theme.border
                            }`}>
                              {candidates.length > 0 ? (
                                <img 
                                  src={candidates[0]} 
                                  alt={pin.groupName} 
                                  className="w-full h-full object-cover" 
                                  data-candidates={candidatesJson} 
                                  data-index="0" 
                                  onError={handleLogoError} 
                                />
                              ) : (
                                <span className="text-[10px] md:text-xs font-bold text-slate-500">{pin.groupName.slice(0, 2)}</span>
                              )}
                            </div>

                            <div className={`absolute bottom-full mb-1 px-2 py-0.5 bg-slate-900/90 text-white rounded text-[10px] md:text-xs font-bold whitespace-nowrap shadow-md pointer-events-none transition-opacity ${isTarget ? 'opacity-100 z-50 bg-yellow-500 text-slate-900' : 'opacity-0 group-hover:opacity-100'}`}>
                              {pin.groupName}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 右側: リアルタイム詳細カード */}
              <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20">
                {highlightedGroup ? (
                  <div className="bg-amber-50/90 border-2 border-amber-400 rounded-xl p-5 shadow-md space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-white border border-amber-300 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-sm relative">
                          {(() => {
                            const candidates = getLogoSrcCandidates(highlightedGroup.logo, highlightedGroup.name);
                            return candidates.length > 0 ? (
                              <img src={candidates[0]} alt="logo" className="w-full h-full object-cover" data-candidates={JSON.stringify(candidates)} data-index="0" onError={handleLogoError} />
                            ) : ( <div className="text-xl font-bold text-slate-400">祭</div> );
                          })()}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 leading-snug">{highlightedGroup.name}</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">📍 {highlightedGroup.location}</span>
                            {highlightedGroup.category && (
                              <span className="text-[11px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">🏷️ {highlightedGroup.category}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/80 rounded-xl p-3 border border-amber-200 flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-xs font-bold text-slate-500 block">混雑度 / 待ち時間</span>
                        {getTimeAgo(highlightedGroup.lastUpdated) && (
                          <span className="text-[10px] text-slate-400 font-medium">🕒 {getTimeAgo(highlightedGroup.lastUpdated)}に更新</span>
                        )}
                      </div>
                      <span className="text-sm font-black text-orange-600">
                        {highlightedGroup.waitingTime !== "ー" ? `🔥 レベル ${highlightedGroup.waitingTime}` : "待ちなし (ー)"}
                      </span>
                    </div>

                    {highlightedGroup.comment && (
                      <div className="bg-orange-100/80 p-3 rounded-xl border border-orange-200 text-xs text-orange-900 font-bold">
                        💬 "{highlightedGroup.comment}"
                      </div>
                    )}

                    {highlightedGroup.description && (
                      <div className="text-xs text-slate-700 leading-relaxed font-medium bg-white/70 p-3.5 rounded-xl border border-amber-200/80 max-h-56 overflow-y-auto">
                        {highlightedGroup.description}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/50">
                    <span className="text-4xl mb-3">📍</span>
                    <p className="text-xs font-bold text-slate-600">ピン情報がありません</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 団体カードグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group, idx) => {
            const candidates = getLogoSrcCandidates(group.logo, group.name);
            const candidatesJson = JSON.stringify(candidates);
            const isHighlighted = highlightedGroupName === group.name;
            const timeAgoStr = getTimeAgo(group.lastUpdated);
            
            return (
              <div 
                key={idx} 
                id={`card-${group.name}`}
                onClick={() => handleItemClick(group.name, 'list')} 
                className={`bg-white rounded-xl shadow-sm border transition-all p-5 flex flex-col justify-between space-y-4 cursor-pointer scroll-mt-24 ${isHighlighted ? 'border-yellow-500 ring-2 ring-yellow-300 scale-[1.02] shadow-md' : 'border-slate-200 hover:border-blue-400 hover:shadow-md'}`}
              >
                <div>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                      {candidates.length > 0 ? (
                        <img src={candidates[0]} alt="logo" className="w-full h-full object-cover" data-candidates={candidatesJson} data-index="0" onError={handleLogoError} />
                      ) : ( <div className="text-xl font-bold text-slate-400">祭</div> )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-base leading-tight truncate">{group.name}</h3>
                        
                        {/* ⏱️ ステータスと〇分前の表示 */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${group.status === '更新済' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {group.status}
                          </span>
                          {timeAgoStr && (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                              {timeAgoStr}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-xs font-semibold text-blue-600">📍 {group.location}</span>
                        {group.category && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            🏷️ {group.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className={`text-xs text-slate-500 mt-3 leading-relaxed transition-all ${isHighlighted ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                    {group.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">混雑度/待ち時間</span>
                    <span className="text-sm font-bold text-slate-700">{group.waitingTime !== "ー" ? <span className="text-orange-600">🔥 レベル {group.waitingTime}</span> : <span className="text-slate-400">ー</span>}</span>
                  </div>
                  {group.comment && ( 
                    <div className="text-right max-w-[60%] bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      <span className={`text-[11px] text-slate-600 block font-medium ${isHighlighted ? '' : 'truncate'}`}>"{group.comment}"</span>
                    </div> 
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {!loading && filteredGroups.length === 0 && <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 font-medium text-sm">該当する団体が見つかりませんでした。</div>}
      </main>

      {/* スマホ用モーダル */}
      {selectedGroupInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setModalGroupName(null)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalGroupName(null)} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 z-10 font-bold transition">✕</button>
            
            <div className="p-6 overflow-y-auto">
              <div className="w-24 h-24 mx-auto bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden mb-4 relative shadow-sm">
                {(() => {
                  const candidates = getLogoSrcCandidates(selectedGroupInfo.logo, selectedGroupInfo.name);
                  return candidates.length > 0 ? (
                    <img src={candidates[0]} alt="logo" className="w-full h-full object-cover" data-candidates={JSON.stringify(candidates)} data-index="0" onError={handleLogoError} />
                  ) : ( <div className="text-3xl font-bold text-slate-400">祭</div> );
                })()}
              </div>
              
              <h3 className="text-2xl font-black text-center text-slate-800 mb-1">{selectedGroupInfo.name}</h3>
              
              <div className="flex justify-center items-center gap-2 mb-5">
                <span className="text-sm font-bold text-blue-600">📍 {selectedGroupInfo.location}</span>
                {selectedGroupInfo.category && (
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    🏷️ {selectedGroupInfo.category}
                  </span>
                )}
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4 flex items-center justify-between shadow-inner">
                 <div>
                    <span className="text-xs font-bold text-slate-500 block">現在の混雑度 / 待ち時間</span>
                    {getTimeAgo(selectedGroupInfo.lastUpdated) && (
                      <span className="text-[10px] text-slate-400 font-medium">🕒 {getTimeAgo(selectedGroupInfo.lastUpdated)}に更新</span>
                    )}
                 </div>
                 <span className={`text-xl font-black ${selectedGroupInfo.waitingTime !== "ー" ? 'text-orange-600' : 'text-slate-700'}`}>
                    {selectedGroupInfo.waitingTime !== "ー" ? `🔥 ${selectedGroupInfo.waitingTime}` : "待ちなし (ー)"}
                 </span>
              </div>
              
              {selectedGroupInfo.comment && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 text-sm text-orange-800 font-bold shadow-sm flex gap-2">
                  <span>💬</span>
                  <p>{selectedGroupInfo.comment}</p>
                </div>
              )}
              
              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedGroupInfo.description}
                </p>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => setModalGroupName(null)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition active:scale-[0.98]">
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
