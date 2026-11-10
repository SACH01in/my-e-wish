"use client";

import { useState } from "react";
import type { SurpriseBlock } from "@/lib/types";

type Props = {
  blocks: SurpriseBlock[];
  slug?: string;
};

/**
 * Renders each surprise as a small, isolated interaction so templates can
 * share the same content blocks without duplicating interaction logic.
 */
export default function SurpriseBlocks({ blocks, slug }: Props) {
  return (
    <div className="surprise-list">
      {blocks.map((block) => <SurpriseBlockView block={block} slug={slug} key={block.id} />)}
    </div>
  );
}

function SurpriseBlockView({ block, slug }: { block: SurpriseBlock; slug?: string }) {
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState("");
  const [checking, setChecking] = useState(false);

  async function checkAnswer() {
    if (!answer.trim() || checking) return;
    if (!slug) {
      setResult("This game is available on its published page.");
      return;
    }
    setChecking(true);
    try {
      const response = await fetch(`/api/public/${encodeURIComponent(slug)}/unlock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: block.id, answer }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Your answer could not be checked.");
      setResult(payload.correct ? payload.message || "You got it!" : `Not quite! ${payload.hint ? `A little hint: ${payload.hint}` : "Have another think and try again."}`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Your answer could not be checked.");
    } finally {
      setChecking(false);
    }
  }

  if (block.kind === "quote") {
    return (
      <figure className="surprise-quote">
        <span className="surprise-kind">A THOUGHT FOR YOU</span>
        <blockquote>“{block.body}”</blockquote>
        {block.title && <figcaption>— {block.title}</figcaption>}
      </figure>
    );
  }

  if (block.kind === "question") {
    return (
      <section className="surprise-game">
        <span className="surprise-kind">A TINY MEMORY GAME</span>
        <h3>{block.title}</h3>
        {result ? (
          <div className={`game-result${result.startsWith("Not quite!") ? "" : " game-correct"}`}>{result}</div>
        ) : (
          <div className="game-form">
            {block.hint && <p className="game-hint">Hint: {block.hint}</p>}
            <label className="sr-only" htmlFor={`answer-${block.id}`}>Your answer</label>
            <input
              id={`answer-${block.id}`}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void checkAnswer();
                }
              }}
              placeholder="Type your answer…"
              maxLength={160}
              required
            />
            <button type="button" suppressHydrationWarning onClick={() => void checkAnswer()} disabled={checking || !answer.trim()}>{checking ? "Checking…" : "Check my answer ↗"}</button>
          </div>
        )}
        {result && result.startsWith("Not quite!") && <button className="game-retry" suppressHydrationWarning onClick={() => setResult("")}>Try once more</button>}
      </section>
    );
  }

  if (block.kind === "memory") {
    return (
      <figure className="surprise-memory">
        {block.body && <img src={block.body} alt={block.title || "A shared memory"} />}
        {block.title && <figcaption>{block.title}</figcaption>}
      </figure>
    );
  }

  return (
    <section className="surprise-note">
      {revealed ? (
        <div className="secret-reveal">
          <span>✦ A LITTLE SECRET, JUST FOR YOU ✦</span>
          <p>{block.body}</p>
        </div>
      ) : (
        <span className="surprise-action-wrap">
          <button className="reveal-button" suppressHydrationWarning onClick={() => setRevealed(true)}>
            {block.title || "There’s one more thing…"} <span aria-hidden="true">↗</span>
          </button>
        </span>
      )}
    </section>
  );
}
