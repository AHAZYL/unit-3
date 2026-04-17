(function () {
    // Global variables
    // Attribute objects with human-readable labels, units, and descriptions
    var attrObjects = [
        {
            attr: "mean_temp",
            label: "Mean Temperature",
            unit: "°C",
            description: "Average county temperature during the study period."
        },
        {
            attr: "max_temp",
            label: "Maximum Temperature",
            unit: "°C",
            description: "Highest observed county temperature during the study period."
        },
        {
            attr: "min_temp",
            label: "Minimum Temperature",
            unit: "°C",
            description: "Lowest observed county temperature during the study period."
        },
        {
            attr: "wind_speed",
            label: "Wind Speed",
            unit: "m/s",
            description: "Average wind speed measured for each county."
        },
        {
            attr: "solar_radiation",
            label: "Solar Radiation",
            unit: "W/m²",
            description: "Amount of incoming solar energy received in each county."
        },
        {
            attr: "humidity",
            label: "Humidity",
            unit: "%",
            description: "Average relative humidity for each county."
        }
    ];

    // Keep list of attribute names for joins and loops
    var attrArray = attrObjects.map(function (d) {
        return d.attr;
    });

    // Object storing which variables are currently expressed
    var expressed = {
        x: "max_temp",
        y: "min_temp",
        color: "mean_temp"
    };

    // Responsive chart frame dimensions
    var chartWidth = window.innerWidth < 700 ? window.innerWidth - 40 : window.innerWidth * 0.5 - 25,
        chartHeight = window.innerHeight - 170;

    // Chart margins
    var leftPadding = 70,
        rightPadding = 25,
        topPadding = 45,
        bottomPadding = 65;

    var chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topPadding - bottomPadding;

    // Initialize map on page load
    window.onload = setMap;

    // Create the map
    function setMap() {

        // Responsive map size
        var width = window.innerWidth < 700 ? window.innerWidth - 40 : window.innerWidth * 0.5 - 25,
            height = window.innerHeight - 170;

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

            // Create navbar title, subtitle, and dropdown menus
            createTitle();
            createSubtitle();
            createDropdown(csvData, "color", "Map + Bubble Color/Size");
            createDropdown(csvData, "x", "Bubble X-Axis");
            createDropdown(csvData, "y", "Bubble Y-Axis");

            // Create description panel below the visualizations
            createDescription();
            updateDescription();
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

    // Helper: get label for attribute
    function getAttrLabel(attrName) {
        for (var i = 0; i < attrObjects.length; i++) {
            if (attrObjects[i].attr === attrName) {
                return attrObjects[i].label;
            }
        }
        return attrName;
    }

    // Helper: get unit for attribute
    function getAttrUnit(attrName) {
        for (var i = 0; i < attrObjects.length; i++) {
            if (attrObjects[i].attr === attrName) {
                return attrObjects[i].unit;
            }
        }
        return "";
    }

    // Helper: get description for attribute
    function getAttrDescription(attrName) {
        for (var i = 0; i < attrObjects.length; i++) {
            if (attrObjects[i].attr === attrName) {
                return attrObjects[i].description;
            }
        }
        return "";
    }

    // Helper: create bubble size scale
    function createRadiusScale(csvData) {
        var maxValue = d3.max(csvData, function (d) {
            return parseFloat(d[expressed.color]);
        });

        return d3.scaleSqrt()
            .domain([0, maxValue])
            .range([5, 22]);
    }

    // Color scale
    function makeColorScale(data) {
        var colorClasses = [
            "#fde0dd",
            "#fcbba1",
            "#fc9272",
            "#ef3b2c",
            "#99000d"
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
                    return "#d9d9d9";
                }
            })
            .on("mouseover", function (event, d) {
                highlight({
                    county: d.properties.NAME,
                    mean_temp: d.properties.mean_temp,
                    max_temp: d.properties.max_temp,
                    min_temp: d.properties.min_temp,
                    wind_speed: d.properties.wind_speed,
                    solar_radiation: d.properties.solar_radiation,
                    humidity: d.properties.humidity
                });
            })
            .on("mouseout", function (event, d) {
                dehighlight({ county: d.properties.NAME });
            })
            .on("mousemove", moveLabel);
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

        var radiusScale = createRadiusScale(csvData);

        // Create chart SVG
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        // Inner chart group
        var chartInner = chart.append("g")
            .attr("class", "chartInner")
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
            .attr("class", function (d) {
                return "bubble " + d.county
                    .replace(/\s+/g, "_")
                    .replace(/[^\w]/g, "");
            })
            .attr("r", function (d) {
                return radiusScale(parseFloat(d[expressed.color]));
            })
            .attr("cx", function (d) {
                return xScale(parseFloat(d[expressed.x]));
            })
            .attr("cy", function (d) {
                return yScale(parseFloat(d[expressed.y]));
            })
            .style("fill", function (d) {
                return colorScale(parseFloat(d[expressed.color]));
            })
            .on("mouseover", function (event, d) {
                highlight(d);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d);
            })
            .on("mousemove", moveLabel);

        // Chart title
        chart.append("text")
            .attr("class", "chartTitle")
            .attr("x", chartWidth / 2)
            .attr("y", 24)
            .style("text-anchor", "middle")
            .text("County Climate Comparison Bubble Chart");

        // X label
        chart.append("text")
            .attr("class", "axisLabel xLabel")
            .attr("x", leftPadding + chartInnerWidth / 2)
            .attr("y", chartHeight - 15)
            .style("text-anchor", "middle")
            .text(getAttrLabel(expressed.x) + " (" + getAttrUnit(expressed.x) + ")");

        // Y label
        chart.append("text")
            .attr("class", "axisLabel yLabel")
            .attr("transform", "rotate(-90)")
            .attr("x", -(topPadding + chartInnerHeight / 2))
            .attr("y", 22)
            .style("text-anchor", "middle")
            .text(getAttrLabel(expressed.y) + " (" + getAttrUnit(expressed.y) + ")");
    }

    // Create page title in navbar
    function createTitle() {
        d3.select(".navbar")
            .append("h1")
            .attr("class", "pageTitle")
            .text("Wisconsin County Climate Dashboard");
    }

    // Create subtitle
    function createSubtitle() {
        d3.select(".navbar")
            .append("p")
            .attr("class", "pageSubtitle")
            .text("Interactive comparison of county-level temperature, wind, solar radiation, and humidity across Wisconsin.");
    }

    // Create dropdown menu for attribute selection
    function createDropdown(csvData, expressedAttribute, menuLabel) {

        // add dropdown label
        d3.select(".navbar")
            .append("p")
            .attr("class", "dropdown-label")
            .text(menuLabel + ": ");

        // add select element
        var dropdown = d3.select(".navbar")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function () {
                changeAttribute(this.value, expressedAttribute, csvData);
            });

        // add initial option
        dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .property("selected", true)
            .text(getAttrLabel(expressed[expressedAttribute]));

        // add attribute name options
        dropdown.selectAll("attrOptions")
            .data(attrObjects)
            .enter()
            .append("option")
            .attr("value", function (d) { return d.attr; })
            .text(function (d) { return d.label; });
    }

    // Create description section
    function createDescription() {
        d3.select("body")
            .append("div")
            .attr("class", "infoPanel")
            .attr("id", "infoPanel");
    }

    // Update description section
    function updateDescription() {
        var html =
            "<h2>About This Dashboard</h2>" +
            "<p><b>Aim:</b> This map explores county-level climate variation across Wisconsin and helps users compare how temperature, wind, solar radiation, and humidity differ spatially.</p>" +
            "<p><b>How to read the map:</b> The choropleth map shows the currently selected <b>Map + Bubble Color/Size</b> variable across Wisconsin counties. Darker red indicates higher values, and lighter red indicates lower values.</p>" +
            "<p><b>How to read the bubble chart:</b> Each circle represents one Wisconsin county. The <b>X-axis</b> and <b>Y-axis</b> show two selected climate variables, while <b>bubble size and color</b> both represent the selected color/size variable. Larger circles indicate higher values of that selected variable.</p>" +
            "<h3>Current Variables</h3>" +
            "<ul>" +
            "<li><b>Map + Bubble Color/Size:</b> " + getAttrLabel(expressed.color) + " (" + getAttrUnit(expressed.color) + ") — " + getAttrDescription(expressed.color) + "</li>" +
            "<li><b>Bubble X-Axis:</b> " + getAttrLabel(expressed.x) + " (" + getAttrUnit(expressed.x) + ") — " + getAttrDescription(expressed.x) + "</li>" +
            "<li><b>Bubble Y-Axis:</b> " + getAttrLabel(expressed.y) + " (" + getAttrUnit(expressed.y) + ") — " + getAttrDescription(expressed.y) + "</li>" +
            "</ul>" +
            "<h3>Parameter Definitions</h3>" +
            "<ul>" +
            "<li><b>Mean Temperature:</b> Average county temperature during the study period.</li>" +
            "<li><b>Maximum Temperature:</b> Highest observed county temperature during the study period.</li>" +
            "<li><b>Minimum Temperature:</b> Lowest observed county temperature during the study period.</li>" +
            "<li><b>Wind Speed:</b> Average wind speed measured for each county.</li>" +
            "<li><b>Solar Radiation:</b> Amount of incoming solar energy received in each county.</li>" +
            "<li><b>Humidity:</b> Average relative humidity for each county.</li>" +
            "</ul>";

        d3.select("#infoPanel").html(html);
    }

    // Dropdown change event handler
    function changeAttribute(attribute, expressedAttribute, csvData) {

        // Change the expressed attribute
        expressed[expressedAttribute] = attribute;

        // Recreate x and y scales
        var yScale = createYScale(csvData, chartInnerHeight);
        var xScale = createXScale(csvData, chartInnerWidth);

        // Recreate the color scale
        var colorScale = makeColorScale(csvData);

        // Recreate the radius scale
        var radiusScale = createRadiusScale(csvData);

        // Recolor enumeration units
        d3.selectAll(".counties")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                var value = d.properties[expressed.color];
                if (value || value === 0) {
                    return colorScale(d.properties[expressed.color]);
                } else {
                    return "#d9d9d9";
                }
            });

        // Update bubbles
        d3.selectAll(".bubble")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                return colorScale(parseFloat(d[expressed.color]));
            })
            .attr("r", function (d) {
                return radiusScale(parseFloat(d[expressed.color]));
            })
            .attr("cx", function (d) {
                return xScale(parseFloat(d[expressed.x]));
            })
            .attr("cy", function (d) {
                return yScale(parseFloat(d[expressed.y]));
            });

        // Update axes
        d3.select(".xaxis")
            .transition()
            .duration(1000)
            .call(d3.axisBottom().scale(xScale));

        d3.select(".yaxis")
            .transition()
            .duration(1000)
            .call(d3.axisLeft().scale(yScale));

        // Update axis labels
        d3.select(".xLabel")
            .text(getAttrLabel(expressed.x) + " (" + getAttrUnit(expressed.x) + ")");

        d3.select(".yLabel")
            .text(getAttrLabel(expressed.y) + " (" + getAttrUnit(expressed.y) + ")");

        // Update description
        updateDescription();
    }

    // Function to highlight linked county and bubble
    function highlight(props) {

        d3.selectAll("." + props.county
            .replace(/\s+/g, "_")
            .replace(/[^\w]/g, ""))
            .classed("selected", true)
            .raise();

        // Create label
        setLabel(props);
    }

    // Function to dehighlight linked county and bubble
    function dehighlight(props) {

        d3.selectAll("." + props.county
            .replace(/\s+/g, "_")
            .replace(/[^\w]/g, ""))
            .classed("selected", false);

        // Remove label
        d3.select(".infolabel").remove();
    }

    // Function to create dynamic label
    function setLabel(props) {

        // Label content
        var labelAttribute =
            "<h1>" + parseFloat(props[expressed.color]).toFixed(2) + " " + getAttrUnit(expressed.color) +
            "</h1><b>" + props.county + "</b><div class='labelname'>" +
            getAttrLabel(expressed.color) + "</div>";

        // Create info label div
        d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .html(labelAttribute);
    }

    // Function to move label with mouse
    function moveLabel(event) {

        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect().width;

        // Default positions
        var x1 = event.clientX + 12,
            y1 = event.clientY - 75;

        // Alternate positions (avoid overflow)
        var x2 = event.clientX - labelWidth - 12,
            y2 = event.clientY + 25;

        // Check horizontal overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;

        // Check vertical overflow
        var y = event.clientY < 75 ? y2 : y1;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    }

})();