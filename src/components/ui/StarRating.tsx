
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
          <Star
            size={size}
            className={`${
              index <= (hoverRating || rating)
                ? 'text-blue-500 fill-blue-500'
                : 'text-gray-300'
            } transition-colors`}
          />
        </div>
      ))}
    </div>
  );
};

export default StarRating;
