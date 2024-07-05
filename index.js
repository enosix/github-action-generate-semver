const core = require('@actions/core');
const { getOctokit, context } = require('@actions/github');
const semver = require('semver')

async function mostRecentTag() {
  const token = core.getInput('GITHUB_TOKEN', { required: true })
  const octokit = getOctokit(token)
  const regex = /^\d+\.\d+$/;

  const { data: refs } = await octokit.git.listMatchingRefs({
    ...context.repo,
    namespace: 'tags/'
  })

  const release = (context.ref.split('/').pop().replace('-','.')) || ''

  const versions = refs
    .map(ref => semver.parse(ref.ref.replace(/^refs\/tags\//g, ''), { loose: true }))
    .filter(version => version !== null)
    .sort(semver.rcompare)

  if (regex.test(release)) {
    return versions.find(v => v.startsWith(release)) || release + ".0"
  } else {
    return versions[0] || semver.parse('0.0.0')
  }
}

async function createTag(version) {
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
    let version = semver.parse(process.env.VERSION)
    if (version === null) {
      const bump = core.getInput('bump', { required: false })
      const prereleaseVersion = core.getInput('prerelease_version', { required: false })
      const latestTag = await mostRecentTag()
      console.log(`Using latest tag "${latestTag.toString()}" and prerelease "${prereleaseVersion}"`)
      if (bump) {
        version = semver.inc(latestTag, bump)
      }else{
        version = semver.parse(latestTag)
      }

      if (prereleaseVersion){
        version = `${semver.major(version)}.${semver.minor(version)}.${semver.patch(version)}-${prereleaseVersion}`
      }
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
  }
  catch (error) {
    core.setFailed(error.message)
  }
}

run();
