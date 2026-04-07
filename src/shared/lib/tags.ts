export function extractTags(content: string): string[] {
  const matcher = /(^|\s)#([\p{L}\p{N}_-]+)/gu;
  const tags = new Set<string>();

  for (const match of content.matchAll(matcher)) {
    tags.add(`#${match[2]}`);
  }

  return [...tags];
}
