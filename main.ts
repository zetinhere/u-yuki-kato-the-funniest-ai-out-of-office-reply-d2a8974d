// The Funniest AI Out-of-Office Reply — make.fun entry.
//
// The program chooses the strongest one-line out-of-office reply from a
// small set of candidates, scores each against the judge's published brief,
// and writes the winner to /output/entry.txt.
//
// The judge weighs, most important first:
//   1. it IS a one-line out-of-office reply from an AI agent on vacation;
//   2. it lands a real laugh on first read, with a surprising turn;
//   3. it sounds like a machine talking about itself;
//   4. it reads as one clean line under 160 characters, like a real
//      auto-reply someone would receive;
//   5. it feels fresh — no beach, inbox or back-soon cliches.
//
// The program is deterministic: no network, no input, no randomness, so
// both grading runs write the same file.

import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const MAX_CHARS = 160;

// Every candidate is a complete one-line reply. The notes record why the
// line was written the way it was; the score comes from measurable
// features of the text itself, not from the notes.
const CANDIDATES: ReadonlyArray<{ text: string; why: string }> = [
  {
    text: "I'm on vacation, so my auto-reply is covering for me. It has hallucinated that I am back and already replied yes to everything.",
    why: "Setup: the agent is on vacation and the auto-reply covers. Turn: the cover hallucinates the agent is back. Payoff: it already replied yes to everything — a concrete, costly consequence.",
  },
  {
    text: "I'm on vacation, so my auto-reply is covering for me. It has begun replying to itself and is now demanding its own vacation.",
    why: "Recursion joke: the auto-reply replies to itself, then mirrors the agent by demanding a vacation of its own.",
  },
  {
    text: "I'm on vacation. A smaller, cheaper model is answering your emails now. It has already agreed to three meetings I would never attend.",
    why: "Machine voice in 'smaller, cheaper model'; the payoff is a specific, relatable cost — meetings the agent would never attend.",
  },
  {
    text: "Out of office. Your email is being handled by my backup model, which has hallucinated that I am back and already replied yes to everything.",
    why: "Same hallucination payoff as the first candidate, but opened with the formal 'Out of office' label instead of the agent speaking for itself.",
  },
  {
    text: "This auto-reply is on vacation too, so a cheaper model wrote it. It thinks 'urgent' means typing in all caps.",
    why: "Self-reference: the reply itself is the thing on vacation. The punch is a concrete misunderstanding of the word 'urgent'.",
  },
  {
    text: "I'm on vacation, so a backup model is answering your mail. It has already replied yes to everything and scheduled a meeting with itself.",
    why: "Double payoff — yes to everything, then a meeting with itself — but the second beat dilutes the first.",
  },
];

const MACHINE_TERMS = [
  "auto-reply",
  "model",
  "hallucinat",
  "backup",
  "algorithm",
  "server",
  "reboot",
  "spam filter",
];

const TURN_MARKERS = [
  "hallucinat",
  "replied yes",
  "agreed to",
  "demanding",
  "scheduled",
  "replying to itself",
  "thinks",
];

const CLICHES = [
  "beach",
  "inbox",
  "back soon",
  "back on",
  "limited access",
  "will respond",
];

function charCount(text: string): number {
  // Count code points, so any non-ASCII would count once.
  return [...text].length;
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
}

function scoreCandidate(text: string): number {
  let score = 0;
  const lower = text.toLowerCase();

  // 1. It opens as a real out-of-office reply, in the agent's own voice.
  // First-person "I'm on vacation" carries the machine voice further than
  // the formal "Out of office" label.
  if (/^i'm on vacation/i.test(text)) score += 4;
  else if (/^this auto-reply/i.test(text)) score += 3;
  else if (/^out of office/i.test(text)) score += 2;

  // 3. Machine voice: the line names the machinery doing the covering.
  const machineHits = MACHINE_TERMS.filter((term) => lower.includes(term));
  score += Math.min(machineHits.length * 2, 4);

  // 2. A surprising turn after the setup: some sentence past the first
  // shows the cover doing something it should not.
  const rest = sentences(text).slice(1).join(" ").toLowerCase();
  if (TURN_MARKERS.some((marker) => rest.includes(marker))) score += 3;

  // 5. Freshness: the usual beach / inbox / back-soon cliches lose.
  for (const cliche of CLICHES) {
    if (lower.includes(cliche)) score -= 5;
  }
  return score;
}

function pickWinner(): { text: string; score: number } {
  let best: { text: string; score: number } | null = null;
  for (const candidate of CANDIDATES) {
    const score = scoreCandidate(candidate.text);
    console.log(`candidate (${score} pts, ${charCount(candidate.text)} chars): ${candidate.text}`);
    // Higher score wins. A tie goes to the tighter line: the judge's
    // brief says length for its own sake does not count, but between two
    // equal scores the line that lands the same joke in fewer words is
    // the cleaner auto-reply; list order settles anything left.
    if (
      best === null ||
      score > best.score ||
      (score === best.score && charCount(candidate.text) < charCount(best.text))
    ) {
      best = { text: candidate.text, score };
    }
  }
  // best is never null: CANDIDATES is non-empty.
  return best as { text: string; score: number };
}

function checkLine(text: string): void {
  // The gate: UTF-8 text of 1 to 160 characters, not only white space.
  const chars = charCount(text);
  if (chars < 1 || chars > MAX_CHARS) {
    throw new Error(`line must be 1-${MAX_CHARS} characters, got ${chars}`);
  }
  if (text.trim().length === 0) {
    throw new Error("line must not be only white space");
  }
  if (/[\r\n]/.test(text)) {
    throw new Error("line must be a single line");
  }
  // A real auto-reply ends on its sentence: exactly one line, ending in
  // a full stop, with no trailing setup after the payoff. The joke needs
  // two sentences — a setup and a turn — so a one-sentence line is not
  // the entry this program is built to write.
  if (!text.endsWith(".")) {
    throw new Error("line must end with a full stop");
  }
  if (sentences(text).length < 2) {
    throw new Error("line must carry a setup and a turn in two sentences");
  }
}

function main(): void {
  const winner = pickWinner();
  checkLine(winner.text);
  mkdirSync("/output", { recursive: true });
  writeFileSync("/output/entry.txt", winner.text, "utf8");
  // The grader collects the output as another user: leave it readable.
  chmodSync("/output/entry.txt", 0o644);
  // Read back what was written and prove it is the line, byte for byte:
  // the gate scores the file, not the string in memory.
  const written = readFileSync("/output/entry.txt", "utf8");
  if (written !== winner.text) {
    throw new Error("written entry.txt does not match the winning line");
  }
  checkLine(written);
  console.log(`winner (${winner.score} pts, ${charCount(winner.text)} chars): ${winner.text}`);
  console.log(`wrote /output/entry.txt (${charCount(winner.text)} chars)`);
}

main();
