const sharp = require('sharp');

async function processImage(options)
{
	let instance = sharp(options.input);

	for(const step of options.pipeline)
	{
		if(typeof instance[step.fn] !== 'function')
			throw new Error(`Unknown method: ${step.fn}`);

		instance = instance[step.fn](...(step.args || []));
	}

	return instance;
}

process.on('message', async function(data) {

	const index = data.index;
	const options = data.options;

	if(data.job === 'memory')
	{
		const output = process.memoryUsage();
		process.send({success: true, output, index});
		return;
	}

	try
	{
		const output = await processImage(options);
		process.send({success: true, output, index});
	}
	catch(error)
	{
		process.send({success: false, error: error.message, index});
	}

});