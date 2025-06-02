import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  onChange, 
  size = 20, 
  readonly = false 
}) => {
  const [hoverRating, setHoverRating] = React.useState(0);

  const handleMouseEnter = (index: number) => {
    if (readonly) return;
    setHoverRating(index);
  };

  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverRating(0);
  };

  const handleClick = (index: number) => {
    if (readonly || !onChange) return;
    onChange(index);
  };

  return (
    <div className="flex mb-4">
      {[1, 2, 3, 4, 5].map((index) => (
        <div
          key={index}
          onMouseEnter={() => handleMouseEnter(index)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick(index)}
          className={`cursor-${readonly ? 'default' : 'pointer'} transition-colors`}
        >
          <svg
            className={`w-${size} h-${size} transition-colors ${
              index <= (hoverRating || rating)
                ? 'text-[#0074b3] fill-[#0074b3]'
                : 'text-gray-300'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969.045 1.371 1.23 0.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.784-.57-1.838.197-1.539 1.118l1.07 3.292a1 1 0 00.95.69l3.462.48c.96.14 1.365 1.323.588 1.802l-2.8 2.034a1 1 0 00-.363 1.118l1.07 3.293c.3.921.756 1.689 1.54 1.12l2.8-2.034a1 1 0 00.363-1.12l1.07-3.293c.784-1.689.193-2.874-1.546-3.355l-3.46-1.03z" />
          </svg>
        </div>
      ))}
    </div>
  );
};

export default StarRating;
