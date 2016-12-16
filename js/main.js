/*********************************************************
Geography 575 Lab 3 Example: Coordinated Visualization using D3

Copyright (c) March 2013, Carl Sack and the University of Wisconsin-Madison Cartography Program
MIT License

modified by R Donohue, 2013
**********************************************************/

var expressed = "mortality"; //initial attribute expressed

function initialize(){
	//<-window.onload
	setUI();
	setMap(); //->
};
var setUI = function(){
	$("#about").click(function(){
			if(this.innerHTML == 'about'){
				$("#sec1").slideUp(500);
				$(this).text('map');
			} else {
				$("#sec1").slideDown(500);
				$(this).text('about');
			}
		});
	// d3.select("#about")
		// .on('click', function(){
			// if(this.innerHTML == 'about'){	
				// d3.select("#sec1")
					// .transition()
					// .style('opacity',0)
					// .duration(500)
					// .remove();	
				// d3.select("#about")
					// .text('map');
			// } else {
				// d3.select("#sec1")
					// .add()
					// .transition()
					// .style('opacity',1)
					// .duration(500)
					// ;	
				// d3.select("#about")
					// .text('about');
			// }
		// });

}
function setMap(){
	//<-initialize
	
	//map frame dimensions
	var width = 500;
	var height = 570;
	
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
	var keyArray = ["mortality","morbidity","behavior","clinics","economic","physical"]; //array of property keys	
			
	//retrieve data in csv data file for coloring choropleth	
	d3.csv("data/health-data.csv", function(csvData){
		var recolorMap = colorScale(csvData); //->
		drawPcp(csvData); //->
		//drawHistogram(csvData);

		//retrieve and process wisCounties json file
		d3.json("data/wi_counties_topo.json", function(error, wisCounties) {
			//variables for csv to json data transfer


			var jsonCounties = wisCounties.objects.counties.geometries; //for brevity
			//loop through csv data to assign each csv county's values to json county properties
				for (var i=0; i<csvData.length; i++) {		
					var csvCounty = csvData[i]; //the current county
					var csvFip = csvCounty.fips; //adm1 code from csv features
					//loop through json counties to assign csv data to the right county
					for (var j=0; j<jsonCounties.length; j++){
						//where adm1 codes match, attach csv data to json object
						if (jsonCounties[j].properties.fips == csvFip){
							//one more for loop to assign all five key/value pairs to json object
							for (var k=0; k<keyArray.length; k++){
								var key = keyArray[k]; //assign key from keys array
								var val = parseFloat(csvCounty[key]); //convert corresponding csv attribute value to float
								jsonCounties[j].properties[key] = val; //assign key and value pair to json object
							};
							jsonCounties[j].properties.name = csvCounty.name; //replace TopoJSON name property
							
							break; //stop looking through the json counties
						};
					};
				};
			//add counties to map as enumeration units colored by data
			var counties = map.selectAll(".county")
				.data(topojson.object(wisCounties, wisCounties.objects.counties).geometries) //bind counties data to path element
				.enter() //create elements
				.append("path") //append elements to svg
				.attr("class", function(d) { return 'county '+d.properties.fips; }) //set the admin code as element id for later reference
				.attr("d", path) //project data as geometry in svg
				.style("fill", function(d) { //color enumeration units
					return choropleth(d, recolorMap); //->
			   	})
				.on("mousemove", moveLabel) //->
				.on("mouseover", highlight) //->
				.on("mouseout", dehighlight) //->
				.on("click", selectTarget)
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
			"#F7FBFF",
			"#DEEBF7",
			"#C6DBEF",
			"#9ECAE1",
			"#6BAED6",
			"#4292C6",
			"#2171B5",
			"#08519C",
			"#08306B"
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
	
	if(d.properties){
	//Get data value
		var value = d.properties[expressed];
		if (value) {
			return recolorMap(value);
		}else {
			return "#ccc";
		}
	} else {
		var value = d[expressed];
		return recolorMap(value);
	} 
};
function drawHistogram(inData){
	var values = [];
	
	inData.forEach(function(att){
		att.fips = "id"+att.fips;
		values.push(parseFloat(att[expressed]));
	});
	values.sort(function(a,b){ return a-b});

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
	
	var recolorMap = colorScale(csvData); //->

	var color = d3.scale.quantile() //designate quantile scale generator
		.range([
			"#F7FBFF",
			"#DEEBF7",
			"#C6DBEF",
			"#9ECAE1",
			"#6BAED6",
			"#4292C6",
			"#2171B5",
			"#08519C",
			"#08306B"
		])
		.domain([d3.min(csvData, function(d) { return Number(d[expressed]); }),
		d3.max(csvData, function(d) { return Number(d[expressed]); })]);
		

	// //pcp dimensions
	var width = 460;
	var height = 323;

	//create attribute names array for pcp axes
	var keys = [], attributes = [];
	//fill keys array with all property names
	for (var key in csvData[0]){
		keys.push(key);
	};
	//fill attributes array with only the attribute names
	for (var i=2; i<keys.length; i++){
		attributes.push(keys[i]);
	};
	attributes.forEach(function(each){
		d3.select('#pcpAxisTitles')
			.append('span')
			.attr('id',each)
			.html(each)
			.on("click", function(){ //click listener
				d3.selectAll('#pcpAxisTitles span').classed('titleSelected', false);
				d3.select(this).attr('class','titleSelected');
				sequence(this, csvData); 
				var target = d3.select("#infoWindow");
				console.log(target);
			});
	});
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
		.attr("class", "pcplot")
		.attr("transform", d3.transform( //change the container size/shape
			"scale(1, 1),"+ //shrink
			"translate(0, 0)")) //move; //for styling
			
	//add lines
	var pcpLines = pcplot.append("g") //append a container element
		.attr("class", "pcpLines") //class for styling lines
		.selectAll("path") //prepare for new path elements
		.data(csvData) //bind data
		.enter() //create new path for each line
		.append("path") //append each line path to the container element
		.attr("class", function(d){
 			return 'pcpLine '+d.fips; //id each line by admin code
 		})
		.attr("d", function(d){
			return line(attributes.map(function(att){ //map coordinates for each line to arrays object for line generator
				return [coordinates(att), scales[att](d[att])]; //x and y coordinates for line at each axis
			}));
		})
		.style('stroke',function(d){
			return color(Number(d[expressed]));;
		})
		.on("mouseover", highlight)
		.on("mouseout", dehighlight) //->
		.on("mousemove", moveLabel)
		.on("click", selectTarget)
		.append("desc") //append the current color as a desc element
		.text(function(d) { 
			return choropleth(d, recolorMap); //->
		});; //->

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
				})
				// .append("div") //add child div for feature name
					// .attr("class", "attributeName") //for styling name
					// .html('howdy there') //add feature name to label;	
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
	}
};

function highlight(data){
	//<-setMap d3.json counties.on("mouseover"...
	//<-drawPcp pcpLines.on("mouseover"...
	
	//console.log(data.type,this);
	
	d3.selection.prototype.moveToFront = function() {
		return this.each(function(){
			this.parentNode.appendChild(this);
	  });
	};

	var props = datatest(data);	//standardize json or csv data
	d3.selectAll('#map')
		.select("."+props.fips) //select the current province in the DOM
		.style("stroke", "yellow")
		.style("stroke-width",'3')
		.moveToFront()
		.append('div')
		.text('id','infoWindow')

		
	//highlight corresponding pcp line
	d3.selectAll(".pcpLines") //select the pcp lines
		.select("."+props.fips) //select the right pcp line
		.style("stroke","#ffd700")
		.style("stroke-width",'.08em')
		.moveToFront(); //restyle the line
	
	 var labelAttribute = "<h3>"+props.name+"</h3><h4>"+expressed+" rank:   "+props[expressed]+"</h4>"; //html string for attribute in dynamic label

 	if(this.parentNode.className.baseVal == 'pcpLines'){
		var targetDiv = '#pcpContainer';
	} else {
		var targetDiv = '#map';
	}
// 	//create info label div
 	var infolabel = d3.select(targetDiv)
		.append("div")
		.attr("id", "infolabel") //for styling label
		.html(labelAttribute) //add text
};

function dehighlight(data){
	//<-setMap d3.json svg.selectAll(".counties").on("mouseout"...
	//<-drawPcp pcpLines.on("mouseout"...

	var props = datatest(data);	//standardize json or csv data
	
 	d3.selectAll('#map')
		.select("."+props.fips)
		.style("stroke", "#202020")
		.style("stroke-width",'.04em'); //set the enumeration unit fill to black

 	//dehighlight corresponding pcp line
 	d3.selectAll(".pcpLines") //select the pcp lines
 		.select("."+props.fips) //select the right pcp line
		.style("stroke",function(d){
			return this.childNodes[0].textContent;
		})
		.style("stroke-width",'1'); //restyle the line
 
	d3.select("#infolabel").remove(); //remove info label
	
};

function moveLabel() {
	//<-setMap d3.json counties.on("mousemove"...
	//<-drawPcp pcpLines.on("mousemove"...
	var x = d3.mouse(this)[0]+10; //horizontal label coordinate
	var y = d3.mouse(this)[1]-60; //vertical label coordinate
	
	var mug = d3.select("#infolabel") //select the label div for moving
		.style("left", x+"px") //reposition label horizontal
		.style("top", y+"px"); //reposition label vertical
	
	
	var limitWidth = mug[0][0].offsetWidth + mug[0][0].offsetLeft;
	var parentWidth = mug[0][0].parentNode.offsetWidth;
	
	if( limitWidth >= parentWidth){
		var newPos = x - mug[0][0].offsetWidth - 40;
		mug.style("left", newPos+"px");
	}

};

function selectTarget(e){

	// d3.selection.prototype.moveToFront = function() {
		// return this.each(function(){
			// this.parentNode.appendChild(this);
	  // });
	// };
	var props = datatest(e);
	
	var mug2 = d3.selectAll('#map')
		.select("."+props.fips)
		.attr('class','selectedMug');
		//.moveToFront(); //restyle the line
	d3.selectAll(".pcpLines") //select the pcp lines
		.select("."+props.fips) //select the right pcp line
		.attr('class','selectedMug');
		//.moveToFront(); //restyle the line
	
}


function sequence(axis, csvData){
	//<-drawPcp axes.append .on("click"...

	//restyle the axis
	d3.selectAll(".axes") //select every axis
		.style("stroke-width", "5px"); //make them all thin
	axis.style.strokeWidth = "10px"; //thicken the axis that was clicked
	axis.style.strokeColor = "#08519C";
	var mug = d3.select(axis)
		.classed('selected', true);
	console.log(mug);
	
	expressed = axis.id; //change the class-level attribute variable
	d3.selectAll('#pcpContainer')
		.select('#'+axis.id)
		.style('strokeColor','#08519C');
	//recolor the map
	d3.selectAll(".county") //select every county
		.style("fill", function(d) { //color enumeration units
			return choropleth(d, colorScale(csvData)); //->
		})
		.select("desc") //replace the color text in each county's desc element
			.text(function(d) {
				return choropleth(d, colorScale(csvData)); //->
			});
	d3.selectAll('.pcpLine')
		.style("stroke", function(d) { //color enumeration units
			return choropleth(d, colorScale(csvData));
		})
		
};

window.onload = initialize(); //->