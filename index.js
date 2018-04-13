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
      const totalRequests = queryList.length;
      
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
          card.alternateImages = null;
          card.editMode = false;
          card.printsUri = data.prints_search_uri;

          //update card images:
          if(data.layout === "transform") {

              console.log(`Encountered double-faced card: ${card.name}`);
            
              card.cardFaces = 2;

              card.cardImage = (data.card_faces[0].image_uris) ? data.card_faces[0].image_uris.border_crop : "http://via.placeholder.com/224x317";

              card.cardImage2 = (data.card_faces[1].image_uris) ? data.card_faces[1].image_uris.border_crop : "http://via.placeholder.com/224x317";

          } else {

            console.log(`Updating card image: ${card.name}`);
            
            card.cardFaces = 1;

            card.cardImage = (data.image_uris) ? data.image_uris.border_crop : "http://via.placeholder.com/224x317";

          }

          console.log("Completed requests: " + ++completedRequests);
          
          let percentageComplete = (completedRequests / totalRequests) * 100;
          
          $(".progress-bar").css("width", `${percentageComplete}%`).attr("aria-valuenow", `${percentageComplete}`);
          
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
    $(".progress-container").remove();
    
    const sortedDeckList = STATE.deckList.sort(function(card1, card2) {
      return card1.displayOrder - card2.displayOrder;
    });
    
    buildSpoiler(sortedDeckList);
    console.log(STATE.deckList);
  
  } else {
    throw new Error("Invalid Mode");
  }
  
}

////////////////////////////////////////////////////////
//  Utility Functions:
////////////////////////////////////////////////////////

function buildSpoiler(deckList) {
  
  for(let i = 0; i < deckList.length; i++) {
    
    const card = deckList[i];
    
    let cardFaceDivs = $(`*[data-card="${card.name}-${i}"]`);
    
    let cardFaceDiv1, cardFaceDiv2;
    
    if(cardFaceDivs.length === 0) {
      
      cardFaceDiv1 = $();
      
      $(".js-results").append(`
        <div class="card-face-div col-6 col-sm-4 col-md-3 col-lg-2" data-card="${card.name}-${i}">
        </div>
      `);
      
      if(card.cardImage2) {
        $(".js-results").append(`
        <div class="card-face-div col-6 col-sm-4 col-md-3 col-lg-2" data-card="${card.name}-${i}">
        </div>
      `);
        
      
      }
      
      cardFaceDivs = $(`*[data-card="${card.name}-${i}"]`);
      
    }
      
      cardFaceDiv1 = $(cardFaceDivs[0]);
      
      if(cardFaceDivs.length > 1) {
        cardFaceDiv2 = $(cardFaceDivs[1]);
      }
    
    
    
    if(card.needsRerender) {
      const divHTML = `
          <div class="card-overlay d-print-none">

            ${(card.editMode) ? `<span class="set-name badge badge-dark">${card.set}</span>` : ""}

            ${(card.editMode) ? `<button class="done-button btn btn-outline-light btn-sm">Done</button>` : ""}
            
            ${(card.editMode) ? `<button class="prev-button btn btn-dark btn-sm"> < </button>` : ""}

            ${(card.editMode) ? `<span class="badge badge-dark image-counter"><span class="image-counter-current">${card.alternateImages.map(item => item.cardImage).indexOf(card.cardImage) + 1}</span> / <span class="image-counter-total">${card.alternateImages.length}</span></span>` : `<button class="edit-button btn btn-outline-light btn-sm">Edit</button>`}

            ${(card.editMode) ? `<button class="next-button btn btn-dark btn-sm"> > </button>` : ""}
          </div>

          <img src="${card.cardImage}" />`
      
      cardFaceDiv1.html(divHTML);
      
      if(card.cardImage2) {
        const div2html = `<img src="${card.cardImage2}" />`;
        
        cardFaceDiv2.html(div2html);
      }
      
      $(".edit-button", cardFaceDiv1).click(function() {
        card.editMode = true;
        
        if(!card.alternateImages) {
          $.getJSON(card.printsUri, null, function(resultData) {
            
            if(card.cardImage2) {
              
              card.alternateImages = resultData.data.map(function(item) {
                let alternateImage = {};
                alternateImage.cardImage = item.card_faces[0].image_uris.border_crop;
                alternateImage.cardImage2 = item.card_faces[1].image_uris.border_crop;
                alternateImage.set =  item.set_name;
                return alternateImage;
              });
              
            } else {
              
              card.alternateImages = resultData.data.map(function(item) {
                let alternateImage = {};
                alternateImage.cardImage = item.image_uris.border_crop;
                alternateImage.set =  item.set_name;
                return alternateImage;
              });
            }
            
            card.needsRerender = true;
            renderAppliction(STATE);
          });
          
        } else {
          
          card.needsRerender = true;
          renderAppliction(STATE);
        }
      });
      
      $(".done-button").click(function() {
        card.editMode = false;
        card.needsRerender = true;
        renderAppliction(STATE);
      });
      
      $(".next-button").click(function() {
        
        const indexOfCurrentImage = card.alternateImages.map(item => item.cardImage).indexOf(card.cardImage);
        
        const numAlternateImages = card.alternateImages.length;
        
        if(indexOfCurrentImage < numAlternateImages - 1) {
          
          card.cardImage = card.alternateImages[indexOfCurrentImage + 1].cardImage;
          
          card.set = card.alternateImages[indexOfCurrentImage + 1].set;
          
          if(card.cardImage2) {
            card.cardImage2 = card.alternateImages[indexOfCurrentImage + 1].cardImage2;
          }
          
          card.needsRerender = true;
          renderAppliction(STATE);
        }
      });
      
      $(".prev-button").click(function() {
        
        const indexOfCurrentImage = card.alternateImages.map(item => item.cardImage).indexOf(card.cardImage);
        
        if(indexOfCurrentImage > 0) {
          const prevImageURL = card.alternateImages[indexOfCurrentImage - 1].cardImage;
          
          card.cardImage = prevImageURL;
          card.set = card.alternateImages[indexOfCurrentImage - 1].set;
          
          
          if(card.cardImage2) {
            card.cardImage2 = card.alternateImages[indexOfCurrentImage - 1].cardImage2;
          }
          
          card.needsRerender = true;
          renderAppliction(STATE);
        }
      });
      
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
  $("footer").prop('hidden', false);
}

function showEditScreen() {
  $(".disclaimer").prop('hidden', true);
  $(".js-input-section").prop('hidden', false);
  $(".js-results").prop('hidden', true);
  $("footer").prop('hidden', true);
}

function showReviewScreen() {
  $(".disclaimer").prop('hidden', true);
  $(".js-input-section").prop('hidden', true);
  $(".js-results").prop('hidden', false);
  $("footer").prop('hidden', true);
}


$(function() {
  renderAppliction(STATE);
});