// Build a stable CSS selector for an element, scoped to body
export function getStableSelector(el: Element): string {
  if (!el || el === document.body) return "body";
  const parts: string[] = [];
  let node: Element | null = el;
  let depth = 0;
  while (node && node !== document.body && depth < 12) {
    const parent = node.parentElement;
    if (!parent) break;
    const tag = node.tagName.toLowerCase();
    const siblings = Array.from(parent.children).filter(
      (c) => c.tagName === node!.tagName
    );
    const idx = siblings.indexOf(node) + 1;
    parts.unshift(`${tag}:nth-of-type(${idx})`);
    node = parent;
    depth++;
  }
  return "body > " + parts.join(" > ");
}

export function isInsideEditorUI(el: Element): boolean {
  return !!el.closest("[data-live-editor-ui]");
}
