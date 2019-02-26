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


//stats_sample is the ROI used in the reducer, 
//necessary b/c GEE caps the # of pixels you can use
var stats_sample = ee.Geometry.Point([-100, 38]).buffer(100000);

//this will get the min and max as an exploritory messure, 
//just enter the band layer you want to analyze
var stats = function(layer, roi) {
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
stats(ndvi, stats_sample)

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

/*
Quality Layer
The first two bits of the DetailedQA layer contain general information about 
the quality of the pixel. 0 - 2 means the pixel was produced with 0 as the highest
quality and 2 representing a cloudy pixel. 3 means the pixel was not produced due 
to reasons other than clouds.
*/


// Use the expression function to perform bitwise opperations on the image object
// the expression we use here masks to select the first 2 bits
var qcq = image.expression(
    '(QA & 3)', {
      'QA': image.select('DetailedQA'),
});

// We expect to have 4 integer codes representing quality
// Please note that the in AND max values are inclusive 
var qcqVis = {
  min: 0.0,
  max: 3.0,
  //notice that you can use hex codes as above to id colors or the name! 
  //while the hex code offers you more shades, using the name gives you a defacto legend
  palette: [
    'green', 'yellow', 'purple', 'red'
  ],
};


/*
Usefulness Layer
The usefulness portion of the DetailedQA includes bits 2-5 (remember, in CS we index by 0
so the first bit is called bit 0). This means we have 4 bits and 16 values to represent the
usefulness of the pixel. 0 is the most useful and 12 is the least. Values 13-15 are not used,
which is why I chose not to visualize this range. 
*/

//Breaking down the bit math:
// 15 is represented in binary as 1111
// we shift over by 2 bits so the mask becomes 111100
// we then &, which means that any bits 2-5 in QA is selected by the mask
// then shift the newly masked quality back 2 places so we have sensible min/max vals
var qcu = image.expression(
    '(QA & (15 << 2))>>2', {
      'QA': image.select('DetailedQA'),
});

stats(qcu, stats_sample)


//Values 13-15 are not used, which is why I chose not to visualize this range 
//(as you can see by the use of 12 as the max in visualization range, I clip the values).
var qcuVis = {
  min: 0.0,
  max: 12.0, //max is inclusive
  palette: [
    'aqua', 'blue', 'lime', 'green', 'fuchsia', 'yellow', 
    'orange', 'red', 'maroon', 'white','silver', 'grey', 'black' 
  ],
};

//Question: why did I chose to have 13 colors in my pallet? 


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
//Map.addLayer(qcc.clip(continentalUS), qccVis, 'QC Mixed Clouds');

Map.addLayer(ndvi.clip(continentalUS), ndviVis, 'NDVI');
Map.addLayer(qcq.clip(continentalUS), qcqVis, 'QC Quality');
Map.addLayer(qcu.clip(continentalUS), qcuVis, 'QC Usefulness');
//this highlights the ROI I used to generate the min max reductions
Map.addLayer(stats_sample, {}, 'Stats ROI')

