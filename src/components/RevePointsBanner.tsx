import { Sparkles } from "lucide-react";

export default function RevePointsBanner() {
  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 rounded-xl px-4 py-3 shadow mb-6">
      <div className="bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full p-2 shadow">
        <Sparkles className="h-7 w-7 text-yellow-700" />
      </div>
      <div>
        <div className="font-bold text-lg text-blue-900 tracking-wide">Rêve Points</div>
        <div className="text-sm text-blue-700 font-semibold">À venir&nbsp;: programme de fidélité exclusif !</div>
      </div>
    </div>
  );
} 