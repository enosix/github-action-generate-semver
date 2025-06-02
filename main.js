const core = require('@actions/core');
const { getOctokit, context } = require('@actions/github');
const semver = require('semver')
const zero = semver.parse('0.0.0', { loose: true })

async function mostRecentTag() {
    const refs = await getTags()
    const release = getReleaseBranch()

    const versions = refs
        .map(ref => {
            return semver.coerce(ref.ref.replace(/^refs\/tags\//g, ''));
        })
        .filter(version => version !== null)
        .sort(semver.rcompare)

    if (release) {
        return versions.find(v => v.major === release.major) || release
    } else {
        return versions[0] || zero
    }
}

function getReleaseBranch(){
    const branch = process.env.TEST === "true" ? process.env['DUMMY_BRANCH'] : context.ref

    const release = (branch.split('/').pop().replace('-','.'))

    if (/^v?\d+\.\d+(\.\d+)?$/.test(release)) {
        return semver.coerce(release)
    }

    return null
}

async function getTags() {
    if (process.env.TEST === "true") {
        return process.env['DUMMY_REFS'].split(',').map(x => { return { ref: `refs/tags/${x}` } })
    }
    const token = core.getInput('github_token', { required: true })
    const octokit = getOctokit(token)

    const { data: refs } = await octokit.rest.git.listMatchingRefs({
        ...context.repo,
        ref: 'tags'
    })
    return refs
}

async function createTag(version) {
    if (process.env.TEST === "true") {
        return
    }
    const token = core.getInput('github_token', { required: true })
    const octokit = getOctokit(token)
    const sha = core.getInput('sha') || context.sha
    const ref = `refs/tags/${version}`
    await octokit.rest.git.createRef({
        ...context.repo,
        ref,
        sha
    })
}

async function detectBump() {
    let bump = core.getInput('bump', { required: false })

    if (core.getInput('detect_bump') === 'true') {
        const sha = core.getInput('sha') || context.sha
        const token = core.getInput('github_token', { required: true })
        const octokit = getOctokit(token)
        const { data } = await octokit.rest.repos.getCommit({
            ...context.repo,
            commit_sha: sha
        });
        console.log(data)
        const msg = (data.commit && data.commit.message || '').toLowerCase()
        if (msg.includes('[major]')) {
            bump = 'major'
        } else if (msg.includes('[minor]')) {
            bump = 'minor'
        } else if (msg.includes('[patch]')) {
            bump = 'patch'
        }
    }

    return bump || 'none'
}

async function run() {
    try {
        const bump = await detectBump()
        const prereleaseVersion = core.getInput('prerelease_version', { required: false })
        const latestTag = await mostRecentTag()
        console.log(`Using latest tag "${latestTag.toString()}" and prerelease "${prereleaseVersion}"`)
        let version = zero
        if (latestTag){
            version = latestTag
            console.log(`Using latest tag "${version}"`)
        }

        if (bump && bump !== 'none') {
            version = version.inc(bump)
        }

        if (prereleaseVersion){
            version = version.inc('pre', prereleaseVersion, false)
        }

        const prefix = core.getInput('prefix', {required: false}) || "v"
        let version_tag = prefix + version.toString()
        console.log(`Using tag prefix "${prefix}"`)

        core.exportVariable('VERSION', version.toString())
        core.setOutput('version', version.toString())
        core.setOutput('version_optimistic', `${semver.major(version)}.${semver.minor(version)}`)
        core.setOutput('version_tag', version_tag)

        console.log(`Result: "${version.toString()}" (tag: "${version_tag}")`)

        if (core.getInput('dry_run') !== 'true') {
            await createTag(version_tag)
        }
        return version
    }
    catch (error) {
        core.setFailed(error.message)
    }
}

module.exports = { run, mostRecentTag, getReleaseBranch, getTags, createTag }
