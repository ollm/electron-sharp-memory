const sharp = require('sharp');
const childFork = require('./js/child-fork.js');

childFork.config({
	jobsPerCycle: 10,
	idleTimeout: 1000,
});

sharp.cache(false);
sharp.concurrency(1);

let numImages = 0, prevNow = 0;

function memory()
{
	const now = performance.now();

	const memoryUsage = process.memoryUsage();
	const toGB = (bytes) => (bytes / (1024 ** 3)).toFixed(2);

	const imagesSec = prevNow ? Math.round((1 / ((now - prevNow) / 1000))) : '0';

	const images = `Images: ${numImages}, ${imagesSec} images/sec`;
	const memoryText = `RSS: ${toGB(memoryUsage.rss)} GB, Heap Total: ${toGB(memoryUsage.heapTotal)} GB, Heap Used: ${toGB(memoryUsage.heapUsed)} GB, External: ${toGB(memoryUsage.external)} GB`;

	console.log(images+'\n'+memoryText);
	if(document) document.querySelector('.memory').innerHTML = images+'<br>'+memoryText;

	forkMemory();

	prevNow = now;
}

async function forkMemory()
{
	const memoryUsage = await childFork.memory();
	const toGB = (bytes) => (bytes / (1024 ** 3)).toFixed(2);

	const memoryText = `Fork memory: RSS: ${toGB(memoryUsage.rss)} GB, Heap Total: ${toGB(memoryUsage.heapTotal)} GB, Heap Used: ${toGB(memoryUsage.heapUsed)} GB, External: ${toGB(memoryUsage.external)} GB`;

	console.log(memoryText);
	console.log('');
	if(document) document.querySelector('.forkMemory').innerHTML = memoryText;
}

let interval = false;

async function startToFile()
{
	clearInterval(interval);
	interval = setInterval(async function() {

		await sharp('./image.jpg').jpeg({quality: 95}).resize(100, 100).toFile('./image-out.jpg');
		numImages++;
		if(global.gc) global.gc();
		memory();

	}, 100);
}

async function startToBuffer()
{
	clearInterval(interval);
	interval = setInterval(async function() {

		await sharp('./image.jpg').jpeg({quality: 95}).resize(100, 100).toBuffer();
		numImages++;
		if(global.gc) global.gc();
		memory();

	}, 100);
}

async function startForkToFile()
{
	clearInterval(interval);
	interval = setInterval(async function() {

		const options = {
			input: './image.jpg',
			pipeline: [
				{fn: 'jpeg', args: [{quality: 95}]},
				{fn: 'resize', args: [100, 100]},
				{fn: 'toFile', args: ['./image-out.jpg']}
			]
		};

		await childFork.sharp(options);
		numImages++;
		if(global.gc) global.gc();
		memory();

	}, 100);
}

async function startForkToBuffer()
{
	clearInterval(interval);
	interval = setInterval(async function() {

		const options = {
			input: './image.jpg',
			pipeline: [
				{fn: 'jpeg', args: [{quality: 95}]},
				{fn: 'resize', args: [100, 100]},
				{fn: 'toBuffer', args: []}
			]
		};

		await childFork.sharp(options);
		numImages++;
		if(global.gc) global.gc();
		memory();

	}, 100);
}

function stop()
{
	clearInterval(interval);
	interval = false;

	setTimeout(function(){

		forkMemory();

	}, 1500);
}

setTimeout(function(){

	memory();
	document.querySelector('.versions').innerHTML = `Electron v${process.versions.electron}<br>Sharp v${sharp.versions.sharp}`;

}, 500);