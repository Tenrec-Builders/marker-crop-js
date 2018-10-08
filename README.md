A set of tools for rotating, cropping, and binding the images from a
scanned book into a PDF.

When scanning books, it is easy to spend a lot of time in the
post-processing phase trying to get things just right. A lot of
automated tools are really '99%' solutions which really means that you
still have to go through and check their work to verify that they are
working properly and to fix the few mistakes that crop up in each
book. In the worst case, post-processing can involve a mostly
automated process that still requires human intervention every minute
or two which means that human time is being taken up just as much as
machine time.

The purpose of this project is to try to build an absolutely reliable
and absolutely automated post-processing workflow. All of the human
effort is done up front during the actual book scanning process. After
this, the software does the remainder of the work without any need for
monitoring or intervention by a human. The result will be a PDF that
is ready for a human to read as a book.

The most basic kind of post-processing involves four steps:

1. Interleaving the odd and even page captures to provide a single image list. This is currently done when scanning with Pi Scan.
1. Rotate each photograph 90, 180, or 270 degrees if necessary so that the images can easily be read. Odd and even pages typically need different rotations.
1. Crop each photograph to the page or content scanned.
1. Bind all the photographs into an easy to read book file like a PDF.

There are a number of variations and extra steps that could be added
to this process depending on individual needs. But almost everyone
that uses a book scanner needs to do at least these steps.

The way to perform these steps with high reliability and complete
automation is through the use of fiducial markers. Fiducial markers
are printed images that are designed to be analyzed by computer vision
algorithms. Computer vision libraries can find these markers reliably
in a wide variety of poses and lighting conditions. We can use these
markers while scanning to provide orientation and cropping information
for each captured image.

![Fiducial Marker Setup](https://github.com/Tenrec-Builders/marker-crop/raw/master/images/marker-placement-1.jpg)

By using these physical markers at scan time, the person doing the
scanning can visually see what parts of the image will be cropped. As
they scan a book, they can adjust the markers as necessary to make
sure that all desired content will be preserved when cropping. This
small additional task when scanning will ensure that post-processing
is automated and painless.

# How to Scan

First you will need some markers:

1. Download and print out the [Marker Label Sheet](https://github.com/Tenrec-Builders/marker-crop/raw/master/labels/label-print.pdf) on cardstock.
1. Cut out the labels along the light gray lines.
1. Cover the back of each label with electrical tape. Try to get one even layer of tape. Use a craft knife to trim any excess tape around the edges.

Now you can press the markers against a gently sloping glass platen and they will stick slightly to the glass. Press the marker against the glass firmly and try to firmly adhere all parts of the back of the label to the glass.

The marker can be bumped or moved easily by your fingers, but it
should stay where it is on the glass even if the scanner or platen is
bumped.

All markers should be placed so that their text is readable. As images
are processed, they will be automatically rotated so that the text on
the label is made readable.

---

Place an 'Even Top Bottom' marker anywhere along the bottom of the page. Its top edge defines the crop line for the bottom of the page.
![Even Bottom Marker](https://github.com/Tenrec-Builders/marker-crop/raw/master/images/marker-placement-2.jpg)

---

Place an 'Even Side' marker anywhere along the left edge of the page. Its right edge defines the crop line for the left of the page.
![Even Left Marker](https://github.com/Tenrec-Builders/marker-crop/raw/master/images/marker-placement-3.jpg)

---

Place an 'Even Top Bottom' marker anywhere along the top of the page. Its bottom edge defines the crop line for the top of the page.
![Even Top Marker](https://github.com/Tenrec-Builders/marker-crop/raw/master/images/marker-placement-4.jpg)

---

Place an 'Even Side' marker anywhere along the gutter line. Its right edge defines the crop line along the gutter.
![Even Right Marker](https://github.com/Tenrec-Builders/marker-crop/raw/master/images/marker-placement-5.jpg)

---

Place an 'Odd Top Bottom' marker anywhere along the bottom of the page. Its top edge defines the crop line for the bottom of the page.
![Odd Bottom Marker](https://github.com/Tenrec-Builders/marker-crop/raw/master/images/marker-placement-6.jpg)

---

Place an 'Odd Side' marker anywhere along the right of the page. Its left edge defines the crop line for the right of the page.
![Odd Right Marker](https://github.com/Tenrec-Builders/marker-crop/raw/master/images/marker-placement-7.jpg)

---

Place an 'Odd Top Bottom' marker anywhere along the top of the page. Its bottom edge defines the crop line for the top of the page.
![Odd Top Marker](https://github.com/Tenrec-Builders/marker-crop/raw/master/images/marker-placement-8.jpg)

---

Place an 'Odd Side' marker anywhere along the gutter. Its left edge defines the crop line along the gutter.
![Odd Left Marker](https://github.com/Tenrec-Builders/marker-crop/raw/master/images/marker-placement-9.jpg)

---

Once all markers are placed, scan normally. If the book is bumped or a
marker is bumped, simply re-adjust as needed and you can visually see
where the scan will be cropped.

# Processing Scanned Images

Marker Crop has now been ported to JavaScript to provide a downloadable and universal UI. While it runs in a browser, it is a completely standalone application and does not upload any images anywhere. All processing is done on the local machine.

Marker Crop requires a 64-bit operating system (Windows 7 or later, recent versions of OSX and Linux) and a 64-bit version of your browser. It also needs a system with 8 GB of memory.

## Download and Install

First, download the [zip file](https://github.com/Tenrec-Builders/marker-crop-js/blob/master/dist/marker-crop-1.0.zip?raw=true) and unzip it to a convenient place. Then open marker-crop.en.html (for the English language) in your favorite browser.

## Running Marker Crop

Follow the instructions in the UI to process your images. You can turn them directly into a readable PDF, or save the processed images as a ZIP file to allow later processing. Note that you will likely want Marker Crop to run in its own window so it can process at full speed even while in the background. An inactive tab is usually slowed drastically by your browser.

User input is usually only required at the beginning of a batch to set parameters and at the end of a batch to download the resulting zip or pdf file. If there are any issues, the user may need to set crop marks manually inside the UI halfway through the processing.

# Contributing

If you wish to contribute code, feel free to make a pull request. If you want to translate the Marker Crop UI to a new language, please contact help@tenrec.builders so we can provide guidance on how to proceed.

# TODO:

* Add OpenCV patches to repo
* Optimize memory usage
* Add translation yml files (Spanish, other languages?)
