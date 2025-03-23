import React from "react";
import { AQIIcon } from "./AQIIcon";

export const AQIHeader: React.FC = () => {
  return (
    <div className="flex items-center gap-2 mb-4">
      <AQIIcon className="w-8 h-8" />
      <h1 className="text-2xl font-bold">AQI Monitor</h1>
    </div>
  );
};
