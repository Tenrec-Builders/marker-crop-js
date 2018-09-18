$(function ()
{
  'use strict';

  var MARKER_EVEN_SIDE = 0;
  var MARKER_EVEN_TOP = 1;
  var MARKER_ODD_SIDE = 2;
  var MARKER_ODD_TOP = 3;

  var cornerMat = new cv.MatVector();
  var idMat = new cv.Mat();
  var rejectedCandidateMat = new cv.MatVector();

  var gray = new cv.Mat();
  window.processMarkerImage = function (file, borderOdd, borderEven)
  {
    var result = {
      message: null,
      baseCrop: {},
      crop: {},
      rotation: {},
      isOdd: false,
      rotatedSize: {}
    };
    var image = cv.imread(file);
    cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY);
    cv.detectMarkers(gray, cornerMat, idMat, rejectedCandidateMat);

    var ids = idMat.data32S;
    var corners = [];
    var i = 0;
    for (; i < cornerMat.size(); i++)
    {
      corners.push(cornerMat.get(i));
    }
    window.debugIds = ids;
    window.debugCorners = corners;

    var isOdd = calculateOdd(ids);
    var sides = findSides(corners, ids, isOdd);
    var topBottom = findTopBottom(corners, ids, isOdd);

    if (sides.length != 2 || topBottom.length != 2)
    {
      result.message = 'Error finding markers';
    }
    else
    {
      result.rotation = findRotation(sides[0], corners);
      transposeFlipCorners(result.rotation.transpose,
			   result.rotation.flip,
			   image,
			   corners,
			   result.rotatedSize);
      var horizontal = processSides(sides, isOdd);
      var vertical = processTopBottom(topBottom);
      result.isOdd = isOdd;
      result.baseCrop.left = horizontal.left;
      result.baseCrop.right = horizontal.right;
      result.baseCrop.top = vertical.top;
      result.baseCrop.bottom = vertical.bottom;
      
      window.updateCrop(result, borderOdd, borderEven);
    }

    // Cleanup
    image.delete();
    for (i = 0; i < cornerMat.size(); ++i)
    {
      cornerMat.get(i).delete();
    }
    for (i = 0; i < rejectedCandidateMat.size(); ++i)
    {
      rejectedCandidateMat.get(i).delete();
    }
    
    return result;
  }

  window.updateCrop = function(info, borderOdd, borderEven)
  {
    if (info.message === null)
    {
      var border = borderEven;
      if (info.isOdd)
      {
	border = borderOdd;
      }
      if (info.isOdd)
      {
	info.crop.left = info.baseCrop.left + border.gutter;
	info.crop.right = info.baseCrop.right - border.edge;
      }
      else
      {
	info.crop.left = info.baseCrop.left + border.edge;
	info.crop.right = info.baseCrop.right - border.gutter;
      }
      info.crop.top = info.baseCrop.top + border.top;
      info.crop.bottom = info.baseCrop.bottom - border.bottom;

      // Ensure that the crop is within the bounds of the image
      info.crop.left = Math.max(info.crop.left, 0);
      info.crop.right = Math.min(info.crop.right,
				 info.rotatedSize.width);
      info.crop.top = Math.max(info.crop.top, 0);
      info.crop.bottom = Math.min(info.crop.bottom,
				  info.rotatedSize.height);
    }
  };

  function calculateOdd(ids)
  {
    var oddCount = 0;
    var evenCount = 0;
    _.each(ids, function (item) {
      if (item === MARKER_EVEN_SIDE || item === MARKER_EVEN_TOP)
      {
	evenCount += 1;
      }
      if (item === MARKER_ODD_SIDE || item === MARKER_ODD_TOP)
      {
	oddCount += 1;
      }
    });
    return oddCount >= evenCount;
  }

  function findSides(corners, ids, isOdd)
  {
    var result = [];
    var i = 0;
    for (; i < ids.length; i += 1)
    {
      if ((isOdd && ids[i] === MARKER_ODD_SIDE) ||
	  (! isOdd && ids[i] === MARKER_EVEN_SIDE))
      {
	result.push(corners[i]);
      }
    }
    return result;
  }

  function findTopBottom(corners, ids, isOdd)
  {
    var result = [];
    var i = 0;
    for (; i < ids.length; i++)
    {
      if ((isOdd && ids[i] === MARKER_ODD_TOP) ||
	  (! isOdd && ids[i] === MARKER_EVEN_TOP))
      {
	result.push(corners[i]);
      }
    }
    return result;
  }

  function processSides(sides, isOdd)
  {
    var result = {
      left: null,
      right: null
    }
    var left = sides[0];
    var right = sides[1];
    if (left.col(0).data32F[0] > right.col(0).data32F[0])
    {
      var temp = left;
      left = right;
      right = temp;
    }
    if (isOdd)
    {
      result.left = Math.max(left.col(0).data32F[0],
			     left.col(3).data32F[0]);
      result.right = Math.min(right.col(0).data32F[0],
			      right.col(3).data32F[0]);
    }
    else
    {
      result.left = Math.max(left.col(1).data32F[0],
			     left.col(2).data32F[0]);
      result.right = Math.min(right.col(1).data32F[0],
			      right.col(2).data32F[0]);
    }
    return result;
  }

  function processTopBottom(topBottom)
  {
    var result = {
      top: null,
      bottom: null
    };
    var top = topBottom[0];
    var bottom = topBottom[1];
    if (top.col(0).data32F[1] > bottom.col(0).data32F[1])
    {
      var temp = top;
      top = bottom;
      bottom = temp;
    }
    result.top = Math.max(top.col(2).data32F[1],
			  top.col(3).data32F[1]);
    result.bottom = Math.min(bottom.col(0).data32F[1],
			     bottom.col(1).data32F[1]);
    return result;
  }

  // flip === null means no flip
  // flip === 0 means flip x-axis
  // flip === 1 means flip y-axis
  // flip === -1 means flip both axis
  function findRotation(example, corners)
  {
    var angleRad = Math.atan2(example.col(3).data32F[1] - example.col(0).data32F[1],
			      example.col(3).data32F[0] - example.col(0).data32F[0]) - Math.PI/2;
    var angle = angleRad * 180 / Math.PI;
    return window.rotationCalculation(angle);
  }

  window.rotationCalculation = function (angle)
  {
    var result = {
      angle: angle,
      snapAngle: null,
      transpose: false,
      flip: null
    };
    if (result.angle < 0)
    {
      result.angle += 360;
    }
    if (result.angle >= 45 && result.angle < 135)
    {
      result.snapAngle = 90;
      result.transpose = true;
      result.flip = 0;
    }
    else if (result.angle >= 135 && result.angle < 225)
    {
      result.snapAngle = 180;
      result.transpose = false;
      result.flip = -1;
    }
    else if (result.angle >= 225 && result.angle < 315)
    {
      result.snapAngle = 270;
      result.transpose = true;
      result.flip = 1;
    }
    else
    {
      result.snapAngle = 0;
      result.transpose = false;
      result.flip = null;
    }
    return result;
  }

  function transposeFlipCorners(shouldTranspose, flipType, image, corners,
				rotatedSize)
  {
    var cols = image.size().width;
    var rows = image.size().height;
    rotatedSize.width = image.size().width;
    rotatedSize.height = image.size().height;
    if (shouldTranspose)
    {
      _.each(corners, function (box) {
	var i = 0;
	for (; i < box.size().width; i++)
	{
	  var temp = box.col(i).data32F[0];
	  box.col(i).data32F[0] = box.col(i).data32F[1];
	  box.col(i).data32F[1] = temp;
	}
      });
      rotatedSize.width = image.size().height;
      rotatedSize.height = image.size().width;
    }
    _.each(corners, function (box) {
      var i = 0;
      for (; i < box.size().width; i++)
      {
	if (flipType === 0 || flipType === -1)
	{
	  box.col(i).data32F[1] = cols - box.col(i).data32F[1];
	}
	if (flipType === 1 || flipType === -1)
	{
	  box.col(i).data32F[0] = rows - box.col(i).data32F[0];
	}
      }
    });
  }
});
