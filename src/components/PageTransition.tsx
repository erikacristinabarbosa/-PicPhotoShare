import React from 'react';
import { motion } from 'motion/react';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, filter: 'brightness(2) blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'none' }}
      exit={{ opacity: 0, scale: 1.05, filter: 'brightness(2) blur(10px)' }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}
