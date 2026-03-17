// Add all scripts to the JS folder//execute script when window is loaded
window.onload = function(){

    //SVG dimension variables
    var w = 900, h = 500;

    //container block
    var container = d3.select("body") //get the <body> element from the DOM
        .append("svg") //put a new svg in the body
        .attr("width", w) //assign the width
        .attr("height", h) //assign the height
        .attr("class", "container") //assign a class name
        .style("background-color", "rgba(0,0,0,0.2)"); //background color

    //innerRect block
    var innerRect = container.append("rect") //put a new rect in the svg
        .datum(400) //a single value is a datum
        .attr("width", function(d){
            return d * 2; //400 * 2 = 800
        })
        .attr("height", function(d){
            return d; //400
        })
        .attr("class", "innerRect") //class name
        .attr("x", 50) //horizontal position
        .attr("y", 50) //vertical position
        .style("fill", "#FFFFFF"); //fill color

};