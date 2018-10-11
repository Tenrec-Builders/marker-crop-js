$(function ()
{
  'use strict';

  var imageMax = 0;
  
  window.collateMarkerImagePdf = function (doc, next, options, pageSize)
  {
    var image = window.transformMarkerImage(next, options, pageSize);
    
    cv.imshow('canvas-collate', image);
    var quality = getQuality(options.parameters.quality);
    var data = $('#stage-collating #canvas-collate')[0].toDataURL('image/jpeg', quality);
    if (options.parameters.border === 'none')
    {
      var left = (pageSize.maxWidth - image.size().width)/(2*pageSize.divisor);
      var top = (pageSize.maxHeight - image.size().height)/(2*pageSize.divisor);
      doc.addImage(data, 'JPEG', left, top,
		   image.size().width/pageSize.divisor,
		   image.size().height/pageSize.divisor);
    }
    else
    {
      doc.addImage(data, 'JPEG', 0, 0,
		   pageSize.width,
		   pageSize.height);
    }
  };

  window.collateMarkerImageZip = function (doc, next, options,
					   pageSize, filename)
  {
    var image = window.transformMarkerImage(next, options, pageSize);
    
    cv.imshow('canvas-collate', image);
    var quality = getQuality(options.parameters.quality);
    var data = $('#stage-collating #canvas-collate')[0].toDataURL('image/jpeg', quality);
    doc.file(filename,
	     decodeURIComponent(data.substr(data.indexOf('base64,')+7)),
	     { createFolders: true,
	       base64: true });
  };

  var baseImage = null;

  var averageBackgroundColor = null;
  var averageBackgroundGray = null;
  
  window.transformMarkerImage = function(next, options, pageSize)
  {
    if (baseImage !== null)
    {
      baseImage.delete();
      baseImage = null;
    }
    baseImage = cv.imread(next);
    var image = baseImage;
    setImageMax(image);
    image = rotate(image, options);
    image = crop(image, options);
    //image = whiteBalance(image, options);
    image = deskew(image, options);
    image = sharpen(image, options);
    image = grayscale(image, options);
    if (options.parameters.border !== 'none')
    {
      image = aspectRatio(image, options, pageSize);
    }
    return image;
  };

  function setImageMax(image)
  {
    imageMax = Math.max(image.size().width, image.size().height);
  }

  function createMatrixData()
  {
    return cv.createMatRawData(imageMax * imageMax);
  }

  function createMatrix(source, data, type)
  {
    return createMatrixSize(source.size().width, source.size().height, data, type);
  }

  function createMatrixSize(width, height, data, inType)
  {
    var type = cv.CV_8UC4;
    if (inType !== undefined)
    {
      type = inType;
    }
    return new cv.Mat(height, width, type, data, cv.Mat_AUTO_STEP);
  }

  var transposedImage = null;

  function rotate(image, options)
  {
    if (transposedImage !== null)
    {
      transposedImage.delete();
      transposedImage = null;
    }
    // Rotate
    if (options.rotation.transpose)
    {
      transposedImage = image.t();
      image = transposedImage;
    }
    if (options.rotation.flip !== null)
    {
      cv.flip(image, image, options.rotation.flip);
    }
    return image;
  }

  var croppedImage = null;
  
  function crop(image, options)
  {
    if (croppedImage !== null)
    {
      croppedImage.delete();
      croppedImage = null;
    }
    // Crop
    var area = new cv.Rect(options.crop.left,
			   options.crop.top,
			   options.crop.right - options.crop.left,
			   options.crop.bottom - options.crop.top);
    if (area.x < 0)
    {
      area.x = 0;
    }
    if (area.y < 0)
    {
      area.y = 0;
    }
    if (area.x + area.width > image.size().width)
    {
      area.width = image.size().width - area.x;
    }
    if (area.y + area.height > image.size().height)
    {
      area.height = image.size().height - area.y;
    }
    croppedImage = image.roi(area);
    return croppedImage;
  }

  var deskewGrayData = null;
  var deskewBinaryData = null;
  var deskewMaskData = null;
  var deskewResultData = null;
  
  function deskew(image, options)
  {
    if (deskewGrayData === null)
    {
      deskewGrayData = createMatrixData();
    }
    if (deskewBinaryData === null)
    {
      deskewBinaryData = createMatrixData();
    }
    if (deskewMaskData === null)
    {
      deskewMaskData = createMatrixData();
    }
    if (deskewResultData === null)
    {
      deskewResultData = createMatrixData();
    }
    var gray = createMatrix(image, deskewGrayData, cv.CV_8UC1);
    cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY);
    var binary = createMatrix(image, deskewBinaryData, cv.CV_8UC1);
    cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY_INV, 31, 15);
    var mask = createMatrix(image, deskewMaskData, cv.CV_8UC1);
    cv.bitwise_not(binary, mask);
    averageBackgroundColor = cv.mean(image, mask);
    averageBackgroundGray = cv.mean(gray, mask);
    if (options.parameters.deskew)
    {
      var lines = new cv.Mat();
      cv.HoughLinesP(binary, lines, 1, Math.PI/180, 20, image.size().width/2, 50);
      var lineData = lines.data32S;
      var total = 0;
      var count = 0;
      var i = 0;
      for (i = 0; i < lineData.length - 3; i += 4)
      {
	var angle = Math.atan2(lineData[i+3] - lineData[i+1],
			       lineData[i+2] - lineData[i]);
	if (! isNaN(angle) && angle > -0.1 && angle < 0.1)
	//if (! isNaN(angle))
	{
	  total += angle;
	  count += 1;
	}
      }
      var average = 0;
      if (count > 0)
      {
	average = total / count;
      }
      var result = image;
      if (average !== 0)
      {
	var rotation = cv.getRotationMatrix2D(new cv.Point(image.size().width/2,
							   image.size().height/2),
					      average*180/Math.PI,
					      1.0);
	var result = createMatrix(image, deskewResultData);
	var border = cv.BORDER_CONSTANT;
	var borderScalar = [255, 255, 255, 255];
	if (options.parameters.border === 'black')
	{
	  borderScalar = [0, 0, 0, 255];
	}
	else if (options.parameters.border === 'mean')
	{
	  borderScalar = averageBackgroundColor;//cv.mean(image);
	}
	else if (options.parameters.border === 'blur')
	{
	  border = cv.BORDER_REPLICATE;
	}
	cv.warpAffine(image, result, rotation, image.size(), cv.INTER_CUBIC,
		      border, borderScalar);
	rotation.delete();
      }
      lines.delete();
      return result;
    }
    else
    {
      return image;
    }
  }

  /* Alternate sharpening method. Doesn't seem to work. Maybe fix later.

  // Find Laplacian of Gaussian
  function findLog(x, y, sigma)
  {
    var xy = (Math.pow(x, 2) + Math.pow(y, 2)) / (2 * Math.pow(sigma, 2));
    return -1.0 / (Math.PI * Math.pow(sigma, 4)) * (1.0 - xy) * Math.exp(-xy);
  }

  // Find Laplacian of Gaussian kernel of specified size
  function findLogKernel(size, sigma)
  {
    var kernel = new cv.Mat(size, size, cv.CV_32F);
    var halfsize = Math.floor(size / 2);
    var x = 0;
    var y = 0;
    for (x = -halfsize; x <= halfsize; ++x) {
      for (y = -halfsize; y <= halfsize; ++y) {
	kernel.data32F[x+halfsize + (y+halfsize)*size] = findLog(x, y, sigma);
      }
    }
    return kernel;
  }
      //var kernel = findLogKernel(5, 1.4);
      //cv.filter2D(image, result, -1, kernel);
      //console.log(result);
      //console.log(kernel);
      //kernel.delete();
      //return result;
*/

  var sharpenBlurredData = null;
  var sharpenResultData = null;
  
  function sharpen(image, options)
  {
    if (sharpenBlurredData === null)
    {
      sharpenBlurredData = createMatrixData();
    }
    if (sharpenResultData === null)
    {
      sharpenResultData = createMatrixData();
    }
    if (options.parameters.sharpen)
    {
      var blurred = createMatrix(image, sharpenBlurredData);
      cv.GaussianBlur(image, blurred, new cv.Size(5, 5), 3);
      var result = createMatrix(image, sharpenResultData);
      cv.addWeighted(blurred, -0.5, image, 1.5, 0, result);
      return result;
    }
    else
    {
      return image;
    }
  }

  var aspectData = null;
  
  function aspectRatio(image, options, pageSize)
  {
    if (aspectData === null)
    {
      aspectData = createMatrixData();
    }
    // Aspect Ratio
    var pageWidth = pageSize.width;
    var pageHeight = pageSize.height;
    var aspectWidth = 0;
    var aspectHeight = 0;
    
    if (image.size().width / image.size().height < pageWidth / pageHeight)
    {
      // Fill horizontally
      aspectWidth = Math.floor(image.size().height * pageWidth / pageHeight);
      aspectHeight = image.size().height;
    }
    else
    {
      // Fill vertically
      aspectWidth = image.size().width;
      aspectHeight = Math.floor(image.size().width * pageHeight / pageWidth);
    }
    var aspected = createMatrixSize(aspectWidth, aspectHeight, aspectData, image.type());
    var left = Math.floor(Math.abs(image.size().width - aspected.size().width)/2);
    var right = aspected.size().width - image.size().width - left;
    var top = Math.floor(Math.abs(image.size().height - aspected.size().height)/2);
    var bottom = aspected.size().height - image.size().height - top
    var borderFlag = cv.BORDER_CONSTANT;
    var borderColor = [255, 255, 255, 255];
    if (options.parameters.border === 'black')
    {
      cv.copyMakeBorder(image, aspected, top, bottom, left, right,
			cv.BORDER_CONSTANT | cv.BORDER_ISOLATED,
			[0, 0, 0, 255]);
    }
    else if (options.parameters.border === 'white')
    {
      cv.copyMakeBorder(image, aspected, top, bottom, left, right,
			cv.BORDER_CONSTANT | cv.BORDER_ISOLATED,
			[255, 255, 255, 255]);
    }
    else if (options.parameters.border === 'mean')
    {
      var meanColor = averageBackgroundColor;
      if (image.type() !== cv.CV_8UC4)
      {
	meanColor = averageBackgroundGray;
      }
      cv.copyMakeBorder(image, aspected, top, bottom, left, right,
			cv.BORDER_CONSTANT | cv.BORDER_ISOLATED,
			meanColor);
    }
    else // Default to blur
    {
      cv.copyMakeBorder(image, aspected, top, bottom, left, right,
			cv.BORDER_REPLICATE | cv.BORDER_ISOLATED,);
      if (left > 0)
      {
	var leftBlur = aspected.roi(new cv.Rect(0, 0,
						left, aspected.size().height));
	cv.blur(leftBlur, leftBlur, new cv.Size(1, 50));
	leftBlur.delete();
      }
      if (right > 0)
      {
	var rightBlur = aspected.roi(new cv.Rect(left + image.size().width, 0,
						 right, aspected.size().height));
	cv.blur(rightBlur, rightBlur, new cv.Size(1, 50));
	rightBlur.delete();
      }
      if (top > 0)
      {
	var topBlur = aspected.roi(new cv.Rect(0, 0,
					       aspected.size().width, top));
	cv.blur(topBlur, topBlur, new cv.Size(50, 1));
	topBlur.delete();
      }
      if (bottom > 0)
      {
	var bottomBlur = aspected.roi(new cv.Rect(0, top + image.size().height,
						  aspected.size().width, bottom));
	cv.blur(bottomBlur, bottomBlur, new cv.Size(50, 1));
	bottomBlur.delete();
      }
    }
    return aspected;
  }

  var grayscaleData = null;
  
  function grayscale(image, options)
  {
    if (grayscaleData === null)
    {
      grayscaleData = createMatrixData();
    }
    if (options.parameters.grayscale)
    {
      var gray = createMatrix(image, grayscaleData, cv.CV_8UC1);
      cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY);
      cv.normalize(gray, gray, 0, 255, cv.NORM_MINMAX);
      return gray;
    }
    else
    {
      return image;
    }
  }

  var whiteBalanceData = null;
  var wbInternalData = null;
  var wbResultData = null;
  
  function whiteBalance(image, options)
  {
    if (whiteBalanceData === null)
    {
      whiteBalanceData = createMatrixData();
      wbInternalData = createMatrixData();
      wbResultData = createMatrixData();
    }
    if (true)
    {
      var wbInternal = createMatrix(image, wbInternalData, cv.CV_8UC3);
      var balanced = createMatrix(image, whiteBalanceData, cv.CV_8UC3);
      cv.cvtColor(image, wbInternal, cv.COLOR_RGBA2RGB);
      cv.balanceWhite(wbInternal, balanced);
      var wbResult = createMatrix(image, wbResultData);
      cv.cvtColor(balanced, wbResult, cv.COLOR_RGB2RGBA);
      return wbResult;
    }
    else
    {
      return image;
    }
  }

  var nameToQuality = {
    'fair': 0.4,
    'good': 0.7,
    'great': 0.9
  };
  
  function getQuality(name)
  {
    var result = 0.7;
    if (nameToQuality[name] !== undefined)
    {
      result = nameToQuality[name];
    }
    return result;
  }

  var debugData = null;
  var debugMat = new cv.Mat(3000, 3800, cv.CV_8UC4);
  window.debugSource = debugMat;

  window.testMemoryManagement = function()
  {
    if (debugData === null)
    {
      imageMax = 4000;
      debugData = createMatrixData();
    }
    var foo = createMatrix(debugMat, debugData, cv.CV_8UC1);
    window.debugDest = foo;
    //foo.create(debugMat.size(), debugMat.type());
    cv.cvtColor(debugMat, foo, cv.COLOR_RGBA2GRAY);
  }
  
});
