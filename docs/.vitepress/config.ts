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
          { text: 'Testing', link: '/sdk/testing/' },
          { text: 'Build & Publish', link: '/sdk/building/' },
        ]
      },
      {
        text: 'Pages',
        items: [
          { text: 'Introduction', link: '/pages/' },
          { text: 'HTML Elements', link: '/pages/html-elements' },
          {
            text: 'Layout',
            collapsed: true,
            items: [
              { text: 'Hero', link: '/pages/layout/hero' },
              { text: 'Menu', link: '/pages/layout/menu' },
              { text: 'Card', link: '/pages/layout/card' },
              { text: 'Columns', link: '/pages/layout/columns' },
              { text: 'Tabs', link: '/pages/layout/tabs' },
              { text: 'Table', link: '/pages/layout/table' }
            ]
          },
          {
            text: 'Components',
            collapsed: true,
            items: [
              { text: 'Button', link: '/pages/components/button' },
              { text: 'Checkbox', link: '/pages/components/checkbox' },
              { text: 'Dialog', link: '/pages/components/dialog' },
              { text: 'Icon', link: '/pages/components/icon' },
              { text: 'Input', link: '/pages/components/input' },
              { text: 'Range', link: '/pages/components/range' },
              { text: 'Select', link: '/pages/components/select' },
              { text: 'Separator', link: '/pages/components/separator' },
              { text: 'Slider', link: '/pages/components/slider' },
              { text: 'Switch', link: '/pages/components/switch' },
              { text: 'Textarea', link: '/pages/components/textarea' }
            ]
          }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xLongLink/longlink' },
      { icon: 'pypi', link: 'https://pypi.org/project/longlink/' }
    ]
  }
}))
