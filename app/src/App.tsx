import { useState, useEffect, useRef } from 'react';//アプリを動かす使うUseStateやUseEffectなどのフックを導入

// ⚠️ STEP 2で取得したGASのWebアプリURLをここに貼り付けてください
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxkejAhnIoPCg5EncAM2NT4YfbTOX4dJXkhCQbKHSsIEF2uqnZdbCLLy1qziCrOBZv6vw/exec";//読み込むスプレットシートを選択するコード

interface Group {//団体の情報を格納するためのインターフェース
  name: string;//団体名
  description: string;//団体の説明
  location: string;//団体の場所
  logo: string;//団体のロゴ画像のURL
  status: '更新済' | '未更新';//団体の情報が更新されているかどうかのステータス
  waitingTime: string;//団体の待ち時間
  comment: string;//団体に関するコメント(削除済み)
  lastUpdated: string;//団体の情報が最後に更新された日時
  category: string;//団体のカテゴリ(展示、屋台、ステージなど)
}

interface Coordinate {//団体の座標情報を格納するためのインターフェース
  groupName: string;//団体名
  location: string;//団体の場所
  x: number;//団体の座標X
  y: number;//団体の座標Y
  category?: string;//団体のカテゴリ(展示、屋台、ステージなど)
}

// ロゴ読み込み用のエイリアス表。
// 団体名や既存のファイル名から、実際に public 配下に存在する画像へ正しく到達させるためのマッピングです。
const LOGO_ALIAS_MAP: Record<string, string[]> = {// 団体名や既存のファイル名をキーにして、実際の画像パスの候補を配列で指定、ロゴが新しくなった場合はここに流れに沿って書き加えてください。この工程を踏むことによってロゴが正しく表示されるようになります。
  "生物部": ["/seibutsu.png"],
  "図書研究部": ["/tosyo_kenkyu.png"],
  "浅野学園生徒会": ["/asano_seitokai.png"],
  "生徒会": ["/asano_seitokai.png"],
  "図書委員会古本バザー": ["/furuhon_bazaar.png"],
  "古本バザー": ["/furuhon_bazaar.png"],
  "焼きすぎて麺！": ["/yakisugi.png"],
  "ポテトヘッド": ["/potatohead.png"],
  "神兵衛": ["/jinbee.png"],
  "りすのおうち": ["/risu_house.png"],
  "アサノ大全": ["/asano_taizen.png"],
  "クイズ研究部": ["/quiz.png"],
  "ホラー展": ["/horror.png"],
  "物理部展2026": ["/butsuri2026.png"],
  "地学部プラネタリウム": ["/chigaku_planetarium.png"],
  "地学部展示": ["/chigaku_tenji.png"],
  "Cooland": ["/cooland.png"],
  "AMERICAN CAFE BEN&KEN": ["/ben_ken.png"],
  "中学野球部": ["/chugaku_yakyu.jpeg"],
  "折り紙研究会": ["/origami.png"],
  "喰いコミュニケーションXXIV": ["/kui_com.jpg"],
  "団GO!": ["/dango.png"],
  "中２学年参加": ["/chu2_gakunen.png"],
  "中１学年参加": ["/chu1_gakunen.png"],
  "お化け屋敷": ["/obake_yashiki.png"],
  "レーザータグ": ["/lasertag.png"],
  "総務部門": ["/soumu.png"],
  "装飾部門": ["/soushoku.png"],
  "浅野同窓会": ["/asano_dousoukai.png"],
  "賛助会": ["/sanjokai.png"],
  "涼水": ["/ryosui.png"],
  "ARCHERz": ["/archerz.jpg"],
  "数学同好会": ["/suugaku.png"],
  "びりやーど研究会": ["/billiard.png"],
  "歴史研究部": ["/rekishi.png"],
  "鉃道研究部": ["/tetsudou.png"],
  "美術部展": ["/bijutsu.png"],
  "化学部": ["/kagaku.png"],
  "的に当てろ屋": ["/matoni_atero.jpg"],
  "書道部": ["/shodou.png"],
  "棋道部": ["/kidou.png"],
  "登山部": ["/tozambu.png"],
  "スクラム食堂": ["/scrum_shokudou.png"],
  "KCC": ["/kcc.png"],
  "浅野学園吹奏楽部": ["/浅野学園吹奏楽部_ロゴ.jpg"],
  "演劇部": ["/演劇部_ロゴ.png"],
  "Juggling Art Asano": ["/Juggling Art Asano_ロゴ.png_"],
  "Zepp Asano": ["/Zepp Asano_ロゴ.png"],
  "Melon Frappe Jazz Orchestra": ["/Melon Frappe Jazz Orchestra_ロゴ.png"],
};

const PUBLIC_LOGO_ASSET_URLS = Object.values(//ロゴをpublic配下の画像ファイルから取得するためのコードです。import.meta.globを使って、publicディレクトリ内のすべての画像ファイルを取得し、そのURLを配列として返します。filter(Boolean)は、nullやundefinedを除外するために使われます。
  import.meta.glob('/public/**/*.{png,jpg,jpeg,webp,svg,avif}', { eager: true, import: 'default' }) as Record<string, string>
).filter(Boolean);//public配下の画像ファイルのURLを取得するためのコードです。import.meta.globを使って、publicディレクトリ内のすべての画像ファイルを取得し、そのURLを配列として返します。filter(Boolean)は、nullやundefinedを除外するために使われます。

const logoResolutionCacheRef = { current: {} as Record<string, string | null> };//ロゴの解決結果をキャッシュするためのオブジェクトです。キーは「団体名::オリジナルロゴURL」の形式で、値は解決されたロゴのURLまたはnullです。
const logoResolutionInFlightRef = { current: {} as Record<string, Promise<string | null>> };//ロゴの解決中のPromiseを保持するためのオブジェクトです。キーは「団体名::オリジナルロゴURL」の形式で、値は解決中のPromiseです。

const isAbsoluteLogoReference = (value: string): boolean => {//ロゴ候補が http(s) や data などの絶対参照かどうかを判定する関数です。
  const trimmed = value.trim();//valueの前後の空白を削除する
  return /^(https?:\/\/|data:|blob:|\/\/)/i.test(trimmed);//正規表現を使って、valueがhttp(s)://、data:、blob:、または//で始まるかどうかを判定します。これらの形式は絶対参照とみなされます。
};

const getLogoSrcCandidates = (originalLogo: string, groupName: string): string[] => {//オリジナルのロゴ画像のURLと団体名を受け取り、画像の読み込み候補を作る関数です。まずは実在する public 配下のロゴを優先し、次に名前から推測する候補を試します。
  const urls: string[] = [];//画像の読み込み候補を格納する配列です。
  const addCandidate = (value: string) => {//画像の読み込み候補を追加する関数です。valueは追加する候補の文字列です。
    if (!value) return;//valueが空文字の場合は何もしない
    const trimmed = value.trim();//valueの前後の空白を削除する
    if (!trimmed) return;//trimmedが空文字の場合は何もしない
    const normalized = trimmed.replace(/#/g, '%23').replace(/&/g, '%26').replace(/\?/g, '%3F');//団体名やロゴ画像のURLに含まれる特殊文字をエンコードする
    const absolute = isAbsoluteLogoReference(normalized);//normalizedが絶対参照かどうかを判定する
    const variants = [normalized];//表記ゆれ回収(絶対参照の場合はそのまま、相対参照の場合は / を付けたものと付けないものの2種類を候補に追加する)
    if (!absolute) {//表記ずれを吸収
      variants.push(`/${normalized.replace(/^\/+/, '')}`);//相対参照の場合は、先頭のスラッシュを取り除いたものにスラッシュを付けたものを候補に追加する
      variants.push(`/${normalized.replace(/^\/+/, '')}`.replace(/^\//, ''));
    }
    variants.forEach(v => {//様々な候補を追加する。
      if (!urls.includes(v)) urls.push(v);//urlsに含まれていない場合は追加する
    });
  };

  const addPublicAssetMatches = (value: string) => {// public 配下に存在する画像のうち、名前やファイル名に一致するものを優先して候補に加える関数です。
    const trimmed = (value || '').trim();//valueの前後の空白を削除する
    if (!trimmed) return;//trimmedが空文字の場合は何もしない
    const rawName = trimmed.replace(/^\/+/, '').replace(/^\.\//, '').split(/[\\/]/).pop() || trimmed;//trimmedの先頭のスラッシュや./を取り除き、最後のスラッシュ以降の文字列を取得する。もし取得できなかった場合はtrimmedをそのまま使用する。
    const baseName = rawName.replace(/\.[^.]+$/, '');//rawNameの拡張子を取り除いた文字列を取得する。もし拡張子がなかった場合はrawNameをそのまま使用する。
    const searchTerms = [rawName, baseName, trimmed];//検索対象の文字列を配列に格納する。rawName、baseName、trimmedの順に格納する。

    searchTerms.forEach(term => {//検索対象の文字列を順番に処理する。
      const match = PUBLIC_LOGO_ASSET_URLS.find(path => {//PUBLIC_LOGO_ASSET_URLSの中から、検索対象の文字列に一致するものを探す。
        const normalizedPath = path.replace(/^\/+/, '');//pathの先頭のスラッシュを取り除いた文字列を取得する。
        return normalizedPath === term || normalizedPath.endsWith(`/${term}`);//normalizedPathがtermと完全一致するか、normalizedPathの末尾が/termで終わるかを判定する。
      });
      if (match) addCandidate(match);//一致するものが見つかった場合は、addCandidate関数を使って候補に追加する。
    });
  };

  const name = (groupName || '').trim();//団体名の前後の空白を削除する
  const original = (originalLogo || '').trim();//オリジナルのロゴ画像のURLの前後の空白を削除する

  const directKeys = [name, name.replace(/\s+/g, ''), original, original.replace(/\s+/g, '')].filter(Boolean);//団体名やオリジナルのロゴ画像のURLを候補として配列に格納する。空文字は除外する。
  directKeys.forEach(key => {//団体名やオリジナルのロゴ画像のURLを順番に処理する。
    const aliases = LOGO_ALIAS_MAP[key];//LOGO_ALIAS_MAPにkeyが存在する場合は、その値（候補の配列）を取得する。存在しない場合はundefinedになる。
    if (aliases?.length) {//LOGO_ALIAS_MAPにkeyが存在する場合は、候補の配列を順番に処理する。
      aliases.forEach(alias => addCandidate(alias));//LOGO_ALIAS_MAPにkeyが存在する場合は、候補の配列を順番に処理する。aliasをaddCandidate関数を使って候補に追加する。
    }
    addPublicAssetMatches(key);//LOGO_ALIAS_MAPにkeyが存在する場合は、候補の配列を順番に処理する。keyをaddPublicAssetMatches関数を使って候補に追加する。
  });

  if (original) {//オリジナルのロゴ画像のURLが存在する場合は、候補に追加する。
    addCandidate(original);//オリジナルのロゴ画像のURLを候補に追加する。
    addPublicAssetMatches(original);//オリジナルのロゴ画像のURLを候補に追加する。
  }

  addPublicAssetMatches(name);//団体名を候補に追加する。

  const clean = name.replace(/\s+/g, '');//団体名の空白を取り除いた文字列を取得する。
  [
    `${name}.png`,//団体名に.pngを付けた文字列を候補に追加する。
    `${name}.jpg`,//団体名に.jpgを付けた文字列を候補に追加する。
    `${name}.jpeg`,//団体名に.jpegを付けた文字列を候補に追加する。
    `${name}_ロゴ.png`,//団体名に_ロゴ.pngを付けた文字列を候補に追加する。
    `${name} ロゴ.png`,//団体名に ロゴ.pngを付けた文字列を候補に追加する。
    `${clean}_ロゴ.png`,//団体名の空白を取り除いた文字列に_ロゴ.pngを付けた文字列を候補に追加する。
    `${clean}.png`,//団体名の空白を取り除いた文字列に.pngを付けた文字列を候補に追加する。
    `${clean}.jpg`,//団体名の空白を取り除いた文字列に.jpgを付けた文字列を候補に追加する。
    `${name}_ロゴ.jpg`//団体名に_ロゴ.jpgを付けた文字列を候補に追加する。
  ].forEach(addCandidate);//上記の候補を順番に処理する。addCandidate関数を使って候補に追加する。

  return urls;//候補の配列を返す
};

const resolveLogoSrc = async (originalLogo: string, groupName: string): Promise<string | null> => {//ロゴ候補を順番に確認して、最初に読み込めるものを返す関数です。
  const cacheKey = `${(groupName || '').trim()}::${(originalLogo || '').trim()}`;//キャッシュキーを作成する。団体名とオリジナルのロゴ画像のURLを::で区切った文字列を作成する。
  const cached = logoResolutionCacheRef.current[cacheKey];//キャッシュに解決済みのロゴ画像のURLが存在する場合は、それを返す。キャッシュに存在しない場合は、次の処理に進む。
  if (cached !== undefined) return cached;//キャッシュに解決済みのロゴ画像のURLが存在する場合は、それを返す。キャッシュに存在しない場合は、次の処理に進む。

  const pending = logoResolutionInFlightRef.current[cacheKey];//解決中のPromiseが存在する場合は、それを返す。解決中のPromiseが存在しない場合は、次の処理に進む。
  if (pending) return pending;//解決中のPromiseが存在する場合は、それを返す。解決中のPromiseが存在しない場合は、次の処理に進む。

  const candidates = getLogoSrcCandidates(originalLogo, groupName);//ロゴ候補を取得する。getLogoSrcCandidates関数を使って、団体名とオリジナルのロゴ画像のURLから候補の配列を取得する。
  const promise = (async () => {//ロゴ候補を順番に確認して、最初に読み込めるものを返す非同期関数です。
    for (let index = 0; index < candidates.length; index += 1) {//候補の配列を順番に処理する。indexは候補の配列のインデックスを表す。
      const candidate = candidates[index];//候補の配列から、現在のインデックスに対応する候補を取得する。
      const resolved = await new Promise<string | null>((resolve) => {//候補の画像を読み込めるかどうかを確認するためのPromiseを作成する。resolve関数は、画像の読み込みが成功した場合に呼び出される。
        const probe = new Image();//画像を読み込むためのImageオブジェクトを作成する。
        probe.onload = () => resolve(candidate);//画像の読み込みが成功した場合は、resolve関数を呼び出して、候補の画像のURLを返す。
        probe.onerror = () => resolve(null);//画像の読み込みが失敗した場合は、resolve関数を呼び出して、nullを返す。
        probe.decoding = 'async';//画像のデコードを非同期で行うように設定する。これにより、画像の読み込みが完了する前に次の処理に進むことができる。
        probe.src = candidate;//画像のURLを設定して、画像の読み込みを開始する。
      });

      if (resolved) {//画像の読み込みが成功した場合は、キャッシュに解決済みのロゴ画像のURLを保存して、それを返す。
        logoResolutionCacheRef.current[cacheKey] = resolved;//キャッシュに解決済みのロゴ画像のURLを保存する。キャッシュキーは、団体名とオリジナルのロゴ画像のURLを::で区切った文字列で作成する。
        return resolved;//画像の読み込みが成功した場合は、キャッシュに解決済みのロゴ画像のURLを保存して、それを返す。
      }

      if (index < candidates.length - 1) {//画像の読み込みが失敗した場合は、次の候補を試す前に少し待つ。これにより、連続して画像の読み込みを行うことで、ブラウザのリソース制限に引っかかることを防ぐ。
        await new Promise(resolve => setTimeout(resolve, 40));//40ミリ秒待つ。setTimeout関数を使って、指定した時間が経過した後にresolve関数を呼び出すことで、Promiseを解決する。
      }
    }

    logoResolutionCacheRef.current[cacheKey] = null;//すべての候補が読み込めなかった場合は、キャッシュにnullを保存して、それを返す。
    return null;//すべての候補が読み込めなかった場合は、キャッシュにnullを保存して、それを返す。
  })();

  logoResolutionInFlightRef.current[cacheKey] = promise;//解決中のPromiseを保存する。キャッシュキーは、団体名とオリジナルのロゴ画像のURLを::で区切った文字列で作成する。
  try {//解決中のPromiseを返す。これにより、同じ団体名とオリジナルのロゴ画像のURLに対して、複数のコンポーネントが同時にロゴの解決を行うことを防ぐ。
    return await promise;//解決中のPromiseを返す。これにより、同じ団体名とオリジナルのロゴ画像のURLに対して、複数のコンポーネントが同時にロゴの解決を行うことを防ぐ。
  } finally {//解決中のPromiseを削除する。これにより、同じ団体名とオリジナルのロゴ画像のURLに対して、複数のコンポーネントが同時にロゴの解決を行うことを防ぐ。
    delete logoResolutionInFlightRef.current[cacheKey];//解決中のPromiseを削除する。これにより、同じ団体名とオリジナルのロゴ画像のURLに対して、複数のコンポーネントが同時にロゴの解決を行うことを防ぐ。
  }
};

// ⏱️ 更新からの経過時間を計算する関数
const getTimeAgo = (dateString: string): string => {//　更新日時の文字列を受け取り、現在時刻との差を計算して「たった今」「〇分前」「〇時間前」「〇日前」といった形式で返す関数です。
  if (!dateString || dateString === "ー") return "";//日付文字列が空または「ー」の場合は空文字を返す
  const date = new Date(dateString);//日付文字列をDateオブジェクトに変換
  if (isNaN(date.getTime())) return "";//日付が無効な場合は空文字を返す

  const now = new Date();//現在時刻を取得
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);//現在時刻と更新日時の差を秒単位で計算

  if (diffInSeconds < 60) return "たった今";//60秒未満なら「たった今」と表示
  const diffInMinutes = Math.floor(diffInSeconds / 60);//60秒以上なら分単位で計算
  if (diffInMinutes < 60) return `${diffInMinutes}分前`;// 60分未満なら「〇分前」と表示
  const diffInHours = Math.floor(diffInMinutes / 60);// 60分以上なら時間単位で計算
  if (diffInHours < 24) return `${diffInHours}時間前`;// 24時間未満なら「〇時間前」と表示
  const diffInDays = Math.floor(diffInHours / 24);// 24時間以上なら日単位で計算
  return `${diffInDays}日前`;// 7日以上なら「〇日前」と表示
};

interface LogoImageProps {//ロゴ画像を安定して表示するためのコンポーネントのプロパティです。
  originalLogo: string;//団体のロゴ画像のURL
  groupName: string;//団体名
  alt: string;//画像の代替テキスト
  className?: string;//画像のクラス名
  fallbackClassName?: string;//ロゴが見つからなかったときの表示クラス名
}

function LogoImage({ originalLogo, groupName, alt, className, fallbackClassName }: LogoImageProps) {//ロゴ画像の解決を非同期で行い、表示が安定するようにするコンポーネントです。
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);//解決済みのロゴ画像URLを保持するステート
  const [shouldLoad, setShouldLoad] = useState(false);//画面内に入ったらロゴ読み込みを開始するためのステート
  const containerRef = useRef<HTMLSpanElement>(null);//ロゴの可視判定に使う参照

  useEffect(() => {
    let isActive = true;
    const node = containerRef.current;

    if (!node) {
      setShouldLoad(false);
      return undefined;
    }

    // 🔎 画面内に入ったタイミングでだけロゴをロードして、初期表示の通信量を抑える
    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          const isVisible = entries.some(entry => entry.isIntersecting);
          if (isVisible && isActive) {
            setShouldLoad(true);
            observer.disconnect();
          }
        }, { rootMargin: '200px 0px' })
      : null;

    observer?.observe(node);

    return () => {
      isActive = false;
      observer?.disconnect();
    };
  }, [originalLogo, groupName]);

  useEffect(() => {
    if (!shouldLoad) return undefined;

    let isActive = true;

    const loadLogo = async () => {
      const resolved = await resolveLogoSrc(originalLogo, groupName);
      if (isActive) {
        setResolvedSrc(resolved);
      }
    };

    loadLogo();

    return () => {
      isActive = false;
    };
  }, [shouldLoad, originalLogo, groupName]);

  const baseFallbackClassName = fallbackClassName || 'text-[10px] md:text-xs font-bold text-slate-400';

  return (
    <span ref={containerRef} className={`w-full h-full flex items-center justify-center ${baseFallbackClassName}`}>
      {resolvedSrc ? (
        <img src={resolvedSrc} alt={alt} className={className} loading="lazy" decoding="async" />
      ) : (
        '祭'
      )}
    </span>
  );
}

export default function App() {//アプリを動かすためのコード
  const [groups, setGroups] = useState<Group[]>([]);//setGroupsとは、グループの情報を格納するためのステート変数です。初期値は空の配列です。
  const [coords, setCoords] = useState<Coordinate[]>([]);//setCoordsとは、座標の情報を格納するためのステート変数です。初期値は空の配列です。
  const [loading, setLoading] = useState(true);//setLoadingとは、データの読み込み中かどうかを示すためのステート変数です。初期値はtrueです。
  const [searchTerm, setSearchTerm] = useState('');//setSearchTermとは、検索キーワードを格納するためのステート変数です。初期値は空文字です。ステート変数とは、Reactコンポーネント内で状態を管理するための変数です。useStateフックを使って定義されます。useStateフックとは、Reactで状態を管理するためのフックです。useStateフックを使うことで、コンポーネント内で状態を持つことができます。useStateフックは、初期値を引数に取り、現在の状態と状態を更新するための関数を返します。
  
  const [filterLocation, setFilterLocation] = useState(() => {//setFilterLocationとは、場所のフィルターを格納するためのステート変数です。初期値はURLのクエリパラメータから取得されます。
    const params = new URLSearchParams(window.location.search);//URLに場所の指定がある場合はその値を取得し、ない場合は「すべて」を初期値として設定します。
    return params.get('location') || 'すべて';//選択されてなかったら「すべて」を初期値として設定します。
  });

  const [filterCategory, setFilterCategory] = useState<string>('すべて');//eカテゴリのフィルターのための変数です。初期値は「すべて」です。
  const [sortBy, setSortBy] = useState<'waiting' | 'name' | 'category'>('waiting');//待ち時間、名前、カテゴリのいずれかでソートするための変数です。初期値は「waiting」です。
  const [isOpen, setisOpen] = useState(false);//モーダルの開閉を管理するための変数です。初期値はfalse（閉じてる）です。
  const [showGuide, setShowGuide] = useState(false); // 📖 使い方ガイドの開閉状態

  // 🎯 座標測定機能用のステート
  const [measureMode, setMeasureMode] = useState(false);//測定モードのオンオフを管理
  const [clickedCoord, setClickedCoord] = useState<{ x: number; y: number } | null>(null);//クリックされた座標を管理するためのステート（コード）。初期値はnull(なし）で、クリックされると{x: number, y: number}の形式で座標が格納されます。
  const [copiedText, setCopiedText] = useState<string | null>(null);//コピーされたテキストを管理するためのステート。初期値はnullで、コピーされると文字列が格納されます。

  const [modalGroupName, setModalGroupName] = useState<string | null>(null);//モーダルで表示する団体名を管理するためのステート。初期値はnullで、モーダルが開かれると団体名が格納されます。
  const [highlightedGroupName, setHighlightedGroupName] = useState<string | null>(null);//マップ上でハイライト表示する団体名を管理するためのステート。初期値はnullで、ハイライトされると団体名が格納されます。

  const [pendingScroll, setPendingScroll] = useState<{ type: 'map'; groupName: string } | null>(null);//マップへのスクロールが保留されているかどうかを管理するためのステート。初期値はnullで、スクロールが保留されると{type: 'map', groupName: string}の形式で情報が格納されます。

  const mapContainerRef = useRef<HTMLDivElement>(null);//マップコンテナの参照を保持するためのuseRefフック。初期値はnullで、マップコンテナがレンダリングされるとHTMLDivElementの参照が格納されます。

  useEffect(() => {//URLを更新するためのuseEffectフック。filterLocationが変更されるたびに実行されます。
    const params = new URLSearchParams(window.location.search);//URLSearchParamsオブジェクトを作成し、現在のURLのクエリパラメータを取得します。URLSearchParamsオブジェクトは、URLのクエリパラメータを操作するための便利なAPIです。
    if (filterLocation && filterLocation !== 'すべて') {//filterLocationが「すべて」以外の場合は、URLのクエリパラメータにlocationを追加します。
      params.set('location', filterLocation);//URLのクエリパラメータにlocationを追加します。params.set()メソッドは、指定されたキーと値のペアをURLSearchParamsオブジェクトに設定します。すでに同じキーが存在する場合は、その値を上書きします。
    } else {
      params.delete('location');//URLのクエリパラメータからlocationを削除します。params.delete()メソッドは、指定されたキーをURLSearchParamsオブジェクトから削除します。
    }
    const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');//新しいURLのパスとクエリパラメータを作成します。window.location.pathnameは、現在のURLのパス部分を取得します。params.toString()は、URLSearchParamsオブジェクトを文字列に変換します。クエリパラメータが存在する場合は、'?'を付けて結合します。
    window.history.replaceState(null, '', newRelativePathQuery);//ブラウザの履歴を置き換えます。window.history.replaceState()メソッドは、現在の履歴エントリを新しい状態に置き換えます。これにより、ページのリロードや戻るボタンの挙動に影響を与えずにURLを更新できます。
  }, [filterLocation]);//filterLocationが変更されるたびに実行されます。

  // 表示中のピンの中で「最も待ち時間が低い（空いている）」団体を自動選択
  const activePins = coords.filter(pin => pin.location === filterLocation);//現在のフィルターに一致する座標を取得します。
  
  useEffect(() => {//activePinsが変更されるたびに実行されます。
    if (activePins.length > 0) {//activePinsが1つ以上存在する場合は、最も待ち時間が低い団体を自動選択します。
      const exists = activePins.some(p => p.groupName === highlightedGroupName);//現在のハイライト団体がactivePinsに存在するかどうかを確認します。
      if (!exists) {//現在のハイライト団体がactivePinsに存在しない場合は、最も待ち時間が低い団体を自動選択します。
        const sortedPins = [...activePins].sort((a, b) => {//activePinsをコピーして、待ち時間の低い順にソートします。
          const getScore = (name: string) => {//団体名から待ち時間を取得する関数です。
            const g = groups.find(item => item.name === name);//団体名に一致するグループを検索します。
            if (!g || !g.waitingTime) return 999;//グループが存在しない場合や待ち時間が存在しない場合は、999を返します。(一番下に表示されるようにするため)
            if (g.waitingTime === 'ー') return 0; // 待ち時間が「ー」の場合は、0を返します。(一番上に表示されるようにするため)
            const val = parseFloat(g.waitingTime);//待ち時間を数値に変換します。
            return isNaN(val) ? 999 : val;//待ち時間が数値に変換できない場合は、999を返します。(一番下に表示されるようにするため)
          };
          return getScore(a.groupName) - getScore(b.groupName);//待ち時間の差を計算します。
        });

        setHighlightedGroupName(sortedPins[0].groupName);//もっとも待ち時間が低い団体をハイライトします。sortPins[0]は、待ち時間の低い順にソートされた配列の最初の団体です。
      }
    } else {//ピンがない画面の時は↓
      setHighlightedGroupName(null);//ハイライト団体をnull(なし)にします
    }
  }, [filterLocation, coords, groups]);//これをピンが変わるたびに実装します

  // 場所切り替え時に測定座標をリセット
  useEffect(() => {//ハイライト団体を表示してるかが変更されるごとに以下が実行されます
    setClickedCoord(null);//測定座標（クリックされた座標）をリセットします
  }, [filterLocation]);//何階を表示してるかが変更されるごとに実行、二個上のやつとの違いは、二個上のやつはピンが変わるたびに発動し、効果範囲はハイライト団体の変更、こっちは何階を表示してるか、が変更されるごとに発動し、効果範囲は測定座標のリセットです。

  // 下部カードクリック時のみマップへスムーズスクロール
  useEffect(() => {//場所の絞り込み、ハイライト団体の変更があるときマップにスクロールするためのプログラム外貨
    if (!pendingScroll) return;//もしpendingScroll(保留中のスクロール、これはピンをクリックしたときに発動する)がnull(なし)なら何もしない

    const timer = setTimeout(() => {//timerを設定して、一定時間たったら以下の処理を実行、なぜわざわざタイマーを用意するかというと、マップの描画が完了する前にスクロールしようとすると、スクロール位置が正しく計算されないことがあるためです。タイマーを使って、マップの描画が完了するまで待つことで、正しいスクロール位置に移動できるようにしています。
      if (pendingScroll.type === 'map' && mapContainerRef.current) {//もし団体のカードを押し、マップの描画が完了してる場合は以下を実行
        mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });//マップコンテナをスムーズにスクロールして、画面の中央に表示するようにします。behavior: 'smooth'は、スクロールをスムーズに行うためのオプションです。block: 'center'は、スクロール先の要素を画面の中央に表示するためのオプションです。
        setPendingScroll(null);//スクロールが完了したら、pendingScrollをnull(なし)にします。これにより、次回のスクロールが保留されることを防ぎます。
      }
    }, 120);

    return () => clearTimeout(timer);//処理が終わったら、タイマーをクリアして、不要な処理が残らないようにします。これにより、コンポーネントがアンマウントされたり、依存関係が変更された場合に、タイマーが残ってしまうことを防ぎます。
  }, [filterLocation, pendingScroll]);//filterLocation(何階を表示してるか)とpendingScroll(保留中のスクロール)が変更されるたびに実行されます。

  // 🎯 マップ画像クリック時の座標計算ハンドラ(測定モードの話なので新規マップ追加の時以外は見なくてよし)
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {//マップ画像がクリックされたときに呼び出される関数です。クリックイベントを引数に取ります。クリックイベントはユーザーがマップをクリックしたときのこと。引数とはわかりやすく言うと、関数に渡す情報のこと。
    if (!measureMode) return;//測定モードがオフの場合は何もしない

    const rect = e.currentTarget.getBoundingClientRect();//マップの大きさを取得します。
    const clickX = e.clientX - rect.left;//クリックされた位置のX座標を取得する
    const clickY = e.clientY - rect.top;//クリックされた位置のY座標を取得する

    const xPercent = parseFloat(((clickX / rect.width) * 100).toFixed(1));//クリックされた位置のX座標をパーセンテージに変換して小数点1桁に丸める
    const yPercent = parseFloat(((clickY / rect.height) * 100).toFixed(1));//クリックされた位置のY座標をパーセンテージに変換して小数点1桁に丸める

    setClickedCoord({ x: xPercent, y: yPercent });//クリックされた座標を保存する
  };

  // 📋 クリップボードコピー処理
  const copyToClipboard = (text: string, label: string) => {//クリップボードにコピーする関数です。textはコピーする文字列、labelはコピーしたことを示すラベルです。
    navigator.clipboard.writeText(text);//クリップボードにコピーする
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);//2秒後にコピーしたことを示すラベルを消す
  };

  const MAP_ASSET_VERSION = '20260804-2';// Vercel やブラウザのキャッシュで古い PNG が残らないよう、マップ画像 URL にはバージョンを付けて更新を強制します。

  const getMapImageSources = (buttonName: string): { webp: string; png: string } | null => {//校内マップは WebP を優先して読み込み、対応ブラウザでなければ PNG へフォールバックします。
    if (!buttonName || buttonName === 'すべて' || buttonName === 'その他' || buttonName === '屋台') return null;

    const mapImageMap: Record<string, { webp: string; png: string }> = {
      '中学・高校棟 1階': { webp: `/1階 (1).webp?v=${MAP_ASSET_VERSION}`, png: `/1階 (1).png?v=${MAP_ASSET_VERSION}` },
      '中学・高校棟 2階': { webp: `/2階 (1).webp?v=${MAP_ASSET_VERSION}`, png: `/2階 (1).png?v=${MAP_ASSET_VERSION}` },
      '中学棟 3階': { webp: `/中学棟三階.webp?v=${MAP_ASSET_VERSION}`, png: `/中学棟三階.png?v=${MAP_ASSET_VERSION}` },
      '中学棟 4階': { webp: `/中学棟四階.webp?v=${MAP_ASSET_VERSION}`, png: `/中学棟四階.png?v=${MAP_ASSET_VERSION}` },
      '中学棟 5階': { webp: `/中学棟五階.webp?v=${MAP_ASSET_VERSION}`, png: `/中学棟五階.png?v=${MAP_ASSET_VERSION}` },
      '高校棟 3階': { webp: `/高校棟三階.webp?v=${MAP_ASSET_VERSION}`, png: `/高校棟三階.png?v=${MAP_ASSET_VERSION}` },
      '高校棟 4階': { webp: `/高校棟四階.webp?v=${MAP_ASSET_VERSION}`, png: `/高校棟四階.png?v=${MAP_ASSET_VERSION}` },
      '高校棟 5階': { webp: `/高校棟五階.webp?v=${MAP_ASSET_VERSION}`, png: `/高校棟五階.png?v=${MAP_ASSET_VERSION}` }
    };

    return mapImageMap[buttonName] || null;
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

  // GAS から団体データ・座標・更新情報をまとめて取得して、画面表示用に整形する。
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

  const currentMapSources = getMapImageSources(filterLocation);
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
    // 測定モード中ならピンクリック無視
    if (measureMode && source === 'map') return;

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
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <img 
              src="/logo.jpg" 
              alt="打越祭ロゴ" 
              className="w-10 h-10 object-contain rounded-xl shadow-md shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-black text-base sm:text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight">打越祭リアルタイム混雑サイト</h1>
              <p className="text-[10px] text-slate-400 font-medium -mt-0.5">打越祭をもっと快適に</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {false && (
              <button
                onClick={() => setMeasureMode(!measureMode)}
                className={`flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition active:scale-95 whitespace-nowrap ${
                  measureMode 
                    ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-300' 
                    : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                }`}
              >
                <span>🎯</span>
                <span>{measureMode ? '測定モードON' : '座標測定'}</span>
              </button>
            )}
            <button
              onClick={() => {
                setShowGuide(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition active:scale-95 whitespace-nowrap"
            >
              📖 使い方
            </button>
            <button onClick={fetchData} disabled={loading} className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50 whitespace-nowrap">
              <span className={loading ? 'animate-spin inline-block' : ''}>🔄</span>
              <span>{loading ? '読込中...' : '更新'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-6 relative z-10">

        {/* 🎯 座標測定モードのアラートツールバー */}
        {measureMode && (
          <div className="bg-purple-900 text-white p-4 rounded-xl shadow-lg border border-purple-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center space-x-3">
              <span className="text-2xl animate-bounce">🎯</span>
              <div>
                <h3 className="font-bold text-sm text-purple-100">座標測定モードが有効です</h3>
                <p className="text-xs text-purple-300">マップ画像のピンを打ちたい場所を直接タップ/クリックしてください。</p>
              </div>
            </div>

            {clickedCoord ? (
              <div className="flex flex-wrap items-center gap-2 bg-purple-950/80 p-2 rounded-lg border border-purple-800 w-full md:w-auto">
                <span className="font-mono text-xs text-purple-200 font-bold px-2">
                  X: {clickedCoord.x}% | Y: {clickedCoord.y}%
                </span>
                <button
                  onClick={() => copyToClipboard(`${clickedCoord.x}, ${clickedCoord.y}`, 'XY')}
                  className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition active:scale-95"
                >
                  {copiedText === 'XY' ? '✅ コピー完了' : '📋 X, Y コピー'}
                </button>
                <button
                  onClick={() => copyToClipboard(`新規団体\t${filterLocation}\t${clickedCoord.x}\t${clickedCoord.y}`, 'GAS')}
                  className="px-2.5 py-1 rounded bg-purple-700 hover:bg-purple-600 text-purple-100 font-bold text-xs transition active:scale-95"
                >
                  {copiedText === 'GAS' ? '✅ コピー完了' : '📄 シート貼付用コピー'}
                </button>
              </div>
            ) : (
              <span className="text-xs text-purple-400 italic bg-purple-950/50 px-3 py-1.5 rounded-lg border border-purple-800/50">
                マップをタップすると座標が表示されます
              </span>
            )}
          </div>
        )}

       {/* 📖 使い方ガイド */}
{showGuide && (
  <div className="bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-slate-50 border-2 border-blue-200 rounded-2xl p-5 md:p-6 shadow-md space-y-5 animate-in fade-in duration-200">
    
    {/* ヘッダー */}
    <div className="flex items-center justify-between border-b border-blue-200 pb-3">
      <div className="flex items-center space-x-2.5">
        <span className="text-2xl">📖</span>
        <div>
          <h2 className="font-black text-base md:text-lg text-blue-950">使い方ガイド & 混雑度目安</h2>
          <p className="text-[11px] text-blue-600 font-medium">打越祭をスムーズに楽しむためのヒント</p>
        </div>
      </div>
      <button 
        onClick={() => setShowGuide(false)}
        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 shadow-sm transition active:scale-95"
      >
        閉じる ✕
      </button>
    </div>

    {/* 🌟 機能の使い方ステップ */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm flex items-start space-x-3">
        <span className="text-2xl shrink-0">🗺️</span>
        <div>
          <h4 className="font-bold text-xs text-slate-800">1. マップで探す</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
            エリアや階数を切り替えるとマップが表示されます。気になるピンをタップして詳細を確認できます。
          </p>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm flex items-start space-x-3">
        <span className="text-2xl shrink-0">🔍</span>
        <div>
          <h4 className="font-bold text-xs text-slate-800">2. 検索・並び替え</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
            「待ち時間順（低い順）」を選べば、今すぐ入れる空いている展示や企画をひと目で確認できます。
          </p>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm flex items-start space-x-3">
        <span className="text-2xl shrink-0">🔄</span>
        <div>
          <h4 className="font-bold text-xs text-slate-800">3. リアルタイム更新</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
            データは30秒ごとに自動更新されます。手動で確認したい場合は右上の「更新」をタップしてください。
          </p>
        </div>
      </div>
    </div>

    {/* 🔥 混雑度レベルの目安 */}
    <div className="space-y-2 pt-2 border-t border-blue-200/60">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
          <span>🔥</span> 混雑度レベル（5段階）の目安
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
        {/* レベル 1 */}
        <div className="bg-white p-2.5 rounded-xl border border-green-300 shadow-sm flex flex-col items-center text-center hover:border-green-400 transition">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-green-100 text-green-700 mb-1">
            レベル 1
          </span>
          <span className="font-bold text-slate-800 text-xs">とても空いている</span>
          <span className="text-[10px] text-slate-400 mt-0.5">待ち時間なし・即入場</span>
        </div>

        {/* レベル 2 */}
        <div className="bg-white p-2.5 rounded-xl border border-green-400 shadow-sm flex flex-col items-center text-center hover:border-green-500 transition">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-green-100 text-green-700 mb-1">
            レベル 2
          </span>
          <span className="font-bold text-slate-800 text-xs">かなり空いている</span>
          <span className="text-[10px] text-slate-400 mt-0.5">スムーズに閲覧可能</span>
        </div>

        {/* レベル 3 */}
        <div className="bg-white p-2.5 rounded-xl border border-orange-300 shadow-sm flex flex-col items-center text-center hover:border-orange-400 transition">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700 mb-1">
            レベル 3
          </span>
          <span className="font-bold text-slate-800 text-xs">問題なく回れる</span>
          <span className="text-[10px] text-slate-400 mt-0.5">標準的な賑わい</span>
        </div>

        {/* レベル 4 */}
        <div className="bg-white p-2.5 rounded-xl border border-red-300 shadow-sm flex flex-col items-center text-center hover:border-red-400 transition">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 mb-1">
            レベル 4
          </span>
          <span className="font-bold text-slate-800 text-xs">かなり混んでいる</span>
          <span className="text-[10px] text-slate-400 mt-0.5">少し待ち時間あり</span>
        </div>

        {/* レベル 5 */}
        <div className="bg-white p-2.5 rounded-xl border border-red-500 shadow-sm flex flex-col items-center text-center col-span-2 sm:col-span-1 hover:border-red-600 transition">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white mb-1">
            レベル 5
          </span>
          <span className="font-bold text-slate-800 text-xs">とても混んでいる</span>
          <span className="text-[10px] text-slate-400 mt-0.5">長蛇の列・入場規制</span>
        </div>
      </div>
    </div>

  </div>
)}

        {/* 検索・フィルターエリア */}
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

        {/* 🗺️ マップコンテナ */}
        {currentMapSources && (
          <div ref={mapContainerRef} className={`bg-white border rounded-xl p-4 md:p-6 shadow-sm space-y-4 scroll-mt-20 transition-all ${measureMode ? 'border-purple-400 ring-2 ring-purple-100' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">🗺️ {filterLocation} のマップ</h2>
                {measureMode && (
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                    🎯 クリックして座標を取得
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* 左側: マップエリア */}
              <div className="lg:col-span-7 xl:col-span-8">
                <div 
                  onClick={handleMapClick}
                  className={`w-full rounded-xl overflow-hidden border bg-slate-100 relative shadow-inner select-none ${
                    measureMode ? 'cursor-crosshair border-purple-400' : 'border-slate-200'
                  }`}
                >
                  <div className="relative inline-block w-full leading-none text-[0]">
                    <picture>
                      <source type="image/webp" srcSet={currentMapSources.webp} />
                      <img
                        src={currentMapSources.png}
                        alt={`${filterLocation}のマップ`}
                        className="w-full h-auto block pointer-events-none"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                      />
                    </picture>
                    
                    {/* 既存の団体ピン */}
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
                            if (!measureMode) {
                              e.stopPropagation();
                              handleItemClick(pin.groupName, 'map');
                            }
                          }} 
                          className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${
                            measureMode ? 'pointer-events-none opacity-60' : 'cursor-pointer group'
                          } ${isTarget ? 'scale-125 z-40' : 'hover:scale-125 z-20 hover:z-30'}`} 
                          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                        >
                          <div className="relative flex items-center justify-center">
                            <div className={`w-8 h-8 md:w-14 md:h-14 rounded-full bg-white border-2 md:border-4 shadow-md overflow-hidden flex items-center justify-center relative transition-all ${
                              isTarget 
                                ? 'ring-4 ring-yellow-400 border-yellow-500 shadow-[0_0_20px_rgba(250,204,21,0.9)] animate-pulse' 
                                : theme.border
                            }`}>
                              <LogoImage originalLogo={groupInfo?.logo || ''} groupName={groupInfo?.name || pin.groupName} alt={pin.groupName} className="w-full h-full object-cover" fallbackClassName="text-[10px] md:text-xs font-bold text-slate-500" />
                            </div>

                            {!measureMode && (
                              <div className={`absolute bottom-full mb-1 px-2 py-0.5 bg-slate-900/90 text-white rounded text-[10px] md:text-xs font-bold whitespace-nowrap shadow-md pointer-events-none transition-opacity ${isTarget ? 'opacity-100 z-50 bg-yellow-500 text-slate-900' : 'opacity-0 group-hover:opacity-100'}`}>
                                {pin.groupName}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* 🎯 測定モード時の計測マーカー */}
                    {measureMode && clickedCoord && (
                      <div
                        className="absolute z-50 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-in zoom-in-50 duration-150"
                        style={{ left: `${clickedCoord.x}%`, top: `${clickedCoord.y}%` }}
                      >
                        <div className="relative flex items-center justify-center">
                          {/* 十字カーソル風デザイン */}
                          <div className="w-8 h-8 rounded-full border-2 border-purple-500 bg-purple-500/30 flex items-center justify-center shadow-lg animate-pulse">
                            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                          </div>
                          <div className="absolute bottom-full mb-1 bg-purple-950 text-purple-100 font-mono text-[11px] font-bold px-2 py-0.5 rounded shadow-lg border border-purple-700 whitespace-nowrap">
                            x: {clickedCoord.x}%, y: {clickedCoord.y}%
                          </div>
                        </div>
                      </div>
                    )}

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
                            return <LogoImage originalLogo={highlightedGroup.logo} groupName={highlightedGroup.name} alt="logo" className="w-full h-full object-cover" fallbackClassName="text-xl font-bold text-slate-400" />;
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
                      <div className="text-right">
                        {highlightedGroup.waitingTime !== "ー" ? (
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-xs font-bold text-amber-700">レベル</span>
                            <span className="text-3xl font-black text-amber-600">{highlightedGroup.waitingTime}</span>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-slate-400">データなし</span>
                        )}
                      </div>
                    </div>

                    {highlightedGroup.comment && (
                      <div className="bg-white/90 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 font-medium">
                        💬 {highlightedGroup.comment}
                      </div>
                    )}

                    <p className="text-xs text-slate-600 leading-relaxed bg-white/60 p-3 rounded-lg border border-amber-100">
                      {highlightedGroup.description}
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400">
                    <p className="text-xs font-bold">マップ上のピンをタップすると<br />ここに詳細が表示されます</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 📋 団体・展示一覧エリア */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">
              📋 該当団体一覧 <span className="text-xs font-normal text-slate-500">({filteredGroups.length}件)</span>
            </h2>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-slate-200 text-center space-y-2">
              <span className="text-3xl">🔍</span>
              <p className="text-sm font-bold text-slate-600">条件に一致する団体が見つかりませんでした</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map((group, idx) => {
                const timeAgoStr = getTimeAgo(group.lastUpdated);

                return (
                  <div
                    key={idx}
                    onClick={() => handleItemClick(group.name, 'list')}
                    className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-3 group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                            <LogoImage originalLogo={group.logo} groupName={group.name} alt={group.name} className="w-full h-full object-cover" fallbackClassName="text-sm font-bold text-slate-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                              {group.name}
                            </h3>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                📍 {group.location}
                              </span>
                              {group.category && (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {group.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          {group.waitingTime !== "ー" ? (
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-[10px] font-bold text-slate-400">Lv.</span>
                              <span className="text-xl font-black text-orange-500">{group.waitingTime}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-300">ー</span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {group.description}
                      </p>

                      {group.comment && (
                        <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600 border border-slate-100 line-clamp-1">
                          💬 {group.comment}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>{timeAgoStr ? `🕒 ${timeAgoStr}` : '未更新'}</span>
                      <span className="text-blue-500 font-bold group-hover:underline">マップ・詳細を見る →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* モーダル表示 */}
      {selectedGroupInfo && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setModalGroupName(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalGroupName(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm transition"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                <LogoImage originalLogo={selectedGroupInfo.logo} groupName={selectedGroupInfo.name} alt="logo" className="w-full h-full object-cover" fallbackClassName="text-xl font-bold text-slate-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">{selectedGroupInfo.name}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    📍 {selectedGroupInfo.location}
                  </span>
                  {selectedGroupInfo.category && (
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      🏷️ {selectedGroupInfo.category}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-orange-800 block">混雑度 / 待ち時間</span>
                {getTimeAgo(selectedGroupInfo.lastUpdated) && (
                  <span className="text-[10px] text-orange-600">🕒 {getTimeAgo(selectedGroupInfo.lastUpdated)}に更新</span>
                )}
              </div>
              <div className="text-right">
                {selectedGroupInfo.waitingTime !== "ー" ? (
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xs font-bold text-orange-700">レベル</span>
                    <span className="text-2xl font-black text-orange-600">{selectedGroupInfo.waitingTime}</span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-400">未更新</span>
                )}
              </div>
            </div>

            {selectedGroupInfo.comment && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                💬 <span className="font-semibold">{selectedGroupInfo.comment}</span>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">紹介文</span>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {selectedGroupInfo.description}
              </p>
            </div>

            <button
              onClick={() => setModalGroupName(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

