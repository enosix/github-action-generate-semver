const assert = require('node:assert');
const { describe, it } = require('node:test');
const dotenv = require('dotenv');
const { run } = require('./main.js');

describe('main', () => {
    it('should handle dev branches', async () => {
        dotenv.config({path: './test-main.env', override: true});
        const output = await run();

        assert.equal(output, '2.3.0-build123');
    });
    it('should handle release branches', async () => {
        dotenv.config({path: './test-release.env', override: true});
        const output = await run();

        assert.equal(output, '2.2.2');
    });
    it('should handle PR branches', async () => {
        dotenv.config({path: './test-pr.env', override: true});
        const output = await run();

        assert.equal(output, '2.3.0-pr123');
    });
});
