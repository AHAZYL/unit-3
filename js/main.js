window.onload = setMap;

// Set up choropleth map
function setMap() {

    // Map frame dimensions
    var width = 960,
        height = 600;

    // Create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    // Create projection
    var projection = d3.geoAlbers();

    var path = d3.geoPath()
        .projection(projection);

    // Load data
    var promises = [
        d3.csv("data/WI_Climate_May_Aug_2024.csv"),
        d3.json("data/WI_Counties.topojson")
    ];

    Promise.all(promises).then(callback);

    function callback(data) {
        var csvData = data[0],
            countiesData = data[1];

        console.log(csvData);
        console.log(countiesData);


        // Convert TopoJSON to GeoJSON
        var wiState = topojson.feature(
                countiesData,
                countiesData.objects.WI_Counties
            ),
            wiCounties = topojson.feature(
                countiesData,
                countiesData.objects.WI_Counties
            ).features;


        console.log(csvData[0].county);
        console.log(wiCounties[0].properties.NAME);


        // Fit projection to Wisconsin
        projection.fitExtent([[20, 20], [width - 20, height - 20]], wiState);

        // State background
        map.append("path")
            .datum(wiState)
            .attr("class", "state")
            .attr("d", path);

        // Draw counties
        map.selectAll(".counties")
            .data(wiCounties)
            .enter()
            .append("path")
            .attr("class", "counties")
            .attr("d", path);
    }
}