
import React from "react";
import { ImportProgress } from "@/types";
import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  progress: ImportProgress;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ progress }) => {
  if (!progress) return null;

  return (
    <div className="mt-6 space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Importing articles...</span>
        <span>{progress.current}/{progress.total} articles</span>
      </div>
      <Progress value={progress.percentage} className="h-2" />
    </div>
  );
};

export default ProgressIndicator;
