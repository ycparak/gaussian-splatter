"use client";

import { motion } from "motion/react";

const infoTransition = {
  type: "spring",
  bounce: 0.16,
  duration: 1.15,
} as const;

export default function InfoPanel() {
  return (
    <motion.div
      key="info-panel"
      initial={{ opacity: 0, scale: 0.94, filter: "blur(16px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
      transition={infoTransition}
      className="pointer-events-auto fixed inset-0 z-10 flex items-center justify-center px-6 text-center"
    >
      <p className="max-w-[256px] text-xs leading-4 font-semibold text-neutral-400">
        An open source, in-browser, particle generator that takes an image and
        outputs a gaussian splat using Apple's ML SHARP. Built with love, by{" "}
        <a
          href="https://yusufparak.com"
          target="_blank"
          rel="noreferrer"
          className="text-neutral-300 transition-colors hover:text-white"
        >
          Yusuf Parak
        </a>
        .
      </p>
    </motion.div>
  );
}
