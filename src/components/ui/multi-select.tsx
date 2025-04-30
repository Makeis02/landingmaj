import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type Option = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: Option[];
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = "Sélectionner...",
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Gérer la sélection/désélection
  const handleOptionClick = (optionValue: string) => {
    const newValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((value) => value !== optionValue)
      : [...selectedValues, optionValue];
    
    onChange(newValues);
  };

  // Supprimer un tag
  const handleRemoveTag = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    onChange(selectedValues.filter((value) => value !== optionValue));
  };

  // Récupérer les objets Option pour les valeurs sélectionnées
  const selectedOptions = options.filter((option) => 
    selectedValues.includes(option.value)
  );

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Bouton pour ouvrir/fermer le dropdown */}
      <div
        className="flex items-center justify-between w-full p-2 text-sm border rounded cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 max-w-[90%]">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 text-gray-800"
              >
                {option.label}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={(e) => handleRemoveTag(e, option.value)}
                />
              </span>
            ))
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 ml-2" />
      </div>

      {/* Liste des options */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option.value}
              className={cn(
                "flex items-center justify-between p-2 cursor-pointer hover:bg-gray-100",
                selectedValues.includes(option.value) && "bg-blue-50"
              )}
              onClick={() => handleOptionClick(option.value)}
            >
              <span>{option.label}</span>
              {selectedValues.includes(option.value) && (
                <Check className="w-4 h-4 text-blue-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 