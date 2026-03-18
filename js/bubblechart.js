// SVG dimension variables
var w = 900, h = 500;

// container block
var container = d3.select("body")
    .append("svg")
    .attr("width", w)
    .attr("height", h)
    .attr("class", "container")
    .style("background-color", "rgba(0,0,0,0.2)");

// inner rectangle
var innerRect = container.append("rect")
    .datum(400)
    .attr("width", function(d){
        return d * 2;
    })
    .attr("height", function(d){
        return d;
    })
    .attr("class", "innerRect")
    .attr("x", 50)
    .attr("y", 50)
    .style("fill", "#FFFFFF");

// input city population data
var cityPop = [
    {
        city: "Madison",
        population: 233209
    },
    {
        city: "Milwaukee",
        population: 594833
    },
    {
        city: "Green Bay",
        population: 104057
    },
    {
        city: "Superior",
        population: 27244
    }
];


// minimum and maximum population values
var minPop = d3.min(cityPop, function(d){
    return d.population;
});

var maxPop = d3.max(cityPop, function(d){
    return d.population;
});

// x scale and y scale
var x = d3.scaleLinear()
    .range([90, 700])
    .domain([0, 3]);

var y = d3.scaleLinear()
    .range([450, 50])
    .domain([0, 700000]);

// color scale
var color = d3.scaleLinear()
    .range([
        "#c6dbef",
        "#08306b"
    ])
    .domain([
        minPop,
        maxPop
    ]);

// circles block
var circles = container.selectAll(".circles")
    .data(cityPop)
    .enter()
    .append("circle")
    .attr("class", "circles")
    .attr("id", function(d){
        return d.city;
    })
    .attr("r", function(d){
        var area = d.population * 0.01;
        return Math.sqrt(area / Math.PI);
    })
    .attr("cx", function(d, i){
        return x(i);
    })
    .attr("cy", function(d){
        return y(d.population);
    })
    .style("fill", function(d){
        return color(d.population);
    })
    .style("stroke", "#000");




// y axis generator
var yAxis = d3.axisLeft(y);

// axis block
var axis = container.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(50, 0)")
    .call(yAxis);


// title block
var title = container.append("text")
    .attr("class", "title")
    .attr("text-anchor", "middle")
    .attr("x", 450)
    .attr("y", 30)
    .text("City Populations");


// labels block
var labels = container.selectAll(".labels")
    .data(cityPop)
    .enter()
    .append("text")
    .attr("class", "labels")
    .attr("text-anchor", "left")
    .attr("y", function(d){
        return y(d.population);
    });

// first line of label
var nameLine = labels.append("tspan")
    .attr("class", "nameLine")
    .attr("x", function(d, i){
        return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
    })
    .text(function(d){
        return d.city;
    });

// create format generator
var format = d3.format(",");

// second line of label
var popLine = labels.append("tspan")
    .attr("class", "popLine")
    .attr("x", function(d, i){
        return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
    })
    .attr("dy", "15")
    .text(function(d){
        return "Pop. " + format(d.population);
    });