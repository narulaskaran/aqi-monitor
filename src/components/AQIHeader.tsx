import React from "react";
import { AQIIcon } from "./AQIIcon";

export const AQIHeader: React.FC = () => {
  return (
    <div className="app-brand">
      <AQIIcon className="app-brand-icon" />
      <span>AQI Monitor</span>
    </div>
  );
};
