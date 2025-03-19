
import React, { useState } from 'react';
import { useEditStore } from '@/stores/useEditStore';

interface EditableContentProps {
  children: React.ReactNode;
  onEdit?: () => void;
}

const EditableContent: React.FC<EditableContentProps> = ({ children, onEdit }) => {
  const { isEditMode } = useEditStore();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative ${isEditMode ? 'cursor-pointer hover:bg-blue-50 hover:ring-2 hover:ring-blue-200 transition-colors rounded' : ''}`}
      onMouseEnter={() => isEditMode && setIsHovered(true)}
      onMouseLeave={() => isEditMode && setIsHovered(false)}
      onClick={() => isEditMode && onEdit && onEdit()}
    >
      {children}
      {isEditMode && isHovered && (
        <div className="absolute top-0 right-0 bg-blue-500 text-white p-1 text-xs rounded-bl">
          Modifier
        </div>
      )}
    </div>
  );
};

export default EditableContent;
