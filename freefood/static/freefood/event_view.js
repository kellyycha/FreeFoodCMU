
const EVENT_STAR = "star-rating-";  // prefix ID for stars in the "event rating"
const USER_STAR = "star-";          // prefix ID for stars in the "user  rating"


function hideClearButton() {
    $("#clear-rating").removeClass("show-submit-rating");
    $("#clear-rating").addClass("hidden");
}

function showClearButton() {
    $("#clear-rating").addClass("show-submit-rating");
    $("#clear-rating").removeClass("hidden");
}

function showSubmitRatingSucess() {
    $("#submit-rating-indicator").removeClass("hidden");
    $("#submit-rating-indicator").addClass("show-submit-rating");
}

function hideSubmitRatingSuccess() {
    // 😂😂😂😂😂😂😂
    $("#submit-rating-indicator").addClass("hidden");
    $("#submit-rating-indicator").removeClass("show-submit-rating");
}


// This function intends to setup various user interactive methods when the page is loaded.
// 
// It does not make an AJAX call to the server to get data (e.g. ratings).
// Instead it relies on "data-*" that are placed throughout event_view.html. 
window.addEventListener("load", (event) => {

    // set up user ratings (allow user to rate stuff)
    let stars = ["1", "2", "3", "4", "5"];
    stars.forEach(function(star) {

        $(`#${USER_STAR}${star}`).click(function(id) {
            $("#submit-rating-indicator").removeClass("hidden"); // mentally ignore this line if you are wondering why it is here 😂 
            hideSubmitRatingSuccess();
            hideClearButton();

            // process the request, sending the request to the server. 
            let value = parseInt(id.currentTarget.getAttribute("data-value"));

            $("#user-submit-rating-stars").attr("data-rating", value);

            updateStars(USER_STAR, value);
            submitRating(value);
        });
    })

    // Set the user ratings to show if the user has already rated the event
    let preexistingRating = parseInt($("#user-submit-rating-stars").attr("data-rating"));
    updateStars(USER_STAR, parseInt(preexistingRating));

    
    // Initialize the clear button to either be hidden or shown. 
    if (preexistingRating == 0) {
        $("#clear-rating").addClass("hidden");
    } else {
        $("#clear-rating").addClass("show-submit-rating");
    }
    $("#clear-rating").click(function () {
        $("#user-submit-rating-stars").attr("data-rating", 0);

        submitRating(0);
        updateStars(USER_STAR, 0);
        
        hideClearButton();
        hideSubmitRatingSuccess();
    });

    // Set up the current image (need to set the first image as active)
    $("#carouselInner").children(":last").addClass("active");
    

    // Set up the current ratings for the event
    let eventRating = parseInt($(`#event-rating`).attr("data-value"));
    updateStars(EVENT_STAR, eventRating);

    // enable popovers
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl))
});


// rating: int 
// rating should be in range of [1,5]
function updateStars(id_prefix, rating) {
    for (let i = 0; i < rating; i++) {
        // let currStar = stars[i];
        $(`#${id_prefix}${i+1}`).addClass("checked");
    }
    for (let i = rating; i < 5; i++) {
        $(`#${id_prefix}${i+1}`).removeClass("checked");
    }
}



function submitRating(currRating) {
    let event_id = $(`#event-detail-view`).attr("data-value");

    $.ajax({
        url: `/freefood/submit-rating/${event_id}/${currRating}`,
        dataType : "json",
        success: doneSubmitRating,
        error: updateError
    });

}

function doneSubmitRating(newRating) {
    // probably update the overall rating
    updateStars(EVENT_STAR, parseInt(newRating.rating));

    // do other things?
    $("#event-rating").attr('data-bs-content', `Rating: ${newRating.ratingPrecise}, Number: ${newRating.ratingNum}`);

    // messiest/laziest possible way to update the popovers
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl))

    if (parseInt($("#user-submit-rating-stars").attr("data-rating")) != 0) {
        showSubmitRatingSucess();
        showClearButton();
    }
}


// send to server that the event is finished.
// Change something on the screen to indicate that the event is finished. 
function changeAvailability(event) {
    let event_id = $(`#event-detail-view`).attr("data-value");

    // A bit of a nonsensical request that "swaps" the buttons and closes the current modal. 
    $.ajax({
        url: `/freefood/${event}/${event_id}`,
        success: function() {
            if (event == "markFinished") {
                $("#markFinishedModal").modal('toggle');
                $("#markFinishedButton").addClass('hidden');
                $("#markAvailableButton").removeClass('hidden');
            } else {
                $("#markAvailableModal").modal('toggle');
                $("#markFinishedButton").removeClass('hidden');
                $("#markAvailableButton").addClass('hidden');
            }
        },
        error: updateError
    });
}


//todo probably needs to actually do something lol 
function updateError(xhr) {
    console.log("didn't work")
}




// Functions for Comments
function addComment() { 
    let comment_text_id = "id_comment_input_text"
    let itemTextElement = document.getElementById(comment_text_id)

    let itemTextValue   = itemTextElement.value

    if (itemTextValue.length == 0) return false;

    itemTextElement.value = ''

    let xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function() {
        if (xhr.readyState != 4) return
        updatePage(xhr)
    }
    let event_id = $(`#event-detail-view`).attr("data-value");

    xhr.open("POST", "/freefood/add-comment/"+event_id, true)
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.send("content=" + itemTextValue + "&event_id=" + event_id + "&csrfmiddlewaretoken="+getCSRFToken());
}

// Sends a new request to update the posts
function loadComments() {
    let xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function() {
        if (this.readyState != 4) return
        updatePage(xhr)
    }
    let event_id = $(`#event-detail-view`).attr("data-value");

    xhr.open("GET", "/freefood/get-global/"+event_id, true)
    xhr.send()
}

// Gets the answer back from the above function
function updatePage(xhr) {
    if (xhr.status == 200) {
        let response = JSON.parse(xhr.responseText)
        updateComments(response)
        return
    }
    if (xhr.status == 0) {
        displayError("Cannot connect to server")
        return
    }

    if (!xhr.getResponseHeader('content-type') == 'application/json') {
        displayError("Received status=" + xhr.status)
        return
    }
    let response = JSON.parse(xhr.responseText)
    if (response.hasOwnProperty('error')) {
        displayError(response.error)
        return
    }

    displayError(response)
}


// Fetches the csrf token out of the cookies
function getCSRFToken() {
    let cookies = document.cookie.split(";")
    for (let i = 0; i < cookies.length; i++) {
        let c = cookies[i].trim()
        if (c.startsWith("csrftoken=")) {
            return c.substring("csrftoken=".length, c.length)
        }
    }
    return "unknown"
}

// This function displays comments for a specific event
function updateComments(items) {
    let comments_div = document.getElementById("my-comments");
    for (let i=0; i < items['comments'].length; i++) {
        let item = items['comments'][i]; 
        
        let picture_html = `<img src="`+ item.picture +`" id="id_user_picture" style="border-radius: 50%; height:40px;"></img>`

        // insert comment html
        commentHTML =`

            <div class="container" id='id_comment_div_` + item.id + `'>
                <div class="row">
                    <div class="col-1">`+
                        picture_html +
                    `</div>
                    <div class="col">
                        <p style='margin:0; font-weight: bold; color: rgb(72, 64, 194) !important;'> 
                            <span> ` 
                                + item.user + " " +
                                `<span style='color:black;' id='id_comment_text_`+ item.id + "'>" 
                                    + sanitize(item.content) + `
                                </span>
                            </span>
                        </p>` +
                        `<p style='color:gray; font-size:12px;' id='id_comment_date_time_` + item.id + "'>" + item.create_date + `</p>
                    </div>
                </div>
            </div>
        `

            

        let event_id = $(`#event-detail-view`).attr("data-value");
        if (item.event_id == parseInt(event_id)) {
            let the_comment_id = "id_comment_div_" + item.id;
            if (document.getElementById(the_comment_id)) {
            } else {
                comments_div.innerHTML = commentHTML + comments_div.innerHTML;
            }
        }
    }
}



function sanitize(s) {
    // Be sure to replace ampersand first
    return s.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
}