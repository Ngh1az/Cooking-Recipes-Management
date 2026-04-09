"use client";

import { useEffect, useState } from "react";

type TypingEffectProps = {
  words: string[];
  className?: string;
};

export default function TypingEffect({ words, className }: TypingEffectProps) {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!words.length) {
      return;
    }

    const currentWord = words[wordIndex % words.length];
    const doneTyping = text === currentWord;
    const doneDeleting = text === "";

    let delay = isDeleting ? 40 : 90;

    if (!isDeleting && doneTyping) {
      delay = 1100;
    }

    const timer = setTimeout(() => {
      if (!isDeleting && doneTyping) {
        setIsDeleting(true);
        return;
      }

      if (isDeleting && doneDeleting) {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % words.length);
        return;
      }

      setText((prev) => {
        if (isDeleting) {
          return prev.slice(0, -1);
        }

        return currentWord.slice(0, prev.length + 1);
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [isDeleting, text, wordIndex, words]);

  return (
    <span className={className}>
      {text}
      <span className="ml-1 inline-block h-[1em] w-[2px] animate-pulse bg-current align-[-0.12em]" />
    </span>
  );
}
