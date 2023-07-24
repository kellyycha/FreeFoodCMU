let map;        // hold the map
var marker = null;    // hold the current marker
window.initMap = initMap;  // map.html calls this to open the map. 

// Creates the map on the google maps page. 
function initMap() {

    // https://developers.google.com/maps/documentation/javascript/style-reference
    // this turns off the "default pins" on the map. 
    let styles = [
        {
          "featureType": "all",
          "elementType": "labels.icon",
          "stylers": [
            { "visibility": "off" }
          ]
        }
      ]
    
    map = new google.maps.Map(document.getElementById("new-event-map"), {
        center: { lat: 40.4432, lng: -79.9428 }, // hardcoded center of CMU campus. 
        zoom: 17, // 17 or 18 seems best
        styles: styles,
    });


    // Click listener for a map. 
    map.addListener("click", (mapsMouseEvent) => {
        // Get the location! The command returns a float. 
        let lat = mapsMouseEvent.latLng.lat()
        let lng = mapsMouseEvent.latLng.lng()

        // set the selected_location in the form fields. 
        set_selected_location(lat, lng);

    });

}

// Helper function. Creates a new marker, updates lat/lng fields and the "currently selected location field" on the form.
function set_selected_location(lat, lng) {

    if (marker != null) {
        // remove current marker. 
        marker.setMap(null)
    }
    // add the marker
    marker = new google.maps.Marker({
        position: { lat: lat, 
                    lng: lng },
        map: map,
        optimized: false,
    })


    // Update the lat/lng fields (these should be hidden)
    let lat_elt = document.getElementById("id_location_lat");
    let lng_elt = document.getElementById("id_location_lng");
    lat_elt.value = lat;
    lng_elt.value = lng;

    // maybe we can get the address or something of the thing we are clicking on
    fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat}, ${lng}&key=AIzaSyB4--DpVDid7yY_Uqt6Pm1NL_NSN2eSty4`)
    .then((responseText) => {
        return responseText.json();
    })
    .then(jsonData => {
        document.getElementById("id_address").value = jsonData.results[0].formatted_address;
        // console.log(jsonData.results[0].formatted_address);
    })
    .catch(error => {
      // Sometimes the request fails because the lat/lng is too far away from the nearest "location". 
        document.getElementById("id_address").value = `(${lat}, ${lng})`;
    })
  }


// Use this function to set the "current" location to the browser's html5 geolocation.
function set_current_location() {
  // Geolocation testing
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        // do something with the position...
        console.log(`${pos.lat}, ${pos.lng}`)
        set_selected_location(pos.lat, pos.lng)
        map.setCenter(pos);
      },
      () => {
        console.log("geolocation service failed, because it's not enabled.")
      }
    )
  } else {
      console.log("Browser does not support geolocation...")
  }
  
}