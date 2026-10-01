"use client";

import React from "react";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-bg z-[9999] flex items-center justify-center p-8">
          <div className="max-w-2xl w-full border border-accent-red bg-bg-panel p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="led-indicator bg-accent-red text-accent-red" />
              <h1 className="font-pixel text-2xl text-accent-red tracking-widest">
                SYSTEM FAULT
              </h1>
            </div>
            <div className="border border-border bg-bg p-4 font-mono text-xs text-accent-red whitespace-pre-wrap max-h-80 overflow-auto">
              {this.state.error?.message}
              {"\n\n"}
              {this.state.error?.stack}
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 border border-accent-green text-accent-green font-mono text-xs uppercase hover:bg-accent-green hover:text-black transition-colors"
            >
              Attempt Recovery
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
