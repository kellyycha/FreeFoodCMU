
let map, heatmap;        // hold the map/heatmap
window.initMap = initMap;  // map.html calls this to open the map. 

// Creates the map on the google maps page. 
function initMap() {
    // Get the points first
    requestPoints();

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
    
    map = new google.maps.Map(document.getElementById("heatmap"), {
        center: { lat: 40.4432, lng: -79.9428 }, // hardcoded center of CMU campus. 
        zoom: 17, // 17 or 18 seems best
        styles: styles,
        mapTypeId: "satellite", // differentiation :D
    });

}

function requestPoints() {
    $.ajax({
        url: "/freefood/get-map-history/",
        dataType : "json",
        success: makeHeatmap,
        error: updateError
    });
}

function makeHeatmap(items) {
    let points = [];
    $(items).each(function() {
        points.push(new google.maps.LatLng(parseFloat(this.latitude), 
                                           parseFloat(this.longitude)));
    });
    
    heatmap = new google.maps.visualization.HeatmapLayer({
        data: points,
        map: map,
        radius: 16,
    })
}


function updateError(xhr) {
    console.log("didn't work")
}

