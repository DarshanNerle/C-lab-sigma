import * as React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-lab-border bg-lab-card text-white shadow-xl backdrop-blur-md ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-2xl font-bold font-heading leading-none tracking-tight ${className}`}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={`p-6 pt-0 font-sans ${className}`} {...props} />;
}
