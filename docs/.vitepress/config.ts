import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// https://vitepress.dev/reference/site-config
export default withMermaid(defineConfig({
  lastUpdated: true,
  srcDir: 'src',
  title: 'LongLink',
  description: 'LongLink documentation',
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  themeConfig: {
    logo: '/image.png',
    siteTitle: "LongLink",
    search: {
      provider: 'local'
    },
    editLink: {
      pattern: 'https://github.com/xLongLink/longlink/edit/main/docs/src/:path',
      text: 'Edit this page on GitHub'
    },
    nav: [
      { text: 'Control Plane', link: '/api/' },
      { text: 'Applications SDK', link: '/sdk/' }
    ],

    sidebar: [
      {
        text: 'Overview',
        items: [
          { text: 'Introduction', link: '/' },
        ]
      },
      {
        text: 'Control Plane',
        items: [
          { text: 'Overview', link: '/api/' },
          { text: 'Self Hosted', link: '/api/self-hosted' },
        ]
      },
      {
        text: 'Applications SDK',
        items: [
          { text: 'Overview', link: '/sdk/' },
          { text: 'Environments', link: '/sdk/environments' },
          { text: 'Routes', link: '/sdk/routes' },
          { text: 'Storage', link: '/sdk/storage' },
          { text: 'Database', link: '/sdk/database' },
          { text: 'Testing', link: '/sdk/testing' },
          { text: 'Build & Publish', link: '/sdk/building' },
        ]
      },
      {
        text: 'XML',
        items: [
          { text: 'Introduction', link: '/xml/' },
          { text: 'HTML', link: '/xml/html' },
          { text: 'Components', link: '/xml/components' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xLongLink/longlink' },
      { icon: 'pypi', link: 'https://pypi.org/project/longlink/' }
    ]
  }
}))
