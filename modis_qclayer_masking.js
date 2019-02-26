//This gives an over the US ROI that we will use when visualizing the map
var continentalUS = ee.Geometry.Rectangle(-127.18, 19.39, -62.75, 51.29);


//This is the MODIS vegatation indices product
// The given date filter will selects several images into a collection
var dataset = ee.ImageCollection('MODIS/006/MOD13Q1')
                  .filter(ee.Filter.date('2018-01-01', '2018-05-07'));
                  
//Get the dates of the images in the image collection and print to the console          
var dates = dataset.toList(dataset.size()).map(function (img) {
  return ee.Image(img).date().format();
});
console.log(dates)

//We only want to examine one image, so we will just grab the first image off the collection
var image = ee.Image(dataset.first());

// Now we can start evaluating the image! Let's start by visualizing the NDVI layer.


//to get some basic stats on each layer we will add reducers 
var reducers = ee.Reducer.min().combine({
  reducer2: ee.Reducer.max(),
  sharedInputs: true
});



//this will get the min and max as an exploritory messure, 
//just enter the band layer you want to analyze
var stats = function(layer) {
  var roi = ee.Geometry.Point([-100, 38]).buffer(100000);
  var vals = layer.reduceRegion({
    geometry : roi,
    reducer: reducers,
    scale: 30,
    maxPixels: 1e9
  });
  // Display the dictionary of band means and SDs.
  console.log(vals);
  return vals;
};

// Select grabs the band named NDVI from the image and stores it in the ndvi variable
// (see the documentation for the band names on different products)
var ndvi = image.select('NDVI');

//run the stats
stats(ndvi)

// ndviVis is an object that defines some visualization parameters. 
var ndviVis = {
  min: 0.0,
  max: 8000.0,
  palette: [
    'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901',
    '66A000', '529400', '3E8601', '207401', '056201', '004C00', '023B01',
    '012E01', '011D01', '011301'
  ],
};

//quality layer 
var qcq = image.expression(
    '(QA & 3)', {
      'QA': image.select('DetailedQA'),
});


var qcqVis = {
  min: 0.0,
  max: 4.0,
  palette: [
    'green', 'yellow', 'orange', 'red'
  ],
};


//usefulness 
var qcu = image.expression(
    '(QA & (15 << 2))>>2', {
      'QA': image.select('DetailedQA'),
});

stats(qcu)
var qcuVis = {
  min: 0.0,
  max: 11.0, //max is inclusive
  palette: [
    'aqua', 'blue', 'lime', 'green', 'fuchsia', 'yellow', 'orange', 'red', 'maroon', 'white','silver', 'black' 
  ],
};


//mixed clouds
/*
var qcc = image.expression(
    '(QA & (1 <<15))>>15', {
      'QA': image.select('DetailedQA'),
});

var qccVis = {
  min: 0.0,
  max: 1.0, //max is inclusive
  palette: [
    'white', 'black' 
  ],
};
*/

Map.setCenter(-100, 38, 3.5)
Map.addLayer(ndvi.clip(continentalUS), ndviVis, 'NDVI');
Map.addLayer(qcq.clip(continentalUS), qcqVis, 'QC Quality');
Map.addLayer(qcu.clip(continentalUS), qcuVis, 'QC Usefulness');
Map.addLayer(ee.Geometry.Point([-100, 38]).buffer(100000))
//Map.addLayer(qcc.clip(continentalUS), qccVis, 'QC Mixed Clouds');
