import { useState } from "react";

import { SegmentedControl } from "./SegmentedControl";
import { getTheme, setTheme, type Theme } from "./theme";

// Light / Dark / Auto switcher, built on the existing SegmentedControl (React
// Aria). "Auto" = follow the OS. setTheme persists + applies immediately.
export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(getTheme);
  return (
    <SegmentedControl<Theme>
      aria-label="Theme"
      selectedKey={theme}
      onSelectionChange={(t) => {
        setTheme(t);
        setThemeState(t);
      }}
      items={[
        { id: "light", label: "Light" },
        { id: "dark", label: "Dark" },
        { id: "system", label: "Auto" },
      ]}
    />
  );
}
