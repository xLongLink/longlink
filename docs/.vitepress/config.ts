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
    logo: 'banner.png',
    siteTitle: false,
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
          { text: 'Applications', link: '/api/applications/' },
          { text: 'Self Hosted', link: '/api/self-hosted/' },
        ]
      },
      {
        text: 'Applications SDK',
        items: [
          { text: 'Overview', link: '/sdk/' },
          { text: 'Environments', link: '/sdk/environments/' },
          { text: 'Routes', link: '/sdk/routes/' },
          { text: 'Storage', link: '/sdk/storage/' },
          { text: 'Database', link: '/sdk/database/' },
          {
            text: 'Pages',
            collapsed: true,
            items: [
              { text: 'Introduction', link: '/sdk/pages/' },
              { text: 'HTML Elements', link: '/sdk/pages/html-elements' },
              {
                text: 'Layout',
                collapsed: true,
                items: [
                  { text: 'Hero', link: '/sdk/pages/layout/hero' },
                  { text: 'Menu', link: '/sdk/pages/layout/menu' },
                  { text: 'Card', link: '/sdk/pages/layout/card' },
                  { text: 'Columns', link: '/sdk/pages/layout/columns' },
                  { text: 'Tabs', link: '/sdk/pages/layout/tabs' },
                  { text: 'Table', link: '/sdk/pages/layout/table' }
                ]
              },
              {
                text: 'Components',
                collapsed: true,
                items: [
                  { text: 'Button', link: '/sdk/pages/components/button' },
                  { text: 'Checkbox', link: '/sdk/pages/components/checkbox' },
                  { text: 'Dialog', link: '/sdk/pages/components/dialog' },
                  { text: 'Icon', link: '/sdk/pages/components/icon' },
                  { text: 'Input', link: '/sdk/pages/components/input' },
                  { text: 'Range', link: '/sdk/pages/components/range' },
                  { text: 'Select', link: '/sdk/pages/components/select' },
                  { text: 'Separator', link: '/sdk/pages/components/separator' },
                  { text: 'Slider', link: '/sdk/pages/components/slider' },
                  { text: 'Switch', link: '/sdk/pages/components/switch' },
                  { text: 'Textarea', link: '/sdk/pages/components/textarea' }
                ]
              }
            ]
          },
          { text: 'Testing', link: '/sdk/testing/' },
          { text: 'Build & Publish', link: '/sdk/building/' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xLongLink/longlink' },
      { icon: 'pypi', link: 'https://pypi.org/project/longlink/' }
    ]
  }
}))
