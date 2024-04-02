import Jimp from 'jimp';
import { PDFDocument, PDFImage, PDFPage } from 'pdf-lib';

const FILE_CAMP = './maps/camp.jpg';
const FILE_HEX = './grid/hex_grid_transparent_large.png';

const imgHex = await Jimp.read(FILE_HEX);
const imgCamp = await Jimp.read(FILE_CAMP);
// const imgWilderness = await Jimp.read(FILE_WILDERNESS)

imgHex
  .color([
    // { apply: "hue", params: [-90] },
    { apply: "lighten", params: [100] },
  ])
  .resize(imgHex.bitmap.width * 1.5, Jimp.AUTO);

imgCamp
  .composite(
    imgHex,
    0, 0, // offsets
    {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 0.25,
      opacityDest: 1,
    }
  )
  .rotate(90)
  .resize(Jimp.AUTO, 2970);

const segments = await Promise.all([
  Jimp.read(imgCamp),
  Jimp.read(imgCamp),
  Jimp.read(imgCamp),
  Jimp.read(imgCamp),
]);

const myPDF: PDFDocument = await PDFDocument.create();

const addImgToPDF = (image: PDFImage, pdf: PDFDocument) => {
  const page = pdf.addPage();
  const dims = image.scale(page.getWidth() / image.width)
  page.drawImage(image, {
    x: 0,
    y: page.getHeight() / 2 - dims.height / 2,
    width: dims.width,
    height: dims.height,
  });
}

// map each image segment into a different promise task since
// async operations are involved
const pageWork = segments.map(async (part, index) => {
  let x=0, y=0;

  switch (index) {
    case 0: // TOP-LEFT
      x=0;
      y=0;
      break;
    case 1: // TOP-RIGHT
      x=part.bitmap.width/2;
      y=0;
      break;
    case 2: // BOTTOM-LEFT
      x=0;
      y=part.bitmap.height/2;
      break;
    case 3: // BOTTOM-RIGHT
      x=part.bitmap.width/2;
      y=part.bitmap.height/2;
      break;
    default:
      break;
  }
  part
    .crop(
      x, y, // upper-left to start cropping from
      part.bitmap.width/2 -1, part.bitmap.height/2 -1, // length_W, length_H to grab
    )

  const img: PDFImage = await myPDF.embedPng(await part.getBase64Async('image/png'));
  addImgToPDF(img, myPDF);
});

await Promise.all(pageWork);

const pdfBytes = await myPDF.save();
Bun.write('output.pdf', pdfBytes);