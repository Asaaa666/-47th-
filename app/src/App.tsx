import { useState, useEffect, useRef } from 'react';

// あなたのスプレッドシートID
const SPREADSHEET_ID = "1W4vJaSM0jlOQcjE-TstUby6v0K1bJeSY3GnSH8BDKhA"; 

const EXACT_FILE_MAP: Record<string, string[]> = {
  "化学部": ["化学部_ロゴ.png"],
  "物理部": ["物理部展#2026 ロゴ.png"],
  "物理部展#2026": ["物理部展#2026 ロゴ.png"],
  "Asano Debating Union": ["Asano Debating Union_ロゴ(教室,講堂企画合同).png"],
  "ADU": ["Asano Debating Union_ロゴ(教室,講堂企画合同).png"],
  "ポテトヘッド": ["ポテトヘッド ロゴ.png"],
  "神兵衛": ["神兵衛_ロゴ .png"], 
  "鶏ッピー": ["鶏ッピー ロゴ.jpg"], 
  "浅野特撮研究会": ["ASET 浅野学園特撮研究会_ロゴ.png のコピー.png"], 
  "ASET": ["ASET 浅野学園特撮研究会_ロゴ.png のコピー.png"],
  "生徒会チャリティー": ["浅野学園生徒会_ロゴ.png"],
  "生徒会": ["浅野学園生徒会_ロゴ.png"],
  "歴史研究部": ["歴史研究部_ロゴ.png"],
  "鉃道研究部": ["鉃道研究部_ロゴ.png"],
  "鉄道研究部": ["鉃道研究部_ロゴ.png"],
  "浅野学園吹奏楽部": ["浅野学園吹奏楽部_ロゴ.jpg"],
  "吹奏楽部": ["浅野学園吹奏楽部_ロゴ.jpg"],
  "ARCHERz": ["ARCHERz_ロゴ.jpg"],
  "美術部展": ["美術部展＿ロゴ.png"], 
  "ホラー展": ["ホラー展_ロゴ.png"],
  "Melon Frappe Jazz Orchestra": ["Melon Frappe Jazz Orchestra_ロゴ.png"],
  "数学同好会": ["数学同好会_ロゴ.png"],
  "びりやーど研究会": ["びりやーど研究会_ロゴ.png"],
  "中学野球部": ["中学野球部_ロゴ.jpeg"], 
  "折り紙研究会": ["折り紙研究会_ロゴ.png"],
  "喰いコミュニケーションXXIV": ["喰いコミュニケーションXXIV_ロゴ.jpg"],
  "喰いコミュニケーション": ["喰いコミュニケーションXXIV_ロゴ.jpg"],
  "団GO": ["団GO!_ロゴ.png"],
  "団GO！": ["団GO!_ロゴ.png"],
  "図書研究部": ["図書研究部 ロゴ.png", "図書委員会古本バザー _ロゴ.png"],
  "生物部": ["肩 生物部ロゴ.png"], 
  "地学部プラネタリウム": ["地学部プラネタリウム_ロゴ.png"],
  "地学部展示": ["地学部展示_ロゴ.png"],
  "Cooland": ["Cooland_ロゴ.png"],
  "American Cafe BEN&KEN": ["AMERICAN CAFE BEN&KEN_ロゴ.png"],
  "AMERICAN CAFE BEN & KEN": ["AMERICAN CAFE BEN&KEN_ロゴ.png"],
  "焼きすぎて麺": ["焼きすぎて麺！_ロゴ.png"],
  "焼きすぎて麺！": ["焼きすぎて麺！_ロゴ.png"],
  "Zepp Asano": ["Zepp Asano_ロゴ.png"],
  "りすのおうち": ["りすのおうち_ロゴ.png"],
  "アサノ大全": ["アサノ大全.PNG"], 
  "地学部ロケット実演": ["地学部ロケット実演_ロゴ.png"],
  "あまねくダンク": ["あまねくダンク_ロゴ.png"],
  "クイズ研究部": ["クイズ研究部.png"],
  "的に当てろ屋": ["的に当てろ屋_ロゴ.jpg"],
  "書道部展示": ["書道部_ロゴ.png"],
  "書道部": ["書道部_ロゴ.png"],
  "棋道部": ["棋道部＿ロゴ.png"],
  "登山部": ["登山部 ＿ロゴ.png"],
  "演劇部": ["演劇部_ロゴ.png"],
  "図書委員会古本バザー": ["図書委員会古本バザー _ロゴ.png"],
  "Juggling Art Asano": ["Juggling Art Asano_ロゴ(アリーナ、講堂共通) .png_"], 
  "KCC": ["KCC_ロゴ.png"],
  "KCC Lounge": ["KCC_ロゴ.png"],
  "中１学年参加": ["中１学年参加_ロゴ.png"],
  "中1学年参加": ["中１学年参加_ロゴ.png"],
  "スクラム食堂": ["スクラム食堂.png"],
  "おばけ屋敷": ["おばけ屋敷_ロゴ.jpeg"],
   "レーザータグ": ["レーザータグ_ロゴ.png"],
   "CHANCE and PLANTS": ["中２学年参加_ロゴ.png"],
   "装飾部門": ["装飾部門_ロゴ.png"],
   "浅野同窓会": ["浅野同窓会_ロゴ.png"],
   "涼水": ["涼水_ロゴ.png"] ,
    };

interface Group {
  name: string;
  description: string;
  location: string;
  logo: string;
  status: '更新済' | '未更新';
  waitingTime: string;
  comment: string;
  lastUpdated: string;
}

interface Coordinate {
  groupName: string;
  location: string;
  x: number;
  y: number;
}

export default function App() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [coords, setCoords] = useState<Coordinate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterLocation, setFilterLocation] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('location') || 'すべて';
  });
  
  const [modalGroupName, setModalGroupName] = useState<string | null>(null);
  const [highlightedGroupName, setHighlightedGroupName] = useState<string | null>(null);

  // 🔥 開発用：クリックした座標を保存するステート
  const [clickedCoords, setClickedCoords] = useState<{x: string, y: string} | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHighlightedGroupName(null);
    setClickedCoords(null); // 場所を切り替えたら座標リセット
  }, [filterLocation, searchTerm]);

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

  const getLogoSrcCandidates = (originalLogo: string, groupName: string): string[] => {
    const filenames: string[] = [];
    const name = groupName.trim();
    const normalizeKey = (str: string) => str.toLowerCase().replace(/\s+/g, '').replace(/[！!！＿_#＃＆&()（）]/g, '').replace(/鉄/g, '鉃');
    const normName = normalizeKey(name);

    if (originalLogo) filenames.push(originalLogo.trim());
    if (name.includes("生物")) filenames.push("肩 生物部ロゴ.png");
    if (name.includes("図書")) { filenames.push("図書研究部 ロゴ.png"); filenames.push("図書委員会古本バザー _ロゴ.png"); }

    if (EXACT_FILE_MAP[name]) {
      filenames.push(...EXACT_FILE_MAP[name]);
    } else {
      Object.keys(EXACT_FILE_MAP).forEach(key => {
        const normKey = normalizeKey(key);
        if (normName.includes(normKey) || normKey.includes(normName) || name.includes(key) || key.includes(name)) {
          filenames.push(...EXACT_FILE_MAP[key]);
        }
      });
    }

    const clean = name.replace(/\s+/g, '');
    filenames.push(`${name}_ロゴ.png`, `${name} ロゴ.png`, `${name}.png`, `${clean}_ロゴ.png`);

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
          textDiv.className = 'fallback-text text-xl font-bold text-slate-400 absolute inset-0 flex items-center justify-center bg-slate-100';
          textDiv.innerText = '祭';
          parent.appendChild(textDiv);
        }
      }
    } catch (err) { console.error(err); }
  };

  const getMapImagePath = (buttonName: string): string | null => {
    if (!buttonName || buttonName === 'すべて' || buttonName === 'その他') return null;
    if (buttonName === '屋台') return '/屋台 (1).png';
    if (buttonName === '打越アリーナ') return '/アリーナ.png';
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

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    return lines.map(line => line.split(',').map(cell => {
      let cleaned = cell.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.substring(1, cleaned.length - 1);
      return cleaned.replace(/""/g, '"');
    })).filter(row => row.length > 0 && row.some(cell => cell !== ""));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsRes, updatesRes, coordsRes] = await Promise.all([
        fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("団体名")}`),
        fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("updates")}`),
        fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("coords")}`).catch(() => null)
      ]);

      const groupsText = await groupsRes.text();
      const updatesText = await updatesRes.text();

      if (coordsRes) {
        const coordsText = await coordsRes.text();
        const coordsRows = parseCSV(coordsText).slice(1);
        const parsedCoords: Coordinate[] = coordsRows.filter(row => row && row[0] && row[1]).map(row => ({
          groupName: row[0], location: getUnifiedLocationGroup(row[1]), x: parseFloat(row[2]) || 50, y: parseFloat(row[3]) || 50
        }));
        setCoords(parsedCoords);
      }

      const groupsRows = parseCSV(groupsText).slice(1);
      const updatesRows = parseCSV(updatesText).slice(1);
      const latestUpdates: Record<string, { waiting: string; comment: string; time: string }> = {};
      
      updatesRows.forEach(row => {
        if (!row || row.length < 2) return;
        const timestamp = row[0], name = row[1], waiting = row[2], comment = row[3];
        if (name) latestUpdates[name] = { waiting: waiting || "ー", comment: comment || "", time: timestamp || "" };
      });

      let mergedGroups: Group[] = groupsRows.filter(row => row && row.length > 1 && row[1]).map(row => ({
        name: row[1], description: row[2] || "紹介文はまだありません。", location: row[3] || "校内", logo: row[4] || "",
        status: latestUpdates[row[1]] ? "更新済" : "未更新", waitingTime: latestUpdates[row[1]] ? latestUpdates[row[1]].waiting : "ー",
        comment: latestUpdates[row[1]] ? latestUpdates[row[1]].comment : "", lastUpdated: latestUpdates[row[1]] ? latestUpdates[row[1]].time : ""
      }));

      const hasBio = mergedGroups.some(g => g.name.includes("生物"));
      const hasLibrary = mergedGroups.some(g => g.name.includes("図書"));

      if (!hasBio) {
        const bioUpdates = Object.keys(latestUpdates).find(k => k.includes("生物"));
        mergedGroups.push({
          name: "生物部", description: "生物部です！様々な展示を行っています。ぜひお越しください！", location: "生物特別教室", logo: "肩 生物部ロゴ.png",
          status: bioUpdates ? "更新済" : "未更新", waitingTime: bioUpdates ? latestUpdates[bioUpdates].waiting : "ー",
          comment: bioUpdates ? latestUpdates[bioUpdates].comment : "", lastUpdated: bioUpdates ? latestUpdates[bioUpdates].time : ""
        });
      }

      if (!hasLibrary) {
        const libUpdates = Object.keys(latestUpdates).find(k => k.includes("図書"));
        mergedGroups.push({
          name: "図書研究部", description: "図書研究部（図書委員会古本バザー）です。面白い本がたくさんあります！", location: "本校舎教室", logo: "図書研究部 ロゴ.png",
          status: libUpdates ? "更新済" : "未更新", waitingTime: libUpdates ? latestUpdates[libUpdates].waiting : "ー",
          comment: libUpdates ? latestUpdates[libUpdates].comment : "", lastUpdated: libUpdates ? latestUpdates[libUpdates].time : ""
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

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) || group.description.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterLocation === 'すべて') return true;
    const rawLocation = group.location || "";
    if (rawLocation.includes('生徒ホール') || rawLocation.includes('せいとほーる')) {
      return filterLocation === '中学・高校棟 1階' || filterLocation === 'その他';
    }
    const unified = getUnifiedLocationGroup(rawLocation);
    if (filterLocation === 'その他' && unified === 'other_fallback') return true;
    return unified === filterLocation;
  }).sort((a, b) => {
    const valA = a.waitingTime === "ー" ? Infinity : parseFloat(a.waitingTime);
    const valB = b.waitingTime === "ー" ? Infinity : parseFloat(b.waitingTime);
    return valA - valB; 
  });

  const presetLocations = [
    'すべて', '中学・高校棟 1階', '中学・高校棟 2階', '中学棟 3階', '中学棟 4階', '中学棟 5階', '高校棟 3階', '高校棟 4階', '高校棟 5階', '打越アリーナ', '屋台', 'その他'
  ];

  const currentMapPath = getMapImagePath(filterLocation);
  const activePins = coords.filter(pin => pin.location === filterLocation);

  const getPinTheme = (time: string) => {
    if (time === "ー" || !time) return { bg: "bg-blue-500", text: "text-blue-500" };
    const t = parseFloat(time);
    if (isNaN(t)) return { bg: "bg-blue-500", text: "text-blue-500" };
    if (t <= 15) return { bg: "bg-green-500", text: "text-green-500" };
    if (t <= 30) return { bg: "bg-orange-500", text: "text-orange-500" };
    return { bg: "bg-red-600", text: "text-red-600" };
  };

  const handleItemClick = (groupName: string, source: 'map' | 'list') => {
    if (filterLocation === 'すべて') {
      setModalGroupName(groupName);
    } else {
      setHighlightedGroupName(groupName);
      setTimeout(() => {
        if (source === 'map') {
          const el = document.getElementById(`card-${groupName}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (source === 'list') {
          if (mapContainerRef.current) {
            mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 50);
    }
  };

  // 🔥 マップ画像をクリックした時に座標を計算する関数
  const handleMapClickForCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPos = ((e.clientX - rect.left) / rect.width) * 100;
    const yPos = ((e.clientY - rect.top) / rect.height) * 100;
    
    // 小数点第2位までに丸めて保存
    setClickedCoords({
      x: xPos.toFixed(2),
      y: yPos.toFixed(2)
    });
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
          <input type="text" placeholder="🔍 団体名やキーワードで検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">場所・エリアで絞り込む</span>
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">🟢 待ち時間が低い順に表示中</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presetLocations.map((loc, i) => (
                <button key={i} onClick={() => setFilterLocation(loc)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterLocation === loc ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{loc}</button>
              ))}
            </div>
          </div>
        </div>

        {currentMapPath && (
          <div ref={mapContainerRef} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 scroll-mt-24">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-700">🗺️ {filterLocation} のリアルタイムピンマップ</h2>
              
              {/* 🔥 座標表示パネル（クリックした時だけ表示） */}
              {clickedCoords && (
                <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-800 flex items-center gap-3 shadow-sm animate-in fade-in">
                  <span>📍 座標測定:</span>
                  <span className="select-all bg-white px-1.5 py-0.5 rounded border border-blue-100">X: {clickedCoords.x}</span>
                  <span className="select-all bg-white px-1.5 py-0.5 rounded border border-blue-100">Y: {clickedCoords.y}</span>
                </div>
              )}
            </div>
            
            <div className="w-full max-w-3xl mx-auto rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative">
              {/* 🔥 onClickを追加。カーソルを十字架にしてクリックしやすく */}
              <div 
                className="relative inline-block w-full leading-none text-[0] cursor-crosshair" 
                onClick={handleMapClickForCoords}
              >
                <img src={currentMapPath} alt={`${filterLocation}のマップ`} className="w-full h-auto block pointer-events-none" />
                
                {activePins.map((pin, i) => {
                  const groupInfo = groups.find(g => g.name === pin.groupName);
                  const theme = getPinTheme(groupInfo?.waitingTime || "ー");
                  const isTarget = highlightedGroupName === pin.groupName;
                  
                  return (
                    <div 
                      key={i} 
                      onClick={(e) => {
                        e.stopPropagation(); // ピンをクリックした時は座標測定を動かさない
                        handleItemClick(pin.groupName, 'map');
                      }} 
                      className={`absolute cursor-pointer group transform -translate-x-1/2 -translate-y-1/2 hover:z-30 transition-all ${isTarget ? 'scale-125 z-40' : 'hover:scale-110'}`} 
                      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    >
                      <div className="flex flex-col items-center">
                        <div className={`px-1.5 py-0.5 bg-white/95 rounded shadow-sm text-[9px] font-bold whitespace-nowrap mb-1 border ${isTarget ? 'border-blue-500 text-blue-600 ring-2 ring-blue-200' : 'border-slate-100 text-slate-800'}`}>
                          {pin.groupName}
                        </div>
                        <div className={`w-6 h-6 rounded-full shadow-md flex items-center justify-center text-white ${theme.bg} ring-2 ring-white`}>
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <div className={`w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-current ${theme.text} mx-auto -mt-[1px]`}></div>
                      </div>
                    </div>
                  );
                })}

                {/* 🔥 クリックした場所に一時的な「＋」マークを表示 */}
                {clickedCoords && (
                  <div 
                    className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
                    style={{ left: `${clickedCoords.x}%`, top: `${clickedCoords.y}%` }}
                  >
                    <div className="w-full h-0.5 bg-red-500 absolute top-1/2 -translate-y-1/2 shadow-sm"></div>
                    <div className="h-full w-0.5 bg-red-500 absolute left-1/2 -translate-x-1/2 shadow-sm"></div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-1">※ マップ上の何もない場所をクリックすると、その位置の X / Y 座標（％）を取得できます。</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group, idx) => {
            const candidates = getLogoSrcCandidates(group.logo, group.name);
            const candidatesJson = JSON.stringify(candidates);
            const isHighlighted = highlightedGroupName === group.name;
            
            return (
              <div 
                key={idx} 
                id={`card-${group.name}`}
                onClick={() => handleItemClick(group.name, 'list')} 
                className={`bg-white rounded-xl shadow-sm border transition-all p-5 flex flex-col justify-between space-y-4 cursor-pointer scroll-mt-24 ${isHighlighted ? 'border-blue-500 ring-2 ring-blue-200 scale-[1.02]' : 'border-slate-200 hover:border-blue-400 hover:shadow-md'}`}
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
                        <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${group.status === '更新済' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{group.status}</span>
                      </div>
                      <p className="text-xs font-semibold text-blue-600 mt-1">📍 {group.location}</p>
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
              <p className="text-sm font-bold text-blue-600 text-center mb-5">📍 {selectedGroupInfo.location}</p>
              
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4 flex items-center justify-between shadow-inner">
                 <span className="text-xs font-bold text-slate-500 block">現在の混雑度 / 待ち時間</span>
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
