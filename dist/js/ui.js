$(function ()
{
  'use strict';

  if (! window.loadFailed)
  {
    $(function () {
      $('[data-toggle="popover"]').popover({
	container: 'body'
      })
    })
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
  }

  var timer = null;
  var parameters = {};
  var processFiles = [];
  var processIndex = 0;
  var processDone = [];
  var loadFailed = [];
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
    image.onerror = function () {
      sampleFailed('Could not load file as an image.');
    }
    image.onload = function () {
      try
      {
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
	  sampleFailed(info.message);
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
      }
      catch (e)
      {
	mainErrorHandler(e, 'Update Sample', sampleImage.index, sampleImage.file.name);
      }
    };
  }

  function sampleFailed(message)
  {
    $('#stage-options #sample-failed-message').html(message);
    $('#stage-options #sample-loading').hide();
    $('#stage-options #sample-failed').show();
    $('#stage-options #sample-buttons').show();
    sampleWaiting = false;
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
    parameters.output = $('#stage-options #select-output').val();
  }

  function saveParameters()
  {
  }
  
  function beginProcessing(event)
  {
    try
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
    catch (e)
    {
      mainErrorHandler(e, 'Process Begin');
    }
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
    try
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
	image.onerror = function () {
	  $('#skipped').show();
	  $('#skipped .list-group').append('<li class="list-group-item">Skipped (could not load as image): <b>' + _.escape(processFiles[processIndex].name) + '</b></li>');
	  loadFailed.push(true);
	  processDone.push(null);
	  ++processIndex;
	  processStatus();
	  timer = window.setTimeout(processNext, 100);
	}
	image.onload = function () {
	  try
	  {
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
	    loadFailed.push(false);
	    ++processIndex;
	    timer = window.setTimeout(processNext, 100);
	  }
	  catch (e)
	  {
	    window.clearTimeout(timer);
	    if (processIndex < processFiles.length)
	    {
	      mainErrorHandler(e, 'Process Inside', processIndex, processFiles[processIndex].name);
	    }
	    else
	    {
	      mainErrorHandler(e, 'Process Inside End');
	    }
	  }
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
    catch (e)
    {
      window.clearTimeout(timer);
      if (processIndex < processFiles.length)
      {
	mainErrorHandler(e, 'Process Outside', processIndex, processFiles[processIndex].name);
      }
      else
      {
	mainErrorHandler(e, 'Process Outside End');
      }
    }
  }
  
  var fixIndex = 0;
  var fixStarted = false;
  var fixUrl = null;
  
  function beginFixing()
  {
    try
    {
      $('.marker-stage').hide();
      $('#stage-fixing').show();

      fixIndex = 0;
      fixingStatus();
      setupCropFix(processDone[badIndices[fixIndex]]);
    }
    catch (e)
    {
      if (fixIndex < badIndices.length)
      {
	mainErrorHandler(e, 'Fix Begin', badIndices[fixIndex], processFiles[badIndices[fixIndex]].name);
      }
      else
      {
	mainErrorHandler(e, 'Fix Begin No Index');
      }
    }
  }

  function fixingStatus()
  {
    $('#stage-fixing #current-fix').html(fixIndex + 1);
    $('#stage-fixing #fix-count').html(badIndices.length);
  }

  function nextFix()
  {
    try
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
    catch (e)
    {
      if (fixIndex < badIndices.length)
      {
	mainErrorHandler(e, 'Fix', badIndices[fixIndex], processFiles[badIndices[fixIndex]].name);
      }
      else
      {
	mainErrorHandler(e, 'Fix End');
      }
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
  var zipContent = null;

  function setPageSize()
  {
    var i = 0;
    var maxWidth = 1;
    var maxHeight = 1;

    for (i = 0; i < processDone.length; ++i)
    {
      if (! loadFailed[i])
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
    }
    pageSize = {
      width: maxWidth/11.811,
      height: maxHeight/11.811,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
      divisor: 11.811,
      unit: 'mm'
    };
  }

  function beginCollating()
  {
    try
    {
      $('.marker-stage').hide();
      $('#stage-collating').show();

      setPageSize();
      collateIndex = 0;
      if (parameters.output == 'pdf')
      {
	outputDoc = new jsPDF({
	  unit: pageSize.unit,
	  format: [pageSize.width, pageSize.height]
	});
      }
      else
      {
	outputDoc = new JSZip();
      }
      collateStatus();
      timer = window.setTimeout(collateNext, 100);
    }
    catch (e)
    {
      mainErrorHandler(e, 'Collate Begin');
    }
  }

  function collateStatus()
  {
    $('#stage-collating #current-collate').html(collateIndex + 1);
    $('#stage-collating #collate-count').html(processDone.length);
  }
  
  function collateNext()
  {
    try
    {
      while (collateIndex < processDone.length && loadFailed[collateIndex])
      {
	++collateIndex;
      }
      collateStatus();
      if (collateIndex < processDone.length)
      {
	var image = new Image();
	image.src = URL.createObjectURL(processDone[collateIndex].file);
	image.onload = function () {
	  try
	  {
	    if (parameters.output == 'pdf')
	    {
	      if (collateIndex != 0)
	      {
		outputDoc.addPage();
	      }
	      window.collateMarkerImagePdf(outputDoc, image,
					   processDone[collateIndex], pageSize);
	    }
	    else
	    {
	      var filename = processFiles[collateIndex].name;
	      window.collateMarkerImageZip(outputDoc, image,
					   processDone[collateIndex],
					   pageSize,
					   filename);
	    }
	    URL.revokeObjectURL(image.src);
	    ++collateIndex;
	    timer = window.setTimeout(collateNext, 100);
	  }
	  catch (e)
	  {
	    if (collateIndex < processFiles.length)
	    {
	      mainErrorHandler(e, 'Collate Inside', collateIndex, processFiles[collateIndex].name);
	    }
	    else
	    {
	      mainErrorHandler(e, 'Collate Inside End');
	    }
	  }
	};
      }
      else
      {
	window.clearTimeout(timer);
	timer = null;
	beginSave();
      }
    }
    catch (e)
    {
      if (collateIndex < processFiles.length)
      {
	mainErrorHandler(e, 'Collate Outside', collateIndex, processFiles[collateIndex].name);
      }
      else
      {
	mainErrorHandler(e, 'Collate Outside End');
      }
    }
  }

  var pdfBlobUrl = null;
  
  function beginSave()
  {
    try
    {
      if (parameters.output == 'pdf')
      {
	$('#stage-save #save-title-zip').hide();
	$('#stage-save #save-button-zip').hide();
      }
      else
      {
	$('#stage-save #save-title-pdf').hide();
	$('#stage-save #save-button-pdf').hide();
	$('#stage-save #embedded-pdf').hide();
      }
      $('.marker-stage').hide();
      $('#stage-save').show();
      if (parameters.output == 'pdf')
      {
	if (pdfBlobUrl)
	{
	  URL.revokeObjectURL(pdfBlobUrl);
	}
	pdfBlobUrl = outputDoc.output('bloburi');
	PDFObject.embed(pdfBlobUrl, $('#stage-save #embedded-pdf')[0]);
      }
      else
      {
	$('#stage-save #button-save').prop('disabled', true);
	outputDoc.generateAsync({type:"blob"})
	  .then(function(content) {
	    zipContent = content;
	    $('#stage-save #button-save').prop('disabled', false);
	  });
      }
    }
    catch (e)
    {
      mainErrorHandler(e, 'Save Begin');
    }
  }

  function saveBook()
  {
    try
    {
      if (parameters.output == 'pdf')
      {
	outputDoc.save('book.pdf');
      }
      else
      {
	FileSaverSaveAs(zipContent, 'book.zip');
      }
    }
    catch (e)
    {
      mainErrorHandler(e, 'Save Download');
    }
  }

});
