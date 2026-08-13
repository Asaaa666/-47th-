export const normalizeCategoryValue = (value) => {
  const trimmed = (value ?? '').toString().trim();
  if (!trimmed) return 'その他';

  const compact = trimmed
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[()（）\[\]【】「」『』・／_ー-]+/g, '')
    .toLowerCase();

  if (!compact) return 'その他';

  const otherKeywords = ['その他', 'other', 'unknown', '未設定', '未記入', 'なし', 'none', 'na'];
  if (otherKeywords.some((keyword) => compact.includes(keyword))) {
    return 'その他';
  }

  return trimmed.replace(/\s+/g, ' ').trim();
};

export const normalizeSearchText = (value) => {
  return (value ?? '')
    .toString()
    .normalize('NFKC')
    .replace(/[\s\u3000]+/g, ' ')
    .replace(/[、，。．・]/g, ' ')
    .replace(/[_/\\-]+/g, ' ')
    .trim()
    .toLowerCase();
};

export const tokenizeSearchQuery = (value) => {
  return normalizeSearchText(value)
    .split(/\s+/)
    .filter(Boolean);
};

export const getUnifiedLocationGroup = (rawLocation) => {
  const location = (rawLocation ?? '').toString();
  if (!location) return 'その他';
  if (location.includes('清和書林') || location.includes('清話書林') || location.includes('ハンドボールコートB')) return 'その他';
  if (location.includes('屋台') || location.includes('ハンドボールコート')) return '屋台';
  if (location.includes('アリーナ') || location.includes('打越アリーナ')) return '打越アリーナ';
  if (location.includes('中学棟 1階') || location.includes('高校棟 1階') || (location.includes('1階') && (location.includes('中学') || location.includes('高校')))) return '中学・高校棟 1階';
  if (location.includes('中学棟 2階') || location.includes('高校棟 2階') || (location.includes('2階') && (location.includes('中学') || location.includes('高校')))) return '中学・高校棟 2階';
  if (location.includes('中学棟')) {
    if (location.includes('3階')) return '中学棟 3階';
    if (location.includes('4階')) return '中学棟 4階';
    if (location.includes('5階')) return '中学棟 5階';
  }
  if (location.includes('高校棟')) {
    if (location.includes('3階')) return '高校棟 3階';
    if (location.includes('4階')) return '高校棟 4階';
    if (location.includes('5階')) return '高校棟 5階';
  }
  if (location.includes('1階')) return '中学・高校棟 1階';
  if (location.includes('2階')) return '中学・高校棟 2階';
  return 'その他';
};

export const matchesSearchQuery = (group, searchTerm) => {
  const query = tokenizeSearchQuery(searchTerm);
  if (query.length === 0) return true;

  const searchableFields = [
    group.name,
    group.description,
    group.category,
    group.location,
    group.comment,
    getUnifiedLocationGroup(group.location),
  ].map((value) => normalizeSearchText(value));

  const joinedFields = searchableFields.join(' ');

  return query.every((term) => {
    const hasTermMatch = searchableFields.some((field) => field.includes(term));
    const compactMatch = joinedFields.replace(/\s+/g, '').includes(term.replace(/\s+/g, ''));
    return hasTermMatch || compactMatch;
  });
};
