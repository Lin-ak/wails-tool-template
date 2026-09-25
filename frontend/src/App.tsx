import { ExamplePage } from "./features/example/ExamplePage";

export function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-3">
        <div className="mx-auto flex max-w-2xl items-center">
          <h1 className="m-0 font-medium text-base text-foreground">
            wails-tool-template
          </h1>
        </div>
      </header>
      <ExamplePage />
    </div>
  );
}
