function getDataFromScryFall(card, callback) {
  const query = {
    fuzzy : card.name
  }
  
  $.getJSON(SCRYFALL_SEARCH_URL, query, callback).fail(function() {
    callback({name : card.name});
  });
}