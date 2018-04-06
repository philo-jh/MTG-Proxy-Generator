////////////////////////////////////////////////////////
//  Constant Values & Application State:
////////////////////////////////////////////////////////

const MODES = {
  DISCLAIMER : "disclaimer",
  EDIT : "edit",
  REVIEW : "review"
}

const SCRYFALL_SEARCH_URL = "https://api.scryfall.com/cards/named";

let STATE = {
  mode : MODES.DISCLAIMER,
  deckList : null
}

function setState(stateFunction) {
  STATE = stateFunction(STATE);
  renderAppliction(STATE);
}

function renderAppliction(state) {
  
  if(state.mode === MODES.DISCLAIMER) {
    showDisclaimer();
    
    $(".accept-terms").click(function() {
      setState(oldState => {
        oldState.mode = MODES.EDIT;
        return oldState;
      });
    });
  } 
  
  else if(state.mode === MODES.EDIT) {
    showEditScreen();
    
    $(".js-generate-button").click(function(event) {
      event.preventDefault();
      
      //generate a list of query...
      queryList = generateQueryList($(".js-queryList").val().split("\n"));
      console.log("Initial queryList:");
      console.log(queryList);
      
      //set the loading counter for total queries
      $("#total-queries").html(queryList.length);
      
      let completedRequests = 0;
      showReviewScreen();
      
      STATE.deckList = [];
      
      for(let i=0; i < queryList.length; i++) {
        //query ScryFall for CURRENT card
        getDataFromScryFall(queryList[i], function(data) {
          console.log(`Querying ScryFall, i=${i}, card=${queryList[i].name}`);

          const card = {}

          card.name = data.name;
          card.set = data.set_name;
          card.displayOrder = i;

          //update card images:
          if(data.layout === "transform") {

              console.log(`Encountered double-faced card: ${card.name}`);

              card.cardImage = (data.card_faces[0].image_uris) ? data.card_faces[0].image_uris.border_crop : "http://via.placeholder.com/224x317";

              card.cardImage2 = (data.card_faces[1].image_uris) ? data.card_faces[1].image_uris.border_crop : "http://via.placeholder.com/224x317";

          } else {

            console.log(`Updating card image: ${card.name}`);

            card.cardImage = (data.image_uris) ? data.image_uris.border_crop : "http://via.placeholder.com/224x317";

          }

          console.log("Completed requests: " + ++completedRequests);
          $("#current-query").html(completedRequests);
          card.needsRerender = true;

          //push the cards into the deckList:
          for(let j =0; j < queryList[i].quantity; j++) {
            const myTempCard = $.extend(true, {}, card);
            STATE.deckList.push(myTempCard);
          }

          if(completedRequests === queryList.length) {
            renderAppliction(STATE);
          }
        });
      }
      
      console.log("Setting state MODE to REVIEW");
      STATE.mode = MODES.REVIEW;
    });
    
  } else if(state.mode === MODES.REVIEW) {
    
    $("#loading-stuff").remove();
    
    const sortedDeckList = STATE.deckList.sort(function(card1, card2) {
      return card1.displayOrder - card2.displayOrder;
    });
    
    buildSpoiler(sortedDeckList);
    console.log(STATE.deckList);
  } 
  
  else {
    throw new Error("Invalid Mode");
  }
  
}

////////////////////////////////////////////////////////
//  Utility Functions:
////////////////////////////////////////////////////////

function buildSpoiler(deckList) {
  
  for(let i = 0; i < deckList.length; i++) {
    let div = $(`.js-results > div:nth-child(${i + 1})`);
    if(div.length === 0) {
      $(".js-results").append(`<div class="card-div"></div>`);
      div = $(`.js-results > div:nth-child(${i + 1})`);
    }
    
    if(deckList[i].needsRerender) {
      div.append(`<div class="card-face-div"><img src="${deckList[i].cardImage}" /></div>`);
      
      if(deckList[i].cardImage2) {
        div.append(`<div class="card-face-div"><img src="${deckList[i].cardImage2}" /></div>`);
      }
      
      deckList[i].needsRerender = false;
    }
  }
}

function generateQueryList(arr) {
  
  const queryList = [];
  
  for(let i = 0; i < arr.length; i++) {
    
    const cardName = arr[i].replace(/[0-9]/g, '').trim().toLowerCase();
    
    if(!(cardName === "")) {
      
      queryList.push({
        name : cardName,
        quantity : checkQuantity(arr[i])
      });
    }
  }
  
  for(let i = 0; i < queryList.length; i++) {
    
    const currentCard = queryList[i];
    
    for(let j = i+1; j < queryList.length; j++) {
      
      let nextCard = queryList[j];
      
      while((j < queryList.length) && (currentCard.name === nextCard.name)) {
        currentCard.quantity += nextCard.quantity;
        queryList.splice(j, 1);
        nextCard = queryList[j];
      }
    }
  }
  
  return queryList;
}

function checkQuantity(input) {
  input = parseInt(input);
  if(isNaN(input)) {
    return 1;
  } else {
    return input;
  }
}

function getDataFromScryFall(card, callback) {
  const query = {
    fuzzy : card.name
  }
  
  $.getJSON(SCRYFALL_SEARCH_URL, query, callback).fail(function() {
    callback({name : card.name});
  });
}

function showDisclaimer() {
  $(".disclaimer").prop('hidden', false);
  $(".js-input-section").prop('hidden', true);
  $(".js-results").prop('hidden', true);
}

function showEditScreen() {
  $(".disclaimer").prop('hidden', true);
  $(".js-input-section").prop('hidden', false);
  $(".js-results").prop('hidden', true);
}

function showReviewScreen() {
  $(".disclaimer").prop('hidden', true);
  $(".js-input-section").prop('hidden', true);
  $(".js-results").prop('hidden', false);
}


$(function() {
  renderAppliction(STATE);
});