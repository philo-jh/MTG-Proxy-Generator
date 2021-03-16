const MODES = {
  DISCLAIMER : "disclaimer",
  EDIT : "edit",
  REVIEW : "review"
}

const SCRYFALL_SEARCH_URL = "https://api.scryfall.com/cards/";

const syntaxText = `Black Lotus (single card)
4 Counterspell (creates 4 cards)
Shatterskull Smashing (creates a card for each face)
Jace, Vryn's Prodigy -checklist (creates a single 'checklist' style card enabled by the -checklist or -cl flag)
LEB/233 -code (finds card #233 in Limeted Edition Beta, enabled by the -code or -cd flag)`;