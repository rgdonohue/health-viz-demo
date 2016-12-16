/*********************************************************
Geography 575 Lab 3 Example: Coordinated Visualization using D3

Copyright (c) March 2013, Carl Sack and the University of Wisconsin-Madison Cartography Program
MIT License

modified by R Donohue, 2013
**********************************************************/

var expressed = "mortality"; //initial attribute expressed

function initialize(){
	//<-window.onload
	
	setMap(); //->
};

function setMap(){
	//<-initialize
	
	//map frame dimensions
	var width = 500;
	var height = 600;
	
	//create a new svg element with the above dimensions
	var map = d3.select("#map")
		.append("svg")
		.attr("width", d3.select("#map").style("width"))
		.attr("height", height);
	
	//create wisCounties albers equal area conic projection
	var projection = d3.geo.albers()
		.center([0, 44.5])
		.rotate([90, 0])
		.parallels([43, 62])
		.scale(6500)
		.translate([width / 2, height / 2]);
	
	//create svg path generator using the projection
	var path = d3.geo.path()
		.projection(projection);
	
	//retrieve data in csv data file for coloring choropleth	
	d3.csv("data/health-data.csv", function(csvData){
		var recolorMap = colorScale(csvData); //->
		drawPcp(csvData); //->
		//drawHistogram(csvData);

		//retrieve and process wisCounties json file
		d3.json("data/wi_counties_topo.json", function(error, wisCounties) {
			//variables for csv to json data transfer
			var keyArray = ["mortality","morbidity","health_behaviors","clinical_care","social_economic","physical"]; //array of property keys	

			var jsonCounties = wisCounties.objects.counties.geometries; //for brevity
			//loop through csv data to assign each csv province's values to json province properties
			for (var i=0; i<csvData.length; i++) {		
				var csvCounty = csvData[i]; //the current province
				var csvFip = csvCounty.fips; //adm1 code from csv features
				//loop through json counties to assign csv data to the right province
				for (var j=0; j<jsonCounties.length; j++){
					//where adm1 codes match, attach csv data to json object
					if (jsonCounties[j].id == csvFip){
						
						//one more for loop to assign all five key/value pairs to json object
						for (var k=0; k<keyArray.length; k++){
							var key = keyArray[k]; //assign key from keys array
							var val = parseFloat(csvCounty[key]); //convert corresponding csv attribute value to float
							
							jsonCounties[j].properties[key] = val; //assign key and value pair to json object
						};
						jsonCounties[j].properties.name = csvCounty.name; //replace TopoJSON name property
						jsonCounties[j].properties.fips = 'id'+csvFip;  // ids can't begin with numbers!
						
						break; //stop looking through the json counties
					};
				};
			};
			//add counties to map as enumeration units colored by data
			var counties = map.selectAll(".counties")
				.data(topojson.object(wisCounties, wisCounties.objects.counties).geometries) //bind counties data to path element
				.enter() //create elements
				.append("path") //append elements to svg
				.attr("class", "counties") //assign class for additional styling
				.attr("id", function(d) { return d.properties.fips }) //set the admin code as element id for later reference
				.attr("d", path) //project data as geometry in svg
				.style("fill", function(d) { //color enumeration units
					return choropleth(d, recolorMap); //->
			   	})
				//.on("mousemove", moveLabel) //->
				.on("mouseover", highlight) //->
				.on("mouseout", dehighlight) //->
				.append("desc") //append the current color as a desc element
				.text(function(d) { 
					return choropleth(d, recolorMap); //->
			   	});
		});
	});
};

function colorScale(csvData){
	//<-setMap d3.csv
	
	//create quantile classes with color scale
	var color = d3.scale.quantile() //designate quantile scale generator
		.range([
			"#F1EEF6",
			"#BDC9E1",
			"#74A9CF",
			"#2B8CBE",
			"#045A8D"
		])
		.domain([
		d3.min(csvData, function(d) { return Number(d[expressed]); }),
		d3.max(csvData, function(d) { return Number(d[expressed]); })
		]);

	//return the color scale generator
	return color;	
};

function choropleth(d, recolorMap){
	//<-setMap d3.json counties.style
	//<-setMap d3.json counties.append("desc").text
	
	//Get data value
	var value = d.properties[expressed];
	//If value exists, assign it a color; otherwise assign gray
	if (value) {
		return recolorMap(value);
	} else {
		return "#ccc";
	};
};
function drawHistogram(inData){
	var values = [];
	
	inData.forEach(function(att){
		att.fips = "id"+att.fips;
		values.push(parseFloat(att[expressed]));
	});
	values.sort(function(a,b){ return a-b});
	console.log(values);
	var w = 460;
	var h = 160;
	var barPadding = 1;
	
	var svg = d3.select("#infoWindow")
		.append("svg")
		.attr("width", w)
		.attr("height", h);
	
	svg.selectAll("rect")
	   .data(values)
	   .enter()
	   .append("rect")
	   .attr("x", function(d, i) {
			return i * (w / values.length);
	   })
	   .attr("y", function(d) {
			   		return h - (d * 4);
			   })
	   .attr("width", w / values.length - barPadding)
	   .attr("height", function(d) {
			return d * 4;
	   })
	   .attr("fill", function(d) {
			return "rgb(0, 0, " + (d * 10) + ")";
	   });
}
function drawPcp(csvData){
	//<-setMap d3.csv

	// //pcp dimensions
	var width = 460;
	var height = 280;

	//create attribute names array for pcp axes
	var keys = [], attributes = [];
	//fill keys array with all property names
	for (var key in csvData[0]){
		keys.push(key);
	};
	//fill attributes array with only the attribute names
	for (var i=3; i<keys.length; i++){
		attributes.push(keys[i]);
	};
	
 	//create horizontal pcp coordinate generator
	var coordinates = d3.scale.ordinal() //create an ordinal scale for plotting axes
		.domain(attributes) //horizontally space each attribute's axis evenly
		.rangePoints([0, width]); //set the horizontal scale width as the SVG width
		
    var axis = d3.svg.axis() //create axis generator
		.orient("left"); //orient generated axes vertically
	
	//create vertical pcp scale
	scales = {}; //object to hold scale generators
	attributes.forEach(function(att){ //for each attribute
    	scales[att] = d3.scale.linear() //create a linear scale generator for the attribute
        	.domain(d3.extent(csvData, function(data){ //compute the min and max values of the scale
				return +data[att]; //create array of data values to compute extent from
			})) 
        	.range([height, 0]); //set the height of each axis as the SVG height
	});
	
	var line = d3.svg.line(); //create line generator
	
	//create a new svg element with the above dimensions
	var pcplot = d3.select("#pcpContainer")
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("class", "pcplot") //for styling
		.append("g") //append container element
		.attr("transform", d3.transform( //change the container size/shape
			"scale(1, 1),"+ //shrink
			"translate(0, 0)")); //move
			
	//add lines
	var pcpLines = pcplot.append("g") //append a container element
		.attr("class", "pcpLines") //class for styling lines
		.selectAll("path") //prepare for new path elements
		.data(csvData) //bind data
		.enter() //create new path for each line
		.append("path") //append each line path to the container element
		.attr("id", function(d){

 			return "id"+d.fips; //id each line by admin code
 		})
		.attr("d", function(d){
			return line(attributes.map(function(att){ //map coordinates for each line to arrays object for line generator
				return [coordinates(att), scales[att](d[att])]; //x and y coordinates for line at each axis
			}));
		})
		.on("mouseover", highlight) //->
		.on("mouseout", dehighlight); //->
		//.on("mousemove", moveLabel); //->

 	//add axes	
	var axes = pcplot.selectAll(".attribute") //prepare for new elements
		.data(attributes) //bind data (attribute array)
		.enter() //create new elements
		.append("g") //append elements as containers
		.attr("class", "axes") //class for styling
		.attr("transform", function(d){
			return "translate("+coordinates(d)+")"; //position each axis container
		})
		.each(function(d){ //invoke the function for each axis container element
			d3.select(this) //select the current axis container element
				.call(axis //call the axis generator to create each axis path
					.scale(scales[d]) //generate the vertical scale for the axis
					.ticks(0) //no ticks
					.tickSize(0) //no ticks, I mean it!
				)
				.attr("id", d) //assign the attribute name as the axis id for restyling
				.style("stroke-width", "5px") //style each axis		
				.on("click", function(){ //click listener
					sequence(this, csvData); //->
				});	
		});
		
	pcplot.select("#"+expressed) //select the expressed attribute's axis for special styling
		.style("stroke-width", "10px");
};

function datatest(data){
	//<-highlight
	//<-dehighlight
	if (data.properties){ //if json data
		return data.properties;
	} else { //if csv data
		return data;
	};
};

function highlight(data){
	//<-setMap d3.json counties.on("mouseover"...
	//<-drawPcp pcpLines.on("mouseover"...

	var props = datatest(data);	//standardize json or csv data

	d3.select("#"+props.fips) //select the current province in the DOM
		.style("stroke", "yellow"); //set the enumeration unit fill to black

	var labelAttribute = "<p>"+props.name+": "+props[expressed]+": "+expressed+"</p>"; 

	//html string for attribute in dynamic label
	var labelName = props.name; //html string for name to go in child div
	
	//create info label div
	var infolabel = d3.select("#infoWindow").append("div")
		.attr("class", "infolabel") //for styling label
		.attr("id", props.fips+"label") //for future access to label div
		.html(labelAttribute) //add text
		.append("div") //add child div for feature name
			.attr("class", "labelname") //for styling name
			.html(labelName); //add feature name to label

	//highlight corresponding pcp line
	d3.selectAll(".pcpLines") //select the pcp lines
		 .select("#"+props.fips) //select the right pcp line
			 .style("stroke","#ffd700"); //restyle the line
};

function dehighlight(data){
	//<-setMap d3.json svg.selectAll(".counties").on("mouseout"...
	//<-drawPcp pcpLines.on("mouseout"...
	
	var props = datatest(data);	//standardize json or csv data
	
	var prov = d3.select("#"+props.fips); //designate selector variable for brevity
	var fillcolor = prov.select("desc").text(); //access original color from desc
	prov.style("stroke", 'white'); //reset enumeration unit to orginal color
	
	d3.select("#"+props.fips+"label").remove(); //remove info label
	
	 //dehighlight corresponding pcp line
	 d3.selectAll(".pcpLines") //select the pcp lines
		 .select("#"+props.fips) //select the right pcp line
			 .style("stroke","#1e90ff"); //restyle the line
};

function moveLabel() {
	//<-setMap d3.json counties.on("mousemove"...
	//<-drawPcp pcpLines.on("mousemove"...
	
	var x = d3.event.clientX+10; //horizontal label coordinate based mouse position stored in d3.event
	var y = d3.event.clientY-75; //vertical label coordinate
	d3.select(".infolabel") //select the label div for moving
		.style("margin-left", x+"px") //reposition label horizontal
		.style("margin-top", y+"px"); //reposition label vertical
};

function sequence(axis, csvData){
	//<-drawPcp axes.append .on("click"...
	
	//restyle the axis
	d3.selectAll(".axes") //select every axis
		.style("stroke-width", "5px"); //make them all thin
	axis.style.strokeWidth = "10px"; //thicken the axis that was clicked
	
	expressed = axis.id; //change the class-level attribute variable
	
	//recolor the map
	d3.selectAll(".counties") //select every province
		.style("fill", function(d) { //color enumeration units
			return choropleth(d, colorScale(csvData)); //->
		})
		.select("desc") //replace the color text in each province's desc element
			.text(function(d) {
				return choropleth(d, colorScale(csvData)); //->
			});
};

window.onload = initialize(); //->