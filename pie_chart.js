// this is a smaller version
var isBusy = true

var populationThreshold = .01
var populationPercentThreshold = .02

var sliceColorMap
var sliceList
var allSliceTypes
var dataBucket

var colorArray = ["white", "#0073AE", "#4575b4", "#74add1", "#abd9e9", "#ffffbf", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026", "#e0f3f8"]

var sliceWidth = 300
var sliceHeight = 200
var sliceRadius = Math.min( sliceWidth, sliceHeight ) / 3
var sliceShift = sliceRadius * 1.2 // label arc bend points

var arc
var outerArc
var innerArc
var transitionDuration = 500
var label_group, arc_group, arcs, sliceLabel

var pieDataLayout
var pieChart

function getPercentInterval()
{
	return isBusy ? 15 : 7
}

function getCount()
{
	return isBusy ? 33 : 22
}

function init ()
{
	arc = d3.svg.arc()
		.outerRadius( sliceRadius )
		.innerRadius( sliceRadius / 3 );

	pieDataLayout = d3.layout.pie()
		.value( provideArcSizeData )
		.sort(null)

	outerArc = d3.svg.arc()
		.innerRadius(sliceRadius * 0.9)
		.outerRadius(sliceRadius * 1.3)
	innerArc = d3.svg.arc()
		.innerRadius(sliceRadius * 0.9)
		.outerRadius(sliceRadius * 0.95)

	pieChart = d3.select(".pieChart").append("svg")
		.attr( "width", sliceWidth )
		.attr( "height", sliceHeight * 3 )
		.append( "g" )
		.attr( "transform", "translate(" + sliceWidth / 2 + "," + (sliceHeight / 3* 2 - 10/*+ 10*/) + ")" );

	arc_group = pieChart.append("g")
		.attr("class", "arcGroup")
	label_group = pieChart.append("g")
		.attr("class", "lblGroup")

	draw()
}

/*
callout label coordinate sockets to calculate label layout in case of narrow segments.
The segments will be moved up- and downwards, on the left and right.
ySockets:
	11	21

	12	22
 */
var ySocket11 = []
var ySocket12 = []
var ySocket21 = []
var ySocket22 = []
var socketMap = {}
var yGap = 10 // minimum vertical label gap for the ring in case callout labels are too tight

var percent = d3.format(".1%")

function draw ()
{
	dataBucket = []
	allSliceTypes = []
	sliceList = []
	sliceColorMap = d3.map()

	var percentInterval = getPercentInterval()

	for (var i = 0; i < getCount(); i++)
	{
		sliceList[i] = { type: "Label " + i, population: (i + 1) % percentInterval == 0 ? 0.1 : 0.011 }
		sliceColorMap.set( "Label " + i, colorArray[i % colorArray.length] )
	}

	isBusy = !isBusy

	for (var slice in sliceList)
	{
		dataBucket[dataBucket.length] = { name: sliceList[slice].type, population: sliceList[slice].population } // 0, for color demo: 1
		allSliceTypes[allSliceTypes.length] = sliceList[slice].type
	}

	refreshChart( dataBucket );
}

function refreshChart( data ) {

	pieChart.selectAll( ".callout" ).remove()

/* segment arc - start*/
	var arcs = arc_group.selectAll( ".arc" )
			.data(pieLayoutData(data), pieLayoutKey)

	arcs.exit()
		.transition()
		.duration(transitionDuration).ease("sin")
		.style("opacity", 0)
		.attrTween('d', function (a)
		{
			var i = d3.interpolate(this._current, {startAngle: 0, endAngle: 0, value: 0})
			this._current = i(0)

			return function (t)
			{
				return arc(i(t))
			}
		})
		.remove() // now remove the exiting arcs

	var arcEnter = arcs.enter()
	var arcEnterPath = arcEnter.append("path")

	arcEnterPath.attr( "d", arc )
		.attr("fill", provideColor)
		.each(function (d)
		{
			this._current = { // store initial values
				data: d.data,
				value: d.value,
				startAngle: 0,
				endAngle: 0
			}
		})
		.attr("class", "arc")

	arcEnterPath.transition().duration(transitionDuration).ease("sin")
		.each("start", function() { d3.select(this)
			.style("opacity", 0)
		})

	arcs.transition().duration(transitionDuration).ease("sin")
		.attrTween("d", function (a)
		{
			var i = d3.interpolate(this._current, a)
			this._current = i(0)

			return function(t)
			{
				return arc(i(t))
			}
		}) // redraw the arcs
		.style("opacity", 1)

	arcs.append("title")
		.attr( "transform", function(d) { return "translate(" + arc.centroid( d ) + ")" } )
		.attr( "dy", ".35em" )
		.attr("class", "callout")
		.style( "text-anchor", "middle" )
		.text(getTooltip)
/* segment arc - finish*/

/* inner-segment text - start*/
	var sliceLabels = label_group.selectAll("text")
		.data(pieLayoutData(data), pieLayoutKey)

	sliceLabels.text( getCaption )

	sliceLabels.exit().transition().duration(transitionDuration).ease("sin")
		.style("opacity", 0)
		.attr("transform", function(d) {
			return "translate(" + arc.centroid({
				data: d.data,
				value: 0,
				startAngle: 0,
				endAngle: 0
			}) + ")"
			})
		.remove()

	var sliceLabelEnter = sliceLabels.enter().append( "text" )

	sliceLabelEnter.attr( "transform", function(d) { return "translate(" + arc.centroid( d ) + ")" } )
		.attr("class", "arcLabel")
		.text( getCaption )

	sliceLabelEnter.transition().duration(transitionDuration).ease("sin")
		.each("start", function() { d3.select(this)
			.style("opacity", 0)
			.attr("transform", function(d) {
			return "translate(" + arc.centroid({
				data: d.data,
				value: 0,
				startAngle: 0,
				endAngle: 0
			}) + ")"
			}) })

	sliceLabelEnter.transition().duration(transitionDuration).ease("sin")
		.attrTween("transform", function(d) {
			return "translate(" + arc.centroid(d) + ")"
			})

	sliceLabels.transition().duration(transitionDuration).ease("sin")
		.attr("transform", function(d) {
			return "translate(" + arc.centroid(d) + ")"
			})
		.style("opacity", 1)
/* inner-segment text - finish*/

/* Callout labels - start */
	var labels = pieChart.selectAll( ".label" )
		.data(pieLayoutData(data), pieLayoutKey)
	var labelEnter = labels.enter()
	var labelGroups = labelEnter.append("g").attr("class", "callout") // the class is used as a reference to clean inner objects out

	/*
	collect label coords here to see if they pile up too tightly in case of narrow segments
	ySockets:
		11	21

		12	22
	 */
	ySocket11 = []
	ySocket12 = []
	ySocket21 = []
	ySocket22 = []
	socketMap = {}

	var labelText = labelEnter
		.append("text")
		.attr({
			"dy": ".35em",
			"class": "callout"
		})
		.text(getCalloutLabel)

	labelText.attr("transform", function(d) {
		var pos = outerArc.centroid(d)
		pos[0] = sliceShift * (isLeftHalfring(d) ? 1 : -1)

		// collect label coords to see if they pile up too tightly in case of narrow segments
		collectLabelCoords(d, pos)

		return "translate(" + pos + ")"
	})
	.style("text-anchor", function(d)
	{
		return isLeftHalfring(d) ? "start":"end"
	})

	labels.exit()
		.remove()

	recalculateTightLabelCoords()

	// reshuffle the labels with new coords
	labelText
		.attr("transform", function(d)
		{
			var socket = socketMap[d.data.name]
			var pos = [socket.array[socket.index].pos[0] + (isLeftHalfring(d) ? 3 : -3), socket.array[socket.index].pos[1]]

			return "translate(" + pos + ")"
		})
/* Callout labels - finish */

/* Callout lines - start */
	var polyline = labelGroups.append("polyline").attr("class", "callout") // the class is used as a reference to clean inner objects out

	polyline
		.attr("points", getCalloutLine)

/* Callout lines - finish */

/* Callout dots - start */
	labelGroups.append("circle").attr({
		x: 0,
		y: 0,
		r: 1,
		transform: function (d, i) {
			centroid = innerArc.centroid(d)
			return "translate(" + innerArc.centroid(d) + ")"
		},
		"class": "label-circle callout"
	})
}

function sliceColor(d) {
	var colour = sliceColorMap.get(d)

	if (!colour)
	{
		colour = "#EEF8FC"
	}

	return colour
}

function pieLayoutData( data )
{
	return pieDataLayout(data).filter(function(d) {
		return d.data.population > populationThreshold
	})
}

function pieLayoutKey(d)
{
	return d.data.name
}

//Store the currently-displayed angles in this._current.
//Then, interpolate from this._current to the new angles.
function arcTween(a)
{
	var i = d3.interpolate(this._current, a)
	this._current = i(0)

	return function(t)
	{
		return arc(i(t))
	}
}

function midAngle(d){
	return d.startAngle + (d.endAngle - d.startAngle)/2;
}

function isLeftHalfring (d)
{
	return midAngle(d) < Math.PI
}

function provideArcSizeData( d ) {
	return d.population;
}

function getCaption( d ) {

	if( d.data.population > populationPercentThreshold ) {
		return percent(d.data.population)
	} else {
		return ""
	}
}

function getTooltip( d ) {

	if( d.data.count > 0 ) {
		return d.data.name + ": " + d.data.count
	} else {
		return ""
	}
}

function getCalloutLabel(d)
{
	return d.data.name
}

function provideColor( d ) {
	return sliceColor(d.data.name);
}

function spreadClockwise (socket, gravity)
{
	for (var i = 0; i < socket.length - 1; i++)
	{
		if (socket[i].pos[1] * gravity - socket[i + 1].pos[1] * gravity < yGap)
		{
			socket[i + 1].pos[1] = socket[i].pos[1] - yGap * gravity
		}
	}
}

function spreadCounterClockwise (socket, gravity)
{
	for (var i = socket.length - 2; i >= 0; i--)
	{
		if (socket[i].pos[1] * gravity - socket[i + 1].pos[1] * gravity < yGap)
		{
			socket[i].pos[1] = socket[i + 1].pos[1] + yGap * gravity
		}
	}
}

// collect label coords to see if they pile up too tightly in case of narrow segments
function collectLabelCoords (d, pos)
{
	if (pos[1] >= 0)
	{
		if (isLeftHalfring(d))
		{
			socketMap[d.data.name] = {array: ySocket22, index: ySocket22.length}
			ySocket22[ySocket22.length] = { pos: pos, d: d }
		}
		else
		{
			socketMap[d.data.name] = {array: ySocket12, index: ySocket12.length}
			ySocket12[ySocket12.length] = { pos: pos, d: d }
		}
	}
	else
	{
		if (isLeftHalfring(d))
		{
			socketMap[d.data.name] = {array: ySocket21, index: ySocket21.length}
			ySocket21[ySocket21.length] = { pos: pos, d: d }
		}
		else
		{
			socketMap[d.data.name] = {array: ySocket11, index: ySocket11.length}
			ySocket11[ySocket11.length] = { pos: pos, d: d }
		}
	}
}

//The segments will be moved up- and downwards, on the left and right.
function recalculateTightLabelCoords ()
{
	// y-middle gap - if the labels at the array borders are too tight (the leftmost and the rightmost points of the ring)
	if (ySocket21.length > 0 && ySocket22.length > 0 &&
			ySocket22[0].pos[1] - ySocket21[ySocket21.length - 1].pos[1] < yGap)
	{
		ySocket22[0].pos[1] = ySocket21[ySocket21.length - 1].pos[1] + yGap
	}

	if (ySocket12.length > 0 && ySocket11.length > 0 &&
			ySocket12[ySocket12.length - 1].pos[1] - ySocket11[0].pos[1] < yGap)
	{
		ySocket11[0].pos[1] = ySocket12[ySocket12.length - 1].pos[1] - yGap
	}

	// calc the remaining y-gaps
	spreadClockwise(ySocket11, 1)
	spreadClockwise(ySocket22, -1)
	spreadCounterClockwise(ySocket12, 1)
	spreadCounterClockwise(ySocket21, -1)
}

//The segments will be moved up- and downwards, on the left and right.
function getCalloutLine (d)
{
	var outerArcCentre = outerArc.centroid(d)
	var isLeft = isLeftHalfring(d)
	var originalPos = [(sliceShift - 5) * (isLeft ? 1 : -1), outerArcCentre[1]]
	var socket = socketMap[d.data.name]
	var gravity = (isLeft ? 1 : -1)
	var pos = socket.array[socket.index].pos
	var newIntersection = intersection(innerArc.centroid(d), outerArcCentre, [pos[0] + 10, pos[1]], pos)
	// an intersection between horizontal label line and tilted ring line

	if (newIntersection != null)
	{
		if (newIntersection[0] * gravity  - originalPos[0] * gravity > 0)
		{
			// in case of intersection being in the label area (where the text is already placed)
			// draw another vertically tilted line instead of the horizontal one
			// - usually in the case of groupping of narrow horizontal segments
			newIntersection = outerArcCentre
		}

	}
	else
	{ // they're parallel
		newIntersection = outerArcCentre
	}

	return [innerArc.centroid(d), newIntersection, pos]
}

function intersection (point1, point2, point3, point4)
{
	var x1 = point1[0]
	var y1 = point1[1]
	var x2 = point2[0]
	var y2 = point2[1]
	var x3 = point3[0]
	var y3 = point3[1]
	var x4 = point4[0]
	var y4 = point4[1]

	var d = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4)
	if (d == 0) return null // parallel

	var xi = ((x3-x4) * (x1*y2 - y1*x2) - (x1-x2) * (x3*y4 - y3*x4)) / d
	var yi = ((y3-y4) * (x1*y2 - y1*x2)  -(y1-y2) * (x3*y4  -y3*x4)) / d

	return [xi, yi]
}
