import { Panel } from "../../shared/Panel";
import { ApplyOperation } from "./ApplyOperation";
import { ExampleForm } from "./ExampleForm";

export function ExamplePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <Panel title="Safe write (plan → confirm → apply → verify)">
        <ExampleForm />
      </Panel>
      <Panel title="Multi-step apply (progress + cancel)">
        <ApplyOperation />
      </Panel>
    </div>
  );
}
