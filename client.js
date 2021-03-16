function getDataFromScryFall(card, callback) {

  if(card.queryEndpoint === 'code') {
    $.get(SCRYFALL_SEARCH_URL + card.query,
      callback
    ).fail(function() {
      callback({name: card.query})
    })
  } else {
    $.getJSON(SCRYFALL_SEARCH_URL + card.queryEndpoint,
      { fuzzy: card.query },
      callback
    ).fail(function () {
      callback({ name: card.query });
    })
  }
}