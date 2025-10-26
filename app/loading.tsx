"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative w-20 h-20">
          <Image
            src="/BelachainLogo.jpg"
            alt="Belachain"
            width={80}
            height={80}
            className="w-full h-full object-contain drop-shadow-2xl"
          />
        </div>

        <div className="flex gap-2">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                delay: index * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
