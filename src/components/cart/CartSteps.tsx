
import { type CartStep } from "./CartDrawer";
import { Check } from "lucide-react";

interface CartStepsProps {
  currentStep: CartStep;
}

const CartSteps = ({ currentStep }: CartStepsProps) => {
  const steps = [
    { id: "products", label: "Produits" },
    { id: "thresholds", label: "Avantages" },
    { id: "summary", label: "Résumé" },
    { id: "checkout", label: "Paiement" },
  ] as const;

  const getCurrentStepIndex = () => steps.findIndex((step) => step.id === currentStep);

  return (
    <div className="relative">
      <div className="absolute top-4 w-full h-0.5 bg-gray-200">
        <div
          className="absolute h-full bg-ocean transition-all duration-500 ease-in-out"
          style={{
            width: `${((getCurrentStepIndex() + 1) / steps.length) * 100}%`,
          }}
        />
      </div>

      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = getCurrentStepIndex() > index;

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                isActive || isCompleted ? "text-ocean" : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-colors duration-200 ${
                  isActive || isCompleted
                    ? "bg-ocean text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="text-sm font-medium">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CartSteps;
