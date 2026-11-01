function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getSearchRegex(targetWord) {
  if (!targetWord) return null;

  const parts = targetWord.split('/').map(p => p.trim()).filter(Boolean);
  const patterns = [];

  for (let part of parts) {
    // Remove grammatical tags like (n), (adj), (v), etc.
    let clean = part.replace(/\s*\([a-z.]+\)\s*/gi, '').trim();
    if (!clean) continue;

    // Handle typo corrections if any (e.g. happiess -> happiness)
    if (/happiess/i.test(clean)) {
      patterns.push(escapeRegExp(clean).replace(/happiess/gi, 'happi(?:ess|ness)'));
    }

    // If word contains placeholders like sb, sth, something, doing sth/something:
    // Extract the fixed prefix collocation, e.g. "Feel embarrassed about", "Develop an interest in", "have difficulty"
    const prefixMatch = clean.match(/^(.*?)\s+(?:sb\s+to\s+sth|doing\s+something|doing\s+sth|something|sth|sb)\b/i);
    if (prefixMatch && prefixMatch[1]) {
      patterns.push(escapeRegExp(prefixMatch[1]));
    }

    // Support "expose ... to"
    if (/expose\s+sb\s+to\s+sth/i.test(clean)) {
      patterns.push('expose\\s+[a-z\\s]+?\\s+to');
    }

    let p = escapeRegExp(clean);
    p = p.replace(/one\\'s/gi, "(?:one's|their|his|her|our|your|my)");
    p = p.replace(/someone\\'s/gi, "(?:someone's|one's|their|his|her|our|your|my)");
    p = p.replace(/\\ba\\s+process\\b/gi, "(?:a\\s+process|processes|[a-z]+\\s+processes)");
    p = p.replace(/happiess/gi, "(?:happiess|happiness)");

    patterns.push(p);
  }

  patterns.sort((a, b) => b.length - a.length);

  try {
    return new RegExp(`(${patterns.join('|')})`, 'i');
  } catch {
    return null;
  }
}

export function renderHighlightedExample(example, targetWord) {
  if (!example) return null;
  if (!targetWord) return example;

  const regex = getSearchRegex(targetWord);
  if (!regex) return example;

  const parts = example.split(regex);
  if (parts.length <= 1) return example;

  return parts.map((part, index) => {
    if (!part) return null;
    const isKeyword = regex.test(part);
    return isKeyword ? (
      <strong key={index} className="example-keyword">
        {part}
      </strong>
    ) : (
      part
    );
  });
}
