$(function ()
{
  'use strict';

  $('.marker-stage').hide();
  $('#stage-fileselect').show();

  $('#stage-fileselect #form-images')[0].reset();
  $('#button-restart').on('click', restart);
  $('#stage-fileselect #input-images').on('change', beginOptions);
  $('#stage-options #button-begin').on('click', beginProcessing);
  $('#stage-options #update-sample').on('click', updateSample);
  $('#stage-options #sample-first').on('click', clickFirstSample);
  $('#stage-options #sample-previous').on('click', clickPreviousSample);
  $('#stage-options #sample-random').on('click', clickRandomSample);
  $('#stage-options #sample-next').on('click', clickNextSample);
  $('#stage-options #sample-last').on('click', clickLastSample);
  $('#stage-fixing #button-fix-next').on('click', nextFix);
  $('#stage-fixing #button-fix-left').on('click', rotateFixLeft);
  $('#stage-fixing #button-fix-right').on('click', rotateFixRight);
  $('#stage-collating #button-collate').on('click', beginCollating);
  $('#stage-save #button-save').on('click', saveBook);

  var timer = null;
  var parameters = {};
  var processFiles = [];
  var processIndex = 0;
  var processDone = [];
  var badIndices = [];

  function restart()
  {
    window.location.reload();
    /*
    if (timer)
    {
      window.clearTimeout(timer);
    }
    timer = null;
    processFiles = [];
    outputDoc = null;
    $('#stage-fileselect #form-images')[0].reset();

    $('.marker-stage').hide();
    $('#stage-fileselect').show();
    */
  }

  var sampleImage = {};
  var sampleWaiting = false;

  function clickFirstSample()
  {
    updateSamplePage(0);
  }

  function clickPreviousSample()
  {
    updateSamplePage(sampleImage.index - 1);
  }

  function clickRandomSample()
  {
    updateSamplePage(Math.floor(Math.random()*processFiles.length));
  }
  
  function clickNextSample()
  {
    updateSamplePage(sampleImage.index + 1);
  }
  
  function clickLastSample()
  {
    updateSamplePage(processFiles.length - 1);
  }
  
  function beginOptions()
  {
    $('.marker-stage').hide();
    $('#stage-options').show();
    processFiles = $('#stage-fileselect #input-images')[0].files;
    updateSamplePage(Math.floor(Math.random()*processFiles.length));
  }

  function updateSamplePage(newPage)
  {
    if (! sampleWaiting)
    {
      if (newPage < 0)
      {
	newPage = 0;
      }
      if (newPage > processFiles.length - 1)
      {
	newPage = processFiles.length - 1;
      }
      sampleImage = {
	index: newPage,
	file: processFiles[newPage]
      };
      if (newPage === 0)
      {
	$('#stage-options #sample-first').hide();
	$('#stage-options #sample-previous').hide();
      }
      else
      {
	$('#stage-options #sample-first').show();
	$('#stage-options #sample-previous').show();
      }
      if (newPage === processFiles.length - 1)
      {
	$('#stage-options #sample-next').hide();
	$('#stage-options #sample-last').hide();
      }
      else
      {
	$('#stage-options #sample-next').show();
	$('#stage-options #sample-last').show();
      }
      updateSample();
    }
  }

  function updateSample()
  {
    sampleWaiting = true;
    $('#stage-options #odd-cropping-group').removeClass('cropping-group-active');
    $('#stage-options #even-cropping-group').removeClass('cropping-group-active');
    setParameters();
    $('#stage-options #sample-loading').show();
    $('#stage-options #sample-ready').hide();
    $('#stage-options #sample-buttons').hide();
    $('#stage-options #sample-failed').hide();
    $('#stage-options #sample-title-even').hide();
    $('#stage-options #sample-title-odd').hide();
    var image = new Image();
    image.src = URL.createObjectURL(sampleImage.file);
    image.onload = function () {
      // TODO: Exception and error handling
      var info;
      if (sampleImage.info)
      {
	info = sampleImage.info;
	window.updateCrop(info, parameters.oddCropping,
			  parameters.evenCropping);
      }
      else
      {
	info = window.processMarkerImage(image, parameters.oddCropping,
					 parameters.evenCropping);
	info.parameters = parameters;
	sampleImage.info = info;
      }
      if (info.message !== null)
      {
	$('#stage-options #sample-failed-message').html(info.message);
	$('#stage-options #sample-loading').hide();
	$('#stage-options #sample-failed').show();
	$('#stage-options #sample-buttons').show();
	sampleWaiting = false;
      }
      else
      {
	var pageSize = {
	  width: info.crop.right - info.crop.left + 100,
	  height: info.crop.bottom - info.crop.top
	};
	var transformed = window.transformMarkerImage(image, info, pageSize);
	cv.imshow('canvas-sample-hidden', transformed);
	var context = $('#stage-options #canvas-sample-page')[0].getContext('2d');
	var height = 600/pageSize.width * pageSize.height;
	$('#stage-options #canvas-sample-page')[0].height = height;
	context.drawImage($('#stage-options #canvas-sample-hidden')[0], 0, 0, 600, height);
	$('#stage-options #sample-loading').hide();
	$('#stage-options #sample-ready').show();
	$('#stage-options #sample-buttons').show();
	if (info.isOdd)
	{
	  $('#stage-options #sample-title-odd').show();
	  $('#stage-options #odd-cropping-group').addClass('cropping-group-active');
	  $('#stage-options #even-cropping-group').removeClass('cropping-group-active');
	}
	else
	{
	  $('#stage-options #sample-title-even').show();
	  $('#stage-options #odd-cropping-group').removeClass('cropping-group-active');
	  $('#stage-options #even-cropping-group').addClass('cropping-group-active');
	}
	sampleWaiting = false;
      }
      URL.revokeObjectURL(image.src);
    };
  }

  function getExtraCroppingSize(size)
  {
    var i = parseInt(size);
    if (isNaN(i))
    {
      i = 0;
    }
    return i;
  }

  function setParameters()
  {
    parameters.oddCropping = {
      top: getExtraCroppingSize($('#stage-options #input-border-top-odd').val()),
      bottom: getExtraCroppingSize($('#stage-options #input-border-bottom-odd').val()),
      gutter: getExtraCroppingSize($('#stage-options #input-border-gutter-odd').val()),
      edge: getExtraCroppingSize($('#stage-options #input-border-edge-odd').val()),
    };
    parameters.evenCropping = {
      top: getExtraCroppingSize($('#stage-options #input-border-top-even').val()),
      bottom: getExtraCroppingSize($('#stage-options #input-border-bottom-even').val()),
      gutter: getExtraCroppingSize($('#stage-options #input-border-gutter-even').val()),
      edge: getExtraCroppingSize($('#stage-options #input-border-edge-even').val()),
    };

    parameters.border = $('#stage-options #select-margin').val();

    parameters.quality = $('#stage-options #select-quality').val();

    parameters.deskew = $('#stage-options #checkbox-deskew').is(':checked');

    parameters.sharpen = $('#stage-options #checkbox-sharpen').is(':checked');

    parameters.grayscale = $('#stage-options #checkbox-grayscale').is(':checked');
  }

  function saveParameters()
  {
  }
  
  function beginProcessing(event)
  {
    event.preventDefault();
    setParameters();
    saveParameters();
    $('.marker-stage').hide();
    $('#stage-processing').show();
    processIndex = 0;
    processDone = [];
    badIndices = [];
    processStatus();
    timer = window.setTimeout(processNext, 100);
  }

  function processStatus()
  {
    $('#status').show();
    $('#stage-processing #current-process').html(processIndex + 1);
    $('#stage-processing #process-count').html(processFiles.length);
    if (badIndices.length > 0)
    {
      $('#stage-processing #failure-count').html(badIndices.length);
      $('#stage-processing #failures').show();
    }
    else
    {
      $('#stage-processing #failures').hide();
    }
  }

  function processNext()
  {
    processStatus();
/*
    testMemoryManagement();
    ++processIndex;
    timer = window.setTimeout(processNext, 100);
*/
    if (processIndex < processFiles.length)
    {
      var image = new Image();
      image.src = URL.createObjectURL(processFiles[processIndex]);
      image.onload = function () {
	// TODO: Exception and error handling
	var info = window.processMarkerImage(image, parameters.oddCropping,
					     parameters.evenCropping);
	info.file = processFiles[processIndex];
	info.parameters = parameters;
	processDone.push(info);
	if (info.message !== null)
	{
	  badIndices.push(processIndex);
	}
	URL.revokeObjectURL(image.src);
	++processIndex;
	timer = window.setTimeout(processNext, 100);
      }
    }
    else
    {
      window.clearTimeout(timer);
      timer = null;
      if (badIndices.length === 0)
      {
	beginCollating();
      }
      else
      {
	beginFixing();
      }
    }
  }
  
  var fixIndex = 0;
  var fixStarted = false;
  var fixUrl = null;
  
  function beginFixing()
  {
    $('.marker-stage').hide();
    $('#stage-fixing').show();

    fixIndex = 0;
    fixingStatus();
    setupCropFix(processDone[badIndices[fixIndex]]);
  }

  function fixingStatus()
  {
    $('#stage-fixing #current-fix').html(fixIndex + 1);
    $('#stage-fixing #fix-count').html(badIndices.length);
  }

  function nextFix()
  {
    finishCropFix(processDone[badIndices[fixIndex]]);
    ++fixIndex;
    if (fixIndex >= badIndices.length)
    {
      beginCollating();
    }
    else
    {
      fixingStatus();
      setupCropFix(processDone[badIndices[fixIndex]]);
    }
  }

  function setupCropFix(options)
  {
    if (! fixStarted)
    {
      var image = $('#stage-fixing #image-fix')
      fixUrl = URL.createObjectURL(options.file);
      image[0].src = fixUrl
      image.cropper({
	guides: false,
	center: false,
	grid: false,
	movable: false,
	scalable: false,
      });
      fixStarted = true;
    }
    else
    {
      var crop = $('#stage-fixing #image-fix').data('cropper');
      URL.revokeObjectURL(fixUrl);
      fixUrl = URL.createObjectURL(options.file);
      crop.replace(fixUrl);
    }
  }

  function finishCropFix(options)
  {
    var crop = $('#stage-fixing #image-fix').data('cropper');
    var data = crop.getData(true);
    options.crop.left = data.x;
    options.crop.right = data.x + data.width;
    options.crop.top = data.y;
    options.crop.bottom = data.y + data.height;
    var angle = data.rotate;
    if (angle < 360)
    {
      angle += 360;
    }
    angle = 360 - angle;
    options.rotation = window.rotationCalculation(angle);
  }

  function rotateFixLeft(options)
  {
    var crop = $('#stage-fixing #image-fix').data('cropper');
    crop.rotate(-90);
  }

  function rotateFixRight(options)
  {
    var crop = $('#stage-fixing #image-fix').data('cropper');
    crop.rotate(90);
  }
  
  var collateIndex = 0;
  var outputDoc = null;
  var pageSize = {};

  function setPageSize()
  {
    var i = 0;
    var maxWidth = 1;
    var maxHeight = 1;

    for (i = 0; i < processDone.length; ++i)
    {
      var crop = processDone[i].crop;
      if (crop.right - crop.left > maxWidth)
      {
	maxWidth = crop.right - crop.left;
      }
      if (crop.bottom - crop.top > maxHeight)
      {
	maxHeight = crop.bottom - crop.top;
      }
    }
    pageSize = {
      width: maxWidth/11.811,
      height: maxHeight/11.811,
      unit: 'mm'
    };
  }

  function beginCollating()
  {
    $('.marker-stage').hide();
    $('#stage-collating').show();

    setPageSize();
    collateIndex = 0;
    outputDoc = new jsPDF({
      unit: pageSize.unit,
      format: [pageSize.width, pageSize.height]
    });
    collateStatus();
    timer = window.setTimeout(collateNext, 100);	
  }

  function collateStatus()
  {
    $('#stage-collating #current-collate').html(collateIndex + 1);
    $('#stage-collating #collate-count').html(processDone.length);
  }
  
  function collateNext()
  {
    collateStatus();
    if (collateIndex < processDone.length)
    {
      var image = new Image();
      image.src = URL.createObjectURL(processDone[collateIndex].file);
      image.onload = function () {
	// TODO: Exception and error handling
	if (collateIndex != 0)
	{
	  outputDoc.addPage();
	}
	window.collateMarkerImage(outputDoc, image,
				  processDone[collateIndex], pageSize);
	URL.revokeObjectURL(image.src);
	++collateIndex;
	timer = window.setTimeout(collateNext, 100);
      };
    }
    else
    {
      window.clearTimeout(timer);
      timer = null;
      beginSave();
    }
  }

  var pdfBlobUrl = null;
  
  function beginSave()
  {
    $('.marker-stage').hide();
    $('#stage-save').show();
    if (pdfBlobUrl)
    {
      URL.revokeObjectURL(pdfBlobUrl);
    }
    pdfBlobUrl = outputDoc.output('bloburi');
    PDFObject.embed(pdfBlobUrl, $('#stage-save #embedded-pdf')[0]);
  }

  function saveBook()
  {
    outputDoc.save('book.pdf');
  }

});
