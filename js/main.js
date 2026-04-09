(function () {
    // Global variables
    // List of all attributes in dataset
    var attrArray = [
        "mean_temp",
        "max_temp",
        "min_temp",
        "wind_speed",
        "solar_radiation",
        "humidity"
    ];

    // Object storing which variables are currently expressed
    var expressed = {
        x: attrArray[1],      // max_temp
        y: attrArray[2],      // min_temp
        color: attrArray[0]   // mean_temp
    };


    // Initialize map on page load
    window.onload = setMap();

    // Creat the map
    function setMap() {

        // Define responsive map size
        var width = window.innerWidth * 0.5 - 25,
            height = 460;

        // Create SVG container for map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);


        // Define projection
        var projection = d3.geoAlbers();

        // Create path generator
        var path = d3.geoPath()
            .projection(projection);

        // Load CSV & TopoJSON
        var promises = [
            d3.csv("data/WI_Climate_May_Aug_2024.csv"),
            d3.json("data/WI_Counties.topojson")
        ];

        Promise.all(promises).then(callback);

        function callback(data) {

            var csvData = data[0],
                countiesData = data[1];


            // Convert TopoJSON → GeoJSON
            var wiState = topojson.feature(
                    countiesData,
                    countiesData.objects.WI_Counties
                ),
                wiCounties = topojson.feature(
                    countiesData,
                    countiesData.objects.WI_Counties
                ).features;

            // Fit projection to SVG frame
            projection.fitExtent([[20, 20], [width - 20, height - 20]], wiState);

            // Draw state background
            map.append("path")
                .datum(wiState)
                .attr("class", "state")
                .attr("d", path);



            // Join CSV data to counties
            wiCounties = joinData(wiCounties, csvData);

            // Create color scale
            var colorScale = makeColorScale(csvData);

            // Draw counties
            setEnumerationUnits(wiCounties, map, path, colorScale);

            // Create bubble chart
            setChart(csvData, colorScale);
        }
    }



    // JOIN CSV TO GEOJSON
    function joinData(wiCounties, csvData) {

        // Loop through CSV rows
        for (var i = 0; i < csvData.length; i++) {
            var csvCounty = csvData[i];
            var csvKey = csvCounty.county;

            // Loop through GeoJSON features
            for (var a = 0; a < wiCounties.length; a++) {
                var geojsonProps = wiCounties[a].properties;
                var geojsonKey = geojsonProps.NAME;

                // Match county names and assign all attributes to GeoJSON
                if (geojsonKey == csvKey) {
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvCounty[attr]);
                        geojsonProps[attr] = val;
                    });
                }
            }
        }

        return wiCounties;
    }




    // Color scale
    function makeColorScale(data) {
        var colorClasses = [
            "#fee5d9",
            "#fcae91",
            "#fb6a4a",
            "#de2d26",
            "#a50f15"
        ];

        // Quantile scale
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        // Build domain array using expressed.color
        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed.color]);
            domainArray.push(val);
        }

        colorScale.domain(domainArray);

        return colorScale;
    }



    // Draw counties
    function setEnumerationUnits(wiCounties, map, path, colorScale) {

        map.selectAll(".counties")
            .data(wiCounties)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "counties " + d.properties.NAME
                    .replace(/\s+/g, "_")
                    .replace(/[^\w]/g, "");
            })
            .attr("d", path)
            .style("fill", function (d) {
                var value = d.properties[expressed.color];

                // Apply color scale if data exists
                if (value || value === 0) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });
    }




    // Data range function
    function getDataValues(csvData, expressedValue) {

        var max = d3.max(csvData, function (d) {
            return parseFloat(d[expressedValue]);
        });

        var min = d3.min(csvData, function (d) {
            return parseFloat(d[expressedValue]);
        });

        // Add buffer so bubbles are not cut off
        var range = max - min,
            adjustment = range / csvData.length;

        return [min - adjustment, max + adjustment];
    }




    // Create scales
    function createYScale(csvData, chartInnerHeight) {

        var dataMinMax = getDataValues(csvData, expressed.y);

        return d3.scaleLinear()
            .range([chartInnerHeight, 0])
            .domain([dataMinMax[0], dataMinMax[1]]);
    }

    function createXScale(csvData, chartInnerWidth) {

        var dataMinMax = getDataValues(csvData, expressed.x);

        return d3.scaleLinear()
            .range([0, chartInnerWidth])
            .domain([dataMinMax[0], dataMinMax[1]]);
    }



    // Create axes
    function createChartAxes(chartInner, chartInnerHeight, yScale, xScale) {

        var yAxisScale = d3.axisLeft().scale(yScale);
        var xAxisScale = d3.axisBottom().scale(xScale);

        // Y axis
        chartInner.append("g")
            .attr("class", "yaxis")
            .call(yAxisScale);

        // X axis
        chartInner.append("g")
            .attr("class", "xaxis")
            .attr("transform", "translate(0," + chartInnerHeight + ")")
            .call(xAxisScale);
    }




    // Create bubble chart
    function setChart(csvData, colorScale) {

        var chartWidth = window.innerWidth * 0.5 - 25,
            chartHeight = 460;

        // Margins
        var leftPadding = 60,
            rightPadding = 20,
            topPadding = 30,
            bottomPadding = 55;

        var chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topPadding - bottomPadding;

        // Create chart SVG
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        // Inner chart group
        var chartInner = chart.append("g")
            .attr("transform", "translate(" + leftPadding + "," + topPadding + ")");

        // Scales
        var yScale = createYScale(csvData, chartInnerHeight);
        var xScale = createXScale(csvData, chartInnerWidth);

        // Axes
        createChartAxes(chartInner, chartInnerHeight, yScale, xScale);



        // Draw bubbles
        chartInner.selectAll(".circles")
            .data(csvData)
            .enter()
            .append("circle")
            .attr("class", "bubble")
            .attr("r", function (d) {
                var minRadius = 2.5;
                return Math.pow(parseFloat(d[expressed.color]), 0.5715) * minRadius;
            })
            .attr("cx", function (d) {
                return xScale(parseFloat(d[expressed.x]));
            })
            .attr("cy", function (d) {
                return yScale(parseFloat(d[expressed.y]));
            })
            .style("fill", function (d) {
                return colorScale(parseFloat(d[expressed.color]));
            });



        // Title
        chart.append("text")
            .attr("class", "chartTitle")
            .attr("x", chartWidth / 2)
            .attr("y", 20)
            .style("text-anchor", "middle")
            .text("Wisconsin Climate Bubble Chart");

        // X label
        chart.append("text")
            .attr("class", "axisLabel")
            .attr("x", leftPadding + chartInnerWidth / 2)
            .attr("y", chartHeight - 10)
            .style("text-anchor", "middle")
            .text("Maximum Temperature");

        // Y label
        chart.append("text")
            .attr("class", "axisLabel")
            .attr("transform", "rotate(-90)")
            .attr("x", -(topPadding + chartInnerHeight / 2))
            .attr("y", 18)
            .style("text-anchor", "middle")
            .text("Minimum Temperature");
    }

})();