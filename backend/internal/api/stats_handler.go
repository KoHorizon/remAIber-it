package api

import "net/http"

type OverallStatsResponse struct {
	Mastery int `json:"mastery" example:"64"`
}

// getOverallStats returns the aggregate mastery across every question.
// @Summary      Get overall stats
// @Description  Returns the aggregate mastery score across all questions in the library. Unanswered questions count as zero.
// @Tags         Stats
// @Produce      json
// @Success      200  {object}  OverallStatsResponse
// @Failure      500  {object}  map[string]string
// @Router       /stats [get]
func (h *Handler) getOverallStats(w http.ResponseWriter, r *http.Request) {
	mastery, err := h.store.GetOverallMastery(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch overall mastery")
		return
	}
	respondJSON(w, http.StatusOK, OverallStatsResponse{Mastery: mastery})
}
