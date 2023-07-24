let map;        // hold the map
let markers;    // hold the list of markers
window.initPage = initPage;  // map.html calls this to open the map. 
var infoWindow;         // should store the infowindow variable. 
var hash = window.location.hash;

// Sends a new request to update the to-do list
function initPage() {
    $.ajax({
        url: "/freefood/get-map-markers/",
        dataType : "json",
        success: initMap,
        error: updateError
    });
}


// This function initializes the map on the page, as well as sets up a few variables
// with the Google API. 
function initMap(items) {

    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 40.4432, lng: -79.9428 }, // hardcoded center of CMU campus. 
        zoom: 18, // 17 or 18 seems best

        mapId: 'bbebcca1bb689e77' // This map id is connected to my google API account
                                  // I have defined certain "styles" in my "dashboard"
    });

    // Initialize a var for the pop-up window that opens when the marker/pin is clicked: 
    infoWindow = new google.maps.InfoWindow();

    // Initialize an object to keep track of the markers. 
    markers = new Object();

    updateMapMarkers(items);

    // NOT SURE IF DOING THIS IS A GOOD IDEA. 
    hash_ajax_elements();
}


function update_marker_background() {
    // if (Object.keys(markers).length < 100) 
    for (let m_id in markers) {
        // change EVERY marker to normal color (yeah why)
        markers[m_id]["marker"].content = markers[m_id]["normal_color"];
    }
}

/*
 * Creates a list of markers. If the marker is already displayed, don't add it again.
 * push new markers to the list upon creating them
 * "remove markers" from the map if they are "deleted". 
 * 
 * This function is designed to be helpful in both filtering and AJAX. 
 * Complexity is not very good... O(n) but should be suitable. 
 * 
 * TODO: This function tries to *not* edit preexisting markers if they show up again in the AJAX request. 
 * However, we should probably be rewriting the preexisting markers instead. 
 */
function updateMapMarkers(items) {
    // For each item returned from the server, add it as a marker on the map. 
    let count = 1;

    // Delete all of the prev elements...
    for (let i in markers) {
        markers[i]["marker"].map = null;    // remove existing markers from map
        $(`#id-event-card-${i}`).remove();  // remove the card from map
        delete markers[i];                  // remove marker from object
    }


    $(items).each(function() {
        let marker_id = (this.id).toString()

        pos = { lat: parseFloat(this.latitude), 
                lng: parseFloat(this.longitude) }
        
        // create the marker on the map. Marker styling obtained from HTML.. 
        // *should add ajax support but no point until the models are implemented zzz. 
        const customColor = new google.maps.marker.PinView({
            background: this.background,    // "#FBBC04" or "green"
            borderColor: this.borderColor,  // "#137333" or "white"
            glyphColor: this.glyphColor,    // "white", (color for text)
            glyph: (count).toString(),      // Define an enumeration to these nodes separate from the marker_id
            scale: 1.2,
        });

        // Same colors, but just inverting background color with the other colors.
        const hoverColor = new google.maps.marker.PinView({
            background: this.glyphColor,
            borderColor: this.background,
            glyphColor: this.background,
            glyph: (count).toString(),      // Define an enumeration to these nodes separate from the marker_id
            scale: 1.2,
        });

        let marker = new google.maps.marker.AdvancedMarkerView({
            map,
            position: pos,
            content: customColor.element,
        })

        // This one "trick" took an hour to figure out LOL
        marker.element.setAttribute("id", marker_id);

        const maker = marker.element;

        // Event when you hover the marker on the map
        ["pointerenter"].forEach((event) => {
            maker.addEventListener(event, (element) => {
                let marker_id = element.path[0].getAttribute('id');
                markers[marker_id]["marker"].content = markers[marker_id]["hover_color"];
            });
        });
        // Event when you stop hovering the marker on the map. 
        ["pointerleave"].forEach((event) => {
            maker.addEventListener(event, (element) => {
                update_marker_background()
                // let marker_id = element.path[0].getAttribute('id');
                // markers[marker_id]["marker"].content = markers[marker_id]["normal_color"];
            });
        });
        
        // Build a string for the disabled buttons showing dietary restrictions of the event. 
        let dietary_options_html = ""
        for (let i = 0; i < this.dietary_options.length; i++) {
            dietary_options_html = dietary_options_html.concat(`<button disabled class="btn btn-outline-secondary btn-sm">${this.dietary_options[i]}</button>\n`);
        }

        // HTML for the info window popup.
        let infowindow_html = `
        <div class="card bg-transparent border-0" style="width: 16rem;">
            <div class="card-body">
                <h5 class="card-title"><a href="/freefood/event/${marker_id}/">${sanitize(this.title)}</a></h5>
                <h6 class="card-subtitle mb-2 text-muted">${sanitize(this.location)}</h6>
                <p class="card-text">${this.date} ${this.time}</p>
                <p class="card-text">${sanitize(this.food)}</p>
                <div>${dietary_options_html}</div>
            </div>
        </div>
        `;
        
        // Click effect for the marker (open the infowindow when marker is clicked).
        marker.addListener("click", () => {
            infoWindow.close();
            // you can use html inside of the content to create a href. 
            infoWindow.setContent(infowindow_html);
            infoWindow.open(marker.map, marker);
        });




        // Generate HTML for a card on the left of the screen. 
        let stretched_href = `<a href="#" onclick="setCenter(${marker_id});return false;" class="stretched-link" title="Click Me"></a>`;

        let img_html = "";
        if (this.img_avail) {
            img_html = `<img src="/freefood/image-by-event/${marker_id}" class="card-img-top img-col-fit" style="border-top-left-radius: 25px;
            border-top-right-radius: 25px;" >`;
        }

        let rating_html = "";
        for (let star_num = 1; star_num <= 5; star_num++) {
            rating_html = rating_html.concat(`\n<span id="star-${marker_id}-${star_num}"><i class="fa fa-star"></i></span>`);
        }
        let card_html = `
        <div class="card" data-value="${marker_id}" id="id-event-card-${marker_id}">
            ${img_html}
            <div class="card-body">
                <h5 class="card-title">${count}. <a href="/freefood/event/${marker_id}/">${sanitize(this.title)}</a></h5>
                <div class="mb-2">${rating_html}</div>
                <h6 class="card-subtitle mb-2 text-muted">${sanitize(this.location)}</h6>
                <p class="card-text">${this.date} ${this.time}</p>
                <p class="card-text">${sanitize(this.food)} </p>
                <p class="card-text">Posted by: @${this.user} </p>
                <div id="stretched-link-${marker_id}">${stretched_href}</div>
            </div>
        </div>
        `;
        
        $("#event-cards").append(card_html);

        // Now the card is added to the html, add functions to handle hover 
        // behavior to the card:
        $(`#id-event-card-${marker_id}`).mouseenter(function(id) {
            update_marker_background();
            marker_id = id.currentTarget.getAttribute("data-value");
            markers[marker_id]["marker"].content = markers[marker_id]["hover_color"];
            
            $(`#id-event-card-${marker_id}`).addClass("shadow-lg");
            $(`#id-event-card-${marker_id}`).css("z-index", "9999");
            
        });
        $(`#id-event-card-${marker_id}`).mouseleave(function(id) {
            marker_id = id.currentTarget.getAttribute("data-value");
            markers[marker_id]["marker"].content = markers[marker_id]["normal_color"];

            $(`#id-event-card-${marker_id}`).removeClass("shadow-lg");
            $(`#id-event-card-${marker_id}`).css("z-index", "1");
        });

        // Highlight the stars correspondingly for the rating...
        loadStars(`star-${marker_id}-`, parseInt(this.rating));


        // store data in the markers dictionary. 
        markers[marker_id] = {
            marker: marker,
            infowindow_html: infowindow_html,
            stretched_href: stretched_href,
            position: pos,
            normal_color: customColor.element,
            hover_color: hoverColor.element,
        };

        count++;
        // end of loop.
    })
}

/*
 * Given the "id" of a marker, pan over the marker on the map.
 * More functionality can be added/removed. 
 */
function setCenter(marker_id) {
    let pos = markers[marker_id]["position"]
    if (map.getZoom() && map.getZoom() < 18) {
        map.setZoom(18); // zoom should be somewhat close
    }
    map.panTo(pos); // has a "smooth animation" to the pin
    

    // we can do more too, like opening up the infowindow :)
    infoWindow.close();
    infoWindow.setContent(markers[marker_id]["infowindow_html"]);
    infoWindow.open(markers[marker_id]["marker"].map, markers[marker_id]["marker"]);

    // testing...
    $(`#stretched-link-${marker_id}`).html('');

    $("#event-cards").children().each(function(i, elm) {
        let id = parseInt(elm.getAttribute('data-value'));
        if (id != marker_id) {
            $(`#stretched-link-${id}`).html(markers[id]["stretched_href"]);
        }
    });
    
}


// id_prefix is a string holding the prefix of the id of the star. 
// rating should be an int in range of [1,5]
function loadStars(id_prefix, rating) {
    for (let i = 0; i < rating; i++) {
        $(`#${id_prefix}${i+1}`).addClass("checked");
    }
}


// Copied over from lecture.
function updateError(xhr) {
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

function displayError(message) {
    $("#error").html(`
        <br>
        <div class="alert alert-danger" role="alert">
            An error occurred: ${message}
        </div>
    `);
}

function sanitize(s) {
    // Be sure to replace ampersand first
    return s.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
}



function submit_date_filter_ajax_label() {
    // yeah fuck this lmao
    //  certainly better to do this with some external js library. 
    // I think this is likely the absolute worst possible way you could implmeent this 
    let s_date = "";
    let e_date = "";
    let final = "";

    if (($("#id_startDate").val().length) != 0) 
        s_date = new Date($("#id_startDate").val() + "GMT-0500").toLocaleDateString('en-US', {month:"numeric", day:"numeric"});
    if (($("#id_endDate").val().length) != 0) 
        e_date = new Date($("#id_endDate").val() + "GMT-0500").toLocaleDateString('en-US', {month:"numeric", day:"numeric"});

    if (s_date.length == 0 && e_date.length == 0)
        final = "Date Filter"
    else
        final = `${s_date} - ${e_date}`
    $("#date-filter-dropdown-button").prop("innerText", final); // this kind of garbage code is soul crushing to write 😂
}


function submit_date_filter_ajax(e) {
    $.ajax({
        type: 'POST',
        url: e.currentTarget.action,
        data: {
            startDate:    $("#id_startDate").val(),
            endDate:      $("#id_endDate").val(),
            
            // https://electrictoolbox.com/jquery-form-elements-by-name/
            csrfmiddlewaretoken:$('#date-filter-form input[name=csrfmiddlewaretoken]').val()
        },
        success: updateMapMarkers,
        error: updateError
    });

    submit_date_filter_ajax_label();
    hash_ajax_elements()
    $("#date-filter-dropdown-button").dropdown("toggle");
}

// Access the form on map.html and change the default behavior of submit
// to submit with AJAX. 
$(document).on('submit','#date-filter-form',function(e){
    e.preventDefault();
    submit_date_filter_ajax(e);
});



// using an unspecified "type". 
function submitSort(sortMethod) {
    $.ajax({
        url: `/freefood/update-sort/${sortMethod}/`,
        success: updateMapMarkers,
        failure: updateError
    })
    hash_ajax_elements()
}

function recentSort() {
    $("#sort-button").prop("innerText", "Sort: Recent");
    submitSort("recent");
}

function ratingSort() {
    $("#sort-button").prop("innerText", "Sort: Rating");
    submitSort("rating")
}

function popularitySort() {
    $("#sort-button").prop("innerText", "Sort: Popularity");
    submitSort("popularity")
}

function commentsSort() {
    $("#sort-button").prop("innerText", "Sort: Comments");
    submitSort("comments")

}



function toggleShowNow() {
    $.ajax({
        url: "/freefood/update-toggle-show/",
        success: updateMapMarkers,
        failure: updateError
    })
    if ($("#active-filter-btn").text().trim() == "Hide Finished") {
        $("#active-filter-btn").prop("innerText", "Show All");
    } else {
        $("#active-filter-btn").prop("innerText", "Hide Finished");
    }
    hash_ajax_elements()
}


function saveDietaryRestrictionsLabel() {
    let new_label = [];

    if ($("#id_veg").is(':checked')) 
        new_label.push("Veg");
    if ($("#id_vn").is(':checked')) 
        new_label.push("Vn");
    if ($("#id_df").is(':checked'))
        new_label.push("Df");
    if ($("#id_gf").is(':checked'))
        new_label.push("Gf");

    let label = ""
    if (new_label.length == 0) 
        label = "Restrictions";
    else
        label = new_label.join(' • ')
    $("#dietary-dropdown-button").prop("innerText", label);
}


function saveDietaryRestrictions(e) {
    $.ajax({
        type: 'POST',
        url: e.currentTarget.action,
        data: {
            veg: $("#id_veg").is(':checked'),
            vn:  $("#id_vn").is(':checked'),
            df:  $("#id_df").is(':checked'),
            gf:  $("#id_gf").is(':checked'),
            
            // https://electrictoolbox.com/jquery-form-elements-by-name/
            csrfmiddlewaretoken:$('#dietary-restrictions-form input[name=csrfmiddlewaretoken]').val()
        },
        success: updateMapMarkers,
        error: updateError
    });

    saveDietaryRestrictionsLabel();
    $("#dietary-dropdown-button").dropdown("toggle");
    
    hash_ajax_elements();
}


// Access the form on map.html and change the default behavior of submit
// to submit with AJAX. 
$(document).on('submit','#dietary-restrictions-form',function(e){
    e.preventDefault();
    saveDietaryRestrictions(e);
});



// Get values of ajax value and hash it. 
function hash_ajax_elements() {
    let contents = [];

    // add sort
    contents.push($("#sort-button").text().trim());

    // add date
    contents.push($("#id_startDate").val());
    contents.push($("#id_endDate").val());

    // add filter
    contents.push(($("#id_veg").is(':checked')).toString());
    contents.push(($("#id_vn").is(':checked')).toString());
    contents.push(($("#id_df").is(':checked')).toString());
    contents.push(($("#id_gf").is(':checked')).toString());

    // add button
    contents.push($("#active-filter-btn").text().trim());
    console.log("Wrote new hash");

    window.location.hash = `#${contents.join('&')}`;
    hash = window.location.hash;
}


function dateIsValid(date) {
    return date instanceof Date && !isNaN(date);
}

// Gets most of the cases. 
function is_valid_date_hash(d) {
    if (d == "")
        return true;
    if (d.length != 10)
        return false;
    let split = d.split("-");

    return ((split.length == 3) && 
            (split[0].length == 4) && (split[1].length == 2) && (split[2].length == 2) && 
            dateIsValid(new Date(d)));
}

function is_valid_bool_hash(b) {
    return (b == "true" || b == "false")
}

// Try to make sense of the current hash.
// If it appears to be somewhat valid, resubmit the ajax request to server. 
// 
// initial thought is to update the form values
// update the labels
// submit an ajax to server with current data. 
// server updates the cookies
// server sends response data. 
function decode_ajax_hash() {
    let contents = window.location.hash;
    if (contents.length > 1) {
        contents = contents.replaceAll("%20", " ");
        contents = contents.slice(1).split("&");
        console.log(contents);
        
        // validate hash... if types are wrong, not enough elements, just do nothing.
        // There's probably multiple bugs in each line of code. 
        if ((contents.length != 8) || 
            ((contents[0] != "Sort: Recent") && (contents[0] != "Sort: Rating") && (contents[0] != "Sort: Popularity") && (contents[0] != "Sort: Comments")) ||
            (!is_valid_date_hash(contents[1]) || !is_valid_date_hash(contents[2])) || 
            (!is_valid_bool_hash(contents[3]) || !is_valid_bool_hash(contents[4]) || !is_valid_bool_hash(contents[5]) || !is_valid_bool_hash(contents[6])) ||
            ((contents[7] != " Show All") && (contents[7] != "Hide Finished"))
        ) {
            console.log("Invalid Hash.")
            return false;       // invalid to an extent, leave the loop
        }
        
        console.log("Valid Hash");
        
        // update Sort label
        $("#sort-button").prop("innerText", contents[0]);

        // update date filter
        $("#id_startDate").val(contents[1]);
        $("#id_endDate").val(contents[2]);
        // date filter label
        submit_date_filter_ajax_label();

        // dietary restriction checkboxes ticked properly
        $('#id_veg').prop('checked', ($.parseJSON(contents[3].toLowerCase())));
        $('#id_vn').prop('checked', ($.parseJSON(contents[4].toLowerCase())));
        $('#id_df').prop('checked', ($.parseJSON(contents[5].toLowerCase())));
        $('#id_gf').prop('checked', ($.parseJSON(contents[6].toLowerCase())));
        // dietary restriction label
        saveDietaryRestrictionsLabel();

        // hidden button thing
        $("#active-filter-btn").prop("innerText", contents[7]);
        // $("#active-filter-btn").text(contents[7]);

        // ajax request
        $.ajax({
            type: 'POST',
            url: '/freefood/refresh-ajax/',
            data: {
                sort: $("#sort-button").text().replace("Sort: ", "").trim(),

                startDate:    $("#id_startDate").val(),
                endDate:      $("#id_endDate").val(),

                veg: $("#id_veg").is(':checked'),
                vn:  $("#id_vn").is(':checked'),
                df:  $("#id_df").is(':checked'),
                gf:  $("#id_gf").is(':checked'),

                happeningNow: $("#active-filter-btn").text().trim(),
                
                // https://electrictoolbox.com/jquery-form-elements-by-name/
                // idk
                csrfmiddlewaretoken:$('#dietary-restrictions-form input[name=csrfmiddlewaretoken]').val()
            },
            success: updateMapMarkers,
            error: updateError
        });
        
        console.log("Done");
        // contemplate why browsers are hostile to ajax requests. 
        // I suppose it would have been smart to just make one form at the very beginning. 
    }
}

//
function getCSRFToken() {
    let cookies = document.cookie.split(";")
    for (let i = 0; i < cookies.length; i++) {
        let c = cookies[i].trim()
        if (c.startsWith("csrftoken=")) {
            return c.substring("csrftoken=".length, c.length)
        }
    }
    return "unknown";
}


// that clock thing that refreshes when the user uses the browser "back" or "forward" buttons from a page that was hashed.
setInterval(function(){
    if (window.location.hash != hash) {
        hash = window.location.hash;
        decode_ajax_hash();
    }
}, 100);

// useful to have this when the user uses the browser "back" or "forward" buttons from a page that didn't have a hash. 
$(window).on("load", function(e) {
    decode_ajax_hash();
});


// function background_ajax() {
//     $("#filter-form").submit();
// }

// window.setInterval(background_ajax, 5000);

