const {fork} = require('node:child_process');

var debounces = {};

function setDebounce(key, callback, debounce = 300, _debounce = false)
{
	const timeout = setTimeout(function(){

		const debounced = debounces[key];
		if(debounced === false) return;

		const now = Date.now();
		const elapsed = now - debounced.now;

		if(elapsed < debounce)
		{
			setDebounce(key, debounced.callback, debounce, (debounce - elapsed));
			return;
		}

		debounces[key] = false;
		debounced.callback(true);

	}, _debounce || debounce);

	if(_debounce === false)
	{
		debounces[key] = {
			now: Date.now() - 5,
			callback: callback,
			timeout: timeout,
		};
	}
	else
	{
		debounces[key].timeout = timeout;
	}
}

class ChildFork
{
	fork;
	#index = 0;
	#idleTimeout;
	#key = crypto.randomUUID();
	onCloseCallback = false;
	promisses = [];
	shouldCloseOnFinish = false;

	constructor(options = {}) {

		this.fork = fork('./www/js/sharp-fork.js');
		this.fork.on('message', (event) => this.message(event));

		this.#idleTimeout = options.idleTimeout || false;

		if(this.#idleTimeout && options.idleTimeoutInit)
			setDebounce(this.#key, () => this.close(), this.#idleTimeout);

	}

	message(data) {

		const arrayIndex = this.promisses.findIndex(item => item.index === data.index);
		const promise = this.promisses[arrayIndex];
		this.promisses.splice(arrayIndex, 1);

		if(!data.success || data.error)
			promise.reject(data.error);
		else
			promise.resolve(data.output);

		if(this.shouldCloseOnFinish)
			this.closeOnFinish();

	}

	work(options = {}) {

		if(this.#idleTimeout)
			setDebounce(this.#key, () => this.close(), this.#idleTimeout);

		const index = this.#index++;

		this.fork.send({
			index: index,
			...options,
		});

		let resolve = false, reject = false;

		const promise = new Promise(function(_resolve, _reject){

			resolve = _resolve;
			reject = _reject;

		});

		this.promisses.push({
			index: index,
			resolve: resolve,
			reject: reject,
		});

		return promise;

	}

	onClose(callback) {
		this.onCloseCallback = callback;
	}

	close() {

		if(!this.fork)
			return;

		this.fork.kill();
		delete this.fork;

		if(this.onCloseCallback)
			this.onCloseCallback();
	}

	closeOnFinish() {
		
		if(!this.promisses.length)
			this.close();
		else
			this.shouldCloseOnFinish = true;

	}
}

let IDLE_TIMEOUT = 5000;
let JOBS_PER_CYCLE = 10;

function config(options)
{
	if(options.idleTimeout !== undefined)
		IDLE_TIMEOUT = options.idleTimeout;

	if(options.jobsPerCycle !== undefined)
		JOBS_PER_CYCLE = options.jobsPerCycle;
}

const forks = [];
let index = 0;

function pushFork()
{
	const _index = index++;
	const fork = new ChildFork({idleTimeout: IDLE_TIMEOUT, idleTimeoutInit: false});

	forks.push({
		index: _index,
		count: 0,
		fork: fork,
	});

	fork.onClose(function(){
		closeFork(_index);
	});
}

function closeFork(index)
{
	const fork = forks.find(item => item.index === index);
	if(!fork) return;

	forks.splice(forks.indexOf(fork), 1);
	fork.fork.closeOnFinish();
}

// Keep 2 forks alive to avoid delays
function createForks()
{
	const fork = forks[0] || false;

	if(fork?.count > JOBS_PER_CYCLE)
		closeFork(fork.index);

	if(!forks[0]) pushFork();
	if(!forks[1]) pushFork();
}

function getFork(count = true)
{
	createForks();

	const fork = forks[0];
	if(count) fork.count++;

	return fork.fork;
}

async function sharp(options = {}) {

	const fork = getFork();

	return fork.work({
		job: 'sharp',
		options: options,
	});

}

async function memory(options = {}) {

	const fork = getFork(false);

	return fork.work({
		job: 'memory',
	});

}

module.exports = {
	ChildFork,
	config,
	sharp,
	memory,
};