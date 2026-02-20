package cli

import (
	"fmt"
	"path/filepath"

	"github.com/philipbankier/autoclaw/pkg/cron"
)

// SetupDriftCronJob registers a recurring drift detection job with the cron service.
// The schedule parameter is a cron expression (e.g. "0 3 * * 0" for weekly Sunday 3 AM).
func SetupDriftCronJob(cronStorePath, tastekitDir, schedule string) error {
	if schedule == "" {
		return fmt.Errorf("schedule is required (e.g. '0 3 * * 0' for weekly)")
	}

	cs := cron.NewCronService(cronStorePath, nil)

	_, err := cs.AddJob(
		"drift-detect",
		cron.CronSchedule{
			Kind: "cron",
			Expr: schedule,
		},
		"Run drift detection on TasteKit trace events",
		false, // don't deliver to channel
		"",    // no channel
		"",    // no recipient
	)
	if err != nil {
		return fmt.Errorf("add cron job: %w", err)
	}

	fmt.Printf("Drift detection cron job registered.\n")
	fmt.Printf("  Schedule: %s\n", schedule)
	fmt.Printf("  Artifacts: %s\n", tastekitDir)
	fmt.Printf("  Store: %s\n", filepath.Dir(cronStorePath))
	return nil
}

// IsDriftDetectJob checks if a cron job is a drift-detect command job.
func IsDriftDetectJob(job *cron.CronJob) bool {
	return job.Name == "drift-detect"
}
