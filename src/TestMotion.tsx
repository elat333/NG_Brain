import React from 'react';
import { motion } from 'motion/react';

export default function TestMotion() {
  return <motion.div animate={{ x: 100 }} className="w-10 h-10 bg-red-500" />;
}
