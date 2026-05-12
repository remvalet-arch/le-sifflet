"use client";

import { useState } from "react";

type Props = {
  fullName: string;
  maxLength?: number;
  className?: string;
};

export function UserName({ fullName, maxLength = 14, className = "" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isTruncated = fullName.length > maxLength;
  const display =
    isTruncated && !expanded ? `${fullName.slice(0, maxLength)}…` : fullName;

  if (!isTruncated) {
    return <span className={className}>{fullName}</span>;
  }

  return (
    <button
      type="button"
      title={fullName}
      onClick={() => setExpanded((v) => !v)}
      className={`cursor-pointer text-left ${className}`}
    >
      {display}
    </button>
  );
}
