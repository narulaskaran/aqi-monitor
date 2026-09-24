import React from "react";

interface KofiButtonProps {
  className?: string;
}

export const KofiButton: React.FC<KofiButtonProps> = ({ className }) => {
  return (
    <div className={className}>
      <a
        href="https://ko-fi.com/Y8Y21CC8IA"
        target="_blank"
        rel="noopener noreferrer"
        className="kofi-link"
      >
        <span aria-hidden="true" className="kofi-link-mark">
          ♥
        </span>
        <span>Support this project</span>
      </a>
    </div>
  );
};
