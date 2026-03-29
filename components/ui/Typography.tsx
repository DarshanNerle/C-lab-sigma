import * as React from "react";

export function H1({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={`scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl font-heading ${className || ""}`}
      {...props}
    >
      {children}
    </h1>
  );
}

export function H2({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={`scroll-m-20 border-b border-lab-border pb-2 text-3xl font-semibold tracking-tight transition-colors font-heading ${className || ""}`}
      {...props}
    >
      {children}
    </h2>
  );
}

export function H3({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`scroll-m-20 text-2xl font-semibold tracking-tight font-heading ${className || ""}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function P({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`leading-7 [&:not(:first-child)]:mt-6 font-sans text-gray-300 ${className || ""}`}
      {...props}
    >
      {children}
    </p>
  );
}

export function Code({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      className={`relative rounded bg-lab-highlight border border-lab-border px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-brand-teal ${className || ""}`}
      {...props}
    >
      {children}
    </code>
  );
}
