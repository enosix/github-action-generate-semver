const core = require('@actions/core');
const { getOctokit, context } = require('@actions/github');
const semver = require('semver')
const zero = semver.parse('0.0.0', { loose: true })
const isCI = process.env.CI === "true"

async function mostRecentTag() {
    const refs = await getTags()
    const release = getReleaseBranch()


    const versions = refs
        .map(ref => semver.parse(ref.ref.replace(/^refs\/tags\//g, ''), { loose: true }))
        .filter(version => version !== null)
        .sort(semver.rcompare)

    if (/^\d+\.\d+$/.test(release)) {
        return versions.find(v => v.version.startsWith(release)) || release + ".0"

    } else {
        return versions[0] || zero
    }
}

function getReleaseBranch(){
    const branch = isCI ? context.ref : process.env['DUMMY_BRANCH']

    return (branch.split('/').pop().replace('-','.')) || ''
}

async function getTags() {
    if (!isCI) {
        console.log(`Skipping tag retrieval as not in CI`)
        return process.env['DUMMY_REFS'].split(',').map(x => { return { ref: `refs/tags/${x}` } })
    }
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    const octokit = getOctokit(token)
    const { data: refs } = await octokit.git.listMatchingRefs({
        ...context.repo,
        refPrefix: 'refs/tags/'
    })
    return refs
}

async function createTag(version) {
    if (!isCI) {
        console.log(`Skipping tag creation as not in CI`)
        return
    }
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    const octokit = getOctokit(token)
    const sha = core.getInput('sha') || context.sha
    const ref = `refs/tags/${version}`
    await octokit.git.createRef({
        ...context.repo,
        ref,
        sha
    })
}
async function run() {
    try {
        const bump = core.getInput('bump', { required: false })
        const prereleaseVersion = core.getInput('prerelease_version', { required: false })
        const latestTag = await mostRecentTag()
        console.log(`Using latest tag "${latestTag.toString()}" and prerelease "${prereleaseVersion}"`)
        let version = zero
        if (bump) {
            version = semver.inc(latestTag, bump)
        }else{
            version = semver.parse(latestTag, { loose: true })
        }

        if (prereleaseVersion){
            version = `${semver.major(version)}.${semver.minor(version)}.${semver.patch(version)}-${prereleaseVersion}`
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
