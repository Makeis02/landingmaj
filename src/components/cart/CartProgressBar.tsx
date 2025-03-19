
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

interface CartProgressBarProps {
  thresholds: any[];
  total: number;
  progress: number;
  remaining: number;
  firstThreshold?: { value: number; description: string; threshold_message?: string; success_message?: string; };
  maxValue: number;
}

const CartProgressBar = ({ 
  thresholds, 
  total, 
  progress, 
  remaining, 
  firstThreshold,
  maxValue 
}: CartProgressBarProps) => {
  const renderThresholdMarkers = () => {
    if (!thresholds) return null;
    
    return (
      <div className="relative w-full">
        {thresholds.map((threshold, index) => {
          const position = (threshold.value / maxValue) * 100;
          const isReached = total >= threshold.value;
          
          // Calculate spacing based on number of thresholds
          const spacing = 100 / (thresholds.length - 1);
          const positionClass = position <= spacing 
            ? 'translate-x-0' 
            : position >= (100 - spacing)
              ? '-translate-x-full'
              : '-translate-x-1/2';
          
          return (
            <div
              key={threshold.id}
              className={`absolute ${positionClass}`}
              style={{ 
                left: `${position}%`, 
                top: '-12px',
                minWidth: 'max-content',
                zIndex: isReached ? 2 : 1
              }}
            >
              <div className="flex flex-col items-center">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    isReached ? 'bg-green-500' : 'bg-gray-300'
                  } border-2 border-white`}
                />
                <span className="text-xs text-gray-600 mt-1 whitespace-nowrap px-1">
                  {threshold.value}€
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Trouve le dernier palier atteint
  const getLastReachedThreshold = () => {
    return [...thresholds]
      .sort((a, b) => b.value - a.value)
      .find(threshold => total >= threshold.value);
  };

  const formatThresholdMessage = (message: string, amount: number, description: string) => {
    return message
      .replace('{amount}', amount.toFixed(2))
      .replace('{description}', description);
  };

  return (
    <div className="mt-6 space-y-2">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-4"
        >
          <div className="text-sm text-center">
            {remaining > 0 ? (
              <span>
                {firstThreshold?.threshold_message ? 
                  formatThresholdMessage(
                    firstThreshold.threshold_message,
                    remaining,
                    firstThreshold.description
                  ) : 
                  `Plus que ${remaining.toFixed(2)}€ pour ${firstThreshold?.description}!`
                }
              </span>
            ) : (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <span>✨</span>
                <span>
                  {getLastReachedThreshold()?.success_message || "Livraison offerte !"}
                </span>
                <span>✨</span>
              </div>
            )}
          </div>

          <div className="relative pt-8 px-4">
            {renderThresholdMarkers()}
            <Progress value={progress} className="h-2" />
            <motion.div
              initial={{ left: "0%" }}
              animate={{ left: `${Math.min(progress, 100)}%` }}
              className="absolute transform -translate-x-1/2"
              style={{ top: '24px' }}
            >
              <motion.div
                animate={{
                  y: [0, -3, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="text-lg"
              >
                🐠
              </motion.div>
            </motion.div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center text-xs text-gray-500">
            {thresholds.map((threshold) => (
              <span 
                key={threshold.id}
                className={`px-2 py-1 rounded-full ${
                  total >= threshold.value 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100'
                }`}
              >
                {threshold.description}
              </span>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CartProgressBar;
