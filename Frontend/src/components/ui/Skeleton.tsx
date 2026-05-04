import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200/60 dark:bg-gray-800/60 ${className || ""}`}
      {...props}
    />
  );
}
