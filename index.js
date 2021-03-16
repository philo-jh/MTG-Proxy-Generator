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
`Supported syntax:\n\n` + syntaxText);
    
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
      console.log('queryList is: ', queryList)
      //set the loading counter for total queries
      const totalRequests = queryList.length;

      let completedRequests = 0;
      showReviewScreen();

      STATE.deckList = [];

      for(let i=0; i < queryList.length; i++) {
        //query ScryFall for CURRENT card
        setTimeout(getDataFromScryFall(queryList[i], function (data) {
          const card = {}

          card.name = data.name;
          card.set = data.set_name;
          card.displayOrder = i;
          card.alternateImages = null;
          card.editMode = false;
          card.printsUri = data.prints_search_uri;
          card.layout = queryList[i].layout

          //update card images:
          if (data.layout == 'transform' || data.layout == 'modal_dfc') {
            card.cardImage = (data.card_faces[0].image_uris) ? data.card_faces[0].image_uris.border_crop : "";
            card.cardImage2 = (data.card_faces[1].image_uris) ? data.card_faces[1].image_uris.border_crop : "";
          } else {
            if(card.layout === 'checklist') {
              card.layout = 'normal';
              $(".js-results").prepend(`<div class="alert alert-danger alert-dismissible fade show col-12" role="alert">
              "${card.name}" cannot be made into a checklist card. Generating standard card instead.
              <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>`);
            }
            card.cardImage = (data.image_uris) ? data.image_uris.border_crop : "";
          }

          completedRequests++;
          let percentageComplete = (completedRequests / totalRequests) * 100;

          $(".progress-bar").css("width", `${percentageComplete}%`).attr("aria-valuenow", `${percentageComplete}`);

          card.needsRerender = true;

          if (card.cardImage !== "") {
            //push the cards into the deckList:
            for (let j = 0; j < queryList[i].quantity; j++) {
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

          if (completedRequests === queryList.length) {
            STATE.deckList = STATE.deckList.sort(function (card1, card2) {
              return card1.displayOrder - card2.displayOrder;
            });

            renderApplication(STATE);
          }
        }), 50);
        console.log("State's decklist: ", STATE.deckList);
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
    let cardDivs, cardDiv1, cardDiv2
    
    // find existing cardDiv(s)
    cardDivs = $(`*[data-card="${card.name}-${i}"].card-div`);
    
    // if there are no matching cardDivs this is a new card, so let's create one
    if(cardDivs.length === 0) {
      
      // cardDiv1 = $();
      
      // make 2 cardDivs for a 'normal' DFC
      if(card.cardImage2 && card.layout !== 'checklist') {
        $(".js-results").append(`
        <div class="card-div col-6 col-sm-4 col-md-3 col-lg-2" data-card="${card.name}-${i}">
          <div class="card-overlay d-print-none">
            <button class="edit-button btn btn-outline-light btn-sm">Edit</button>
          </div>
          <img class="normal">
        </div>

        <div class="card-div col-6 col-sm-4 col-md-3 col-lg-2" data-card="${card.name}-${i}">
          <img>
        </div>`);
        // else make a single cardDiv with checklist style img elements
      } else if(card.cardImage2 && card.layout === 'checklist') {
        // Need to add an img.normal for print-sizing reasons...
        $(".js-results").append(`
        <div class="card-div checklist col-6 col-sm-4 col-md-3 col-lg-2" data-card="${card.name}-${i}">
          <div class="card-overlay d-print-none">
            <button class="edit-button btn btn-outline-light btn-sm">Edit</button>
          </div>
          <img class="normal">
          <img class="checklist checklist-front">
          <img class="checklist-back">
        </div>`);
        // else make a single cardDiv for all other styles of cards
      } else {
        $(".js-results").append(`
        <div class="card-div col-6 col-sm-4 col-md-3 col-lg-2" data-card="${card.name}-${i}">
          <div class="card-overlay d-print-none">
            <button class="edit-button btn btn-outline-light btn-sm">Edit</button>
          </div>
          <img>
        </div>`);
      }
      //now there is at least one cardDiv, so lets save them
      cardDivs = $(`*[data-card="${card.name}-${i}"].card-div`);
    }
    
    cardDiv1 = $(cardDivs[0])
    console.log('cardDiv1 = ', cardDiv1)

    if(cardDivs.length > 1) {
      cardDiv2 = $(cardDivs[1])
      console.log('cardDiv2 = ', cardDiv2)
    }
    
    if(card.needsRerender) {
      // edit mode overlay
      const cardOverlayHTML = `
        <div class="card-overlay d-print-none ${(card.editMode) ? `edit-mode` : ""}">

          ${(card.editMode) ? `<span class="set-name badge badge-dark">${card.set}</span>` : ""}

          ${(card.editMode) ? `<button class="done-button btn btn-outline-light btn-sm">Done</button>` : ""}
          
          ${(card.editMode) ? `<button class="prev-button btn btn-dark btn-sm"> < </button>` : ""}

          ${(card.editMode) ? `<span class="badge badge-dark image-counter"><span class="image-counter-current">${card.alternateImages.map(item => item.cardImage).indexOf(card.cardImage) + 1}</span> / <span class="image-counter-total">${card.alternateImages.length}</span></span>` : `<button class="edit-button btn btn-outline-light btn-sm">Edit</button>`}

          ${(card.editMode) ? `<button class="next-button btn btn-dark btn-sm"> > </button>` : ""}
        </div>`;
      
      //set html of layover in cardDiv
      cardDiv1.find('.card-overlay').replaceWith(cardOverlayHTML);

      // add normal card face images
      if(card.layout === 'normal') {
        cardDiv1.find('img').replaceWith(`<img class="normal" src="${card.cardImage}" alt="${card.name}">`)
        if(card.cardImage2) {
          cardDiv2.find('img').replaceWith(`<img class="normal" src="${card.cardImage2}" alt="${card.name}">`);
        }
      }

      //add checklist card face images
      if (card.layout === 'checklist') {
        if(card.cardImage) {
          // Need this 'normal' image for print-sizing reasons...
          cardDiv1.find('img.normal').replaceWith(`<img class="normal" src="${card.cardImage}" alt="${card.name}">`);
          cardDiv1.find('img.checklist-front').replaceWith(`<img class="checklist-front" src="${card.cardImage}" alt="${card.name}">`);
        }
        if (card.cardImage2) {
          cardDiv1.find('img.checklist-back').replaceWith(`<img class="checklist-back" src="${card.cardImage2}" alt="${card.name}">`);
        }
      }
      
      $(".edit-button", cardDiv1).click(function() {
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

function generateQueryList(userInputArr) {
  
  const queryList = [];
  
  for(let i = 0; i < userInputArr.length; i++) {
    const query = {};
    let currentItem = userInputArr[i]
    console.log('1. currentItem is: ', currentItem)

    //check quantity and store in query object:
    query.quantity = checkQuantity(currentItem)
    console.log('2. query is: ', query)
    //remove quantity from currentItem
    currentItem = currentItem.replace(/^([0-9]+)/g, '').trim();
    console.log('3. currentItem is: ', currentItem)
    //check for flags:

    //check for 'checklist' flag
    if (currentItem.includes('-cl')) {
      query.layout = 'checklist';
      currentItem = currentItem.replace('-cl', '').trim();
    } else if (currentItem.includes('-checklist')) {
      query.layout = 'checklist';
      currentItem = currentItem.replace('-checklist', '').trim();
    } else {
      query.layout = 'normal'
    }
    console.log('4. query is: ', query)
    console.log('5. currentItem is: ', currentItem)

    // check for 'code' flag
    if(currentItem.includes('-code')) {
      currentItem = currentItem.replace('-code', '').trim()
      query.queryEndpoint = 'code';
    }

    if (currentItem.includes('-cd')) {
      currentItem = currentItem.replace('-cd', '').trim()
      query.queryEndpoint = 'code';
    }
    console.log('6. query is: ', query)
    console.log('7. currentItem is: ', currentItem)

    // if the endpoint hasn't been assigned by a flag, it's a standard query

    if(!query.queryEndpoint) {
      query.queryEndpoint = 'named'
    }
    console.log('8. currentItem is: ', currentItem)
    query.query = currentItem.trim().toLowerCase();
    console.log('9. query is: ', query)
    queryList.push(query);
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

function checkQuantity(userQuery) {
  userQuery = parseInt(userQuery);
  if(isNaN(userQuery)) {
    return 1;
  } else {
    return userQuery;
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
