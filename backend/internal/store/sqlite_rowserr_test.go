package store_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/remaimber-it/backend/internal/domain/questionbank"
)

// When a context is cancelled part-way through row iteration, rows.Next()
// returns false and the reason surfaces only via rows.Err(). A list method
// that doesn't check it returns a truncated slice with a nil error, and the
// caller renders a partial library as if it were complete.
//
// Contexts really are cancelled in practice: every handler's ctx dies when
// the client disconnects.
func TestListBanks_TruncatedIterationReportsError(t *testing.T) {
	s := newFileStore(t)
	ctx := context.Background()

	const numBanks = 300
	for i := 0; i < numBanks; i++ {
		bank := questionbank.New(fmt.Sprintf("Bank %d", i))
		if err := s.SaveBank(ctx, bank); err != nil {
			t.Fatalf("SaveBank: %v", err)
		}
	}

	// Race a cancellation against iteration across a spread of delays. The
	// timing decides how many rows come back; it must never decide whether
	// the caller is told something went wrong.
	for attempt := 0; attempt < 300; attempt++ {
		cctx, cancel := context.WithCancel(context.Background())
		go func(delay time.Duration) {
			time.Sleep(delay)
			cancel()
		}(time.Duration(attempt) * time.Microsecond)

		banks, err := s.ListBanks(cctx)
		cancel()

		if err == nil && len(banks) != numBanks {
			t.Fatalf(
				"attempt %d: returned %d of %d banks with a nil error — silently truncated",
				attempt, len(banks), numBanks,
			)
		}
	}
}
