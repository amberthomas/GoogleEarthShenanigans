// This function masks clouds in Landsat 8 imagery.
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
Map.addLayer(recentValueComposite.clip(clip_geom), recentValueCompositeVis, 'Composite');

/*****************/
//this chunk will make cospectral plots based on given bands 

var comp_img = ee.Image(recentValueComposite.select('B1','B2','B3','B4','B5','B6','B7'));
var ROI = ee.Geometry.Rectangle(-122.1282, 37.4476, -122.0756, 37.4204);

var make_cospectral_plot = function(image, roi, x_band, y_bands){
  // Get a dictionary with band names as keys, pixel lists as values.
  
  if ((typeof y_bands ) === "string" ){
    y_bands = [y_bands];
    
  }
  
  var result = image.reduceRegion(ee.Reducer.toList(), roi, 120);
  var band_mapper = function(band){
      return ee.Array(result.get(band));
    };
  // Convert the band data to plot on the y-axis to arrays.
  // Concatenate the y-axis data by stacking the arrays on the 1-axis.
  var yValues = ee.Array.cat(y_bands.map(band_mapper), 1);

  // The band data to plot on the x-axis is a List.
  var xValues = result.get(x_band);
  // Make a band correlation chart.
  var title = x_band.concat(' vs. ').concat(y_bands.join(','));
  print(title);
  var chart = ui.Chart.array.values(yValues, 0, xValues)
      //.setSeriesNames(['B5', 'B6'])
      .setSeriesNames(y_bands)
      .setOptions({
        title: title, 
        hAxis: {'title': x_band},
        vAxis: {'title': y_bands.join(',')},
        pointSize: 3,
  });
  
  // Print the chart.
  Map.addLayer(roi, {}, 'ROI');
  print(chart);
};

make_cospectral_plot(comp_img, ROI, 'B1', 'B5');

//***********************/
// this chunk makes x/y/spectral profiles off of a point 



//ROI CUR: -122.538, 37.8306,-121.8439, 37.3931

var build_profiles = function(image, point, region, band_list){
  //check to make sure profile point is in bounds 
  
  if (!region.contains(point).getInfo()){
    print("Your point is not inside the given region, please adjust.")
    return;
  }
 
  //coerse single string entries into array type
  if ((typeof band_list) === "string" ){
    band_list = [band_list];
  } 
  /*
    get_lines() will get the cross hair lines that correspond to the given 
    region and point
  */
  var get_lines = function(){
    Map.addLayer(point,{},'Spectral profile');
    var point_coords = point.coordinates().getInfo();
    var region_coords = region.coordinates().getInfo()[0];
    
    var horizontal = ee.Geometry.LineString([[region_coords[0][0], point_coords[1]],[region_coords[1][0], point_coords[1]]]);
    var H_feat = ee.Feature(horizontal, {'label': 'Horizontal'});
    Map.addLayer(H_feat,{},'Horizontal profile');
    var vertical = ee.Geometry.LineString([[point_coords[0], region_coords[0][1]],[point_coords[0], region_coords[2][1]]]);
    var V_feat = ee.Feature(vertical, {'label': 'Vertical'});
    Map.addLayer(V_feat,{},'Vertical profile');
    return {'h' : horizontal, 'v': vertical};
  };
  
  /*
    make_profile_plot gets the given line (horiz or vert) and makes the 
    profile plot for the desired bands
  */
  var make_profile_plot = function(line, axis_name){
    
    var result = image.reduceRegion(ee.Reducer.toList(), line, 120);
    var band_mapper = function(band){
      return ee.Array(result.get(band));
    };
  
    // Concatenate the y-axis data by stacking the arrays on the 1-axis.
    var yValues = ee.Array.cat(band_list.map(band_mapper), 1);
    
    
    var profileChart = ui.Chart.array.values(
          yValues, 0)
            .setChartType('LineChart')
            .setSeriesNames(band_list)
            .setOptions({
              title: axis_name.concat(' profile'),
              hAxis: {'title': 'pixel location'},
              vAxis: {'title': 'DN value'},
              lineWidth: 1,
              pointSize: 0,
          });
          
    // Display the chart.
    print(profileChart);
    return;
  };
  
  var make_spectral_plot = function(){
    // Define customization options.
    var options = {
      title: 'DN Spectral Profile',
      hAxis: {title: 'Wavelength (micrometers)'},
      vAxis: {title: 'Digital Numbers'},
      lineWidth: 1,
      pointSize: 4,
    };
    
    // Create the chart and set options.
    var spectraChart = ui.Chart.image.regions(
        image.select(band_list), point, ee.Reducer.mean(), 30, 'label')
            .setChartType('ScatterChart')
            .setOptions(options);
    
    // Display the chart.
    print(spectraChart);
  };
  
    
  var lines = get_lines();
  make_profile_plot(lines.h, 'Horizontal');
  make_profile_plot(lines.v, 'Vertical');
  make_spectral_plot();
  
};


build_profiles(comp_img, ee.Geometry.Point(-122.2202, 37.6306), clip_geom, ['B2', 'B3', 'B4', 'B5'])

