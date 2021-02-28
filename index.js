let STATE = {
  mode : MODES.DISCLAIMER,
  deckList : null
}

function setState(stateFunction) {
  STATE = stateFunction(STATE);
  renderApplication(STATE);
}

function renderApplication(state) {
  
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
    
    $(".js-queryList").attr("placeholder-x", 
`Enter a decklist here in MTGO format:\n\nHere's an example decklist:\n\n(Click 'Generate' to build this deck)\n\n` + sampleDecklist);
    
    $(".js-queryList").placeholder();
    
    showEditScreen();
    
    $(".js-generate-button").click(function(event) {
      event.preventDefault();
      
      if (!$.trim($(".js-queryList").val())) {
        $(".js-queryList").val(sampleDecklist);
      }
      
      $(".js-results").empty();
      addProgressBar();

      //generate a list of query...
      let queryList = generateQueryList($(".js-queryList").val().split("\n"));

      //set the loading counter for total queries
      const totalRequests = queryList.length;

      let completedRequests = 0;
      showReviewScreen();

      STATE.deckList = [];

      for(let i=0; i < queryList.length; i++) {
        //query ScryFall for CURRENT card
        getDataFromScryFall(queryList[i], function(data) {

          console.log("Scryfall data: ", data)

          const card = {}

          card.name = data.name;
          card.set = data.set_name;
          card.displayOrder = i;
          card.alternateImages = null;
          card.editMode = false;
          card.printsUri = data.prints_search_uri;

          console.log('card data: ', card)

          //update card images:
          if(data.card_faces.length === 2) {

              card.cardImage = (data.card_faces[0].image_uris) ? data.card_faces[0].image_uris.border_crop : ""

              card.cardImage2 = (data.card_faces[1].image_uris) ? data.card_faces[1].image_uris.border_crop : "";

          } else {

            card.cardImage = (data.image_uris) ? data.image_uris.border_crop : "";

          }

          completedRequests++;

          let percentageComplete = (completedRequests / totalRequests) * 100;

          $(".progress-bar").css("width", `${percentageComplete}%`).attr("aria-valuenow", `${percentageComplete}`);

          card.needsRerender = true;
          
          if(card.cardImage!=="") {
            //push the cards into the deckList:
            for(let j =0; j < queryList[i].quantity; j++) {
              const myTempCard = $.extend(true, {}, card);
              STATE.deckList.push(myTempCard);
            }
          } else {
            $(".js-results").prepend(`<div class="alert alert-danger alert-dismissible fade show col-12" role="alert">
              "${card.name}" could not be found. Try editing your list.
              <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>`);
          }
          
          if(completedRequests === queryList.length) {
            STATE.deckList = STATE.deckList.sort(function(card1, card2) {
              return card1.displayOrder - card2.displayOrder;
            });

            renderApplication(STATE);
          }
        });
      }
        
      STATE.mode = MODES.REVIEW;
      editReviewButtons();
    });
    
    $(".js-clear-button").click(function() {
      $(".js-queryList").val("");
      $(".js-queryList").scrollTop();
    });
    
    $(".js-review-button").click(function() {
      STATE.mode = MODES.REVIEW;
      renderApplication(STATE);
    });
    
  } else if(state.mode === MODES.REVIEW) {
    
    showReviewScreen();
    
    $(".progress-container").remove();
    
    buildSpoiler(STATE.deckList);
  
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
          <div class="card-overlay d-print-none ${(card.editMode) ? `edit-mode` : ""}">

            ${(card.editMode) ? `<span class="set-name badge badge-dark">${card.set}</span>` : ""}

            ${(card.editMode) ? `<button class="done-button btn btn-outline-light btn-sm">Done</button>` : ""}
            
            ${(card.editMode) ? `<button class="prev-button btn btn-dark btn-sm"> < </button>` : ""}

            ${(card.editMode) ? `<span class="badge badge-dark image-counter"><span class="image-counter-current">${card.alternateImages.map(item => item.cardImage).indexOf(card.cardImage) + 1}</span> / <span class="image-counter-total">${card.alternateImages.length}</span></span>` : `<button class="edit-button btn btn-outline-light btn-sm">Edit</button>`}

            ${(card.editMode) ? `<button class="next-button btn btn-dark btn-sm"> > </button>` : ""}
          </div>

          <img src="${card.cardImage}" alt="${card.name}" />`
      
      cardFaceDiv1.html(divHTML);
      
      if(card.cardImage2) {
        const div2html = `<img src="${card.cardImage2}" alt="${card.name}" />`;
        
        cardFaceDiv2.html(div2html);
      }
      
      $(".edit-button", cardFaceDiv1).click(function() {
        card.editMode = true; 
        
        $(this).parent().css("opacity", "1");
        
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
              
              card.needsRerender = true;
              renderApplication(STATE);
              
            } else {
              
              card.alternateImages = resultData.data.map(function(item) {
                let alternateImage = {};
                alternateImage.cardImage = item.image_uris.border_crop;
                alternateImage.set =  item.set_name;
                return alternateImage;
              });
              
              card.needsRerender = true;
              renderApplication(STATE);
            }
          });
          
        } else {
          
          card.needsRerender = true;
          renderApplication(STATE);
        }
      });
      
      $(".done-button").click(function() {
        card.editMode = false;
        card.needsRerender = true;
        renderApplication(STATE);
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
          renderApplication(STATE);
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
          renderApplication(STATE);
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

function editReviewButtons() {
  $(".edit-review").html(`
    <div class="btn-group btn-group-toggle" data-toggle="buttons" role="radiogroup" aria-label="navigate">
      <label class="btn btn-warning js-edit-button">
        <input type="radio" name="options" id="option1" autocomplete="off" aria-label="edit" checked> Edit
      </label>
      <label class="btn btn-info active js-review-button">
        <input type="radio" name="options" id="option3" autocomplete="off" aria-label="review" checked> Review
      </label>
    </div>
  `);
  
  $(".js-edit-button").click(function() {
    $().addClass("focus");
    $(".js-review-button").removeClass("focus");
    showEditScreen();
  });
  
  $(".js-review-button").click(function() {
    $().addClass("focus");
    $(".js-edit-button").removeClass("focus");
    showReviewScreen();
  });
}

function addProgressBar() {
  $(".js-results").append(`
    <div class="progress-container w-100 p-0">
      <div class="progress">
        <div class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    </div>
  `);
}


$(function() {
  renderApplication(STATE);
});