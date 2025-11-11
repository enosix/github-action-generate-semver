import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import dotenv from 'dotenv';
import { run, mostRecentTag, getReleaseBranch, getTags, createTag, detectBump } from './main.js';

describe('main', () => {
    beforeEach(() => {
        process.env.TEST = 'true';
        delete process.env.DUMMY_BRANCH;
        delete process.env.DUMMY_REFS;
        delete process.env.INPUT_PREFIX;
        delete process.env.INPUT_FILTER_BY_PREFIX;
        delete process.env.INPUT_PRERELEASE_VERSION;
        delete process.env.INPUT_DRY_RUN;
        delete process.env.INPUT_BUMP;
        delete process.env.INPUT_DETECT_BUMP;
        delete process.env.INPUT_SHA;
        delete process.env.INPUT_GITHUB_TOKEN;
    });

    describe('run function', () => {
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

    describe('mostRecentTag function', () => {
        it('should return zero version when no tags exist', async () => {
            process.env.DUMMY_REFS = '';
            process.env.DUMMY_BRANCH = 'main';
            
            const result = await mostRecentTag();
            assert.equal(result.toString(), '0.0.0');
        });

        it('should return latest tag when multiple tags exist', async () => {
            process.env.DUMMY_REFS = 'v1.0.0,v1.1.0,v2.0.0';
            process.env.DUMMY_BRANCH = 'main';
            
            const result = await mostRecentTag();
            assert.equal(result.toString(), '2.0.0');
        });

        it('should filter tags by prefix when filterByPrefix is enabled', async () => {
            process.env.DUMMY_REFS = 'v1.0.0,app-v2.0.0,dude1.5.0';
            process.env.DUMMY_BRANCH = 'main';
            process.env.INPUT_PREFIX = 'dude';
            process.env.INPUT_FILTER_BY_PREFIX = 'true';
            
            const result = await mostRecentTag();
            assert.equal(result.toString(), '1.5.0');
        });

        it('should find matching major version for release branch', async () => {
            process.env.DUMMY_REFS = 'v1.0.0,v2.0.0,v2.1.0';
            process.env.DUMMY_BRANCH = 'release/v1.5.0';
            
            const result = await mostRecentTag();
            assert.equal(result.toString(), '1.0.0');
        });

        it('should return release version when no matching major version found', async () => {
            process.env.DUMMY_REFS = 'v1.0.0,v2.0.0';
            process.env.DUMMY_BRANCH = 'release/v3.0.0';
            
            const result = await mostRecentTag();
            assert.equal(result.toString(), '3.0.0');
        });
    });

    describe('getReleaseBranch function', () => {
        it('should parse valid release branch with v prefix', () => {
            process.env.DUMMY_BRANCH = 'release/v1.2.3';
            const result = getReleaseBranch();
            assert.equal(result.toString(), '1.2.3');
        });

        it('should parse valid release branch without v prefix', () => {
            process.env.DUMMY_BRANCH = 'release/1.2.3';
            const result = getReleaseBranch();
            assert.equal(result.toString(), '1.2.3');
        });

        it('should not parse release branch with dashes', () => {
            process.env.DUMMY_BRANCH = 'release/v1-2-3';
            const result = getReleaseBranch();
            assert.equal(result, null);
        });

        it('should parse release branch with major.minor only', () => {
            process.env.DUMMY_BRANCH = 'release/v1.2';
            const result = getReleaseBranch();
            assert.equal(result.toString(), '1.2.0');
        });

        it('should return null for non-release branches', () => {
            process.env.DUMMY_BRANCH = 'feature/my-feature';
            const result = getReleaseBranch();
            assert.equal(result, null);
        });

        it('should return null for main branch', () => {
            process.env.DUMMY_BRANCH = 'main';
            const result = getReleaseBranch();
            assert.equal(result, null);
        });

        it('should return null for invalid version format', () => {
            process.env.DUMMY_BRANCH = 'release/invalid-version';
            const result = getReleaseBranch();
            assert.equal(result, null);
        });
    });

    describe('getTags function', () => {
        it('should handle empty DUMMY_REFS', async () => {
            process.env.DUMMY_REFS = '';
            const result = await getTags();
            assert.equal(result.length, 1);
            assert.equal(result[0].ref, 'refs/tags/');
        });

        it('should return array of tag objects', async () => {
            process.env.DUMMY_REFS = 'v1.0.0,v2.0.0';
            const result = await getTags();
            
            assert.equal(result.length, 2);
            assert.equal(result[0].ref, 'refs/tags/v1.0.0');
            assert.equal(result[1].ref, 'refs/tags/v2.0.0');
        });

        it('should handle single tag', async () => {
            process.env.DUMMY_REFS = 'v1.0.0';
            const result = await getTags();
            
            assert.equal(result.length, 1);
            assert.equal(result[0].ref, 'refs/tags/v1.0.0');
        });

        it('should handle tags with different prefixes', async () => {
            process.env.DUMMY_REFS = 'v1.0.0,app-v2.0.0,release-1.5.0';
            const result = await getTags();
            
            assert.equal(result.length, 3);
            assert.equal(result[0].ref, 'refs/tags/v1.0.0');
            assert.equal(result[1].ref, 'refs/tags/app-v2.0.0');
            assert.equal(result[2].ref, 'refs/tags/release-1.5.0');
        });
    });

    describe('detectBump function', () => {
        it('should return "none" when no bump input is provided', async () => {
            const result = await detectBump();
            assert.equal(result, 'none');
        });

        it('should return provided bump input when specified', async () => {
            process.env.INPUT_BUMP = 'major';
            const result = await detectBump();
            assert.equal(result, 'major');
        });

        it('should return "minor" for minor bump input', async () => {
            process.env.INPUT_BUMP = 'minor';
            const result = await detectBump();
            assert.equal(result, 'minor');
        });

        it('should return "patch" for patch bump input', async () => {
            process.env.INPUT_BUMP = 'patch';
            const result = await detectBump();
            assert.equal(result, 'patch');
        });

        it('should return "none" for none bump input', async () => {
            process.env.INPUT_BUMP = 'none';
            const result = await detectBump();
            assert.equal(result, 'none');
        });

        it('should return empty string bump input as "none"', async () => {
            process.env.INPUT_BUMP = '';
            const result = await detectBump();
            assert.equal(result, 'none');
        });
    });

    describe('createTag function', () => {
        it('should return without error in test mode', async () => {
            await assert.doesNotReject(async () => {
                await createTag('v1.0.0');
            });
        });

        it('should handle different version formats', async () => {
            await assert.doesNotReject(async () => {
                await createTag('1.0.0');
                await createTag('v2.0.0');
                await createTag('app-v1.5.0');
            });
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle malformed version tags in mostRecentTag', async () => {
            process.env.DUMMY_REFS = 'invalid-tag,v1.0.0,not-a-version';
            process.env.DUMMY_BRANCH = 'main';
            
            const result = await mostRecentTag();
            assert.equal(result.toString(), '1.0.0');
        });

        it('should handle empty tag refs in mostRecentTag', async () => {
            process.env.DUMMY_REFS = '';
            process.env.DUMMY_BRANCH = 'main';
            
            const result = await mostRecentTag();
            assert.equal(result.toString(), '0.0.0');
        });

        it('should handle mixed valid and invalid tags', async () => {
            process.env.DUMMY_REFS = 'v1.0.0,invalid,v2.0.0,also-invalid,v1.5.0';
            process.env.DUMMY_BRANCH = 'main';
            
            const result = await mostRecentTag();
            assert.equal(result.toString(), '2.0.0');
        });

        it('should handle branch names with multiple slashes', () => {
            process.env.DUMMY_BRANCH = 'feature/user/my-feature';
            const result = getReleaseBranch();
            assert.equal(result, null);
        });

        it('should handle branch names with special characters', () => {
            process.env.DUMMY_BRANCH = 'release/v1.0.0-beta';
            const result = getReleaseBranch();
            assert.equal(result, null);
        });

        it('should handle refs/heads/ prefix in branch names', () => {
            process.env.DUMMY_BRANCH = 'refs/heads/release/v1.2.3';
            const result = getReleaseBranch();
            assert.equal(result.toString(), '1.2.3');
        });

        it('should sort versions correctly in mostRecentTag', async () => {
            process.env.DUMMY_REFS = 'v1.0.0,v10.0.0,v2.0.0,v1.10.0';
            process.env.DUMMY_BRANCH = 'main';
            
            const result = await mostRecentTag();
            assert.equal(result.toString(), '10.0.0');
        });

        it('should handle prerelease versions', async () => {
            process.env.DUMMY_REFS = 'v1.0.0,v2.0.0-alpha.1,v1.5.0';
            process.env.DUMMY_BRANCH = 'main';
            
            const result = await mostRecentTag();
            
            assert.equal(result.toString(), '2.0.0');
        });
    });

    describe('version bumping', () => {
        it('should increment major version when bump is "major"', async () => {
            process.env.TEST = 'true';
            process.env.DUMMY_REFS = 'v1.2.3';
            process.env.DUMMY_BRANCH = 'main';
            process.env.INPUT_BUMP = 'major';
            process.env.INPUT_DRY_RUN = 'true';
            delete process.env.INPUT_PRERELEASE_VERSION;
            
            const result = await run();
            
            assert.equal(result.toString(), '2.0.0');
        });

        it('should increment minor version when bump is "minor"', async () => {
            process.env.TEST = 'true';
            process.env.DUMMY_REFS = 'v1.2.3';
            process.env.DUMMY_BRANCH = 'main';
            process.env.INPUT_BUMP = 'minor';
            process.env.INPUT_DRY_RUN = 'true';
            delete process.env.INPUT_PRERELEASE_VERSION;
            
            const result = await run();
            
            assert.equal(result.toString(), '1.3.0');
        });

        it('should increment patch version when bump is "patch"', async () => {
            process.env.TEST = 'true';
            process.env.DUMMY_REFS = 'v1.2.3';
            process.env.DUMMY_BRANCH = 'main';
            process.env.INPUT_BUMP = 'patch';
            process.env.INPUT_DRY_RUN = 'true';
            delete process.env.INPUT_PRERELEASE_VERSION;
            
            const result = await run();
            
            assert.equal(result.toString(), '1.2.4');
        });
    });

    describe('prerelease version bumping', () => {
        it('should create prerelease version without bump', async () => {
            process.env.TEST = 'true';
            process.env.DUMMY_REFS = 'v1.2.3';
            process.env.DUMMY_BRANCH = 'main';
            process.env.INPUT_PRERELEASE_VERSION = 'alpha';
            process.env.INPUT_DRY_RUN = 'true';
            delete process.env.INPUT_BUMP;
            
            const result = await run();
            
            assert.equal(result.toString(), '1.2.3-alpha');
        });

        it('should create prerelease version with major bump', async () => {
            process.env.TEST = 'true';
            process.env.DUMMY_REFS = 'v1.2.3';
            process.env.DUMMY_BRANCH = 'main';
            process.env.INPUT_BUMP = 'major';
            process.env.INPUT_PRERELEASE_VERSION = 'beta';
            process.env.INPUT_DRY_RUN = 'true';
            
            const result = await run();
            
            assert.equal(result.toString(), '2.0.0-beta');
        });

        it('should create prerelease version with minor bump', async () => {
            process.env.TEST = 'true';
            process.env.DUMMY_REFS = 'v1.2.3';
            process.env.DUMMY_BRANCH = 'main';
            process.env.INPUT_BUMP = 'minor';
            process.env.INPUT_PRERELEASE_VERSION = 'rc';
            process.env.INPUT_DRY_RUN = 'true';
            
            const result = await run();
            
            assert.equal(result.toString(), '1.3.0-rc');
        });

        it('should create prerelease version with patch bump', async () => {
            process.env.TEST = 'true';
            process.env.DUMMY_REFS = 'v1.2.3';
            process.env.DUMMY_BRANCH = 'main';
            process.env.INPUT_BUMP = 'patch';
            process.env.INPUT_PRERELEASE_VERSION = 'alpha';
            process.env.INPUT_DRY_RUN = 'true';
            
            const result = await run();
            
            assert.equal(result.toString(), '1.2.4-alpha');
        });

        it('should handle custom prerelease identifiers', async () => {
            process.env.TEST = 'true';
            process.env.DUMMY_REFS = 'v1.2.3';
            process.env.DUMMY_BRANCH = 'main';
            process.env.INPUT_PRERELEASE_VERSION = 'dev';
            process.env.INPUT_DRY_RUN = 'true';
            delete process.env.INPUT_BUMP;
            
            const result = await run();
            
            assert.equal(result.toString(), '1.2.3-dev');
        });
    });

    describe('integration tests', () => {
        it('should handle complete workflow for new feature branch', async () => {
            process.env.TEST = 'true';
            process.env.DUMMY_REFS = 'v1.0.0,v1.1.0';
            process.env.DUMMY_BRANCH = 'feature/new-feature';
            process.env.INPUT_PRERELEASE_VERSION = 'beta';
            process.env.INPUT_DRY_RUN = 'true';
            
            const result = await run();
            
            assert.equal(result.toString(), '1.1.0-beta');
        });

        it('should handle complete workflow for release branch', async () => {
            process.env.TEST = 'true';
            process.env.DUMMY_REFS = 'v1.0.0,v1.1.0,v2.0.0';
            process.env.DUMMY_BRANCH = 'release/v1.2.0';
            process.env.INPUT_DRY_RUN = 'true';
            delete process.env.INPUT_PRERELEASE_VERSION;
            
            const result = await run();
            
            assert.equal(result.toString(), '1.1.0');
        });

        it('should handle workflow with custom prefix', async () => {
            process.env.TEST = 'true';
            process.env.DUMMY_REFS = 'app-v1.0.0,app-v1.1.0';
            process.env.DUMMY_BRANCH = 'main';
            process.env.INPUT_PREFIX = 'app-v';
            process.env.INPUT_FILTER_BY_PREFIX = 'true';
            process.env.INPUT_DRY_RUN = 'true';
            delete process.env.INPUT_PRERELEASE_VERSION;
            
            const result = await run();
            assert.equal(result.toString(), '1.1.0');
        });
    });
});