var XYZprofiles = require('users/amberthomas/profiles_histograms:pointRegionXYZprofiles');


var maskClouds = function(image) {
  var scored = ee.Algorithms.Landsat.simpleCloudScore(image);
  return image.updateMask(scored.select(['cloud']).lt(20));
};

// This function masks clouds and adds quality bands to Landsat 8 images.
var addQualityBands = function(image) {
  return maskClouds(image)
    // NDVI
    .addBands(image.normalizedDifference(['B5', 'B4']))
    // time in days
    .addBands(image.metadata('system:time_start'));
};



var dataset = ee.ImageCollection('LANDSAT/LC08/C01/T1')
                  .filterDate('2013-01-01', '2013-12-31')
                  .map(addQualityBands);

var recentValueComposite = dataset.qualityMosaic('system:time_start');

var clip_geom = ee.Geometry.Rectangle(-122.538, 37.8306,-121.8439, 37.3931);

var trueColor432 = dataset.select(['B5', 'B4', 'B3']);
var trueColor432Vis = {
  min: 0.0,
  max: 30000.0,
};
Map.setCenter(-122.374, 37.8239, 8);
//Map.addLayer(trueColor432, trueColor432Vis, 'True Color (432)');

Map.setCenter(-122.374, 37.8239, 8); // San Francisco Bay
var recentValueCompositeVis = {
  bands: ['B5', 'B4', 'B3'],
  min: 0.0,
  max: 30000.0};
Map.addLayer(recentValueComposite, recentValueCompositeVis, 'Composite');

var comp_img = ee.Image(recentValueComposite.select('B1','B2','B3','B4','B5','B6','B7'));

/**** UI adjustments *****/

Map.style().set('cursor', 'crosshair');

// Create a map to be used as the zoom box.
var zoomBox = ui.Map({style: {stretch: 'both', shown: false}})
    .setControlVisibility(false);
zoomBox.addLayer(recentValueComposite, recentValueCompositeVis);

zoomBox.onClick(function(coords) {
  print([coords.lon, coords.lat])
});


// Update the center of the zoom box map when the base map is clicked.
Map.onClick(function(coords) {
  centerZoomBox(coords.lon, coords.lat);
  if (Map.layers().length() > 2){
    Map.layers().remove(Map.layers().get(Map.layers().length()-1));
    Map.layers().remove(Map.layers().get(Map.layers().length()-1));
    Map.layers().remove(Map.layers().get(Map.layers().length()-1));
  }
  XYZprofiles.build_profiles(comp_img, ee.Geometry.Point(coords.lon, coords.lat), zoomBox.getBounds(), ['B2', 'B3', 'B4', 'B5'])

});

var centerZoomBox = function(lon, lat) {
  instructions.style().set('shown', false);
  zoomBox.style().set('shown', true);
  zoomBox.setCenter(lon, lat, 8);
  var bounds = zoomBox.getBounds();
  var w = bounds[0], e = bounds [2];
  var n = bounds[1], s = bounds [3];
  var outline = ee.Geometry.MultiLineString([
    [[w, s], [w, n]],
    [[e, s], [e, n]],
    [[w, s], [e, s]],
    [[w, n], [e, n]],
  ]);
  var layer = ui.Map.Layer(outline, {color: 'FFFFFF'}, 'Zoom Box Bounds');
  Map.layers().set(1, layer);
};

// Add a label and the zoom box map to the default map.
var instructions = ui.Label('Click the map to see an area in detail.', {
  stretch: 'both',
  textAlign: 'center',
  backgroundColor: '#d3d3d3'
});
var panel = ui.Panel({
  widgets: [zoomBox, instructions],
  style: {
    position: 'top-right',
    height: '300px',
    width: '300px',
  }
});
Map.add(ui.Label('Composite Radience'));
Map.add(panel);

