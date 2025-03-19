
import { motion, AnimatePresence } from "framer-motion";

interface ThresholdAnimationProps {
  threshold: number;
  isReached: boolean;
  message: string;
}

const ThresholdAnimation = ({ threshold, isReached, message }: ThresholdAnimationProps) => {
  if (!isReached) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border-2 border-blue-500 z-50"
      >
        <motion.div
          animate={{
            y: [0, -10, 0],
            transition: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          className="flex items-center gap-2"
        >
          <span role="img" aria-label="fish" className="text-2xl">
            🐠
          </span>
          <p className="font-medium text-blue-600">{message}</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ThresholdAnimation;
