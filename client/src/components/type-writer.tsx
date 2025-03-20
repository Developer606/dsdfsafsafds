import React, { useState, useEffect } from "react";

interface TypeWriterProps {
  text: string | string[];
  speed?: number;
  className?: string;
  delay?: number;
  loop?: boolean;
}

export function TypeWriter({
  text,
  speed = 50,
  className = "",
  delay = 1500,
  loop = true,
}: TypeWriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);
  const [textArrayIndex, setTextArrayIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const textArray = Array.isArray(text) ? text : [text];

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isPaused) {
      timeout = setTimeout(() => {
        setIsPaused(false);
        setIsTyping(false);
      }, delay);
      return () => clearTimeout(timeout);
    }

    if (isTyping) {
      if (index < textArray[textArrayIndex].length) {
        timeout = setTimeout(() => {
          setDisplayedText((prev) => prev + textArray[textArrayIndex][index]);
          setIndex(index + 1);
        }, speed);
      } else {
        setIsPaused(true);
      }
    } else {
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText((prev) => prev.slice(0, -1));
        }, speed / 2);
      } else {
        setIndex(0);
        setIsTyping(true);
        setTextArrayIndex((prev) =>
          loop
            ? (prev + 1) % textArray.length
            : Math.min(prev + 1, textArray.length - 1),
        );
      }
    }

    return () => clearTimeout(timeout);
  }, [
    index,
    textArrayIndex,
    isTyping,
    isPaused,
    displayedText,
    textArray,
    speed,
    delay,
    loop,
  ]);

  return <span className={className}>{displayedText}</span>;
}
