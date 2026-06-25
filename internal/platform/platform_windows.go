//go:build windows

package platform

import (
	"os/exec"
	"syscall"
)

// ConfigureHiddenCommandWindow hides the console window of a child process so
// shelling out to a CLI does not flash a black window on the desktop.
func ConfigureHiddenCommandWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}
