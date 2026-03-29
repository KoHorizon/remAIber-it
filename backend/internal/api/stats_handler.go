package api

import "net/http"

type OverallStatsResponse struct {
	Mastery int `json:"mastery"`
}

func (h *Handler) getOverallStats(w http.ResponseWriter, r *http.Request) {
	mastery, err := h.store.GetOverallMastery(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch overall mastery")
		return
	}
	respondJSON(w, http.StatusOK, OverallStatsResponse{Mastery: mastery})
}
