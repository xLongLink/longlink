import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lastUpdated: true,
  srcDir: 'src',
  title: 'LongLink',
  description: 'LongLink documentation',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/banner.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/banner.png' }]
  ],
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
          { text: 'Organization', link: '/api/organization/' },
          { text: 'Permissions', link: '/api/permissions/' },
          { text: 'Applications', link: '/api/applications/' },
          { text: 'Self Hosted', link: '/api/self-hosted/' },
        ]
      },
      {
        text: 'Applications SDK',
        items: [
          { text: 'Overview', link: '/sdk/' },
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
          {
            text: 'Storage',
            collapsed: true,
            items: [
              { text: 'Introduction', link: '/sdk/storage/' }
            ]
          },
          {
            text: 'Environments',
            collapsed: true,
            items: [
              { text: 'Introduction', link: '/sdk/environments/' }
            ]
          },
          {
            text: 'Database',
            collapsed: true,
            items: [
              { text: 'Introduction', link: '/sdk/database/' }
            ]
          }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xLongLink/longlink' },
      {
        icon: 'pypi',
        link: 'https://pypi.org/project/longlink/'
      }
    ]
  }
})
