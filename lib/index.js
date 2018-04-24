"use strict";

////////////////////////////////////////////////////////
//  Constant Values & Application State:
////////////////////////////////////////////////////////

var MODES = {
  DISCLAIMER: "disclaimer",
  EDIT: "edit",
  REVIEW: "review"
};

var SCRYFALL_SEARCH_URL = "https://api.scryfall.com/cards/named";

var sampleDecklist = "4 Thalia's Lieutenant\n4 Champion of the Parish\n3 Thalia, Guardian of Thraben\n1 Thalia, Heretic Cathar\n1 Thraben Inspector\n3 Phantasmal Image\n1 Dark Confidant\n4 Kitesail Freebooter\n1 Kessig Malcontents\n4 Noble Hierarch\n4 Mantis Rider\n3 Meddling Mage\n4 Reflector Mage\n4 Aether Vial\n4 Ancient Ziggurat\n4 Cavern of Souls\n4 Horizon Canopy\n1 Plains\n2 Seachrome Coast\n4 Unclaimed Territory";

var STATE = {
  mode: MODES.DISCLAIMER,
  deckList: null
};

function setState(stateFunction) {
  STATE = stateFunction(STATE);
  renderApplication(STATE);
}

function renderApplication(state) {

  if (state.mode === MODES.DISCLAIMER) {
    showDisclaimer();

    $(".accept-terms").click(function () {
      setState(function (oldState) {
        oldState.mode = MODES.EDIT;
        return oldState;
      });
    });
  } else if (state.mode === MODES.EDIT) {

    $(".js-queryList").attr("placeholder-x", "Here's an example decklist:\n\n" + sampleDecklist);

    $(".js-queryList").placeholder();
    showEditScreen();

    $(".js-generate-button").click(function (event) {
      event.preventDefault();

      if (!$.trim($(".js-queryList").val())) {
        $(".js-queryList").val(sampleDecklist);
      }

      $(".js-results").empty();
      addProgressBar();

      //generate a list of query...
      queryList = generateQueryList($(".js-queryList").val().split("\n"));

      //set the loading counter for total queries
      var totalRequests = queryList.length;

      var completedRequests = 0;
      showReviewScreen();

      STATE.deckList = [];

      var _loop = function _loop(i) {
        //query ScryFall for CURRENT card
        getDataFromScryFall(queryList[i], function (data) {

          var card = {};

          card.name = data.name;
          card.set = data.set_name;
          card.displayOrder = i;
          card.alternateImages = null;
          card.editMode = false;
          card.printsUri = data.prints_search_uri;

          //update card images:
          if (data.layout === "transform") {

            card.cardImage = data.card_faces[0].image_uris ? data.card_faces[0].image_uris.border_crop : "";

            card.cardImage2 = data.card_faces[1].image_uris ? data.card_faces[1].image_uris.border_crop : "";
          } else {

            card.cardImage = data.image_uris ? data.image_uris.border_crop : "";
          }

          completedRequests++;

          var percentageComplete = completedRequests / totalRequests * 100;

          $(".progress-bar").css("width", percentageComplete + "%").attr("aria-valuenow", "" + percentageComplete);

          card.needsRerender = true;

          if (card.cardImage !== "") {
            //push the cards into the deckList:
            for (var j = 0; j < queryList[i].quantity; j++) {
              var myTempCard = $.extend(true, {}, card);
              STATE.deckList.push(myTempCard);
            }
          } else {
            $(".js-results").prepend("<div class=\"alert alert-danger alert-dismissible fade show col-12\" role=\"alert\">\n              \"" + card.name + "\" could not be found. Try editing your list.\n              <button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\">\n                <span aria-hidden=\"true\">&times;</span>\n              </button>\n            </div>");
          }

          if (completedRequests === queryList.length) {
            STATE.deckList = STATE.deckList.sort(function (card1, card2) {
              return card1.displayOrder - card2.displayOrder;
            });

            renderApplication(STATE);
          }
        });
      };

      for (var i = 0; i < queryList.length; i++) {
        _loop(i);
      }

      STATE.mode = MODES.REVIEW;
    });

    $(".js-clear-button").click(function () {
      $(".js-queryList").val("");
      $(".js-queryList").scrollTop();
    });

    $(".js-review-button").click(function () {
      STATE.mode = MODES.REVIEW;
      editButton();
      renderApplication(STATE);
    });
  } else if (state.mode === MODES.REVIEW) {

    showReviewScreen();

    $(".progress-container").remove();

    buildSpoiler(STATE.deckList);
    editButton();
  } else {
    throw new Error("Invalid Mode");
  }
}

////////////////////////////////////////////////////////
//  Utility Functions:
////////////////////////////////////////////////////////

function buildSpoiler(deckList) {
  var _loop2 = function _loop2(i) {

    var card = deckList[i];

    var cardFaceDivs = $("*[data-card=\"" + card.name + "-" + i + "\"]");

    var cardFaceDiv1 = void 0,
        cardFaceDiv2 = void 0;

    if (cardFaceDivs.length === 0) {

      cardFaceDiv1 = $();

      $(".js-results").append("\n        <div class=\"card-face-div col-6 col-sm-4 col-md-3 col-lg-2\" data-card=\"" + card.name + "-" + i + "\">\n        </div>\n      ");

      if (card.cardImage2) {
        $(".js-results").append("\n        <div class=\"card-face-div col-6 col-sm-4 col-md-3 col-lg-2\" data-card=\"" + card.name + "-" + i + "\">\n        </div>\n      ");
      }

      cardFaceDivs = $("*[data-card=\"" + card.name + "-" + i + "\"]");
    }

    cardFaceDiv1 = $(cardFaceDivs[0]);

    if (cardFaceDivs.length > 1) {
      cardFaceDiv2 = $(cardFaceDivs[1]);
    }

    if (card.needsRerender) {
      var divHTML = "\n          <div class=\"card-overlay d-print-none " + (card.editMode ? "edit-mode" : "") + "\">\n\n            " + (card.editMode ? "<span class=\"set-name badge badge-dark\">" + card.set + "</span>" : "") + "\n\n            " + (card.editMode ? "<button class=\"done-button btn btn-outline-light btn-sm\">Done</button>" : "") + "\n            \n            " + (card.editMode ? "<button class=\"prev-button btn btn-dark btn-sm\"> < </button>" : "") + "\n\n            " + (card.editMode ? "<span class=\"badge badge-dark image-counter\"><span class=\"image-counter-current\">" + (card.alternateImages.map(function (item) {
        return item.cardImage;
      }).indexOf(card.cardImage) + 1) + "</span> / <span class=\"image-counter-total\">" + card.alternateImages.length + "</span></span>" : "<button class=\"edit-button btn btn-outline-light btn-sm\">Edit</button>") + "\n\n            " + (card.editMode ? "<button class=\"next-button btn btn-dark btn-sm\"> > </button>" : "") + "\n          </div>\n\n          <img src=\"" + card.cardImage + "\" />";

      cardFaceDiv1.html(divHTML);

      if (card.cardImage2) {
        var div2html = "<img src=\"" + card.cardImage2 + "\" />";

        cardFaceDiv2.html(div2html);
      }

      $(".edit-button", cardFaceDiv1).click(function () {
        card.editMode = true;

        $(this).parent().css("opacity", "1");

        if (!card.alternateImages) {
          $.getJSON(card.printsUri, null, function (resultData) {

            if (card.cardImage2) {

              card.alternateImages = resultData.data.map(function (item) {
                var alternateImage = {};
                alternateImage.cardImage = item.card_faces[0].image_uris.border_crop;
                alternateImage.cardImage2 = item.card_faces[1].image_uris.border_crop;
                alternateImage.set = item.set_name;
                return alternateImage;
              });

              card.needsRerender = true;
              renderApplication(STATE);
            } else {

              card.alternateImages = resultData.data.map(function (item) {
                var alternateImage = {};
                alternateImage.cardImage = item.image_uris.border_crop;
                alternateImage.set = item.set_name;
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

      $(".done-button").click(function () {
        card.editMode = false;
        card.needsRerender = true;
        renderApplication(STATE);
      });

      $(".next-button").click(function () {

        var indexOfCurrentImage = card.alternateImages.map(function (item) {
          return item.cardImage;
        }).indexOf(card.cardImage);

        var numAlternateImages = card.alternateImages.length;

        if (indexOfCurrentImage < numAlternateImages - 1) {

          card.cardImage = card.alternateImages[indexOfCurrentImage + 1].cardImage;

          card.set = card.alternateImages[indexOfCurrentImage + 1].set;

          if (card.cardImage2) {
            card.cardImage2 = card.alternateImages[indexOfCurrentImage + 1].cardImage2;
          }

          card.needsRerender = true;
          renderApplication(STATE);
        }
      });

      $(".prev-button").click(function () {

        var indexOfCurrentImage = card.alternateImages.map(function (item) {
          return item.cardImage;
        }).indexOf(card.cardImage);

        if (indexOfCurrentImage > 0) {
          var prevImageURL = card.alternateImages[indexOfCurrentImage - 1].cardImage;

          card.cardImage = prevImageURL;
          card.set = card.alternateImages[indexOfCurrentImage - 1].set;

          if (card.cardImage2) {
            card.cardImage2 = card.alternateImages[indexOfCurrentImage - 1].cardImage2;
          }

          card.needsRerender = true;
          renderApplication(STATE);
        }
      });

      deckList[i].needsRerender = false;
    }
  };

  for (var i = 0; i < deckList.length; i++) {
    _loop2(i);
  }
}

function generateQueryList(arr) {

  var queryList = [];

  for (var i = 0; i < arr.length; i++) {

    var cardName = arr[i].replace(/[0-9]/g, '').trim().toLowerCase();

    if (!(cardName === "")) {

      queryList.push({
        name: cardName,
        quantity: checkQuantity(arr[i])
      });
    }
  }

  for (var _i = 0; _i < queryList.length; _i++) {

    var currentCard = queryList[_i];

    for (var j = _i + 1; j < queryList.length; j++) {

      var nextCard = queryList[j];

      while (j < queryList.length && currentCard.name === nextCard.name) {
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
  if (isNaN(input)) {
    return 1;
  } else {
    return input;
  }
}

function getDataFromScryFall(card, callback) {
  var query = {
    fuzzy: card.name
  };

  $.getJSON(SCRYFALL_SEARCH_URL, query, callback).fail(function () {
    callback({ name: card.name });
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

function editButton() {
  $(".edit-review").html("<li class=\"navbar-text js-edit-button text-warning\">Edit</li>");

  $(".js-edit-button").click(function () {
    STATE.mode = MODES.EDIT;
    reviewButton();
    renderApplication(STATE);
  });
}

function reviewButton() {
  $(".edit-review").html("<li class =\"navbar-text js-review-button text-info\">Review</li>");
}

function addProgressBar() {
  $(".js-results").append("\n    <div class=\"progress-container w-100 p-0\">\n      <div class=\"progress\">\n        <div class=\"progress-bar\" role=\"progressbar\" style=\"width: 0%\" aria-valuenow=\"0\" aria-valuemin=\"0\" aria-valuemax=\"100\"></div>\n      </div>\n    </div>\n  ");
}

$(function () {
  renderApplication(STATE);
});