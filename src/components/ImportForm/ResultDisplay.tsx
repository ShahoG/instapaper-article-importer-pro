
import React from "react";
import { ImportResult } from "@/types";
import { CardFooter } from "@/components/ui/card";

interface ResultDisplayProps {
  result: ImportResult | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  if (!result) return null;

  return (
    <CardFooter>
      <div className={`w-full p-3 rounded-md text-sm ${
        result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
      }`}>
        <p>{result.message}</p>
        {result.success && result.importedCount && (
          <p className="mt-1">Successfully imported {result.importedCount} articles.</p>
        )}
      </div>
    </CardFooter>
  );
};

export default ResultDisplay;
