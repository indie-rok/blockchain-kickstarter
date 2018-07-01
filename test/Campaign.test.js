var Campaign = artifacts.require('Campaign');
const assert = require('assert');

contract('Campaign', accounts => {
	let instance;

	beforeEach('creates the instance', async () => {
		instance = await Campaign.new(1);
	});

	describe('#constructor', () => {
		it('should create the campaign', async () => {
			assert.ok(instance.address);
		});

		it('should be created by the owner', async () => {
			const manager = await instance.manager();
			assert.equal(manager, accounts[0]);
		});
	});

	describe('#donate', () => {
		it('should allow people to donate', async () => {
			await instance.donate({
				value: web3.toWei('1', 'ether'),
				from: accounts[1]
			});
			await instance.donate({
				value: web3.toWei('1', 'ether'),
				from: accounts[2]
			});
			const balance = await instance.getBalance();
			const contributorsCount = await instance.contributorsCount();
			assert.equal(balance, 2);
			assert.equal(contributorsCount, 2);
		});

		it('should allow people to donate once', async () => {
			await instance.donate({
				value: web3.toWei('1', 'ether'),
				from: accounts[1]
			});
			let error = false;
			try {
				await instance.donate({
					value: web3.toWei('1', 'ether'),
					from: accounts[1]
				});
			} catch (err) {
				error = true;
			}
			assert(error == true);
		});

		it('should raise an error when donating less than min', async () => {
			let error = false;
			try {
				await instance.donate({
					value: 0,
					from: accounts[0]
				});
			} catch (e) {
				error = true;
			}
			assert.equal(error, true);
		});

		it('should not allow people to donate twice', async () => {
			await instance.donate({
				value: web3.toWei('1', 'ether'),
				from: accounts[1]
			});
			let error = false;
			try {
				await instance.donate({
					value: web3.toWei('1', 'ether'),
					from: accounts[1]
				});
			} catch (err) {
				error = true;
			}

			const balance = await instance.getBalance();

			assert.equal(balance, 1);
			assert.equal(error, true);
		});
	});

	describe('#createRequest', () => {
		it('should allow manager to create request', async () => {
			await instance.createRequest('electronicos', 32, accounts[1]);
			const request = await instance.requests(0);
			assert.equal(request[0], 'electronicos');
		});

		it('should raise and error when invalid params', async () => {
			let error = false;
			try {
				await instance.createRequest();
			} catch (err) {
				error = true;
			}
			assert.equal(error, true);
		});

		it('should only allow manager to create request', async () => {
			let error = false;
			try {
				await instance.createRequest('electronicos', 32, accounts[1], {
					from: accounts[1]
				});
			} catch (err) {
				error = true;
			}
			assert.equal(error, true);
		});
	});

	describe('#aproveRequest', () => {
		it('it should aprove the request to donor', async () => {
			await instance.donate({
				value: web3.toWei('1', 'ether'),
				from: accounts[1]
			});

			await instance.donate({
				value: web3.toWei('1', 'ether'),
				from: accounts[2]
			});

			await instance.createRequest('electronicos', 10, accounts[3]);
			await instance.aproveRequest(0, { from: accounts[1] });
			await instance.aproveRequest(0, { from: accounts[2] });

			const request = await instance.requests(0);
			assert.equal(request[3], 2);
		});

		it('should not aprove request to not donors', async () => {
			await instance.createRequest('electronicos', 10, accounts[3]);

			let error = false;
			try {
				await instance.aproveRequest(0, { from: accounts[1] });
			} catch (err) {
				error = true;
			}
			assert.equal(error, true);
		});

		it('should not allow me to aprove the same request twice', async () => {
			await instance.donate({
				value: web3.toWei('1', 'ether'),
				from: accounts[1]
			});

			await instance.createRequest('electronicos', 10, accounts[3]);
			await instance.aproveRequest(0, { from: accounts[1] });
			let error = false;
			try {
				await instance.aproveRequest(0, { from: accounts[1] });
			} catch (err) {
				error = true;
			}
			assert.equal(error, true);
		});
	});

	describe('#endRequest', () => {
		it('should endRequest to owner', async () => {
			await instance.createRequest('electronicos', 10, accounts[3]);
			await instance.donate({
				value: web3.toWei('1', 'ether'),
				from: accounts[1]
			});
			await instance.aproveRequest(0, { from: accounts[1] });
			await instance.endRequest(0);
			const request = await instance.requests(0);
			assert.equal(request[4], false);
		});

		it('should not endRequest to non-owner', async () => {
			await instance.createRequest('electronicos', 10, accounts[3]);
			let error = false;
			try {
				await instance.endRequest(0, { from: accounts[1] });
			} catch (err) {
				error = true;
			}

			assert(error);
		});

		it('should only allow end request once', async () => {
			await instance.createRequest('electronicos', 10, accounts[3]);
			await instance.donate({
				value: web3.toWei('1', 'ether'),
				from: accounts[1]
			});
			await instance.aproveRequest(0, { from: accounts[1] });
			await instance.endRequest(0);
			let error = false;
			try {
				await instance.endRequest(0);
			} catch (err) {
				error = true;
			}
			assert(error);
		});

		it('should transfer the money to the requester', async () => {
			await instance.donate({
				value: web3.toWei('1', 'ether'),
				from: accounts[1]
			});

			await instance.donate({
				value: web3.toWei('1', 'ether'),
				from: accounts[2]
			});

			await instance.createRequest('electronicos', 10, accounts[3]);
			await instance.aproveRequest(0, { from: accounts[1] });
			await instance.aproveRequest(0, { from: accounts[2] });

			await instance.endRequest(0);

			const recipientBalance = await web3.eth.getBalance(accounts[3]);
			assert(recipientBalance > web3.fromWei('100', 'ether'));
		});

		it('should now allow to close the request if votes are not sufficient', async () => {
			await instance.donate({
				value: web3.toWei('1', 'ether'),
				from: accounts[1]
			});

			await instance.donate({
				value: web3.toWei('1', 'ether'),
				from: accounts[2]
			});

			await instance.donate({
				value: web3.toWei('1', 'ether'),
				from: accounts[4]
			});

			await instance.createRequest('electronicos', 10, accounts[3]);
			await instance.aproveRequest(0, { from: accounts[1] });

			let error = false;
			try {
				await instance.endRequest(0);
			} catch (err) {
				error = true;
			}
			assert(error);
		});
	});
});
