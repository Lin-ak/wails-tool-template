//go:build !windows

package platform

import "os/exec"

// ConfigureHiddenCommandWindow is a no-op on non-Windows platforms.
func ConfigureHiddenCommandWindow(_ *exec.Cmd) {}
