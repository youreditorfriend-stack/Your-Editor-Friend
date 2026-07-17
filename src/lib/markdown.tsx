import React from "react";

// Small, safe markdown for admin-authored product descriptions.
// Returns React nodes — never dangerouslySetInnerHTML — so the admin cannot
// (accidentally or otherwise) inject markup that hits customers.
//
// Supported (only what the SuperProfile-style page actually uses):
//   #  ##  ###                 headings
//   -  *  •  emoji-prefixed    bullets
//   1.                         numbered lists
//   ---  ***                   horizontal divider
//   **bold**   *italic*        inline emphasis
//   [text](https://url)        links
//   blank line                 paragraph break

// Inline: **bold**, *italic*, [text](url). Escapes are unnecessary because we
// never emit raw HTML — the substring becomes a React text node.
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      nodes.push(<strong key={`${keyPrefix}-b-${i}`} className="text-white font-semibold">{m[1]}</strong>);
    } else if (m[2]) {
      nodes.push(<em key={`${keyPrefix}-i-${i}`} className="italic">{m[2]}</em>);
    } else if (m[3] && m[4]) {
      nodes.push(
        <a
          key={`${keyPrefix}-a-${i}`}
          href={m[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#E50914] hover:underline"
        >
          {m[3]}
        </a>
      );
    }
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// Detect a bullet that starts with "- ", "* ", "• " or a leading emoji + space.
// Emoji-prefixed bullets are how the SuperProfile page writes ✅ / 🔥 lines.
const BULLET_RE = /^\s*(?:[-*•]|(?:\p{Extended_Pictographic}️?))\s+(.+)$/u;
const NUMBERED_RE = /^\s*\d+\.\s+(.+)$/;

interface Block {
  type: "heading" | "paragraph" | "ul" | "ol" | "divider";
  level?: number;
  items?: string[];
  text?: string;
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let ul: string[] = [];
  let ol: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushUl = () => {
    if (ul.length) {
      blocks.push({ type: "ul", items: ul });
      ul = [];
    }
  };
  const flushOl = () => {
    if (ol.length) {
      blocks.push({ type: "ol", items: ol });
      ol = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushUl();
    flushOl();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Blank line ends any open block
    if (!line.trim()) {
      flushAll();
      continue;
    }

    // Divider
    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) {
      flushAll();
      blocks.push({ type: "divider" });
      continue;
    }

    // Heading
    const heading = line.match(/^\s*(#{1,3})\s+(.+)$/);
    if (heading) {
      flushAll();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      continue;
    }

    // Numbered list item
    const num = line.match(NUMBERED_RE);
    if (num) {
      flushParagraph();
      flushUl();
      ol.push(num[1]);
      continue;
    }

    // Bullet (dash / star / bullet / emoji)
    const bullet = line.match(BULLET_RE);
    if (bullet) {
      flushParagraph();
      flushOl();
      ul.push(bullet[1]);
      continue;
    }

    // Otherwise it belongs to the current paragraph
    flushUl();
    flushOl();
    paragraph.push(line.trim());
  }

  flushAll();
  return blocks;
}

export function renderMarkdown(text?: string): React.ReactNode[] {
  if (!text) return [];
  const blocks = parseBlocks(text);
  return blocks.map((b, i) => {
    switch (b.type) {
      case "divider":
        return <hr key={i} className="my-8 border-white/10" />;
      case "heading": {
        const cls =
          b.level === 1
            ? "text-2xl md:text-3xl font-semibold text-white mt-8 mb-3"
            : b.level === 2
            ? "text-xl md:text-2xl font-semibold text-white mt-7 mb-3"
            : "text-lg md:text-xl font-semibold text-white mt-6 mb-2";
        const Tag = b.level === 1 ? "h2" : b.level === 2 ? "h3" : "h4";
        return React.createElement(Tag as any, { key: i, className: cls }, renderInline(b.text || "", `h${i}`));
      }
      case "ul":
        return (
          <ul key={i} className="my-3 space-y-2">
            {b.items!.map((item, j) => (
              <li key={j} className="text-zinc-300 leading-relaxed flex gap-2">
                <span className="text-[#25D366] shrink-0 mt-0.5">✓</span>
                <span>{renderInline(item, `ul${i}-${j}`)}</span>
              </li>
            ))}
          </ul>
        );
      case "ol":
        return (
          <ol key={i} className="my-3 space-y-2 list-decimal list-inside">
            {b.items!.map((item, j) => (
              <li key={j} className="text-zinc-300 leading-relaxed">
                {renderInline(item, `ol${i}-${j}`)}
              </li>
            ))}
          </ol>
        );
      case "paragraph":
        return (
          <p key={i} className="my-3 text-zinc-300 leading-relaxed">
            {renderInline(b.text || "", `p${i}`)}
          </p>
        );
      default:
        return null;
    }
  });
}
