import { useState, useEffect, useRef } from 'react';//アプリを動かす使うUseStateやUseEffectなどのフックを導入
import { normalizeCategoryValue, getUnifiedLocationGroup, matchesSearchQuery } from './searchUtils';

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
  "PTA": ["/pta.png"],
  "pta": ["/pta.png"],
  "第二会場": ["/pta.png"],
  "第二会場 PTA": ["/pta.png"],
  "PTA第二会場": ["/pta.png"],
  "Juggling Art Asano": ["/Juggling Art Asano_ロゴ.png_"],
  "Zepp Asano": ["/Zepp Asano_ロゴ.png"],
  "Melon Frappe Jazz Orchestra": ["/Melon Frappe Jazz Orchestra_ロゴ.png"],
};

const normalizePublicAssetUrl = (value: string): string => {//public配下の画像ファイルのURLを正規化する関数です。valueは、正規化する文字列です。
  const trimmed = (value || '').trim();//スペースを削除する
  if (!trimmed) return '';//trimmedが空文字の場合は空文字を返す
  if (/^(https?:\/\/|data:|blob:|\/\/)/i.test(trimmed)) return trimmed;//URLのバグを修正
  return trimmed.replace(/^\/public\//, '/').replace(/^\/+/, '/');//public配下の画像ファイルのURLを正規化するために、先頭の/public/を/に置換し、先頭のスラッシュを1つに統一する
};

const PUBLIC_LOGO_ASSET_URLS = Object.values(//ロゴをpublic配下の画像ファイルから取得するためのコードです。import.meta.globを使って、publicディレクトリ内のすべての画像ファイルを取得し、そのURLを配列として返します。filter(Boolean)は、nullやundefinedを除外するために使われます。
  import.meta.glob('/public/**/*.{png,jpg,jpeg,webp,svg,avif}', { eager: true, import: 'default' }) as Record<string, string>
).filter(Boolean).map(value => normalizePublicAssetUrl(String(value)));//public配下の画像ファイルのURLを取得するためのコードです。import.meta.globを使って、publicディレクトリ内のすべての画像ファイルを取得し、そのURLを配列として返します。filter(Boolean)は、nullやundefinedを除外するために使われます。

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
    const normalizedForProbe = normalizePublicAssetUrl(normalized);
    const variants = [normalizedForProbe];//表記ゆれ回収(絶対参照の場合はそのまま、相対参照の場合は / を付けたものと付けないものの2種類を候補に追加する)
    if (!absolute) {//表記ずれを吸収
      variants.push(`/${normalizedForProbe.replace(/^\/+/, '')}`);//相対参照の場合は、先頭のスラッシュを取り除いたものにスラッシュを付けたものを候補に追加する
      variants.push(`/${normalizedForProbe.replace(/^\/+/, '')}`.replace(/^\//, ''));
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

const probeLogoCandidate = (candidate: string): Promise<string | null> => new Promise((resolve) => {
  if (!candidate) return resolve(null);

  const probe = new Image();
  probe.onload = () => resolve(candidate);
  probe.onerror = () => resolve(null);
  probe.decoding = 'async';
  probe.src = candidate;
});

const resolveLogoSrc = async (originalLogo: string, groupName: string): Promise<string | null> => {//ロゴ候補を順番に確認して、最初に読み込めるものを返す関数です。
  const cacheKey = `${(groupName || '').trim()}::${(originalLogo || '').trim()}`;//キャッシュキーを作成する。団体名とオリジナルのロゴ画像のURLを::で区切った文字列を作成する。
  const cached = logoResolutionCacheRef.current[cacheKey];//キャッシュに解決済みのロゴ画像のURLが存在する場合は、それを返す。キャッシュに存在しない場合は、次の処理に進む。
  if (cached !== undefined) return cached;//キャッシュに解決済みのロゴ画像のURLが存在する場合は、それを返す。キャッシュに存在しない場合は、次の処理に進む。

  const pending = logoResolutionInFlightRef.current[cacheKey];//解決中のPromiseが存在する場合は、それを返す。解決中のPromiseが存在しない場合は、次の処理に進む。
  if (pending) return pending;//解決中のPromiseが存在する場合は、それを返す。解決中のPromiseが存在しない場合は、次の処理に進む。

  const candidates = Array.from(new Set(getLogoSrcCandidates(originalLogo, groupName)));//ロゴ候補を取得し、重複を除去して高速化する。

  const promise = (async () => {
    const maxParallelChecks = 4;

    for (let index = 0; index < candidates.length; index += maxParallelChecks) {
      const batch = candidates.slice(index, index + maxParallelChecks);
      const resolved = await Promise.all(batch.map(candidate => probeLogoCandidate(candidate)));
      const found = resolved.find((value): value is string => Boolean(value));

      if (found) {
        logoResolutionCacheRef.current[cacheKey] = found;
        return found;
      }
    }

    logoResolutionCacheRef.current[cacheKey] = null;
    return null;
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

const normalizeWaitingTime = (value: string | undefined): string => {
  const normalized = (value ?? '').toString().trim().replace(/\s+/g, '');
  if (!normalized || normalized === 'ー' || normalized === '—' || normalized === '-') return 'ー';
  if (normalized === '休止中' || normalized === '休止') return '休止中';
  if (normalized === '売り切れ' || normalized === '売切れ') return '売り切れ';
  return normalized;
};

const getWaitingDisplayInfo = (value: string | undefined) => {//待ち時間の表示情報を取得する関数です。valueは、待ち時間の文字列です。
  const normalized = normalizeWaitingTime(value);//待ち時間の文字列を正規化する。normalizeWaitingTime関数を使って、待ち時間の文字列を正規化する。

  if (normalized === 'ー') {//待ち時間が空の場合は、空の表示情報を返す。
    return {
      kind: 'empty' as const,//待ち時間が空の場合は、空の表示情報を返す。
      displayText: 'ー',//待ち時間が空の場合は、空の表示情報を返す。
      sortScore: 0,//待ち時間が空の場合は、空の表示情報を返す。
      borderClass: 'border-blue-500',//青色の枠線を表示するためのクラス名
      bgClass: 'bg-blue-500',//青色の背景を表示するためのクラス名
      textClass: 'text-slate-400',//テキスト
    };
  }

  if (normalized === '休止中') {//待ち時間が休止中の場合は、休止中の表示情報を返す。
    return {
      kind: 'paused' as const,//待ち時間が休止中の場合は、休止中の表示情報を返す。
      displayText: '休止中',
      sortScore: 6,//待ち時間を6としてソートするためのスコア
      borderClass: 'border-slate-500',
      bgClass: 'bg-slate-500',
      textClass: 'text-slate-600',
    };
  }

  if (normalized === '売り切れ') {
    return {
      kind: 'soldout' as const,//待ち時間が売り切れの場合は、売り切れの表示情報を返す。
      displayText: '売り切れ',
      sortScore: 7,
      borderClass: 'border-rose-600',
      bgClass: 'bg-rose-600',
      textClass: 'text-rose-600',
    };
  }

  const numericValue = Number.parseFloat(normalized);
  if (!Number.isNaN(numericValue)) {
    const level = Math.max(1, Math.min(5, Math.round(numericValue)));//待ち時間の数値を1から5の範囲に丸める。1未満は1、5より大きい場合は5にする。
    return {
      kind: 'numeric' as const,
      displayText: String(level),//
      sortScore: numericValue,
      borderClass: level <= 2 ? 'border-green-500' : level === 3 ? 'border-orange-500' : 'border-red-500',//待ち時間の数値に応じて、枠線の色を変更する。1〜2は緑、3はオレンジ、4〜5は赤にする。
      bgClass: level <= 2 ? 'bg-green-500' : level === 3 ? 'bg-orange-500' : 'bg-red-500',//3より大きい場合は赤にする。
      textClass: level <= 2 ? 'text-green-600' : level === 3 ? 'text-orange-600' : 'text-red-600',
    };
  }

  return {
    kind: 'unknown' as const,//待ち時間が不明な場合は、不明の表示情報を返す。
    displayText: normalized,
    sortScore: Number.POSITIVE_INFINITY,
    borderClass: 'border-blue-500',
    bgClass: 'bg-blue-500',
    textClass: 'text-slate-500',
  };
};

const getWaitingSortScore = (waitingTime: string | undefined): number => {
  const info = getWaitingDisplayInfo(waitingTime);
  return info.kind === 'empty' ? 0 : info.sortScore;
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

  useEffect(() => {//URLの切り替えに応じてロゴの解決を行うための副作用フックです。
    let isActive = true;//アクティブな状態を示すフラグ
    const node = containerRef.current;//ロゴの可視判定に使う参照の現在の値を取得

    if (!node) {//参照が存在しない場合はロゴの読み込みを中止
      setShouldLoad(false);//画面内に入ったらロゴ読み込みを開始するためのステートをfalseに設定
      return undefined;//ロゴの解決を中止
    }

    // 🔎 画面内に入ったタイミングでだけロゴをロードして、初期表示の通信量を抑える
    const observerInstance = typeof IntersectionObserver !== 'undefined'//IntersectionObserverがサポートされている場合は、IntersectionObserverを使ってロゴの可視判定を行う
      ? new IntersectionObserver((entries) => {//IntersectionObserverを使ってロゴの可視判定を行うコールバック関数です。つまり、ロゴが画面内に入ったタイミングでだけロゴをロードして、初期表示の通信量を抑えることができます。
          const isVisible = entries.some(entry => entry.isIntersecting);//ロゴが画面内に入ったかどうかを判定するフラグ
          if (isVisible && isActive) {//ロゴが画面内に入った場合は、ロゴの読み込みを開始する
            setShouldLoad(true);//画面内に入ったらロゴ読み込みを開始するためのステートをtrueに設定
            observerInstance?.disconnect();//IntersectionObserverを切断して、ロゴの可視判定を終了する
          }
        }, { rootMargin: '200px 0px' })//IntersectionObserverのオプションを設定する。rootMarginは、画面内に入ったと判定する範囲を指定する。ここでは、上下200pxの範囲で判定するように設定している。
      : null;

    observerInstance?.observe(node);//IntersectionObserverを使ってロゴの可視判定を開始する。nodeは、ロゴの可視判定に使う参照の現在の値です。

    return () => {
      isActive = false;//コンポーネントがアンマウントされるときに、アクティブな状態をfalseに設定して、ロゴの解決を中止する
      observerInstance?.disconnect();//IntersectionObserverを切断して、ロゴの可視判定を終了する
    };
  }, [originalLogo, groupName]);//originalLogoとgroupNameが変更されたときに、ロゴの可視判定を再度行うための副作用フックです。

  useEffect(() => {
    if (!shouldLoad) return undefined;//ロゴの読み込みを開始するためのステートがfalseの場合は、ロゴの解決を中止する

    let isActive = true;//アクティブな状態を示すフラグ

    const loadLogo = async () => {//ロゴの解決を非同期で行う関数です。
      const resolved = await resolveLogoSrc(originalLogo, groupName);//ロゴの解決を非同期で行い、解決済みのロゴ画像URLを取得する
      if (isActive) {//コンポーネントがアンマウントされていない場合は、解決済みのロゴ画像URLをステートに設定する
        setResolvedSrc(resolved);//解決済みのロゴ画像URLをステートに設定する
      }
    };

    loadLogo();//ロゴの解決を非同期で行う関数を呼び出す

    return () => {
      isActive = false;//コンポーネントがアンマウントされるときに、アクティブな状態をfalseに設定して、ロゴの解決を中止する
    };
  }, [shouldLoad, originalLogo, groupName]);//shouldLoad、originalLogo、groupNameが変更されたときに、ロゴの解決を再度行うための副作用フックです。

  const baseFallbackClassName = fallbackClassName || 'text-[10px] md:text-xs font-bold text-slate-400';//ロゴが見つからなかったときの表示クラス名を設定する。fallbackClassNameが指定されていない場合は、デフォルトのクラス名を使用する。

  return (
    <span ref={containerRef} className={`w-full h-full flex items-center justify-center ${baseFallbackClassName}`}>　
      {resolvedSrc ? (//解決済みのロゴ画像URLが存在する場合は、画像を表示する
        <img src={resolvedSrc} alt={alt} className={className} loading="lazy" decoding="async" />//解決済みのロゴ画像URLが存在する場合は、画像を表示する。srcは、解決済みのロゴ画像URLです。altは、画像の代替テキストです。classNameは、画像のクラス名です。loading="lazy"は、画像の遅延読み込みを有効にする属性です。decoding="async"は、画像のデコードを非同期で行う属性です。
      ) : (
        '祭'//解決済みのロゴ画像URLが存在しない場合は、代替テキストを表示する
      )}
    </span>//ロゴ画像の解決を非同期で行い、表示が安定するようにするコンポーネントのレンダリング部分です。containerRefは、ロゴの可視判定に使う参照です。baseFallbackClassNameは、ロゴが見つからなかったときの表示クラス名です。
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
  const fetchInFlightRef = useRef(false);//重複したデータ取得を防ぐためのフラグ
  const DATA_CACHE_TTL_MS = 5 * 60 * 1000;// 5分以上古いデータだけを再取得し、Vercel側のアクセス量を抑える
  const DATA_CACHE_KEY = 'festival-data-cache-v1';

  const restoreCachedData = (): { savedAt: number; groups: Group[]; coords: Coordinate[] } | null => {
    try {
      const cachedRaw = window.localStorage.getItem(DATA_CACHE_KEY);
      if (!cachedRaw) return null;

      const cached = JSON.parse(cachedRaw) as { savedAt?: number; groups?: Group[]; coords?: Coordinate[] };
      if (!cached?.savedAt || !Array.isArray(cached.groups) || !Array.isArray(cached.coords)) return null;

      const isFresh = Date.now() - cached.savedAt < DATA_CACHE_TTL_MS;
      if (!isFresh) return null;

      return {
        savedAt: cached.savedAt,
        groups: cached.groups,
        coords: cached.coords,
      };
    } catch {
      return null;
    }
  };

  const persistCachedData = (nextGroups: Group[], nextCoords: Coordinate[]) => {
    try {
      window.localStorage.setItem(DATA_CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        groups: nextGroups,
        coords: nextCoords,
      }));
    } catch {
      // localStorage が使えない環境では無視して通常表示を継続する
    }
  };

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
            const info = getWaitingDisplayInfo(g.waitingTime);
            return info.kind === 'empty' ? 0 : info.sortScore;
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

  const MAP_ASSET_VERSION = '20260804-2';// Vercel やブラウザのキャッシュで古い WebP が残らないよう、マップ画像 URL にはバージョンを付けて更新を強制します。

  const getMapImageSources = (buttonName: string): string | null => {//校内マップは WebP だけを読み込みます。
    if (!buttonName || buttonName === 'すべて' || buttonName === 'その他' || buttonName === '屋台') return null;

    const mapImageMap: Record<string, string> = {
      '中学・高校棟 1階': `/1階 (1).webp?v=${MAP_ASSET_VERSION}`,
      '中学・高校棟 2階': `/2階 (1).webp?v=${MAP_ASSET_VERSION}`,
      '中学棟 3階': `/中学棟三階.webp?v=${MAP_ASSET_VERSION}`,
      '中学棟 4階': `/中学棟四階.webp?v=${MAP_ASSET_VERSION}`,
      '中学棟 5階': `/中学棟五階.webp?v=${MAP_ASSET_VERSION}`,
      '高校棟 3階': `/高校棟三階.webp?v=${MAP_ASSET_VERSION}`,
      '高校棟 4階': `/高校棟四階.webp?v=${MAP_ASSET_VERSION}`,
      '高校棟 5階': `/高校棟五階.webp?v=${MAP_ASSET_VERSION}`
    };

    return mapImageMap[buttonName] || null;
  };

  // GAS から団体データ・座標・更新情報をまとめて取得して、画面表示用に整形する。
  const fetchData = async () => {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;

    try {
      const cached = restoreCachedData();
      if (cached) {
        setGroups(cached.groups);
        setCoords(cached.coords);
        setLoading(false);
      } else {
        setLoading(true);
      }

      const res = await fetch(GAS_API_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();

      const coordsCategoryMap: Record<string, string> = {};

      const coordsRows = (data.coords || []).slice(1);
      const parsedCoords: Coordinate[] = coordsRows.filter((row: any[]) => row && row[0] && row[1]).map((row: any[]) => {
        const groupName = String(row[0]).trim();
        const categoryRaw = row[5] ? String(row[5]).trim() : (row[4] ? String(row[4]).trim() : "");
        const category = normalizeCategoryValue(categoryRaw);
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
        const category = normalizeCategoryValue(coordsCategoryMap[name] || (row[5] ? String(row[5]).trim() : "その他"));
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
          category: normalizeCategoryValue(coordsCategoryMap["生物部"] || "展示")
        });
      }

      if (!hasLibrary) {
        const libUpdates = Object.keys(latestUpdates).find(k => k.includes("図書"));
        mergedGroups.push({
          name: "図書研究部", description: "図書研究部（図書委員会古本バザー）です。面白い本がたくさんあります！", location: "本校舎教室", logo: "図書研究部 ロゴ.png",
          status: libUpdates ? "更新済" : "未更新", waitingTime: libUpdates ? latestUpdates[libUpdates].waiting : "ー",
          comment: libUpdates ? latestUpdates[libUpdates].comment : "", lastUpdated: libUpdates ? latestUpdates[libUpdates].time : "",
          category: normalizeCategoryValue(coordsCategoryMap["図書研究部"] || "展示")
        });
      }

      setGroups(mergedGroups);
      persistCachedData(mergedGroups, parsedCoords);
    } catch (error) {
      console.error("データの取得に失敗しました:", error);
    } finally {
      setLoading(false);
      fetchInFlightRef.current = false;
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };

    fetchData();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchData();
      }
    }, 5 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  const uniqueCategories = Array.from(new Set(groups.map(g => normalizeCategoryValue(g.category)).filter(Boolean)));
  const categoryOptions = ['すべて', ...uniqueCategories];

  const filteredGroups = groups.filter(group => {
    if (!matchesSearchQuery(group, searchTerm)) return false;

    if (filterLocation !== 'すべて') {
      const rawLocation = group.location || "";
      if (rawLocation.includes('生徒ホール') || rawLocation.includes('せいとほーる')) {
        if (filterLocation !== '中学・高校棟 1階' && filterLocation !== 'その他') return false;
      } else {
        const unified = getUnifiedLocationGroup(rawLocation);
        if (unified !== filterLocation) {
          return false;
        }
      }
    }

    if (filterCategory !== 'すべて' && normalizeCategoryValue(group.category) !== filterCategory) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name, 'ja');
    } else if (sortBy === 'category') {
      const catCompare = a.category.localeCompare(b.category, 'ja');
      if (catCompare !== 0) return catCompare;
      const valA = getWaitingSortScore(a.waitingTime);
      const valB = getWaitingSortScore(b.waitingTime);
      return valA - valB;
    } else {
      const valA = getWaitingSortScore(a.waitingTime);
      const valB = getWaitingSortScore(b.waitingTime);
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
    const info = getWaitingDisplayInfo(time);
    return { border: info.borderClass, bg: info.bgClass };
  };

  const handleItemClick = (groupName: string, source: 'map' | 'list') => {
    // 測定モード中ならピンクリック無視
    if (measureMode && source === 'map') return;

    const groupCoord = coords.find(c => c.groupName === groupName);
    const group = groups.find(g => g.name === groupName);
    const targetLocation = groupCoord?.location || (group ? getUnifiedLocationGroup(group.location) : null);

    if (targetLocation && getMapImageSources(targetLocation)) {
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#eef5ff_32%,_#f8fafc_100%)] text-slate-800 antialiased font-sans pb-12 notranslate">
      <header className="sticky top-0 z-40 border-b border-sky-100 bg-white/85 backdrop-blur-md shadow-[0_8px_30px_rgba(14,116,144,0.06)]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg shadow-sky-200 ring-2 ring-white">
              <img 
                src="/logo.jpg" 
                alt="打越祭ロゴ" 
                className="h-9 w-9 object-cover rounded-xl"
              />
            </div>
            <div className="min-w-0">
              <h1 translate="no" className="font-black text-base sm:text-lg tracking-tight bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight notranslate">打越祭リアルタイム混雑サイト</h1>
              <p className="text-[10px] font-semibold text-slate-500 -mt-0.5 notranslate">打越祭をもっと快適に</p>
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
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition active:scale-95 whitespace-nowrap shadow-sm ring-1 ring-blue-100"
            >
              📖 使い方
            </button>
            <button onClick={fetchData} disabled={loading} className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50 whitespace-nowrap shadow-sm">
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

        {/* 休止中 */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-400 shadow-sm flex flex-col items-center text-center hover:border-slate-500 transition">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 mb-1">
            休止中
          </span>
          <span className="font-bold text-slate-800 text-xs">一時休止</span>
          <span className="text-[10px] text-slate-400 mt-0.5">展示や営業を休止中</span>
        </div>

        {/* 売り切れ */}
        <div className="bg-white p-2.5 rounded-xl border border-rose-400 shadow-sm flex flex-col items-center text-center hover:border-rose-500 transition">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 mb-1">
            売り切れ
          </span>
          <span className="font-bold text-slate-800 text-xs">受付終了</span>
          <span className="text-[10px] text-slate-400 mt-0.5">品切れ・配布終了</span>
        </div>
      </div>
    </div>

  </div>
)}

        {/* 検索・フィルターエリア */}
        <div className="bg-white/90 p-5 rounded-2xl border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.05)] space-y-4 ring-1 ring-slate-100">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base">🔎</span>
            <input
              type="text"
              placeholder="団体名、部門、キーワードで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-3 pl-11 pr-4 text-sm text-slate-700 shadow-inner outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">表示順 (並び替え)</span>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setSortBy('waiting')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${sortBy === 'waiting' ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                ⚡ 待ち時間順
              </button>
              <button onClick={() => setSortBy('name')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${sortBy === 'name' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                🔤 名前順
              </button>
              <button onClick={() => setSortBy('category')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${sortBy === 'category' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                🏷️ 部門順
              </button>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-100">
            <button 
              onClick={() => setisOpen(!isOpen)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1 shadow-sm"
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
                    <img
                      src={currentMapSources}
                      alt={`${filterLocation}のマップ`}
                      className="w-full h-auto block pointer-events-none"
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                    />
                    
                    {/* 既存の団体ピン */}
                    {activePins.map((pin, i) => {
                      const groupInfo = groups.find(g => g.name === pin.groupName);
                      const theme = getPinTheme(groupInfo?.waitingTime || "ー");
                      const isTarget = highlightedGroupName === pin.groupName;
                      const candidates = groupInfo ? getLogoSrcCandidates(groupInfo.logo, groupInfo.name) : [];
                      void candidates;
                      
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
                        {(() => {
                          const waitingInfo = getWaitingDisplayInfo(highlightedGroup.waitingTime);
                          if (waitingInfo.kind === 'numeric') {
                            return (
                              <div className="flex items-baseline gap-0.5">
                                <span className="text-xs font-bold text-amber-700">レベル</span>
                                <span className="text-3xl font-black text-amber-600">{waitingInfo.displayText}</span>
                              </div>
                            );
                          }
                          return <span className={`text-sm font-black ${waitingInfo.textClass}`}>{waitingInfo.displayText}</span>;
                        })()}
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
              📋 該当団体一覧 <span className="ml-2 inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700 ring-1 ring-sky-100">{filteredGroups.length}件</span>
            </h2>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center space-y-3 shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-3xl shadow-inner">🔍</div>
              <p className="text-base font-bold text-slate-700">条件に一致する団体が見つかりませんでした</p>
              <p className="text-xs text-slate-500">検索語や絞り込み条件を少し変えてみてください</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map((group, idx) => {
                const timeAgoStr = getTimeAgo(group.lastUpdated);

                return (
                  <div
                    key={idx}
                    onClick={() => handleItemClick(group.name, 'list')}
                    className="group flex cursor-pointer flex-col justify-between space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_12px_30px_rgba(59,130,246,0.12)]"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden relative shadow-sm">
                            <LogoImage originalLogo={group.logo} groupName={group.name} alt={group.name} className="w-full h-full object-cover" fallbackClassName="text-sm font-bold text-slate-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                              {group.name}
                            </h3>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                                📍 {group.location}
                              </span>
                              {group.category && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                                  {group.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          {(() => {
                            const waitingInfo = getWaitingDisplayInfo(group.waitingTime);
                            if (waitingInfo.kind === 'numeric') {
                              return (
                                <div className="flex items-baseline gap-0.5">
                                  <span className="text-[10px] font-bold text-slate-400">Lv.</span>
                                  <span className="text-xl font-black text-orange-500">{waitingInfo.displayText}</span>
                                </div>
                              );
                            }
                            return <span className={`text-xs font-black ${waitingInfo.textClass}`}>{waitingInfo.displayText}</span>;
                          })()}
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {group.description}
                      </p>

                      {group.comment && (
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-[11px] text-slate-600 line-clamp-1">
                          💬 {group.comment}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-medium">
                      <span>{timeAgoStr ? `🕒 ${timeAgoStr}` : '未更新'}</span>
                      <span className="font-bold text-blue-500 group-hover:underline">マップ・詳細を見る →</span>
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
                {(() => {
                  const waitingInfo = getWaitingDisplayInfo(selectedGroupInfo.waitingTime);
                  if (waitingInfo.kind === 'numeric') {
                    return (
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-xs font-bold text-orange-700">レベル</span>
                        <span className="text-2xl font-black text-orange-600">{waitingInfo.displayText}</span>
                      </div>
                    );
                  }
                  return <span className={`text-xs font-black ${waitingInfo.textClass}`}>{waitingInfo.displayText}</span>;
                })()}
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


