import { useState, useEffect } from 'react';

// あなたのスプレッドシートID
const SPREADSHEET_ID = "1W4vJaSM0jlOQcjE-TstUby6v0K1bJeSY3GnSH8BDKhA"; 

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
  const [filterLocation, setFilterLocation] = useState('すべて');
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null);

  // 全角英数字を半角に変換
  const toHalfWidth = (str: string) => {
    if (!str) return "";
    return str
      .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace(/ /g, ' ')
      .trim();
  };

  // 統合されたボタン名から、正しいマップ画像ファイルを紐付ける関数
  const getMapImagePath = (buttonName: string): string | null => {
    if (!buttonName || buttonName === 'すべて' || buttonName === 'その他') return null;

    if (buttonName === '屋台') return '/屋台 (1).png';
    if (buttonName === '打越アリーナ') return '/アリーナ.png';
    if (buttonName === '清和書林') return null; 
    
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

  // スプレッドシートに書かれた自由な「場所」を、統合ボタンのどれに所属させるか判定する関数
  const getUnifiedLocationGroup = (rawLocation: string): string => {
    if (!rawLocation) return 'その他';
    
    if (rawLocation.includes('屋台')) return '屋台';
    if (rawLocation.includes('アリーナ') || rawLocation.includes('打越アリーナ')) return '打越アリーナ';
    if (rawLocation.includes('清和書林')) return '清和書林';

    if (rawLocation.includes('中学棟 1階') || rawLocation.includes('高校棟 1階') || (rawLocation.includes('1階') && (rawLocation.includes('中学') || rawLocation.includes('高校')))) {
      return '中学・高校棟 1階';
    }
    if (rawLocation.includes('中学棟 2階') || rawLocation.includes('高校棟 2階') || (rawLocation.includes('2階') && (rawLocation.includes('中学') || rawLocation.includes('高校')))) {
      return '中学・高校棟 2階';
    }

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

    return 'その他';
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    return lines
      .map(line => {
        return line.split(',').map(cell => {
          let cleaned = cell.trim();
          if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.substring(1, cleaned.length - 1);
          }
          return cleaned.replace(/""/g, '"');
        });
      })
      .filter(row => row.length > 0 && row.some(cell => cell !== ""));
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
        const parsedCoords: Coordinate[] = coordsRows
          .filter(row => row[0] && row[1])
          .map(row => ({
            groupName: row[0],
            location: getUnifiedLocationGroup(row[1]),
            x: parseFloat(row[2]) || 50,
            y: parseFloat(row[3]) || 50
          }));
        setCoords(parsedCoords);
      }

      const groupsRows = parseCSV(groupsText).slice(1);
      const updatesRows = parseCSV(updatesText).slice(1);

      const latestUpdates: Record<string, { waiting: string; comment: string; time: string }> = {};
      updatesRows.forEach(row => {
        const timestamp = row[0];
        const name = row[1];
        const waiting = row[2];
        const comment = row[3];
        if (name) {
          latestUpdates[name] = { waiting: waiting || "ー", comment: comment || "", time: timestamp || "" };
        }
      });

      const mergedGroups: Group[] = groupsRows
        .filter(row => row[1])
        .map(row => {
          const name = row[1];
          const description = row[2];
          const location = row[3];
          const logo = row[4];
          const updateInfo = latestUpdates[name];

          return {
            name,
            description: description || "紹介文はまだありません。",
            location: location || "校内",
            logo: logo || "",
            status: updateInfo ? "更新済" : "未更新",
            waitingTime: updateInfo ? updateInfo.waiting : "ー",
            comment: updateInfo ? updateInfo.comment : "",
            lastUpdated: updateInfo ? updateInfo.time : ""
          };
        });

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

  // 絞り込み ＆ 待ち時間が低い順（空いている順）ソート処理
  const filteredGroups = groups
    .filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            group.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterLocation === 'すべて') return matchesSearch;
      
      const rawLocations = group.location.split(/[/、，,・]/).map(l => l.trim());
      const matchesLocation = rawLocations.some(rawLoc => getUnifiedLocationGroup(rawLoc) === filterLocation);
      
      return matchesSearch && matchesLocation;
    })
    .sort((a, b) => {
      const valA = a.waitingTime === "ー" ? Infinity : parseFloat(a.waitingTime);
      const valB = b.waitingTime === "ー" ? Infinity : parseFloat(b.waitingTime);
      return valA - valB; 
    });

  const presetLocations = [
    'すべて',
    '中学・高校棟 1階',
    '中学・高校棟 2階',
    '中学棟 3階',
    '中学棟 4階',
    '中学棟 5階',
    '高校棟 3階',
    '高校棟 4階',
    '高校棟 5階',
    '打越アリーナ',
    '清和書林',
    '屋台',
    'その他'
  ];

  const currentMapPath = getMapImagePath(filterLocation);
  const activePins = coords.filter(pin => pin.location === filterLocation);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans pb-12">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md flex items-center justify-center text-xl font-bold w-9 h-9">
              🎪
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                打越祭リアルタイム混雑マップ
              </h1>
              <p className="text-[10px] text-slate-400 font-medium -mt-0.5">Live Traffic & Activity Monitor</p>
            </div>
          </div>
          <button 
            onClick={fetchData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
          >
            <span className={loading ? 'animate-spin inline-block' : ''}>🔄</span>
            <span>{loading ? '読込中...' : '更新'}</span>
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-6">
        
        {/* 検索・フィルターエリア */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <input 
              type="text" 
              placeholder="🔍 団体名やキーワードで検索..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">場所・エリアで絞り込む</span>
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                🟢 待ち時間が低い順に表示中
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presetLocations.map((loc, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setFilterLocation(loc);
                    setSelectedGroupName(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterLocation === loc
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 🗺️ マップ表示セクション */}
        {currentMapPath && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-700">
                🗺️ {filterLocation} のリアルタイムピンマップ
              </h2>
              {selectedGroupName && (
                <button 
                  onClick={() => setSelectedGroupName(null)}
                  className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition"
                >
                  選択をクリア ✕
                </button>
              )}
            </div>
            
            <div className="relative bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center min-h-[300px] max-h-[550px]">
              <img 
                src={currentMapPath} 
                alt={`${filterLocation}のマップ`}
                className="w-full h-full object-contain max-h-[530px]"
              />
              
              {/* 📍 ピンのレンダリング */}
              {activePins.map((pin, i) => {
                const isTarget = selectedGroupName === pin.groupName;
                const matchesSearch = searchTerm !== '' && pin.groupName.toLowerCase().includes(searchTerm.toLowerCase());
                const isHighlighted = isTarget || matchesSearch;

                return (
                  <div
                    key={i}
                    className="absolute transition-all duration-300 z-20"
                    style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)' }}
                  >
                    <div 
                      onClick={() => setSelectedGroupName(pin.groupName)}
                      className={`flex flex-col items-center cursor-pointer group`}
                    >
                      <div className={`px-2 py-0.5 rounded shadow text-[10px] font-bold whitespace-nowrap mb-0.5 transition-all ${
                        isHighlighted 
                          ? 'bg-orange-600 text-white scale-110 ring-2 ring-white z-30' 
                          : 'bg-white/90 text-slate-800 scale-100 group-hover:bg-blue-600 group-hover:text-white'
                      }`}>
                        {pin.groupName}
                      </div>
                      
                      <div className={`text-xl transition-transform ${
                        isHighlighted ? 'animate-bounce text-2xl drop-shadow-md' : 'opacity-85 group-hover:scale-125'
                      }`}>
                        {isHighlighted ? '🎯' : '📍'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ロード・メインリスト */}
        {loading && groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="text-3xl animate-spin">⏳</div>
            <p className="text-sm text-slate-400 font-medium">最新のデータを読み込んでいます...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group, idx) => {
              const isSelected = selectedGroupName === group.name;
              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    if (filterLocation !== 'forget' && currentMapPath) {
                      setSelectedGroupName(isSelected ? null : group.name);
                    }
                  }}
                  className={`bg-white rounded-xl shadow-sm border transition-all p-5 flex flex-col justify-between space-y-4 cursor-pointer ${
                    isSelected 
                      ? 'border-orange-500 ring-4 ring-orange-50 bg-orange-50/10 scale-[1.01]' 
                      : 'border-slate-200 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                        {group.logo ? (
                          <img 
                            src={`/${encodeURIComponent(toHalfWidth(group.logo))}`} 
                            alt={`${group.name}のロゴ`} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent && !parent.querySelector('.fallback-text')) {
                                const textDiv = document.createElement('div');
                                textDiv.className = 'fallback-text text-xl font-bold text-slate-400';
                                textDiv.innerText = '祭';
                                parent.appendChild(textDiv);
                              }
                            }}
                          />
                        ) : (
                          <div className="text-xl font-bold text-slate-400">祭</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-base leading-tight truncate">{group.name}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap flex-shrink-0 ${
                            group.status === '更新済' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {group.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-blue-600 mt-1 flex items-center gap-1">
                          📍 {group.location}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mt-3 line-clamp-3 leading-relaxed">{group.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">混雑度/待ち時間</span>
                      <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
                        {group.waitingTime !== "ー" ? (
                          <span className="text-orange-600">🔥 レベル {group.waitingTime}</span>
                        ) : (
                          <span className="text-slate-400">ー</span>
                        )}
                      </span>
                    </div>
                    {group.comment && (
                      <div className="text-right max-w-[60%] bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        <span className="text-[9px] text-slate-400 block font-medium">💬 コメント</span>
                        <span className="text-[11px] text-slate-600 truncate block font-medium">
                          "{group.comment}"
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredGroups.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <p className="text-slate-400 font-medium text-sm">該当する団体が見つかりませんでした。</p>
          </div>
        )}
      </main>
    </div>
  );
}

