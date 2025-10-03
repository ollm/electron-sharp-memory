const sharp = require('sharp');

sharp.cache(false);
sharp.concurrency(1);

let numImages = 0;

function memory()
{
	const memoryUsage = process.memoryUsage();
	const toGB = (bytes) => (bytes / (1024 ** 3)).toFixed(2);

	const images = `Images: ${numImages}`;
	const memoryText = `RSS: ${toGB(memoryUsage.rss)} GB, Heap Total: ${toGB(memoryUsage.heapTotal)} GB, Heap Used: ${toGB(memoryUsage.heapUsed)} GB, External: ${toGB(memoryUsage.external)} GB`;

	console.log(images+'\n'+memoryText);
	document.querySelector('.memory').innerHTML = images+'<br>'+memoryText;
}

let interval = false;

async function startToFile()
{
	clearInterval(interval);
	interval = setInterval(async function() {

		await sharp('./image.jpg').jpeg({quality: 95}).resize(100, 100).toFile('./image-out.jpg');
		numImages++;
		global.gc();
		memory();

	}, 100);
}

async function startToBuffer()
{
	clearInterval(interval);
	interval = setInterval(async function() {

		await sharp('./image.jpg').jpeg({quality: 95}).resize(100, 100).toBuffer();
		numImages++;
		global.gc();
		memory();

	}, 100);
}

function stop()
{
	clearInterval(interval);
	interval = false;
}

setTimeout(function(){

	memory();
	document.querySelector('.versions').innerHTML = `Electron v${process.versions.electron}<br>Sharp v${sharp.versions.sharp}`;

}, 500);