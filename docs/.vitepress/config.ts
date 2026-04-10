import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: 'src',
  title: 'LongLink',
  description: 'LongLink documentation',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/banner.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/banner.png' }]
  ],
  themeConfig: {
    logo: '/banner.png',
    logoLink: 'https://longlink.dev',
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Control Plane', link: '/api/' },
      { text: 'Applications SDK', link: '/sdk/' }
    ],

    sidebar: {
      '/api/': [
        {
          text: 'Control Plane',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Organization', link: '/api/organization/' },
            { text: 'Permissions', link: '/api/permissions/' },
            { text: 'Applications', link: '/api/applications/' },
            { text: 'Databases', link: '/api/databases/' },
            { text: 'Storage', link: '/api/storage/' },
            { text: 'Compute', link: '/api/compute/' },
            { text: 'Logging', link: '/api/logging/' },
            { text: 'Integrations', link: '/api/integrations/' }
          ]
        }
      ],
      '/sdk/': [
        {
          text: 'Applications SDK',
          items: [
            { text: 'Overview', link: '/sdk/' },
            {
              text: 'Pages',
              collapsed: true,
              items: [
                { text: 'Introduction', link: '/sdk/pages/' },
                {
                  text: 'Layout',
                  collapsed: true,
                  items: [
                    { text: 'Overview', link: '/sdk/pages/layout' },
                    { text: 'Stack', link: '/sdk/pages/stack' },
                    { text: 'Columns', link: '/sdk/pages/columns' },
                    { text: 'Tabs', link: '/sdk/pages/tabs' },
                    { text: 'Menu', link: '/sdk/pages/menu' }
                  ]
                },
                {
                  text: 'Components',
                  collapsed: true,
                  items: [
                    { text: 'Overview', link: '/sdk/pages/components' },
                    { text: 'Text', link: '/sdk/pages/text' },
                    { text: 'Hero', link: '/sdk/pages/hero' },
                    { text: 'Button', link: '/sdk/pages/button' },
                    { text: 'Input', link: '/sdk/pages/input' },
                    { text: 'Textarea', link: '/sdk/pages/textarea' },
                    { text: 'Select', link: '/sdk/pages/select' },
                    { text: 'Switch', link: '/sdk/pages/switch' },
                    { text: 'Checkbox', link: '/sdk/pages/checkbox' },
                    { text: 'Range', link: '/sdk/pages/range' },
                    { text: 'Table', link: '/sdk/pages/table' },
                    { text: 'Chart', link: '/sdk/pages/chart' },
                    { text: 'Card', link: '/sdk/pages/card' },
                    { text: 'Dialog', link: '/sdk/pages/dialog' },
                    { text: 'Form', link: '/sdk/pages/form' },
                    { text: 'Separator', link: '/sdk/pages/separator' }
                  ]
                },
                {
                  text: 'Logic',
                  collapsed: true,
                  items: [
                    { text: 'Overview', link: '/sdk/pages/logic' },
                    { text: 'State', link: '/sdk/pages/state' },
                    { text: 'ForEach', link: '/sdk/pages/foreach' },
                    { text: 'If', link: '/sdk/pages/if' }
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
              text: 'Database',
              collapsed: true,
              items: [
                { text: 'Introduction', link: '/sdk/database/' }
              ]
            }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xLongLink/longlink' }
    ]
  }
})
