module.exports = {
  branches: ['main'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES']
        },
        releaseRules: [
          { type: 'feat', release: 'minor' },
          { type: 'fix', release: 'patch' },
          { type: 'perf', release: 'patch' },
          { breaking: true, release: 'major' }
        ]
      }
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: 'Features' },
            { type: 'fix', section: 'Bug Fixes' },
            { type: 'perf', section: 'Performance Improvements' }
          ]
        },
        writerOpts: {
          groupBy: 'scope',
          commitGroupsSort: 'title',
          commitsSort: ['scope', 'subject'],
          transform: (commit, context) => {
            const allowedScopes = ['sdk', 'api', 'web'];
            const normalizedScope = (commit.scope || '').toLowerCase();

            if (!allowedScopes.includes(normalizedScope)) {
              return;
            }

            const scopedCommit = { ...commit };
            scopedCommit.scope = normalizedScope.toUpperCase();
            return scopedCommit;
          },
          groupTitleByScope: {
            API: 'API',
            SDK: 'SDK',
            WEB: 'WEB'
          }
        }
      }
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md'
      }
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message:
          'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ]
  ]
};
