/**
 * MarkdownText.tsx
 * ─────────────────
 * Lightweight inline markdown renderer — no external libraries.
 *
 * Supported syntax
 * ────────────────
 *   Block:   # H1  ## H2  ### H3
 *            - item / * item  (bullet list)
 *            1. item          (numbered list)
 *            ---              (horizontal rule)
 *            blank lines      (paragraph spacing)
 *
 *   Inline:  **bold**   *italic*   _italic_   `code`
 */

import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';

// ─── Inline parser ─────────────────────────────────────────────────────────

const INLINE_RE = /(\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|`(.+?)`)/g;

function parseInline(
  raw: string,
  baseStyle: TextStyle | TextStyle[],
  keyPrefix: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let n = 0;

  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Text key={`${keyPrefix}-t${n++}`} style={baseStyle}>
          {raw.slice(lastIndex, match.index)}
        </Text>,
      );
    }

    if (match[2] !== undefined) {
      // **bold**
      nodes.push(
        <Text key={`${keyPrefix}-b${n++}`} style={[baseStyle, styles.bold]}>
          {match[2]}
        </Text>,
      );
    } else if (match[3] !== undefined) {
      // *italic*
      nodes.push(
        <Text key={`${keyPrefix}-i${n++}`} style={[baseStyle, styles.italic]}>
          {match[3]}
        </Text>,
      );
    } else if (match[4] !== undefined) {
      // _italic_
      nodes.push(
        <Text key={`${keyPrefix}-i${n++}`} style={[baseStyle, styles.italic]}>
          {match[4]}
        </Text>,
      );
    } else if (match[5] !== undefined) {
      // `code`
      nodes.push(
        <Text key={`${keyPrefix}-c${n++}`} style={[baseStyle, styles.inlineCode]}>
          {match[5]}
        </Text>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < raw.length) {
    nodes.push(
      <Text key={`${keyPrefix}-t${n++}`} style={baseStyle}>
        {raw.slice(lastIndex)}
      </Text>,
    );
  }

  return nodes;
}

// ─── Block parser ───────────────────────────────────────────────────────────

function parseBlocks(markdown: string, isUser: boolean): React.ReactNode[] {
  const lines = markdown.split('\n');
  const blocks: React.ReactNode[] = [];

  let key = 0;
  const k = () => `blk-${key++}`;

  // Accumulated list items waiting to be flushed
  let pendingList: React.ReactNode[] = [];
  let listType: 'bullet' | 'numbered' | null = null;

  const textStyle: TextStyle = isUser ? styles.userText : styles.botText;

  const flushList = () => {
    if (pendingList.length === 0) return;
    blocks.push(
      <View key={k()} style={styles.list}>
        {pendingList}
      </View>,
    );
    pendingList = [];
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // ── blank line ──────────────────────────────────────────────────────────
    if (!trimmed) {
      flushList();
      continue;
    }

    // ── headings ────────────────────────────────────────────────────────────
    const h1m = trimmed.match(/^#\s+(.+)/);
    const h2m = trimmed.match(/^##\s+(.+)/);
    const h3m = trimmed.match(/^###\s+(.+)/);

    // resolve most-specific first
    const heading = h3m
      ? { level: 3, content: h3m[1] }
      : h2m
        ? { level: 2, content: h2m[1] }
        : h1m
          ? { level: 1, content: h1m[1] }
          : null;

    if (heading) {
      flushList();
      const hStyle =
        heading.level === 1
          ? styles.h1
          : heading.level === 2
            ? styles.h2
            : styles.h3;
      const bk = k();
      blocks.push(
        <Text key={bk} style={[hStyle, textStyle]}>
          {parseInline(heading.content, [hStyle, textStyle], bk)}
        </Text>,
      );
      continue;
    }

    // ── horizontal rule ─────────────────────────────────────────────────────
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushList();
      blocks.push(<View key={k()} style={isUser ? styles.hrUser : styles.hr} />);
      continue;
    }

    // ── bullet list ─────────────────────────────────────────────────────────
    const bulletM = trimmed.match(/^[*\-•]\s+(.+)/);
    if (bulletM) {
      if (listType === 'numbered') flushList();
      listType = 'bullet';
      const bk = k();
      pendingList.push(
        <View key={bk} style={styles.listItem}>
          <Text style={[styles.bullet, textStyle]}>{'•'}</Text>
          <Text style={[styles.listBody, textStyle]}>
            {parseInline(bulletM[1], textStyle, bk)}
          </Text>
        </View>,
      );
      continue;
    }

    // ── numbered list ───────────────────────────────────────────────────────
    const numM = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numM) {
      if (listType === 'bullet') flushList();
      listType = 'numbered';
      const bk = k();
      pendingList.push(
        <View key={bk} style={styles.listItem}>
          <Text style={[styles.bullet, textStyle]}>{numM[1]}.</Text>
          <Text style={[styles.listBody, textStyle]}>
            {parseInline(numM[2], textStyle, bk)}
          </Text>
        </View>,
      );
      continue;
    }

    // ── paragraph ───────────────────────────────────────────────────────────
    flushList();
    const bk = k();
    blocks.push(
      <Text key={bk} style={[styles.paragraph, textStyle]}>
        {parseInline(trimmed, textStyle, bk)}
      </Text>,
    );
  }

  flushList();
  return blocks;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface MarkdownTextProps {
  children: string;
  isUser?: boolean;
}

export const MarkdownText = ({ children, isUser = false }: MarkdownTextProps) => {
  const blocks = parseBlocks(children, isUser);
  return <View style={styles.root}>{blocks}</View>;
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { gap: 8 },

  // base text colours (mirror MessageBubblesBot)
  userText: { color: '#FFFFFF' },
  botText:  { color: '#222222' },

  // inline
  bold:       { fontWeight: '700' },
  italic:     { fontStyle: 'italic' },
  inlineCode: {
    fontFamily: 'Courier',
    fontSize: 13.5,
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 4,
    paddingHorizontal: 3,
  },

  // headings
  h1: { fontSize: 20, fontWeight: '800', lineHeight: 26, marginBottom: 2 },
  h2: { fontSize: 17, fontWeight: '700', lineHeight: 23, marginBottom: 1 },
  h3: { fontSize: 15, fontWeight: '700', lineHeight: 21 },

  // paragraph
  paragraph: { fontSize: 16, lineHeight: 23 },

  // lists
  list:     { gap: 5 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bullet:   { fontSize: 16, lineHeight: 23, fontWeight: '600', minWidth: 14 },
  listBody: { fontSize: 16, lineHeight: 23, flex: 1 },

  // divider
  hr:     { height: StyleSheet.hairlineWidth, backgroundColor: '#DDDDDD', marginVertical: 6 },
  hrUser: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 6 },
});
