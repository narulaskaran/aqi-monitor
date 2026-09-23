import React from "react";
import { AQIIcon } from "./AQIIcon";

export const AQIHeader: React.FC = () => {
  return (
    <div className="cloud-brand" aria-label="AQI Monitor">
      <span className="cloud-mark">
        <AQIIcon />
      </span>
      <span>AQI Monitor</span>
    </div>
  );
};
